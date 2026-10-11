import { localeMeta } from '#lib/i18n/index.js';
import { locale } from '#lib/state/locale.svelte.js';
import { fromDayKey } from '#lib/utils/date.js';

/**
 * Latin digits are kept in every language: a tasbeeh counter is read at a
 * glance, and Arabic-Indic numerals are slower to scan. Set this to `undefined`
 * to follow each locale's own numbering system instead.
 */
const NUMBERING_SYSTEM = 'latn';

const cache = new Map();

function formatter(key, build) {
	let byTag = cache.get(key);
	if (!byTag) {
		byTag = new Map();
		cache.set(key, byTag);
	}
	const tag = localeMeta(locale.code).tag;
	if (!byTag.has(tag)) byTag.set(tag, build(tag));
	return byTag.get(tag);
}

function buildNumber(tag, options) {
	try {
		return new Intl.NumberFormat(tag, { numberingSystem: NUMBERING_SYSTEM, ...options });
	} catch {
		return new Intl.NumberFormat('en', { numberingSystem: NUMBERING_SYSTEM, ...options });
	}
}

/** Grouped number, e.g. 12,400 — for totals and statistics. */
export function formatNumber(value) {
	if (!Number.isFinite(value)) return '0';
	return formatter('number', (tag) => buildNumber(tag)).format(value);
}

/** Bare digits, no grouping — for the big counter and progress figures. */
export function formatPlain(value) {
	if (!Number.isFinite(value)) return '0';
	return formatter('plain', (tag) => buildNumber(tag, { useGrouping: false })).format(value);
}

/** "12 Oct" — dates shown in charts and heatmap tooltips. */
export function formatShortDate(value) {
	const date = typeof value === 'string' ? fromDayKey(value) : value;
	return formatter('date-short', (tag) => new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' })).format(
		date
	);
}

/** Weekday name for the heatmap rows. `index` is 0 = Sunday. */
export function formatWeekday(index, style = 'short') {
	const date = new Date(2024, 0, 7 + index);
	return formatter(`weekday-${style}`, (tag) => new Intl.DateTimeFormat(tag, { weekday: style })).format(date);
}

/** Short month name. `index` is 0 = January. */
export function formatMonth(index) {
	const date = new Date(2024, index, 1);
	return formatter('month-short', (tag) => new Intl.DateTimeFormat(tag, { month: 'short' })).format(date);
}