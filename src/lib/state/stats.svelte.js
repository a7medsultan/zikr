import { db } from '#lib/db.js';
import { settings } from '#lib/state/settings.svelte.js';
import { dayKey, lastNDays, startOfDay, addDays } from '#lib/utils/date.js';

export const stats = $state({
	ready: false,
	byDay: {},
	byZikr: {},
	lifetime: 0,
	today: 0,
	streak: 0,
	bestStreak: 0,
	activeDays: 0,
	totalSessions: 0,
	last7: [],
	last30: [],
	last90: []
});

function emptySeries(n) {
	return lastNDays(n).map((key) => ({ key, count: 0 }));
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
		if (prev && (startOfDay(new Date(prev)) - startOfDay(new Date(k))) / 86400000 === -1) {
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
	const today = dayKey();
	if (rows.some((r) => r.day === today)) stats.today = stats.byDay[today] ?? 0;
	const { streak, best } = recomputeStreaks(stats.byDay, settings.dailyGoal);
	stats.streak = streak;
	stats.bestStreak = best;
	stats.activeDays = Object.keys(stats.byDay).length;
}

/** Optimistic, immediate feedback so the UI never waits on IndexedDB. */
export function bumpLocal(zikrId, n = 1) {
	const day = dayKey();
	stats.byDay[day] = (stats.byDay[day] ?? 0) + n;
	stats.byZikr[zikrId] = (stats.byZikr[zikrId] ?? 0) + n;
	stats.today = stats.byDay[day];
	stats.lifetime += n;
	stats.activeDays = Object.keys(stats.byDay).length;
	const { streak, best } = recomputeStreaks(stats.byDay, settings.dailyGoal);
	stats.streak = streak;
	stats.bestStreak = best;
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
	stats.totalSessions = rows.length;
	applyRows(rows);
	refreshSeries();
	stats.ready = true;
}

export function resetStatsMemory() {
	stats.byDay = {};
	stats.byZikr = {};
	stats.lifetime = 0;
	stats.today = 0;
	stats.streak = 0;
	stats.bestStreak = 0;
	stats.activeDays = 0;
	stats.last7 = emptySeries(7);
	stats.last30 = emptySeries(30);
	stats.last90 = emptySeries(90);
}

export function todayProgress() {
	return settings.dailyGoal > 0 ? Math.min(1, stats.today / settings.dailyGoal) : 0;
}

export function zikrTotal(id) {
	return stats.byZikr[id] ?? 0;
}