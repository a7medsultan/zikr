import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/** True only inside the Capacitor Android/iOS shell. */
export const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

let backHandler = null;

/**
 * Registers the single Android back-button handler. Return `true` from the
 * handler when it consumed the press (closed a sheet, left focus mode, …).
 */
export function onBack(handler) {
	backHandler = handler;
	return () => {
		if (backHandler === handler) backHandler = null;
	};
}

export async function applyNativeTheme(dark) {
	if (!isNative) return;
	try {
		await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
		await StatusBar.setBackgroundColor({ color: dark ? '#0f4f38' : '#f6f3ea' });
	} catch (err) {
		// The status bar API is best-effort on newer Android edge-to-edge builds.
		console.warn('Status bar not available', err);
	}
}

export async function initNative(dark) {
	if (!isNative) return () => {};

	await applyNativeTheme(dark);

	try {
		await SplashScreen.hide();
	} catch {
		/* already hidden */
	}

	const listener = await App.addListener('backButton', ({ canGoBack }) => {
		if (backHandler?.()) return;
		if (canGoBack) window.history.back();
		else App.minimizeApp();
	});

	return () => listener.remove();
}
