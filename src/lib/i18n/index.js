import ar from './locales/ar.js';
import en from './locales/en.js';

/**
 * Every language the app knows about. Adding one is: drop a catalog in
 * `./locales`, register it here, and it appears in the language switcher.
 */
export const CATALOGS = { en, ar };

export const FALLBACK = 'en';

export const LOCALES = Object.entries(CATALOGS).map(([code, catalog]) => ({
	code,
	name: catalog.meta.name,
	nativeName: catalog.meta.nativeName,
	dir: catalog.meta.dir,
	tag: catalog.meta.tag
}));

export function localeMeta(code) {
	return CATALOGS[code]?.meta ?? CATALOGS[FALLBACK].meta;
}

export function isSupported(code) {
	return Boolean(CATALOGS[code]);
}

/** Picks the best supported locale for a browser language list. */
export function detectLocale(languages) {
	for (const language of languages ?? []) {
		const base = String(language).toLowerCase().split('-')[0];
		if (isSupported(base)) return base;
	}
	return FALLBACK;
}

function resolvePath(dict, key) {
	let node = dict;
	for (const part of key.split('.')) {
		if (node == null || typeof node !== 'object') return undefined;
		node = node[part];
	}
	return node;
}

function interpolate(text, params) {
	if (typeof text !== 'string') return text;
	return text.replace(/\{(\w+)\}/g, (match, name) =>
		params?.[name] === undefined ? match : String(params[name])
	);
}

const pluralCache = new Map();

function pluralCategory(code, count) {
	let rules = pluralCache.get(code);
	if (!rules) {
		try {
			rules = new Intl.PluralRules(localeMeta(code).tag);
		} catch {
			rules = new Intl.PluralRules(FALLBACK);
		}
		pluralCache.set(code, rules);
	}
	try {
		return rules.select(count);
	} catch {
		return 'other';
	}
}

function selectForm(node, code, params) {
	if (typeof node === 'string') return node;
	if (node == null || typeof node !== 'object') return undefined;

	if (params?.count !== undefined) {
		const category = pluralCategory(code, params.count);
		const exact = node[category];
		if (exact !== undefined) return exact;
	}
	return node.other ?? node.one;
}

/**
 * Resolves `key` for `code`, falling back to English for anything missing so a
 * partially translated language never shows a raw key to the user.
 */
export function translate(code, key, params) {
	const catalog = CATALOGS[code] ?? CATALOGS[FALLBACK];

	const primary = selectForm(resolvePath(catalog, key), code, params);
	if (primary !== undefined) return interpolate(primary, params);

	if (code !== FALLBACK) {
		const fallback = selectForm(resolvePath(CATALOGS[FALLBACK], key), FALLBACK, params);
		if (fallback !== undefined) return interpolate(fallback, params);
	}

	return key;
}

/** Development aid: reports keys missing from a locale. */
export function findMissing(code) {
	const locale = CATALOGS[code];
	if (!locale) return [];

	const flatten = (node, path = '', out = new Set()) => {
		for (const [key, value] of Object.entries(node)) {
			if (key === 'meta') continue;
			const next = path ? `${path}.${key}` : key;
			if (value && typeof value === 'object') flatten(value, next, out);
			else out.add(next);
		}
		return out;
	};

	const expected = flatten(CATALOGS[FALLBACK]);
	const actual = flatten(locale);
	return [...expected].filter((key) => !actual.has(key)).sort();
}