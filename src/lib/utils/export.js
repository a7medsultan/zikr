import { db } from '#lib/db.js';
import { t } from '#lib/state/locale.svelte.js';
import { settings } from '#lib/state/settings.svelte.js';
import { recomputeStats } from '#lib/state/stats.svelte.js';
import { loadZikrs } from '#lib/state/zikrs.svelte.js';

function download(filename, contents, type) {
	const blob = new Blob([contents], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

function escapeCsv(value) {
	const s = String(value ?? '');
	return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function exportJson() {
	const [zikrs, logs] = await Promise.all([db.zikrs.toArray(), db.logs.toArray()]);
	const payload = {
		app: 'zikr',
		version: 1,
		exportedAt: new Date().toISOString(),
		settings: $state.snapshot(settings),
		zikrs: zikrs.sort((a, b) => a.order - b.order),
		logs
	};
	download(`zikr-backup-${stamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

export async function exportCsv() {
	const rows = await db.logs.toArray();
	rows.sort((a, b) => a.ts - b.ts);
	const header = 'date,time,zikr_id,count';
	const body = rows
		.map((r) => {
			const d = new Date(r.ts);
			const time = `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
			return [r.day, time, escapeCsv(r.zikrId), r.count].join(',');
		})
		.join('\n');
	download(`zikr-history-${stamp()}.csv`, `${header}\n${body}\n`, 'text/csv');
}

export async function exportDailyCsv() {
	const byDay = new Map();
	const rows = await db.logs.toArray();
	for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.count);
	const lines = [...byDay.entries()]
		.sort((a, b) => (a[0] < b[0] ? -1 : 1))
		.map(([day, count]) => `${day},${count}`);
	download(`zikr-daily-${stamp()}.csv`, `day,total\n${lines.join('\n')}\n`, 'text/csv');
}

function readFile(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

/**
 * @param {File} file
 * @param {'merge'|'replace'} mode
 */
export async function importFile(file, mode = 'merge') {
	const text = await readFile(file);
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error(t('export.invalidJson'));
	}
	if (!data || typeof data !== 'object' || (!Array.isArray(data.logs) && !Array.isArray(data.zikrs))) {
		throw new Error(t('export.notBackup'));
	}

	if (mode === 'replace') {
		await Promise.all([db.zikrs.clear(), db.logs.clear()]);
	}

	if (Array.isArray(data.zikrs) && data.zikrs.length) {
		const clean = data.zikrs
			.filter((z) => z && typeof z.id === 'string')
			.map((z, i) => ({
				id: z.id,
				arabic: String(z.arabic ?? 'Dhikr'),
				translit: String(z.translit ?? 'Custom'),
				meaning: String(z.meaning ?? z.translation ?? ''),
				meanings: z.meanings && typeof z.meanings === 'object' ? z.meanings : undefined,
				target: Number(z.target) > 0 ? Number(z.target) : 33,
				order: i,
				builtin: Boolean(z.builtin)
			}));
		await db.zikrs.bulkPut(clean);
	}

	if (Array.isArray(data.logs) && data.logs.length) {
		const clean = data.logs
			.filter((l) => l && typeof l.zikrId === 'string')
			.map((l) => ({
				zikrId: l.zikrId,
				day: typeof l.day === 'string' ? l.day : new Date(l.ts ?? Date.now()).toISOString().slice(0, 10),
				ts: Number(l.ts) || Date.now(),
				count: Number(l.count) || 0
			}));
		await db.logs.bulkPut(clean);
	}

	if (data.settings && typeof data.settings === 'object') {
		const { updateSettings } = await import('#lib/state/settings.svelte.js');
		updateSettings(data.settings);
	}

	await loadZikrs();
	await recomputeStats();
	return { zikrs: data.zikrs?.length ?? 0, logs: data.logs?.length ?? 0 };
}

export async function clearHistory() {
	await db.logs.clear();
	await recomputeStats();
}