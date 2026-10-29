import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { browserPath } from './browser.mjs';
const EDGE = browserPath();
const URL_APP = process.argv[2];
const PORT = Number(process.argv[3] ?? 9340);
const PROFILE = process.argv[4];
const LABEL = process.argv[5] ?? 'phase';

if (!URL_APP || !PROFILE) {
	console.error('usage: check-icons.mjs <url> <port> <profile-dir> [label]');
	process.exit(2);
}

mkdirSync(PROFILE, { recursive: true });

const edge = spawn(
	EDGE,
	[
		'--headless=new',
		'--disable-gpu',
		'--no-first-run',
		'--remote-debugging-port=' + PORT,
		'--user-data-dir=' + PROFILE,
		'about:blank'
	],
	{ stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(url) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url);
		const pending = new Map();
		let id = 0;
		ws.addEventListener('message', (e) => {
			const m = JSON.parse(e.data);
			if (m.id && pending.has(m.id)) {
				pending.get(m.id)(m);
				pending.delete(m.id);
			}
		});
		ws.addEventListener('error', reject);
		ws.addEventListener('open', () =>
			resolve({
				send: (method, params = {}) =>
					new Promise((res) => {
						const i = ++id;
						pending.set(i, res);
						ws.send(JSON.stringify({ id: i, method, params }));
					}),
				close: () => ws.close()
			})
		);
	});
}

for (let i = 0; i < 80; i++) {
	try {
		if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break;
	} catch {}
	await sleep(250);
}
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const cdp = await connect(target.webSocketDebuggerUrl);
await cdp.send('Runtime.enable');
await cdp.send('Page.enable');

const ev = async (expression) =>
	(
		await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
	).result?.result?.value;

await cdp.send('Page.navigate', { url: URL_APP });
await sleep(6000);

const state = await ev(`(async () => {
	const manifest = await (await fetch('/manifest.webmanifest', { cache: 'no-store' })).json();
	const icon = manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'any');
	const keys = await caches.keys();
	let iconPng = false;
	try {
		const res = await fetch(icon.src, { cache: 'no-store' });
		const buf = new Uint8Array(await res.arrayBuffer());
		iconPng = buf[0] === 0x89 && buf[1] === 0x50;
	} catch {}
	let cachedBytes = 0;
	const key = keys.find(k => k.startsWith('zikr-'));
	if (key) {
		const cache = await caches.open(key);
		const hit = await cache.match(new URL(icon.src, location).pathname + new URL(icon.src, location).search);
		if (hit) cachedBytes = (await hit.arrayBuffer()).byteLength;
	}
	return {
		caches: keys,
		iconUrl: icon.src,
		servedIsPng: iconPng,
		precachedBytes: cachedBytes
	};
})()`);

console.log(`${LABEL}:`, JSON.stringify(state));
cdp.close();
edge.kill();
process.exit(0);