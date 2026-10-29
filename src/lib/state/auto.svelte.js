import { settings, updateSettings } from '#lib/state/settings.svelte.js';
import { tap } from '#lib/state/session.svelte.js';

let handle = null;
let elapsed = 0;

export const auto = $state({
	running: false,
	seconds: settings.autoSeconds ?? 2,
	remaining: 0,
	ticks: 0
});

const TICK = 200;

function loop() {
	elapsed += TICK;
	const span = Math.max(250, auto.seconds * 1000);
	auto.remaining = Math.max(0, Math.ceil((span - elapsed) / 1000));
	if (elapsed >= span) {
		elapsed = 0;
		auto.ticks++;
		tap(1);
	}
}

export function setAutoSeconds(value) {
	auto.seconds = Math.min(5, Math.max(1, Number(value) || 2));
	updateSettings({ autoSeconds: auto.seconds });
}

// Settings can also be changed from SettingsView or a JSON import; keep the
// running timer in step with whichever control was used.
$effect.root(() => {
	$effect(() => {
		const seconds = settings.autoSeconds;
		if (seconds !== auto.seconds) auto.seconds = seconds;
	});
});

export function startAuto() {
	stopAuto();
	auto.running = true;
	auto.ticks = 0;
	elapsed = 0;
	auto.remaining = auto.seconds;
	handle = setInterval(loop, TICK);
}

export function stopAuto() {
	clearInterval(handle);
	handle = null;
	auto.running = false;
	auto.remaining = 0;
	elapsed = 0;
}

export function toggleAuto() {
	if (auto.running) stopAuto();
	else startAuto();
}

export function stopAutoOnBlur() {
	if (auto.running && document.visibilityState === 'hidden') stopAuto();
}