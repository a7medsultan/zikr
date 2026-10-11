<script>
	import { Spring } from 'svelte/motion';

	let { count = 0, beads = 33, size = 280, radius = 78 } = $props();

	const R = $derived(radius);
	const step = $derived(360 / Math.max(3, beads));

	// Unwrapped target angle keeps the spring travelling the short, forward way.
	const rotation = new Spring(0, { stiffness: 0.16, damping: 0.78, precision: 0.002 });
	const pop = new Spring(1, { stiffness: 0.35, damping: 0.55, precision: 0.001 });

	let previous = 0;
	$effect(() => {
		const c = count;
		// Negative so bead `c` travels up to the marker at the top of the ring.
		rotation.set(-c * step);
		if (c !== previous) {
			previous = c;
			pop.set(1.4);
			requestAnimationFrame(() => pop.set(1));
		}
	});

	const angle = $derived((((rotation.current % 360) + 360) % 360).toFixed(2));
	const activeIndex = $derived(((Math.round(count) % beads) + beads) % beads);
	const beadRadius = $derived(6.2 + pop.current * 3.4);
</script>

<svg
	viewBox="-124 -124 248 248"
	width={size}
	height={size}
	class="gpu select-none overflow-visible"
	aria-hidden="true"
	focusable="false"
>
	<defs>
		<radialGradient id="bead-glow" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.55" />
			<stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
		</radialGradient>
		<linearGradient id="bead-body" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.95" />
			<stop offset="100%" stop-color="var(--accent)" stop-opacity="0.45" />
		</linearGradient>
	</defs>

	<!-- strand -->
	<circle
		cx="0"
		cy="0"
		r={R}
		fill="none"
		stroke="var(--line)"
		stroke-width="1.25"
		stroke-dasharray="2 6"
		stroke-linecap="round"
	/>

	<!-- rotating bead strand -->
	<g transform={`rotate(${angle})`}>
		{#each Array.from({ length: beads }, (_, i) => i) as i (i)}
			{@const behind = (activeIndex - i + beads) % beads}
			{@const depth = Math.min(behind, beads - behind) / (beads / 2)}
			<circle
				cx="0"
				cy={-R}
				r={i === activeIndex ? beadRadius : 6.4}
				transform={`rotate(${i * step})`}
				fill={i === activeIndex ? 'url(#bead-body)' : 'var(--muted)'}
				opacity={i === activeIndex ? 1 : 0.35 + (1 - depth) * 0.4}
				style="transition: opacity 260ms ease"
			/>
		{/each}
	</g>

	<!-- active bead halo -->
	<circle cx="0" cy={-R} r={16 + pop.current * 6} fill="url(#bead-glow)" opacity="0.9" />

	<!-- marker bead (imam bead) -->
	<circle
		cx="0"
		cy={-R}
		r="11"
		fill="none"
		stroke="var(--accent)"
		stroke-width="1.6"
		opacity="0.85"
	/>
	<circle cx="0" cy={-R} r="3.1" fill="var(--accent)" />
</svg>

<style>
	svg {
		max-width: 100%;
		height: auto;
	}
</style>