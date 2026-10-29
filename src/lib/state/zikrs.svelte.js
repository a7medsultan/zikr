import { db } from '#lib/db.js';
import { DEFAULT_ZIKRS } from '#lib/data/defaults.js';
import { browser } from '$app/environment';
import { migrateDatabase } from '#lib/utils/migrate.js';

const CURRENT_KEY = 'zikr:current';

export const zikrState = $state({
	items: [],
	currentId: null,
	loaded: false
});

export function currentZikr() {
	return zikrState.items.find((z) => z.id === zikrState.currentId) ?? zikrState.items[0] ?? null;
}

function normalise(list) {
	return list
		.slice()
		.sort((a, b) => a.order - b.order)
		.map((z, i) => ({ ...z, order: i, target: z.target ?? 33 }));
}

export async function loadZikrs() {
	await migrateDatabase();
	const existing = await db.zikrs.toArray();
	if (existing.length === 0) {
		await db.zikrs.bulkPut(normalise(DEFAULT_ZIKRS));
		zikrState.items = normalise(DEFAULT_ZIKRS);
	} else {
		// Re-add any builtin that a previous import may have dropped.
		const missing = DEFAULT_ZIKRS.filter((d) => !existing.some((e) => e.id === d.id));
		if (missing.length) {
			await db.zikrs.bulkPut(
				missing.map((m, i) => ({ ...m, order: zikrState.items.length + i }))
			);
			zikrState.items = normalise([...existing, ...missing]);
		} else {
			zikrState.items = normalise(existing);
		}
	}

	const saved = browser ? localStorage.getItem(CURRENT_KEY) : null;
	zikrState.currentId =
		zikrState.items.find((z) => z.id === saved)?.id ?? zikrState.items[0]?.id ?? null;
	zikrState.loaded = true;
}

function persistCurrent() {
	if (browser && zikrState.currentId) {
		localStorage.setItem(CURRENT_KEY, zikrState.currentId);
	}
}

export function selectZikr(id) {
	zikrState.currentId = id;
	persistCurrent();
}

export async function addZikr(data) {
	const id = data.id?.startsWith('custom-') ? data.id : `custom-${Date.now().toString(36)}`;
	const record = {
		id,
		arabic: data.arabic?.trim() || data.translit?.trim() || 'Dhikr',
		translit: data.translit?.trim() || data.arabic?.trim() || 'Custom dhikr',
		meaning: data.meaning?.trim() ?? '',
		target: Number(data.target) > 0 ? Number(data.target) : 33,
		order: zikrState.items.length,
		builtin: false,
		createdAt: Date.now()
	};
	await db.zikrs.put(record);
	zikrState.items = normalise([...zikrState.items, record]);
	return record;
}

export async function updateZikr(id, patch) {
	const record = zikrState.items.find((z) => z.id === id);
	if (!record) return;
	const next = { ...record, ...patch };
	if (patch.target !== undefined) {
		const t = Number(patch.target);
		next.target = t > 0 ? Math.floor(t) : 0;
	}
	await db.zikrs.put(next);
	zikrState.items = normalise(
		zikrState.items.map((z) => (z.id === id ? next : z))
	);
}

export async function removeZikr(id) {
	const record = zikrState.items.find((z) => z.id === id);
	// Built-ins come back on the next load anyway; keep the UI honest.
	if (record?.builtin) return;
	await db.zikrs.delete(id);
	zikrState.items = normalise(zikrState.items.filter((z) => z.id !== id));
	if (zikrState.currentId === id) {
		zikrState.currentId = zikrState.items[0]?.id ?? null;
		persistCurrent();
	}
}

export async function moveZikr(id, direction) {
	const list = normalise(zikrState.items);
	const i = list.findIndex((z) => z.id === id);
	const j = i + direction;
	if (i < 0 || j < 0 || j >= list.length) return;
	([list[i], list[j]] = [list[j], list[i]]);
	const withOrder = list.map((z, idx) => ({ ...z, order: idx }));
	await db.zikrs.bulkPut(withOrder);
	zikrState.items = withOrder;
}

export async function restoreDefaults() {
	// "Erase everything" must also remove custom dhikr, so start from a clean
	// table rather than layering the defaults over the old list.
	await db.zikrs.clear();
	await db.zikrs.bulkPut(normalise(DEFAULT_ZIKRS));
	zikrState.items = normalise(DEFAULT_ZIKRS);
	if (!zikrState.items.some((z) => z.id === zikrState.currentId)) {
		zikrState.currentId = zikrState.items[0]?.id ?? null;
		persistCurrent();
	}
}