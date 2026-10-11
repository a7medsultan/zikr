<script>
	import {
		GRADIENT_CSS,
		GRADIENT_CSS_LIGHT,
		resolveTheme,
		settings
	} from '#lib/state/settings.svelte.js';

	let { dim = false } = $props();

	const isDark = $derived(resolveTheme() === 'dark');
	const gradient = $derived(
		(isDark ? GRADIENT_CSS : GRADIENT_CSS_LIGHT)[settings.gradient] ?? GRADIENT_CSS.emerald
	);
	const ink = $derived(isDark ? '#e8c87a' : '#8a6a1e');
</script>

<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
	<div class="absolute inset-0" style="background: {gradient}"></div>

	{#if settings.pattern === 'girih'}
		<svg class="absolute inset-0 h-full w-full opacity-[0.028]" aria-hidden="true">
			<defs>
				<pattern id="girih" width="64" height="64" patternUnits="userSpaceOnUse">
					<g fill="none" stroke={ink} stroke-width="0.75">
						<path d="M32 3 38 19 56 19 45 29 56 40 38 40 32 56 26 40 8 40 19 29 8 19 26 19Z" />
						<rect x="0" y="0" width="64" height="64" />
					</g>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#girih)" />
		</svg>
	{:else if settings.pattern === 'stars'}
		<svg class="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden="true">
			<defs>
				<radialGradient id="dot" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stop-color={ink} />
					<stop offset="100%" stop-color={ink} stop-opacity="0" />
				</radialGradient>
			</defs>
			<g fill="url(#dot)">
				{#each Array.from({ length: 46 }, (_, i) => i) as i (i)}
					{@const x = ((i * 97) % 100) / 100}
					{@const y = ((i * 61) % 100) / 100}
					{@const r = 8 + ((i * 13) % 7)}
					<circle cx={`${x * 100}%`} cy={`${y * 100}%`} r={r} opacity={0.25 + ((i * 7) % 5) / 10} />
				{/each}
			</g>
		</svg>
	{:else if settings.pattern === 'waves'}
		<svg class="absolute inset-0 h-full w-full opacity-[0.09]" aria-hidden="true">
			<defs>
				<pattern id="waves" width="120" height="60" patternUnits="userSpaceOnUse">
					<path d="M0 30 Q 30 6 60 30 T 120 30" fill="none" stroke={ink} stroke-width="1.2" />
					<path d="M0 50 Q 30 26 60 50 T 120 50" fill="none" stroke={ink} stroke-width="1" />
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#waves)" />
		</svg>
	{/if}

	{#if dim}
		<div class="absolute inset-0 bg-black/55"></div>
	{/if}

	<div
		class="absolute inset-0"
		style="background: radial-gradient(120% 80% at 50% 45%, transparent 40%, rgb(0 0 0 / 0.35) 100%)"
	></div>
</div>