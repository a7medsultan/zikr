<script>
	import { Spring } from 'svelte/motion';
	import { formatPlain, formatShortDate } from '#lib/i18n/format.js';
	import { dir, t } from '#lib/state/locale.svelte.js';
	import { stats } from '#lib/state/stats.svelte.js';

	let { range = 7 } = $props();

	const W = 320;
	const H = 120;
	const PAD = 6;

	const rtl = $derived(dir() === 'rtl');
	const data = $derived(range === 7 ? stats.last7 : range === 30 ? stats.last30 : stats.last90);
	const reveal = new Spring(0, { stiffness: 0.09, damping: 0.9, precision: 0.001 });
	$effect(() => {
		data;
		reveal.set(0);
		requestAnimationFrame(() => reveal.set(1));
	});

	const peakCount = $derived(Math.max(1, ...data.map((d) => d.count)));
	// A little headroom keeps the tallest point off the top edge.
	const max = $derived(peakCount * 1.12);
	const step = $derived(data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0);

	function px(i) {
		// Mirror the time axis in RTL so the newest day sits on the left, matching
		// the reversed date labels under the chart.
		const x = PAD + (data.length > 1 ? i * step : (W - PAD * 2) / 2);
		return rtl ? W - x : x;
	}
	function py(v) {
		return H - PAD - (v / max) * (H - PAD * 2);
	}

	const linePath = $derived(
		data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)} ${py(d.count).toFixed(1)}`).join(' ')
	);
	const areaPath = $derived(
		`${linePath} L${px(data.length - 1).toFixed(1)} ${H - PAD} L${px(0).toFixed(1)} ${H - PAD} Z`
	);

	const showEvery = $derived(data.length <= 7 ? 1 : Math.ceil(data.length / 6));
	const total = $derived(data.reduce((sum, d) => sum + d.count, 0));
	const average = $derived(data.length ? Math.round(total / data.length) : 0);
	const peak = $derived(data.reduce((best, d) => (d.count > (best?.count ?? 0) ? d : best), null));
</script>

<div>
	<div class="mb-2 flex items-baseline justify-between">
		<div>
			<span class="text-2xl font-semibold tabular-nums text-accent">{formatPlain(total)}</span>
			<span class="ms-1.5 text-xs text-muted">{t('stats.periodLabel', { range: formatPlain(range) })}</span>
		</div>
		<span class="text-xs text-muted">{t('stats.average', { count: formatPlain(average) })}</span>
	</div>

	<svg viewBox="0 0 {W} {H}" class="w-full" style="max-height:130px" aria-hidden="true">
		<defs>
			<linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.34" />
				<stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
			</linearGradient>
		</defs>

		{#each [0.25, 0.5, 0.75] as g (g)}
			<line
				x1={PAD}
				y1={PAD + g * (H - PAD * 2)}
				x2={W - PAD}
				y2={PAD + g * (H - PAD * 2)}
				stroke="var(--line)"
				stroke-width="1"
			/>
		{/each}

		<g style="transform-origin: 0 {H}px; transform: scaleY({reveal.current.toFixed(3)})">
			<path d={areaPath} fill="url(#trend-fill)" />
			<path
				d={linePath}
				fill="none"
				stroke="var(--accent)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</g>

		{#each data as d, i (d.key)}
			{#if i === data.length - 1 || i % showEvery === 0}
				<circle cx={px(i)} cy={py(d.count)} r="2.6" fill="var(--accent)">
					<title>{formatShortDate(d.key)}: {formatPlain(d.count)}</title>
				</circle>
			{/if}
		{/each}
	</svg>

	<div class="mt-1 flex justify-between text-[0.6rem] text-muted">
		<span>{data.length ? formatShortDate(data[0].key) : ''}</span>
		<span>{data.length ? formatShortDate(data[data.length - 1].key) : ''}</span>
	</div>

	{#if peak && peak.count > 0}
		<p class="mt-2 text-xs text-muted">
			{t('stats.bestDay', { count: formatPlain(peak.count), date: formatShortDate(peak.key) })}
		</p>
	{/if}
</div>