import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL_APP = process.argv[2] ?? 'http://localhost:4214';
const PORT = 9350;

mkdirSync('shots/about', { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'zikr-about-'));

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
		const events = [];
		let id = 0;
		ws.addEventListener('message', (e) => {
			const m = JSON.parse(e.data);
			if (m.id && pending.has(m.id)) {
				pending.get(m.id)(m);
				pending.delete(m.id);
			} else if (m.method) events.push(m);
		});
		ws.addEventListener('error', reject);
		ws.addEventListener('open', () =>
			resolve({
				events,
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
await cdp.send('DOM.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
	width: 390,
	height: 844,
	deviceScaleFactor: 2,
	mobile: true
});

const ev = async (expression) => {
	const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
	if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text };
	return r.result?.result?.value;
};

async function shot(name) {
	const { result } = await cdp.send('Page.captureScreenshot', { format: 'png' });
	writeFileSync(`shots/about/${name}.png`, Buffer.from(result.data, 'base64'));
	console.log('saved shots/about/' + name + '.png');
}

const scrollSheet = (top) =>
	ev(`(() => { const el = document.querySelector('[role="dialog"] .overflow-y-auto'); if (el) el.scrollTop = ${top}; return true; })()`);

await cdp.send('Page.navigate', { url: URL_APP });
await sleep(5000);

console.log('header buttons:', await ev(`document.querySelectorAll('header button').length`));

await ev(`document.querySelectorAll('header button')[3]?.click()`);
await sleep(900);

// Scroll to the About section
await scrollSheet(99999);
await sleep(600);
await shot('01-about');

const about = await ev(`(() => {
	const dialog = document.querySelector('[role="dialog"]');
	const links = [...dialog.querySelectorAll('a')].map(a => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), text: a.innerText.replace(/\\n/g,' ') }));
	const bullets = [...dialog.querySelectorAll('li')].map(li => li.innerText.trim());
	return { text: dialog.innerText, links, bullets };
})()`);

console.log('\nfeatures:');
about.bullets.forEach((b) => console.log('  - ' + b));
console.log('\nlinks:');
about.links.forEach((l) => console.log('  ' + l.target?.padEnd(7) + l.href + '  | ' + l.text));
console.log('\nversion/closing present:', /Version 1\.0\.0/.test(about.text), '/', about.text.includes('Built for the sake'));

// Share button: force the no-native-share path so the clipboard fallback is tested.
const share = await ev(`(async () => {
	const dialog = document.querySelector('[role="dialog"]');
	const btn = [...dialog.querySelectorAll('button')].find(b => /Share Zikr/i.test(b.textContent));
	if (!btn) return { error: 'share button missing' };

	const original = navigator.share;
	Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
	let written = null;
	const originalWrite = navigator.clipboard?.writeText?.bind(navigator.clipboard);
	if (originalWrite) navigator.clipboard.writeText = async (text) => { written = text; };

	btn.click();
	await new Promise(r => setTimeout(r, 700));
	const status = dialog.innerText.match(/copied to your clipboard/i)?.[0] ?? null;

	if (original) Object.defineProperty(navigator, 'share', { value: original, configurable: true });
	if (originalWrite) navigator.clipboard.writeText = originalWrite;

	return { status, wroteUrl: written, hadNativeShare: 'share' in navigator };
})()`);
console.log('\nshare fallback:', JSON.stringify(share));

// Arabic
await ev(`(() => {
	const dialog = document.querySelector('[role="dialog"]');
	[...dialog.querySelectorAll('button')].find(b => /^العربية|Arabic/i.test(b.innerText))?.click();
	return true;
})()`);
await sleep(900);
await scrollSheet(99999);
await sleep(600);
await shot('02-about-ar');

const ar = await ev(`(() => {
	const dialog = document.querySelector('[role="dialog"]');
	return {
		dir: document.documentElement.dir,
		bullets: [...dialog.querySelectorAll('li')].map(li => li.innerText.trim()).slice(-3),
		version: dialog.innerText.includes('الإصدار 1.0.0'),
		share: dialog.innerText.includes('شارك ذِكْر')
	};
})()`);
console.log('arabic:', JSON.stringify(ar, null, 1));

const errors = cdp.events
	.filter((e) => e.method === 'Runtime.exceptionThrown')
	.map((e) => e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no runtime exceptions');

cdp.close();
edge.kill();
process.exit(0);