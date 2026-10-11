<script>
	import { fade } from 'svelte/transition';

	let { key = 0, title = 'Target complete', subtitle = '' } = $props();

	function makeSparks(seed) {
		let s = seed || 1;
		const rand = () => {
			s = (s * 1664525 + 1013904223) % 4294967296;
			return s / 4294967296;
		};
		return Array.from({ length: 30 }, (_, i) => {
			const angle = (i / 30) * Math.PI * 2 + rand() * 0.4;
			const dist = 18 + rand() * 34;
			return {
				id: `${seed}-${i}`,
				dx: `${(Math.cos(angle) * dist).toFixed(2)}vmin`,
				dy: `${(Math.sin(angle) * dist).toFixed(2)}vmin`,
				size: 3 + Math.round(rand() * 5),
				delay: Math.round(rand() * 260),
				rot: Math.round(rand() * 360)
			};
		});
	}

	const sparks = $derived(makeSparks(key));
</script>

{#if key}
	<div
		class="pointer-events-none fixed inset-0 z-40 overflow-hidden"
		transition:fade={{ duration: 260 }}
		aria-hidden="true"
	>
		<!-- ambient glow from the counter -->
		<div
			class="absolute top-1/2 left-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
			style="background: radial-gradient(circle, color-mix(in srgb, var(--accent) 26%, transparent) 0%, transparent 62%); animation: zikr-pulse-ring 2.4s ease-out forwards"
		></div>

		<!-- expanding rings -->
		{#each [0, 1, 2] as i (i)}
			<div
				class="absolute top-1/2 left-1/2 h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border"
				style="border-color: color-mix(in srgb, var(--accent) 45%, transparent); animation: zikr-pulse-ring 2.6s cubic-bezier(0.22,1,0.36,1) {i * 0.3}s ease-out infinite"
			></div>
		{/each}

		<!-- sparks radiating from the counter -->
		{#each sparks as spark (spark.id)}
			<span
				class="absolute top-1/2 left-1/2 rounded-full"
				style="
					--dx: {spark.dx};
					--dy: {spark.dy};
					margin: -{spark.size / 2}px;
					width: {spark.size}px;
					height: {spark.size}px;
					background: color-mix(in srgb, var(--accent) 85%, #fff);
					box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 70%, transparent);
					animation: zikr-spark 2.1s cubic-bezier(0.16, 0.8, 0.3, 1) {spark.delay}ms forwards;
				"
			></span>
		{/each}

		<!-- gentle motes drifting upward -->
		{#each sparks.slice(0, 8) as spark, i (spark.id)}
			<span
				class="absolute rounded-full opacity-60"
				style="
					inset-inline-start: {30 + i * 5.5}%;
					width: {spark.size}px;
					height: {spark.size}px;
					background: var(--accent);
					animation: zikr-rise 3s ease-in {i * 200}ms infinite;
				"
			></span>
		{/each}

		<!-- banner, clear of the counter -->
		{#if title}
			<div
				class="panel animate-fade-up absolute left-1/2 flex max-w-[85%] -translate-x-1/2 items-center gap-3 rounded-full py-2.5 pe-5 ps-3"
				style="top: max(0.75rem, env(safe-area-inset-top)); animation-delay: 120ms"
			>
				<svg viewBox="0 0 100 100" class="h-7 w-7 shrink-0" aria-hidden="true">
					<path
						d="M62 74a30 30 0 1 1 0-48 24 24 0 1 0 0 48Z"
						fill="var(--accent)"
						style="animation: zikr-crescent 1.6s ease-in-out infinite"
					/>
				</svg>
				<div class="min-w-0 text-left">
					<p class="truncate text-sm font-medium text-accent">{title}</p>
					{#if subtitle}<p class="truncate text-xs text-muted">{subtitle}</p>{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}