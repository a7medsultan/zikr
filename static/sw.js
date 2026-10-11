/* Zikr service worker — offline-first app shell with runtime caching. */
const VERSION = 'v1';
const CACHE = `zikr-${VERSION}`;

const PRECACHE = [
	'/',
	'/index.html',
	'/manifest.webmanifest',
	'/favicon.svg',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
	'/icons/maskable-512.png',
	'/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
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
		const cached = await caches.match(request);
		if (cached) return cached;
		const shell = await caches.match('/index.html');
		if (shell) return shell;
		return new Response('<h1>Zikr is offline</h1>', {
			status: 503,
			headers: { 'Content-Type': 'text/html' }
		});
	}
}

/** Cache-first for hashed build assets, refreshing in the background. */
async function staleWhileRevalidate(request) {
	const cached = await caches.match(request);
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