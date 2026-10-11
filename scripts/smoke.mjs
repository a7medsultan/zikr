import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL_APP = process.argv[2] ?? 'http://localhost:4178';
const PORT = 9333;

const profile = mkdtempSync(join(tmpdir(), 'zikr-smoke-'));
const edge = spawn(
	EDGE,
	[
		'--headless=new',
		'--disable-gpu',
		'--no-first-run',
		'--no-default-browser-check',
		'--remote-debugging-port=' + PORT,
		'--user-data-dir=' + profile,
		'about:blank'
	],
	{ stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint() {
	for (let i = 0; i < 60; i++) {
		try {
			const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
			if (res.ok) return (await res.json()).webSocketDebuggerUrl;
		} catch {
			/* not up yet */
		}
		await sleep(250);
	}
	throw new Error('DevTools endpoint never came up');
}

function connect(url) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url);
		const pending = new Map();
		const events = [];
		let id = 0;

		ws.addEventListener('message', (event) => {
			const msg = JSON.parse(event.data);
			if (msg.id && pending.has(msg.id)) {
				pending.get(msg.id)(msg);
				pending.delete(msg.id);
			} else if (msg.method) {
				events.push(msg);
			}
		});
		ws.addEventListener('error', reject);
		ws.addEventListener('open', () =>
			resolve({
				events,
				send(method, params = {}) {
					return new Promise((res) => {
						const msgId = ++id;
						pending.set(msgId, res);
						ws.send(JSON.stringify({ id: msgId, method, params }));
					});
				},
				close: () => ws.close()
			})
		);
	});
}

async function newTarget() {
	const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
	return res.json();
}

async function evaluate(cdp, expression) {
	const res = await cdp.send('Runtime.evaluate', {
		expression,
		returnByValue: true,
		awaitPromise: true
	});
	if (res.result?.exceptionDetails) {
		return { error: res.result.exceptionDetails.text };
	}
	return res.result?.result?.value;
}

const problems = [];
let cdp;

try {
	const wsEndpoint = await endpoint();
	const browser = await connect(wsEndpoint);
	const target = await newTarget();
	cdp = await connect(target.webSocketDebuggerUrl);

	await cdp.send('Runtime.enable');
	await cdp.send('Log.enable');
	await cdp.send('Page.enable');
	await cdp.send('DOM.enable');
	await cdp.send('Network.enable');
	await cdp.send('Page.navigate', { url: URL_APP });
	await sleep(4500);

	const boot = await evaluate(
		cdp,
		`(() => {
			const main = document.querySelector('main');
			return {
				mounted: !!main,
				arabic: document.querySelector('[lang="ar"]')?.textContent ?? null,
				translit: main?.querySelector('p.mt-1')?.textContent ?? null,
				count: main?.querySelector('.tabular-nums')?.textContent ?? null,
				circles: document.querySelectorAll('circle').length,
				buttons: [...document.querySelectorAll('button')].length,
				theme: document.documentElement.className
			};
		})()`
	);
	console.log('BOOT  ', JSON.stringify(boot, null, 1));

	// Tap anywhere 7 times
	await evaluate(
		cdp,
		`(() => {
			for (let i = 0; i < 7; i++) {
				document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100 + i * 8, clientY: 400 }));
			}
			return true;
		})()`
	);
	await sleep(500);

	const afterTaps = await evaluate(
		cdp,
		`({
			count: document.querySelector('main .tabular-nums')?.textContent ?? null,
			beadRotation: document.querySelector('svg g[transform^="rotate"]')?.getAttribute('transform') ?? null,
			ripples: document.querySelectorAll('.rounded-full').length
		})`
	);
	console.log('TAPS  ', JSON.stringify(afterTaps));

	// Buttons must not count
	await evaluate(
		cdp,
		`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Undo'); b?.click(); return true; })()`
	);
	await sleep(300);
	const afterUndo = await evaluate(
		cdp,
		`document.querySelector('main .tabular-nums')?.textContent ?? null`
	);
	console.log('UNDO  ', afterUndo);

	// Open statistics
	await evaluate(
		cdp,
		`(() => { document.querySelector('button[aria-label="Statistics"]')?.click(); return true; })()`
	);
	await sleep(700);
	const stats = await evaluate(
		cdp,
		`(() => {
			const dialog = document.querySelector('[role="dialog"]');
			if (!dialog) return { dialog: false };
			return {
				dialog: true,
				heatCells: dialog.querySelectorAll('div[title]').length,
				hasLifetime: dialog.innerText.includes('Lifetime'),
				hasTrend: dialog.innerText.includes('Trend'),
				hasActivity: dialog.innerText.includes('Activity'),
				hasBackup: dialog.innerText.includes('Backup'),
				text: dialog.innerText.slice(0, 160).replace(/\\n/g, ' | ')
			};
		})()`
	);
	console.log('STATS ', JSON.stringify(stats));

	// Switch zikr via chip
	await evaluate(
		cdp,
		`(() => {
			document.querySelector('button[aria-label="Close"]')?.click();
			return true;
		})()`
	);
	await sleep(400);
	await evaluate(
		cdp,
		`(() => {
			const chip = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Astaghfirullāh');
			chip?.click();
			return true;
		})()`
	);
	await sleep(400);
	const afterSwitch = await evaluate(
		cdp,
		`({
			arabic: document.querySelector('main [lang="ar"]')?.textContent ?? null,
			count: document.querySelector('main .tabular-nums')?.textContent ?? null
		})`
	);
	console.log('SWITCH', JSON.stringify(afterSwitch));

	// Auto count
	await evaluate(
		cdp,
		`(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('Auto count'))?.click(); return true; })()`
	);
	await sleep(3400);
	const afterAuto = await evaluate(
		cdp,
		`document.querySelector('main .tabular-nums')?.textContent ?? null`
	);
	console.log('AUTO  ', afterAuto);
	await evaluate(
		cdp,
		`(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('Pause'))?.click(); return true; })()`
	);

	// Zen mode
	await evaluate(
		cdp,
		`(() => { document.querySelector('button[aria-label="Enter focus mode"]')?.click(); return true; })()`
	);
	await sleep(500);
	const zen = await evaluate(
		cdp,
		`({
			headerGone: !document.querySelector('header'),
			footerGone: !document.querySelector('footer'),
			exitButton: !!document.querySelector('button[aria-label="Exit focus mode"]')
		})`
	);
	console.log('ZEN   ', JSON.stringify(zen));

	// Service worker + persistence
	await sleep(1200);
	const sw = await evaluate(
		cdp,
		`(async () => {
			const regs = await navigator.serviceWorker.getRegistrations();
			return { registrations: regs.length, scope: regs[0]?.scope ?? null, controlled: !!navigator.serviceWorker.controller };
		})()`
	);
	console.log('SW    ', JSON.stringify(sw));

	// --- Celebration on reaching the target (SubhanAllah target = 33) ---
	await evaluate(
		cdp,
		`(() => { document.querySelector('button[aria-label="Exit focus mode"]')?.click(); return true; })()`
	);
	await sleep(500);
	await evaluate(
		cdp,
		`(() => {
			const chip = [...document.querySelectorAll('button')]
				.find(b => b.textContent.trim() === 'Sub\u1e25\u0101nAll\u0101h');
			if (!chip) return false;
			chip.click();
			return true;
		})()`
	);
	await sleep(400);
	const picked = await evaluate(
		cdp,
		`document.querySelector('main p.mt-1')?.textContent ?? null`
	);
	console.log('PICKED', picked);

	// Reset the session, then tap exactly 33 times
	await evaluate(
		cdp,
		`(() => { document.querySelector('button[aria-label="Reset counter"]')?.click(); return true; })()`
	);
	await sleep(400);
	await evaluate(
		cdp,
		`(() => {
			for (let i = 0; i < 33; i++) {
				document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 120, clientY: 500 }));
			}
			return true;
		})()`
	);
	await sleep(300);
	const celebration = await evaluate(
		cdp,
		`({
			overlay: !!document.querySelector('div.z-40'),
			sparks: document.querySelectorAll('div.z-40 span').length,
			count: document.querySelector('main .tabular-nums')?.textContent ?? null,
			label: document.querySelector('main .uppercase')?.textContent ?? null
		})`
	);
	console.log('CELEBR', JSON.stringify(celebration));

	await sleep(3600);
	const dismissed = await evaluate(cdp, `!document.querySelector('div.z-40')`);
	console.log('DISMISS', dismissed);

	// --- Persistence across reload ---
	await sleep(1500);
	await cdp.send('Page.reload', {});
	await sleep(4500);
	const afterReload = await evaluate(
		cdp,
		`({
			count: document.querySelector('main .tabular-nums')?.textContent ?? null,
			translit: document.querySelector('main p.mt-1')?.textContent ?? null
		})`
	);
	console.log('RELOAD', JSON.stringify(afterReload));

	// --- Offline: kill the network and reload ---
	await cdp.send('Network.emulateNetworkConditions', {
		offline: true,
		latency: 0,
		downloadThroughput: 0,
		uploadThroughput: 0
	});
	await cdp.send('Page.reload', {});
	await sleep(4500);
	const offline = await evaluate(
		cdp,
		`({
			mounted: !!document.querySelector('main'),
			circles: document.querySelectorAll('circle').length,
			count: document.querySelector('main .tabular-nums')?.textContent ?? null,
			online: navigator.onLine
		})`
	);
	console.log('OFFLINE', JSON.stringify(offline));
	await cdp.send('Network.emulateNetworkConditions', {
		offline: false,
		latency: 0,
		downloadThroughput: -1,
		uploadThroughput: -1
	});

	// --- Import a backup ---
	const backup = {
		app: 'zikr',
		version: 1,
		settings: { dailyGoal: 250 },
		zikrs: [
			{
				id: 'import-test',
				arabic: 'اِسْتِغْفِرْ',
				translit: 'ImportTest',
				translation: 'imported entry',
				target: 7,
				order: 99
			}
		],
		logs: [{ zikrId: 'import-test', day: '2026-10-09', ts: 1757376000000, count: 12 }]
	};
	writeFileSync('tmp-backup.json', JSON.stringify(backup));

	await evaluate(
		cdp,
		`(() => { document.querySelector('button[aria-label="Statistics"]')?.click(); return true; })()`
	);
	await sleep(700);
	const inputRef = await cdp.send('Runtime.evaluate', {
		expression: `document.querySelector('input[type="file"]')`
	});
	const setFiles = await cdp.send('DOM.setFileInputFiles', {
		files: [resolve('tmp-backup.json')],
		objectId: inputRef.result?.result?.objectId
	});
	if (setFiles.error) problems.push('IMPORT: ' + setFiles.error.message);
	await sleep(1200);

	const imported = await evaluate(
		cdp,
		`({
			chipPresent: [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'ImportTest'),
			text: document.querySelector('[role="dialog"]')?.innerText.includes('ImportTest') ?? false,
			lifetimeLine: (document.querySelector('[role="dialog"]')?.innerText.match(/total dhikr counted/) ? 'seen' : 'missing')
		})`
	);
	console.log('IMPORT', JSON.stringify(imported));

	const goalApplied = await evaluate(
		cdp,
		`(() => {
			const input = [...document.querySelectorAll('input[type="number"]')].find(i => i.value === '250');
			return input ? 'daily goal updated to 250' : 'goal not applied';
		})()`
	);
	console.log('GOAL  ', goalApplied);

	const errors = cdp.events
		.filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
		.map((e) => e.params.entry.text);
	const exceptions = cdp.events
		.filter((e) => e.method === 'Runtime.exceptionThrown')
		.map((e) => e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description ?? ''));

	if (errors.length) problems.push(...errors.map((t) => 'LOG: ' + t));
	if (exceptions.length) problems.push(...exceptions.map((t) => 'EXCEPTION: ' + t));

	browser.close();
} catch (err) {
	problems.push('HARNESS: ' + err.message);
} finally {
	cdp?.close();
	edge.kill();
	try {
		rmSync(profile, { recursive: true, force: true });
	} catch {
		/* best effort */
	}
}

console.log('\n' + (problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'No console errors.'));
rmSync('tmp-backup.json', { force: true });