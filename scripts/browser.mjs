import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const CANDIDATES = [
	'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
	'/usr/bin/google-chrome',
	'/usr/bin/google-chrome-stable',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
	'/usr/bin/microsoft-edge',
	'/snap/bin/chromium'
];

/** A Chromium-based browser for the CDP scripts. Override with BROWSER=… */
export function browserPath() {
	if (process.env.BROWSER) return process.env.BROWSER;
	const found = CANDIDATES.find(existsSync);
	if (!found) {
		console.error('No Chromium/Edge found. Set BROWSER=/path/to/browser and try again.');
		process.exit(2);
	}
	return found;
}

/**
 * Where throwaway browser profiles live. Snap-confined Chromium cannot write
 * to the system temp directory, so point ZIKR_PROFILE_DIR at a writable path.
 */
export function profileRoot() {
	const root = process.env.ZIKR_PROFILE_DIR || tmpdir();
	mkdirSync(root, { recursive: true });
	return root;
}
