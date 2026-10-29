import { settings } from '#lib/state/settings.svelte.js';

let ctx = null;
let master = null;

function ensureContext() {
	if (typeof window === 'undefined') return null;
	if (!ctx) {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		ctx = new AC();
		master = ctx.createGain();
		master.gain.value = 1;
		master.connect(ctx.destination);
	}
	if (ctx.state === 'suspended') ctx.resume();
	return ctx;
}

export function unlockAudio() {
	ensureContext();
}

function noiseBuffer(c, seconds) {
	const len = Math.max(1, Math.floor(c.sampleRate * seconds));
	const buf = c.createBuffer(1, len, c.sampleRate);
	const data = buf.getChannelData(0);
	for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
	return buf;
}

function env(c, node, t0, peak, attack, decay) {
	const g = c.createGain();
	g.gain.setValueAtTime(0.0001, t0);
	g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
	node.connect(g);
	g.connect(master);
	return g;
}

function knock(c, t0, { freq = 180, gain = 0.5, decay = 0.09, tone = 0.35 }) {
	const osc = c.createOscillator();
	osc.type = 'triangle';
	osc.frequency.setValueAtTime(freq, t0);
	osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + decay);
	env(c, osc, t0, gain * tone, 0.002, decay);
	osc.start(t0);
	osc.stop(t0 + decay + 0.05);

	const src = c.createBufferSource();
	src.buffer = noiseBuffer(c, 0.02);
	const bp = c.createBiquadFilter();
	bp.type = 'bandpass';
	bp.frequency.value = freq * 6;
	bp.Q.value = 1.2;
	src.connect(bp);
	env(c, bp, t0, gain * 0.5, 0.001, 0.035);
	src.start(t0);
}

function click(c, t0, { freq = 1100, gain = 0.4, decay = 0.02 }) {
	const osc = c.createOscillator();
	osc.type = 'square';
	osc.frequency.setValueAtTime(freq, t0);
	env(c, osc, t0, gain, 0.001, decay);
	osc.start(t0);
	osc.stop(t0 + decay + 0.02);

	const hp = c.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 600;
	const src = c.createBufferSource();
	src.buffer = noiseBuffer(c, 0.015);
	src.connect(hp);
	env(c, hp, t0, gain * 0.6, 0.001, 0.02);
	src.start(t0);
}

function chime(c, t0, { gain = 0.3 }) {
	[880, 1320, 1760].forEach((f, i) => {
		const osc = c.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = f;
		env(c, osc, t0 + i * 0.06, gain / (i + 1), 0.01, 0.9);
		osc.start(t0 + i * 0.06);
		osc.stop(t0 + i * 0.06 + 1);
	});
}

/**
 * @param {'wood'|'mech'|'soft'|'none'} kind
 * @param {number} volume 0..1
 */
export function playSound(kind = 'wood', volume = 0.5) {
	if (settings.muted || kind === 'none' || volume <= 0) return;
	const c = ensureContext();
	if (!c) return;
	const t = c.currentTime + 0.001;
	const v = Math.min(1, Math.max(0, volume));

	if (kind === 'mech') {
		click(c, t, { freq: 1350, gain: 0.42 * v, decay: 0.014 });
		click(c, t + 0.028, { freq: 900, gain: 0.2 * v, decay: 0.02 });
	} else if (kind === 'soft') {
		const osc = c.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(760, t);
		osc.frequency.exponentialRampToValueAtTime(520, t + 0.12);
		env(c, osc, t, 0.3 * v, 0.005, 0.14);
		osc.start(t);
		osc.stop(t + 0.24);
	} else {
		knock(c, t, { freq: 190, gain: 0.75 * v, decay: 0.085, tone: 0.45 });
		knock(c, t + 0.004, { freq: 320, gain: 0.3 * v, decay: 0.05, tone: 0.2 });
	}
}

export function playComplete(volume = 0.5) {
	if (settings.muted || settings.sound === 'none') return;
	const c = ensureContext();
	if (!c || volume <= 0) return;
	chime(c, c.currentTime + 0.001, { gain: 0.34 * Math.min(1, volume) });
}