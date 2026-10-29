import { db } from '#lib/db.js';
import { settings } from '#lib/state/settings.svelte.js';
import { dayKey, lastNDays, startOfDay, addDays, fromDayKey } from '#lib/utils/date.js';

export const stats = $state({
	ready: false,
	byDay: {},
	byZikr: {},
	lifetime: 0,
	today: 0,
	streak: 0,
	bestStreak: 0,
	activeDays: 0,
	last7: [],
	last30: [],
	last90: []
});

/** Whole days between two `YYYY-MM-DD` keys, immune to DST transitions. */
function daysBetween(a, b) {
	return Math.round((fromDayKey(a) - fromDayKey(b)) / 86400000);
}

function recomputeStreaks(byDay, goal) {
	let cursor = startOfDay();
	if ((byDay[dayKey(cursor)] ?? 0) < goal) cursor = addDays(cursor, -1);
	let streak = 0;
	while ((byDay[dayKey(cursor)] ?? 0) >= goal) {
		streak++;
		cursor = addDays(cursor, -1);
	}

	const keys = Object.keys(byDay)
		.filter((k) => (byDay[k] ?? 0) >= goal)
		.sort();
	let best = 0;
	let run = 0;
	let prev = null;
	for (const k of keys) {
		if (prev && daysBetween(k, prev) === 1) {
			run++;
		} else {
			run = 1;
		}
		best = Math.max(best, run);
		prev = k;
	}
	return { streak, best: Math.max(best, streak) };
}

/** Applies already-written rows onto the in-memory aggregates. */
function applyRows(rows) {
	for (const r of rows) {
		stats.byDay[r.day] = (stats.byDay[r.day] ?? 0) + r.count;
		stats.byZikr[r.zikrId] = (stats.byZikr[r.zikrId] ?? 0) + r.count;
		stats.lifetime += r.count;
	}
	// A persisted tap plus its undo can sum to zero; do not keep empty keys.
	for (const [key, count] of Object.entries(stats.byDay)) if (!count) delete stats.byDay[key];
	for (const [key, count] of Object.entries(stats.byZikr)) if (!count) delete stats.byZikr[key];
	stats.lifetime = Math.max(0, stats.lifetime);
	const today = dayKey();
	if (rows.some((r) => r.day === today)) stats.today = stats.byDay[today] ?? 0;
	const { streak, best } = recomputeStreaks(stats.byDay, settings.dailyGoal);
	stats.streak = streak;
	stats.bestStreak = best;
	stats.activeDays = Object.keys(stats.byDay).length;
}

/** Optimistic, immediate feedback so the UI never waits on IndexedDB. */
export function bumpLocal(zikrId, n = 1, day = dayKey()) {
	if (n < 0) {
		// An undo must never drive a total below zero, even if the history was
		// cleared out from under the in-progress session.
		n = Math.max(n, -(stats.byDay[day] ?? 0), -(stats.byZikr[zikrId] ?? 0), -stats.lifetime);
	}
	if (!n) {
		if (day === dayKey()) stats.today = stats.byDay[day] ?? 0;
		return;
	}

	stats.byDay[day] = (stats.byDay[day] ?? 0) + n;
	stats.byZikr[zikrId] = (stats.byZikr[zikrId] ?? 0) + n;
	stats.lifetime = Math.max(0, stats.lifetime + n);
	if (!stats.byDay[day]) delete stats.byDay[day];
	if (!stats.byZikr[zikrId]) delete stats.byZikr[zikrId];
	if (day === dayKey()) stats.today = stats.byDay[day] ?? 0;
	stats.activeDays = Object.keys(stats.byDay).length;
	const { streak, best } = recomputeStreaks(stats.byDay, settings.dailyGoal);
	stats.streak = streak;
	stats.bestStreak = best;
	refreshSeries();
}

export function refreshSeries() {
	stats.last7 = lastNDays(7).map((key) => ({ key, count: stats.byDay[key] ?? 0 }));
	stats.last30 = lastNDays(30).map((key) => ({ key, count: stats.byDay[key] ?? 0 }));
	stats.last90 = lastNDays(90).map((key) => ({ key, count: stats.byDay[key] ?? 0 }));
}

export async function recomputeStats() {
	const rows = await db.logs.toArray();
	stats.byDay = {};
	stats.byZikr = {};
	stats.lifetime = 0;
	stats.today = 0;
	stats.streak = 0;
	stats.bestStreak = 0;
	stats.activeDays = 0;
	applyRows(rows);
	refreshSeries();
	stats.ready = true;
}