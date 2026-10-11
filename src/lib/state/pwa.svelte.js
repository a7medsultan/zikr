import { browser } from '$app/environment';
import { asset } from '$app/paths';

export const pwa = $state({
	canInstall: false,
	prompt: null,
	installed: false,
	updateReady: false
});

let reg = null;

export function initPwa() {
	if (!browser) return;

	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		pwa.prompt = event;
		pwa.canInstall = true;
	});

	window.addEventListener('appinstalled', () => {
		pwa.canInstall = false;
		pwa.installed = true;
		pwa.prompt = null;
	});

	if (window.matchMedia('(display-mode: standalone)').matches) {
		pwa.installed = true;
	}

	if ('serviceWorker' in navigator) {
		// Register straight away: SvelteKit boots after `load`, so waiting for the
		// event would mean it has already fired and never registers.
		(async () => {
			try {
				reg = await navigator.serviceWorker.register(asset('sw.js'), {
					scope: asset('/')
				});
				reg.addEventListener('updatefound', () => {
					const next = reg.installing;
					next?.addEventListener('statechange', () => {
						if (next.state === 'installed' && navigator.serviceWorker.controller) {
							pwa.updateReady = true;
						}
					});
				});
				setInterval(() => reg?.update?.(), 60 * 60 * 1000);
			} catch (err) {
				console.warn('Service worker registration failed', err);
			}
		})();
	}
}

export async function install() {
	if (!pwa.prompt) return false;
	pwa.prompt.prompt();
	const { outcome } = await pwa.prompt.userChoice;
	if (outcome === 'accepted') {
		pwa.canInstall = false;
		pwa.prompt = null;
		return true;
	}
	return false;
}

export async function applyUpdate() {
	await reg?.update();
	reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
	location.reload();
}