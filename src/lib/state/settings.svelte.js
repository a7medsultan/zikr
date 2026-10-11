import { browser } from '$app/environment';

const KEY = 'zikr:settings';

export const THEMES = ['dark', 'light', 'system'];
export const SOUNDS = ['wood', 'mech', 'soft', 'none'];
export const PATTERNS = ['none', 'girih', 'stars', 'waves'];
export const GRADIENTS = ['emerald', 'midnight', 'sand', 'dusk'];

export const GRADIENT_CSS = {
	emerald: 'radial-gradient(120% 90% at 50% 0%, #0d4c39 0%, #062018 45%, #030f0b 100%)',
	midnight: 'radial-gradient(120% 90% at 50% 0%, #16305c 0%, #0a1631 45%, #040814 100%)',
	sand: 'radial-gradient(120% 90% at 50% 0%, #6a5a38 0%, #3a3120 45%, #1a1610 100%)',
	dusk: 'radial-gradient(120% 90% at 50% 0%, #45255c 0%, #241239 45%, #100917 100%)'
};

export const GRADIENT_CSS_LIGHT = {
	emerald: 'radial-gradient(120% 90% at 50% 0%, #eef6f0 0%, #e2eee6 45%, #f7f5ec 100%)',
	midnight: 'radial-gradient(120% 90% at 50% 0%, #eef2fb 0%, #e3e9f7 45%, #f7f6f1 100%)',
	sand: 'radial-gradient(120% 90% at 50% 0%, #f7f1e3 0%, #efe6d3 45%, #fbf8f0 100%)',
	dusk: 'radial-gradient(120% 90% at 50% 0%, #f3eef8 0%, #e8e0f2 45%, #f8f6f2 100%)'
};

const defaults = {
	theme: 'dark',
	sound: 'wood',
	volume: 0.6,
	haptics: true,
	dailyGoal: 500,
	pattern: 'girih',
	gradient: 'emerald',
	beads: 33,
	showArabic: true,
	showTranslation: true,
	autoSeconds: 2,
	zenOnLaunch: false
};

function read() {
	if (!browser) return {};
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
	} catch {
		return {};
	}
}

export const settings = $state({ ...defaults, ...read() });

let saveHandle;
function persist() {
	if (!browser) return;
	clearTimeout(saveHandle);
	saveHandle = setTimeout(() => {
		try {
			localStorage.setItem(KEY, JSON.stringify($state.snapshot(settings)));
		} catch {
			/* storage full or unavailable */
		}
	}, 150);
}

function systemPrefersDark() {
	if (!browser) return true;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(theme = settings.theme) {
	if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
	return theme;
}

export function applyTheme() {
	if (!browser) return;
	const dark = resolveTheme() === 'dark';
	document.documentElement.classList.toggle('dark', dark);
	document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute('content', dark ? '#0f4f38' : '#f6f3ea');
}

export function updateSettings(patch) {
	Object.assign(settings, patch);
	persist();
	applyTheme();
}

export function resetSettings() {
	Object.assign(settings, defaults);
	persist();
	applyTheme();
}

if (browser) {
	applyTheme();
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (settings.theme === 'system') applyTheme();
	});
}