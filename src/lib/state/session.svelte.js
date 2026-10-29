import { browser } from '$app/environment';
import { compactRows, db } from '#lib/db.js';
import { formatPlain } from '#lib/i18n/format.js';
import { t } from '#lib/state/locale.svelte.js';
import { bumpLocal, refreshSeries, stats } from '#lib/state/stats.svelte.js';
import { settings } from '#lib/state/settings.svelte.js';
import { currentZikr } from '#lib/state/zikrs.svelte.js';
import { dayKey } from '#lib/utils/date.js';
import { hapticMilestone, hapticTap } from '#lib/utils/haptics.js';
import { migrateSessionStorage } from '#lib/utils/migrate.js';
import { playComplete, playSound, unlockAudio } from '#lib/utils/sound.js';

const SESSION_KEY = 'zikr:session';

if (browser) migrateSessionStorage();

function readSession() {
	const empty = { counts: {}, rounds: {}, lastTap: {} };
	if (!browser) return empty;
	try {
		const saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}') ?? {};
		return {
			counts: saved.counts ?? {},
			rounds: saved.rounds ?? {},
			lastTap: saved.lastTap ?? {}
		};
	} catch {
		return empty;
	}
}

export const session = $state({
	...readSession(),
	pulse: 0,
	celebratingAt: 0,
	lastCompleted: null,
	announcement: ''
});

export function currentCount() {
	const zikr = currentZikr();
	return zikr ? (session.counts[zikr.id] ?? 0) : 0;
}

let pending = [];
let flushTimer;
let saveTimer;

function queueRow(row) {
	pending.push(row);
	scheduleFlush();
}

function scheduleFlush() {
	clearTimeout(flushTimer);
	flushTimer = setTimeout(flush, 1200);
}

export async function flush() {
	clearTimeout(flushTimer);
	if (!pending.length) return;
	const rows = compactRows(pending);
	pending = [];
	if (!rows.length) return;
	try {
		// Merge into the existing five-minute bucket instead of appending a new
		// row on every flush, so the log table stays small.
		await db.transaction('rw', db.logs, async () => {
			for (const row of rows) {
				const existing = await db.logs
					.where('zikrId')
					.equals(row.zikrId)
					.filter((l) => l.ts === row.ts && l.day === row.day)
					.first();
				if (!existing) {
					await db.logs.add(row);
					continue;
				}
				const count = existing.count + row.count;
				if (count) await db.logs.update(existing.id, { count });
				else await db.logs.delete(existing.id);
			}
		});
		refreshSeries();
	} catch (err) {
		console.error('Failed to persist counts', err);
	}
}

function persistSession() {
	if (!browser) return;
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		try {
			localStorage.setItem(
				SESSION_KEY,
				JSON.stringify({
					counts: session.counts,
					rounds: session.rounds,
					lastTap: session.lastTap
				})
			);
		} catch {
			/* ignore */
		}
	}, 400);
}

function announce(message) {
	session.announcement = '';
	queueMicrotask(() => {
		session.announcement = message;
	});
}

/** The single entry point for incrementing — used by taps, buttons and auto mode. */
export function tap(n = 1, options = {}) {
	const zikr = currentZikr();
	if (!zikr) return 0;
	const { silent = false } = options;

	const before = session.counts[zikr.id] ?? 0;
	const after = before + n;
	session.counts[zikr.id] = Math.max(0, after);
	session.pulse++;

	if (n > 0) {
		unlockAudio();
		if (!silent) {
			playSound(settings.sound, settings.volume);
			hapticTap(settings.haptics);
		}
		const day = dayKey();
		const ts = Date.now();
		// Remember where the count landed so Undo can reverse the same bucket.
		session.lastTap[zikr.id] = { day, ts };
		bumpLocal(zikr.id, n);
		queueRow({ zikrId: zikr.id, day, ts, count: n });
	}
	persistSession();

	const target = zikr.target ?? 0;
	if (target > 0 && n > 0 && after % target === 0) {
		session.rounds[zikr.id] = (session.rounds[zikr.id] ?? 0) + 1;
		session.lastCompleted = { zikrId: zikr.id, at: after };
		session.celebratingAt = Date.now();
		playComplete(settings.volume);
		hapticMilestone(settings.haptics);
		announce(
			t('a11y.targetAnnounce', {
				name: zikr.translit,
				count: formatPlain(after),
				target: formatPlain(target)
			})
		);
	} else if (n > 0) {
		announce(
			t('a11y.countAnnounce', { name: zikr.translit, count: formatPlain(after) })
		);
	}

	return after;
}

export function undo() {
	const zikr = currentZikr();
	if (!zikr) return 0;

	const before = session.counts[zikr.id] ?? 0;
	if (before <= 0) return 0;

	const after = before - 1;
	session.counts[zikr.id] = after;
	session.pulse++;

	// Undoing the tap that completed a round must also take the round back,
	// otherwise reaching the target again would count it twice.
	const target = zikr.target ?? 0;
	if (target > 0 && before % target === 0) {
		session.rounds[zikr.id] = Math.max(0, (session.rounds[zikr.id] ?? 0) - 1);
		session.celebratingAt = 0;
	}

	// Reverse the count on the day it was recorded, not necessarily today.
	const at = session.lastTap[zikr.id] ?? { day: dayKey(), ts: Date.now() };
	if ((stats.byZikr[zikr.id] ?? 0) > 0 && (stats.byDay[at.day] ?? 0) > 0) {
		bumpLocal(zikr.id, -1, at.day);
		queueRow({ zikrId: zikr.id, day: at.day, ts: at.ts, count: -1 });
	}

	if (after === 0) delete session.lastTap[zikr.id];
	persistSession();
	return after;
}

export function resetCurrent() {
	const zikr = currentZikr();
	if (!zikr) return;
	session.counts[zikr.id] = 0;
	session.rounds[zikr.id] = 0;
	delete session.lastTap[zikr.id];
	session.celebratingAt = 0;
	persistSession();
}

export function resetAll() {
	session.counts = {};
	session.rounds = {};
	session.lastTap = {};
	session.celebratingAt = 0;
	persistSession();
}

export function dismissCelebration() {
	session.celebratingAt = 0;
}

if (browser) {
	const save = () => {
		flush();
		persistSession();
	};
	window.addEventListener('pagehide', save);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') save();
	});
}