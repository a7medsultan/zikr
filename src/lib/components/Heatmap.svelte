<script>
	import { formatMonth, formatPlain, formatShortDate, formatWeekday } from '#lib/i18n/format.js';
	import { t } from '#lib/state/locale.svelte.js';
	import { resolveTheme, settings } from '#lib/state/settings.svelte.js';
	import { stats } from '#lib/state/stats.svelte.js';
	import { buildHeatmapGrid, dayKey, monthLabels } from '#lib/utils/date.js';

	let { weeks = 18 } = $props();

	const CELL = 12;
	const GAP = 2;
	const COL = CELL + GAP;

	const grid = $derived(buildHeatmapGrid(weeks));
	const labels = $derived(monthLabels(grid));
	const today = $derived(dayKey());

	const goal = $derived(settings.dailyGoal || 500);
	const max = $derived(Math.max(goal, ...Object.values(stats.byDay).map(Number), 1));

	function level(count) {
		if (!count) return 0;
		const ratio = count / max;
		if (ratio >= 0.66) return 4;
		if (ratio >= 0.33) return 3;
		if (ratio >= 0.12) return 2;
		return 1;
	}

	const dark = $derived(resolveTheme() === 'dark');

	const palette = $derived(
		dark
			? [
					'rgb(232 200 122 / 0.07)',
					'rgb(232 200 122 / 0.3)',
					'rgb(232 200 122 / 0.52)',
					'rgb(232 200 122 / 0.76)',
					'#f6e2a8'
				]
			: [
					'rgb(169 127 34 / 0.1)',
					'rgb(169 127 34 / 0.3)',
					'rgb(169 127 34 / 0.52)',
					'rgb(169 127 34 / 0.74)',
					'#a97f22'
				]
	);

	/** Rows are Sunday-first; only Mon/Wed/Fri get a label to stay uncluttered. */
	const WEEKDAY_ROWS = [null, 1, null, 3, null, 5, null];
</script>

<div class="w-full overflow-x-auto pb-1">
	<div class="min-w-max">
		<div class="relative mb-1 ms-[23px] h-3 text-[0.58rem] tracking-wide text-muted">
			{#each labels as label (label.col)}
				<span class="absolute top-0" style="inset-inline-start:{label.col * COL}px">
					{formatMonth(label.month)}
				</span>
			{/each}
		</div>

		<div class="flex" style="gap:{GAP}px">
			<div class="me-1 flex w-5 flex-col text-[0.5rem] leading-none text-muted" style="gap:{GAP}px">
				{#each WEEKDAY_ROWS as day, row (row)}
					<span class="h-[12px]">{day === null ? '' : formatWeekday(day)}</span>
				{/each}
			</div>

			{#each grid as week, w (w)}
				<div class="flex flex-col" style="gap:{GAP}px">
					{#each week as cell (cell.key)}
						{@const count = stats.byDay[cell.key] ?? 0}
						<div
							class="rounded-[3px] transition-transform duration-150 hover:scale-125 {cell.key === today
								? 'ring-1 ring-[var(--accent)]'
								: ''}"
							style="width:{CELL}px;height:{CELL}px;background: {cell.future
								? 'transparent'
								: palette[level(count)]}"
							title={cell.future
								? formatShortDate(cell.key)
								: t('stats.tooltip', { date: formatShortDate(cell.key), count: formatPlain(count) })}
						></div>
					{/each}
				</div>
			{/each}
		</div>

		<div class="mt-2 flex items-center justify-end gap-1.5 text-[0.6rem] text-muted">
			<span>{t('stats.less')}</span>
			{#each palette as color, i (i)}
				<span class="rounded-[3px]" style="width:11px;height:11px;background:{color}"></span>
			{/each}
			<span>{t('stats.more')}</span>
		</div>
	</div>
</div>