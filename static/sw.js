/* Zikr service worker — offline-first app shell with runtime caching. */
const VERSION = '7e740d0dc5';
const CACHE = `zikr-${VERSION}`;

const PRECACHE = [
	'/?v=7e740d0dc5',
	'/index.html?v=7e740d0dc5',
	'/manifest.webmanifest?v=7e740d0dc5',
	'/logo.png?v=7e740d0dc5',
	'/icons/icon-192.png?v=7e740d0dc5',
	'/icons/icon-512.png?v=7e740d0dc5',
	'/icons/maskable-512.png?v=7e740d0dc5',
	'/icons/apple-touch-icon.png?v=7e740d0dc5',
	'/icons/favicon-64.png?v=7e740d0dc5'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) =>
				// `cache: 'reload'` skips the HTTP cache so a deploy cannot
				// re-precache the files it just replaced.
				Promise.allSettled(
					PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
				)
			)
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function isAsset(url) {
	return (
		url.pathname.startsWith('/_app/') ||
		url.pathname.startsWith('/icons/') ||
		/\.(?:js|css|png|svg|woff2?|json|webmanifest)$/.test(url.pathname)
	);
}

/**
 * Looks a request up in the current cache, ignoring the `?v=` stamp that the
 * logo tooling adds, so a precached shell still answers a plain navigation.
 */
async function matchShell(request) {
	const cache = await caches.open(CACHE);
	const direct = await cache.match(request);
	if (direct) return direct;

	const url = new URL(request.url);
	url.search = '';
	return (await cache.match(url.href)) ?? (await cache.match(url.pathname));
}

/** Network-first so a fresh deploy is picked up, cache as the offline safety net. */
async function networkFirst(request) {
	try {
		const response = await fetch(request);
		if (response?.ok) {
			const cache = await caches.open(CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await matchShell(request);
		if (cached) return cached;
		const shell = await matchShell('/index.html');
		if (shell) return shell;
		return new Response('<h1>Zikr is offline</h1>', {
			status: 503,
			headers: { 'Content-Type': 'text/html' }
		});
	}
}

/** Cache-first for hashed build assets, refreshing in the background. */
async function staleWhileRevalidate(request) {
	const cached = await matchShell(request);
	const network = fetch(request)
		.then((response) => {
			if (response?.ok) {
				caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
			}
			return response;
		})
		.catch(() => null);
	return cached ?? (await network) ?? new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request));
		return;
	}

	if (isAsset(url)) {
		event.respondWith(staleWhileRevalidate(request));
	}
});