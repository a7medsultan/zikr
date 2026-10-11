<script>
	import { Spring } from 'svelte/motion';
	import { formatPlain } from '#lib/i18n/format.js';
	import { t } from '#lib/state/locale.svelte.js';

	let { count = 0, target = 0, size = 260 } = $props();

	const R = 100;
	const C = 2 * Math.PI * R;

	const scale = new Spring(1, { stiffness: 0.32, damping: 0.5, precision: 0.001 });
	let previous = 0;
	$effect(() => {
		if (count !== previous) {
			previous = count;
			scale.set(1.12);
			requestAnimationFrame(() => scale.set(1));
		}
	});

	const progress = $derived(target > 0 ? Math.min(1, (count % (target || 1)) / target) : 0);
	const inTarget = $derived(target > 0 && count > 0 && count % target === 0);
	const shown = $derived((Math.min(1, progress) * C).toFixed(2));
	const ringOpacity = $derived(target > 0 ? 0.9 : 0);
</script>

<div class="relative grid place-items-center" style="width:{size}px;height:{size}px">
	<svg viewBox="-120 -120 240 240" class="absolute inset-0 -rotate-90" aria-hidden="true">
		<circle cx="0" cy="0" r={R} fill="none" stroke="var(--line)" stroke-width="4" />
		{#if target > 0}
			<circle
				cx="0"
				cy="0"
				r={R}
				fill="none"
				stroke="var(--accent)"
				stroke-width="5"
				stroke-linecap="round"
				stroke-dasharray={C}
				stroke-dashoffset={C - shown}
				opacity={ringOpacity}
				style="transition: stroke-dashoffset 420ms cubic-bezier(0.22,1,0.36,1), opacity 300ms"
			/>
		{/if}
	</svg>

	<div class="flex flex-col items-center justify-center leading-none">
		<div
			class="gpu font-semibold tabular-nums text-accent"
			style="font-size:{size * 0.3}px; transform: scale({scale.current.toFixed(3)})"
		>
			{formatPlain(count)}
		</div>
		{#if target > 0}
			<div class="mt-1 text-[0.72rem] tracking-[0.25em] text-muted uppercase">
				{inTarget ? t('counter.complete') : t('counter.of', { target: formatPlain(target) })}
			</div>
		{/if}
	</div>
</div>