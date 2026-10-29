import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { browserPath, profileRoot } from './browser.mjs';
const EDGE = browserPath();
const URL_APP = process.argv[2] ?? 'http://localhost:4178';
const PORT = 9333;

const profile = mkdtempSync(join(profileRoot(), 'zikr-smoke-'));
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

	// Tap the counter circle 7 times
	await evaluate(
		cdp,
		`(() => {
			const btn = document.querySelector('main button');
			if (!btn) return { error: 'no counter button' };
			const r = btn.getBoundingClientRect();
			const cx = r.left + r.width / 2;
			const cy = r.top + r.height / 2;
			for (let i = 0; i < 7; i++) {
				btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy }));
			}
			return { ok: true };
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

	// Taps outside the circle must not count.
	await evaluate(
		cdp,
		`(() => {
			const rect = document.querySelector('main button').getBoundingClientRect();
			const targets = [
				document.body,
				document.querySelector('header'),
				document.querySelector('footer')
			];
			for (const el of targets) {
				if (!el) continue;
				el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 8, clientY: rect.bottom + 40 }));
				el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: rect.left - 40, clientY: rect.top - 40 }));
			}
			return true;
		})()`
	);
	await sleep(400);
	const afterOutside = await evaluate(
		cdp,
		`document.querySelector('main .tabular-nums')?.textContent ?? null`
	);
console.log('OUTSIDE', afterOutside, afterOutside === afterTaps.count ? '(unchanged - correct)' : '(LEAKED!)');
if (afterOutside !== afterTaps.count) problems.push('Tapping outside the circle still counted.');

// The circle is a real button, so keyboard/assistive activation must still work.
await evaluate(
		cdp,
		`(() => { document.querySelector('main button').click(); return true; })()`
	);
	await sleep(300);
	const afterKeyboard = await evaluate(
		cdp,
		`document.querySelector('main .tabular-nums')?.textContent ?? null`
	);
	console.log(
		'KEYBOARD',
		afterKeyboard,
		Number(afterKeyboard) === Number(afterOutside) + 1 ? '(counts - correct)' : '(NOT counting!)'
	);
	if (Number(afterKeyboard) !== Number(afterOutside) + 1) {
		problems.push('Keyboard activation of the counter button does not count.');
	}

// --- Mute must actually silence the synthesised sounds ---
	await evaluate(
		cdp,
		`(() => {
			window.__osc = 0;
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return { error: 'no AudioContext' };
			const original = AC.prototype.createOscillator;
			AC.prototype.createOscillator = function (...args) {
				window.__osc++;
				return original.apply(this, args);
			};
			const btn = document.querySelector('main button');
			const r = btn.getBoundingClientRect();
			const cx = r.left + r.width / 2;
			const cy = r.top + r.height / 2;
			for (let i = 0; i < 3; i++) {
				btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy }));
			}
			return { ok: true };
		})()`
	);
	await sleep(600);
	const audible = await evaluate(cdp, `window.__osc`);
	await evaluate(
		cdp,
		`(() => {
			const b = document.querySelector('header button[aria-pressed]');
			b?.click();
			return !!b;
		})()`
	);
	await sleep(400);
	const mutedState = await evaluate(
		cdp,
		`({ pressed: document.querySelector('header button[aria-pressed]')?.getAttribute('aria-pressed'), label: document.querySelector('header button[aria-pressed]')?.getAttribute('aria-label') })`
	);
	await evaluate(
		cdp,
		`(() => {
			const btn = document.querySelector('main button');
			const r = btn.getBoundingClientRect();
			for (let i = 0; i < 3; i++) {
				btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
			}
			return true;
		})()`
	);
	await sleep(600);
	const afterMute = await evaluate(cdp, `window.__osc`);

	console.log(
		'MUTE  ',
		`unmuted=${audible} muted=${afterMute}`,
		audible > 0 && afterMute === audible ? '(silent - correct)' : '(STILL AUDIBLE!)'
	);
	if (!(audible > 0)) problems.push('No sound was produced before muting; mute test is inconclusive.');
	if (afterMute !== audible) problems.push('Muting did not stop sound playback.');
	console.log('       button:', JSON.stringify(mutedState));

	// Unmute again so later checks are not silently muted.
	await evaluate(cdp, `(() => { document.querySelector('header button[aria-pressed]')?.click(); return true; })()`);
	await sleep(300);

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
				hasLifetime: dialog.innerText.toLowerCase().includes('lifetime'),
				hasTrend: dialog.innerText.toLowerCase().includes('trend'),
				hasActivity: dialog.innerText.toLowerCase().includes('activity'),
				hasBackup: dialog.innerText.toLowerCase().includes('backup'),
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
			const btn = document.querySelector('main button');
			const r = btn.getBoundingClientRect();
			const cx = r.left + r.width / 2;
			const cy = r.top + r.height / 2;
			for (let i = 0; i < 33; i++) {
				btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy }));
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