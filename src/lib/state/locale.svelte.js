import { browser } from '$app/environment';
import { FALLBACK, LOCALES, detectLocale, isSupported, localeMeta, translate } from '#lib/i18n/index.js';

const KEY = 'zikr:locale';

function initialLocale() {
	if (!browser) return FALLBACK;
	const saved = localStorage.getItem(KEY);
	if (saved && isSupported(saved)) return saved;
	const detected = detectLocale(navigator.languages ?? [navigator.language]);
	return detected;
}

export const locale = $state({
	code: initialLocale(),
	/** Bumped whenever the locale changes so effects that read `t()` re-run. */
	version: 0
});

/** Reading direction of the active language: 'ltr' or 'rtl'. */
export function dir() {
	return localeMeta(locale.code).dir;
}

export const availableLocales = LOCALES;

/** Translate a key for the active language. Reactive: reads `locale.code`. */
export function t(key, params) {
	// Touch `version` so the dependency is explicit and survives future refactors.
	void locale.version;
	return translate(locale.code, key, params);
}

export function setLocale(code) {
	if (!isSupported(code) || code === locale.code) return;
	locale.code = code;
	locale.version++;
	if (browser) {
		localStorage.setItem(KEY, code);
		document.documentElement.lang = code;
		applyDir();
	}
}

function applyDir() {
	if (!browser) return;
	document.documentElement.dir = dir();
}

/** Keeps the document metadata in step with the interface language. */
function applyMeta() {
	if (!browser) return;
	document.title = `${t('app.title')} — ${t('app.tagline')}`;
	const description = document.querySelector('meta[name="description"]');
	if (description) description.setAttribute('content', t('app.description'));
}

export function applyLocale() {
	if (!browser) return;
	document.documentElement.lang = locale.code;
	applyDir();
	applyMeta();
}

// A locale change has to reach places that only read `t()` once, such as <head>.
$effect.root(() => {
	$effect(() => {
		void locale.version;
		applyMeta();
	});
});

if (browser) {
	applyLocale();
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') applyLocale();
	});
}