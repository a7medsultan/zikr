import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL_APP = process.argv[2] ?? 'http://localhost:4200';
const PORT = 9336;

mkdirSync('shots/i18n', { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'zikr-i18n-'));
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
await cdp.send('DOM.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
	width: 390,
	height: 844,
	deviceScaleFactor: 2,
	mobile: true
});

const evaluate = async (expression) => {
	const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
	if (res.result?.exceptionDetails) return { __error: res.result.exceptionDetails.text };
	return res.result?.result?.value;
};

async function shot(name) {
	const { result } = await cdp.send('Page.captureScreenshot', { format: 'png' });
	writeFileSync(`shots/i18n/${name}.png`, Buffer.from(result.data, 'base64'));
	console.log('saved shots/i18n/' + name + '.png');
}

async function report(label) {
	const info = await evaluate(`({
		lang: document.documentElement.lang,
		dir: document.documentElement.dir,
		title: document.title,
		hint: document.querySelector('main p.mt-5')?.textContent?.trim() ?? null,
		footer: [...document.querySelectorAll('footer span')].map(s => s.textContent.trim()).join(' | '),
		buttons: [...document.querySelectorAll('footer button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 6).join(' | '),
		meaning: document.querySelector('main .text-xs.text-muted')?.textContent?.trim() ?? null,
		monthLabels: [...document.querySelectorAll('[role="dialog"] .absolute.top-0')].map(s => s.textContent.trim()).join(','),
		weekdays: [...document.querySelectorAll('[role="dialog"] .me-1 span')].map(s => s.textContent.trim()).filter(Boolean).join(',')
	})`);
	console.log(label.padEnd(8), JSON.stringify(info));
	return info;
}

// --- English ---
await cdp.send('Page.navigate', { url: URL_APP });
await sleep(5000);
await evaluate(
	`(() => { for (let i=0;i<9;i++) document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:195,clientY:420})); return true; })()`
);
await sleep(800);
await report('EN');
await shot('en-home');

// --- Switch to Arabic via the header globe button ---
await evaluate(
	`(() => {
		const btn = document.querySelectorAll('header button')[2];
		btn?.click(); return !!btn;
	})()`
);
await sleep(800);
await shot('en-language-picker');

await evaluate(
	`(() => {
		const btn = [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('\u0627\u0644\u0639\u0631\u0628\u064a\u0629'));
		btn?.click(); return !!btn;
	})()`
);
await sleep(1000);

const ar = await report('AR');
await shot('ar-home');

// Arabic statistics sheet
await evaluate(
	`(() => { const b=document.querySelectorAll('header button')[0]; b?.click(); return !!b; })()`
);
await sleep(1000);
await shot('ar-stats');
const statsText = await evaluate(
	`document.querySelector('[role="dialog"]')?.innerText.slice(0,220).replace(/\\n/g,' | ') ?? null`
);
console.log('AR stats text:', statsText);

// Scroll to the heatmap for localized months/weekdays
await evaluate(
	`(() => { const el = document.querySelector('[role="dialog"] .overflow-y-auto'); if (el) el.scrollTop = 1750; return true; })()`
);
await sleep(600);
const heat = await report('AR-heat');
await shot('ar-heatmap');

// Arabic settings + dhikr manager
await evaluate(
	`(() => { document.querySelector('[role="dialog"] button[aria-label]')?.click(); return true; })()`
);
await sleep(600);
await evaluate(
	`(() => { const b=document.querySelectorAll('header button')[3]; b?.click(); return !!b; })()`
);
await sleep(900);
await shot('ar-settings');

await evaluate(
	`(() => { document.querySelector('[role="dialog"] button[aria-label]')?.click(); return true; })()`
);
await sleep(600);
await evaluate(
	`(() => { const b=[...document.querySelectorAll('footer button')].pop(); b?.click(); return !!b; })()`
);
await sleep(900);
await shot('ar-zikrs');

console.log('\nAR verification:', JSON.stringify({
	lang: ar.lang,
	dir: ar.dir,
	rtlActive: ar.dir === 'rtl'
}));

// Errors
const errors = cdp.events
	.filter((e) => e.method === 'Runtime.exceptionThrown')
	.map((e) => e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no runtime exceptions');

cdp.close();
edge.kill();
process.exit(0);