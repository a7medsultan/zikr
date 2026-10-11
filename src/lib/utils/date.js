export function dayKey(d = new Date()) {
	const y = d.getFullYear();
	const m = `${d.getMonth() + 1}`.padStart(2, '0');
	const day = `${d.getDate()}`.padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function fromDayKey(key) {
	const [y, m, d] = key.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export function addDays(date, n) {
	const d = new Date(date.getTime());
	d.setDate(d.getDate() + n);
	return d;
}

export function startOfDay(date = new Date()) {
	const d = new Date(date.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

export function lastNDays(n) {
	const out = [];
	const today = startOfDay();
	for (let i = n - 1; i >= 0; i--) out.push(dayKey(addDays(today, -i)));
	return out;
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayIndex(date) {
	return date.getDay();
}

/** Builds a Sun-aligned grid of `weeks` weeks ending with the current week. */
export function buildHeatmapGrid(weeks = 18) {
	const today = startOfDay();
	const end = addDays(today, 6 - weekdayIndex(today));
	const grid = [];
	let cursor = addDays(end, -(weeks * 7 - 1));
	for (let w = 0; w < weeks; w++) {
		const row = [];
		for (let d = 0; d < 7; d++) {
			row.push({ date: cursor, key: dayKey(cursor), future: cursor > today });
			cursor = addDays(cursor, 1);
		}
		grid.push(row);
	}
	return grid;
}

/**
 * Month index for each column of the grid, for the labels above it.
 * Names come from Intl via the i18n layer, so they follow the active language.
 */
export function monthLabels(grid) {
	const labels = [];
	let last = -1;
	grid.forEach((row, i) => {
		const m = row[0].date.getMonth();
		if (m !== last) {
			labels.push({ col: i, month: m });
			last = m;
		}
	});
	return labels;
}