import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { browserPath, profileRoot } from './browser.mjs';
const EDGE = browserPath();
const URL_APP = process.argv[2] ?? 'http://localhost:4181';
const PORT = 9335;

const profile = mkdtempSync(join(profileRoot(), 'zikr-shot-'));
const edge = spawn(
	EDGE,
	[
		'--headless=new',
		'--disable-gpu',
		'--no-first-run',
		'--force-device-scale-factor=2',
		'--remote-debugging-port=' + PORT,
		'--user-data-dir=' + profile,
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

async function waitEndpoint() {
	for (let i = 0; i < 60; i++) {
		try {
			const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
			if (r.ok) return;
		} catch {}
		await sleep(250);
	}
	throw new Error('devtools not up');
}

await waitEndpoint();
const target = await (
	await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
).json();
const cdp = await connect(target.webSocketDebuggerUrl);

await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
	width: 390,
	height: 844,
	deviceScaleFactor: 2,
	mobile: true
});
await cdp.send('Page.navigate', { url: URL_APP });
await sleep(5000);

const evaluate = (expression) =>
	cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });

async function shot(name) {
	const { result } = await cdp.send('Page.captureScreenshot', { format: 'png' });
	writeFileSync(`shots/${name}.png`, Buffer.from(result.data, 'base64'));
	console.log('saved shots/' + name + '.png');
}

// Count a few so the UI is not empty
await evaluate(
	`(() => { for (let i=0;i<9;i++) (function(){const b=document.querySelector('main button');const r=b.getBoundingClientRect();b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));})(); return true; })()`
);
await sleep(900);
await shot('01-home');

// Statistics sheet
await evaluate(`document.querySelector('button[aria-label="Statistics"]')?.click()`);
await sleep(1200);
await shot('02-stats');

// Trend at 30 days
await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='30d'); b?.click(); return true; })()`);
await sleep(900);

const scrollSheet = (top) =>
	evaluate(
		`(() => { const el = document.querySelector('[role="dialog"] .overflow-y-auto'); if (el) el.scrollTop = ${top}; return true; })()`
	);

await scrollSheet(980);
await sleep(500);
await shot('03-trend-30d');

await scrollSheet(1700);
await sleep(500);
await shot('04-heatmap');

await scrollSheet(2500);
await sleep(500);
await shot('05-backup');

// Close, open settings
await evaluate(`document.querySelector('button[aria-label="Close"]')?.click()`);
await sleep(500);
await evaluate(`document.querySelector('button[aria-label="Settings"]')?.click()`);
await sleep(900);
await shot('06-settings');

// Light theme
await evaluate(
	`(() => { const b=[...document.querySelectorAll('button')].find(x=>/^light$/i.test(x.textContent.trim())); b?.click(); return true; })()`
);
await sleep(600);
await evaluate(`document.querySelector('button[aria-label="Close"]')?.click()`);
await sleep(600);
await shot('07-light');

// Back to dark, then the dhikr manager
await evaluate(`document.querySelector('button[aria-label="Settings"]')?.click()`);
await sleep(600);
await evaluate(
	`(() => { const b=[...document.querySelectorAll('button')].find(x=>/^dark$/i.test(x.textContent.trim())); b?.click(); return true; })()`
);
await sleep(400);
await evaluate(`document.querySelector('button[aria-label="Close"]')?.click()`);
await sleep(500);
await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Manage'); b?.click(); return true; })()`);
await sleep(900);
await shot('08-zikrs');

// Celebration
await evaluate(`document.querySelector('button[aria-label="Close"]')?.click()`);
await sleep(400);
await evaluate(`(() => { for (let i=0;i<24;i++) (function(){const b=document.querySelector('main button');const r=b.getBoundingClientRect();b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));})(); return true; })()`);
await sleep(600);
await shot('09-celebration');

// Zen
await sleep(3200);
await evaluate(`document.querySelector('button[aria-label="Enter focus mode"]')?.click()`);
await sleep(800);
await shot('10-zen');

cdp.close();
edge.kill();
process.exit(0);