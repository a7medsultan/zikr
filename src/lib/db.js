import Dexie from 'dexie';

export const db = new Dexie('zikr');

db.version(1).stores({
	zikrs: 'id, order',
	logs: '++id, zikrId, day, ts'
});

/** Five minute buckets keep the log table small while preserving accuracy. */
const BUCKET = 5 * 60 * 1000;

export function bucketFor(ts = Date.now()) {
	return Math.floor(ts / BUCKET) * BUCKET;
}

/** Merges pending taps into as few rows as possible before writing. */
export function compactRows(entries) {
	const groups = new Map();
	for (const e of entries) {
		const b = bucketFor(e.ts);
		const key = `${e.zikrId}|${b}`;
		const existing = groups.get(key);
		if (existing) existing.count += e.count;
		else groups.set(key, { zikrId: e.zikrId, day: e.day, ts: b, count: e.count });
	}
	return [...groups.values()];
}