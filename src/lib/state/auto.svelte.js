import { settings } from '#lib/state/settings.svelte.js';
import { tap } from '#lib/state/session.svelte.js';

let handle = null;
let elapsed = 0;
let since = 0;

export const auto = $state({
	running: false,
	seconds: settings.autoSeconds ?? 2,
	remaining: 0,
	ticks: 0
});

const TICK = 200;

function loop() {
	since += TICK;
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
}

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