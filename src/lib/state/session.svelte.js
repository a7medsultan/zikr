import { browser } from '$app/environment';
import { compactRows, db } from '#lib/db.js';
import { formatPlain } from '#lib/i18n/format.js';
import { t } from '#lib/state/locale.svelte.js';
import { bumpLocal, refreshSeries } from '#lib/state/stats.svelte.js';
import { settings } from '#lib/state/settings.svelte.js';
import { currentZikr } from '#lib/state/zikrs.svelte.js';
import { dayKey } from '#lib/utils/date.js';
import { hapticMilestone, hapticTap } from '#lib/utils/haptics.js';
import { playComplete, playSound, unlockAudio } from '#lib/utils/sound.js';

const SESSION_KEY = 'zikr:session';

function readSession() {
	if (!browser) return { counts: {}, rounds: {} };
	try {
		return { counts: {}, rounds: {}, ...(JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}') ?? {}) };
	} catch {
		return { counts: {}, rounds: {} };
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

export function currentRounds() {
	const zikr = currentZikr();
	if (!zikr || !zikr.target) return 0;
	return (session.rounds[zikr.id] ?? 0) * zikr.target;
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
	try {
		await db.logs.bulkAdd(rows);
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
				JSON.stringify({ counts: session.counts, rounds: session.rounds })
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
		bumpLocal(zikr.id, n);
		queueRow({ zikrId: zikr.id, day: dayKey(), ts: Date.now(), count: n });
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
	return tap(-1, { silent: true });
}

export function resetCurrent() {
	const zikr = currentZikr();
	if (!zikr) return;
	session.counts[zikr.id] = 0;
	session.rounds[zikr.id] = 0;
	session.celebratingAt = 0;
	persistSession();
}

export function resetAll() {
	session.counts = {};
	session.rounds = {};
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