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
		// Include the day so a bucket that straddles midnight cannot merge two
		// dates into one row.
		const key = `${e.zikrId}|${e.day}|${b}`;
		const existing = groups.get(key);
		if (existing) existing.count += e.count;
		else groups.set(key, { zikrId: e.zikrId, day: e.day, ts: b, count: e.count });
	}
	// A tap and an undo in the same bucket cancel out; do not store empty rows.
	return [...groups.values()].filter((row) => row.count !== 0);
}