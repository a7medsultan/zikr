import { db } from '#lib/db.js';

/**
 * IDs that shipped in older builds and have since been renamed. Keep this list
 * append-only: it is how existing history follows a dhikr to its new id.
 */
export const LEGACY_ZIKR_IDS = {
	'lailahaillallah-n/': 'hawqala'
};

function mergeKey(map, from, to) {
	if (!map || typeof map !== 'object' || !(from in map)) return map;
	if (!(to in map)) map[to] = map[from];
	else if (typeof map[to] === 'number' && typeof map[from] === 'number') map[to] += map[from];
	delete map[from];
	return map;
}

/**
 * Rewrites the persisted session and last-selected dhikr before they are read.
 * Called at module load so the in-memory session never sees the old id.
 */
export function migrateSessionStorage(storage = globalThis.localStorage) {
	if (!storage) return;
	for (const [from, to] of Object.entries(LEGACY_ZIKR_IDS)) {
		try {
			if (storage.getItem('zikr:current') === from) storage.setItem('zikr:current', to);

			const raw = storage.getItem('zikr:session');
			if (!raw) continue;
			const session = JSON.parse(raw);
			if (!session || typeof session !== 'object') continue;
			mergeKey(session.counts, from, to);
			mergeKey(session.rounds, from, to);
			mergeKey(session.lastTap, from, to);
			storage.setItem('zikr:session', JSON.stringify(session));
		} catch {
			/* ignore corrupt or unavailable storage */
		}
	}
}

/** Moves the dhikr row and all of its logged counts to the new id. */
export async function migrateDatabase() {
	for (const [from, to] of Object.entries(LEGACY_ZIKR_IDS)) {
		const old = await db.zikrs.get(from);
		if (old) {
			const existing = await db.zikrs.get(to);
			if (!existing) await db.zikrs.put({ ...old, id: to });
			await db.zikrs.delete(from);
		}
		// Move orphaned history too, even if the dhikr row was already removed.
		await db.logs.where('zikrId').equals(from).modify({ zikrId: to });
	}
}
