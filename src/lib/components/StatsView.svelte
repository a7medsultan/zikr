<script>
	import Heatmap from '#lib/components/Heatmap.svelte';
	import TrendChart from '#lib/components/TrendChart.svelte';
	import { formatNumber, formatPlain } from '#lib/i18n/format.js';
	import { t } from '#lib/state/locale.svelte.js';
	import { recomputeStats, stats } from '#lib/state/stats.svelte.js';
	import { settings, updateSettings } from '#lib/state/settings.svelte.js';
	import { zikrState } from '#lib/state/zikrs.svelte.js';
	import { clearHistory, exportCsv, exportDailyCsv, exportJson, importFile } from '#lib/utils/export.js';

	let { open = $bindable(false) } = $props();

	let range = $state(7);
	let busy = $state(false);
	let message = $state('');
	let error = $state('');
	let confirmClear = $state(false);

	const items = $derived([...zikrState.items].sort((a, b) => a.order - b.order));
	const todayProgress = $derived(
		settings.dailyGoal > 0 ? Math.min(1, stats.today / settings.dailyGoal) : 0
	);

	async function run(action, ok) {
		busy = true;
		error = '';
		message = '';
		try {
			const result = await action();
			message = typeof result === 'string' ? result : ok;
			await recomputeStats();
		} catch (err) {
			error = err?.message ?? t('stats.failed');
		} finally {
			busy = false;
		}
	}

	async function onFile(event) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		await run(() => importFile(file, 'merge').then((r) => t('stats.imported', { count: formatPlain(r.logs) })));
	}
</script>

{#if open}
	<div class="space-y-6">
		<!-- Today -->
		<section class="rounded-2xl border border-[var(--line)] p-4">
			<div class="flex items-baseline justify-between">
				<h3 class="text-xs tracking-[0.2em] text-muted uppercase">{t('stats.today')}</h3>
				<span class="text-xs text-muted">{t('stats.goalLabel', { goal: formatPlain(settings.dailyGoal) })}</span>
			</div>
			<p class="mt-1 text-3xl font-semibold tabular-nums text-accent">
				{formatPlain(stats.today)}
				<span class="ms-1 text-sm font-normal text-muted">/ {formatPlain(settings.dailyGoal)}</span>
			</p>
			<div class="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]">
				<div
					class="h-full rounded-full bg-[var(--accent)]"
					style="width:{Math.round(todayProgress * 100)}%; transition: width 500ms cubic-bezier(0.22,1,0.36,1)"
				></div>
			</div>
			<div class="mt-3 grid grid-cols-3 gap-2 text-center">
				<div>
					<p class="text-lg font-semibold tabular-nums">{formatPlain(stats.streak)}</p>
					<p class="text-[0.65rem] text-muted">{t('stats.dayStreak')}</p>
				</div>
				<div>
					<p class="text-lg font-semibold tabular-nums">{formatPlain(stats.bestStreak)}</p>
					<p class="text-[0.65rem] text-muted">{t('stats.bestStreak')}</p>
				</div>
				<div>
					<p class="text-lg font-semibold tabular-nums">{formatPlain(stats.activeDays)}</p>
					<p class="text-[0.65rem] text-muted">{t('stats.activeDays')}</p>
				</div>
			</div>
			<label class="mt-3 flex items-center gap-2 text-xs text-muted">
				<input
					type="number"
					min="1"
					class="tap w-20 rounded-lg border border-[var(--line)] bg-transparent px-2 py-1 text-center text-sm outline-none focus:border-[var(--accent)]"
					value={settings.dailyGoal}
					onchange={(e) => updateSettings({ dailyGoal: Math.max(1, Number(e.currentTarget.value) || 500) })}
				/>
				{t('stats.dailyGoal')}
			</label>
		</section>

		<!-- Lifetime -->
		<section class="rounded-2xl border border-[var(--line)] p-4">
			<h3 class="text-xs tracking-[0.2em] text-muted uppercase">{t('stats.lifetime')}</h3>
			<p class="mt-1 text-3xl font-semibold tabular-nums text-accent">
				{formatNumber(stats.lifetime)}
			</p>
			<p class="mt-0.5 text-xs text-muted">{t('stats.totalCounted')}</p>

			<div class="mt-3 space-y-2">
				{#each items as zikr (zikr.id)}
					{@const total = stats.byZikr[zikr.id] ?? 0}
					{@const share = stats.lifetime ? total / stats.lifetime : 0}
					<div>
						<div class="flex justify-between gap-3 text-xs">
							<span class="truncate">{zikr.translit}</span>
							<span class="tabular-nums text-muted">{formatNumber(total)}</span>
						</div>
						<div class="mt-1 h-1 overflow-hidden rounded-full bg-[var(--line)]">
							<div
								class="h-full rounded-full bg-[var(--accent)] opacity-70"
								style="width:{Math.round(share * 100)}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Trends -->
		<section class="rounded-2xl border border-[var(--line)] p-4">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-xs tracking-[0.2em] text-muted uppercase">{t('stats.trend')}</h3>
				<div class="flex gap-1">
					{#each [7, 30, 90] as option (option)}
						<button
							class="tap h-7 rounded-lg border px-2 text-xs {range === option
								? 'border-[var(--accent)] text-accent'
								: 'border-[var(--line)] text-muted'}"
							onclick={() => (range = option)}
						>
							{t('stats.rangeDays', { range: formatPlain(option) })}
						</button>
					{/each}
				</div>
			</div>
			<TrendChart {range} />
		</section>

		<!-- Heatmap -->
		<section class="rounded-2xl border border-[var(--line)] p-4">
			<h3 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('stats.activity')}</h3>
			<Heatmap weeks={18} />
		</section>

		<!-- Data -->
		<section class="rounded-2xl border border-[var(--line)] p-4">
			<h3 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('stats.backup')}</h3>
			<div class="grid grid-cols-2 gap-2">
				<button
					class="tap rounded-xl border border-[var(--line)] py-2.5 text-sm"
					onclick={() => exportJson()}
				>
					{t('stats.exportJson')}
				</button>
				<button
					class="tap rounded-xl border border-[var(--line)] py-2.5 text-sm"
					onclick={() => exportCsv()}
				>
					{t('stats.exportHistory')}
				</button>
				<button
					class="tap rounded-xl border border-[var(--line)] py-2.5 text-sm"
					onclick={() => exportDailyCsv()}
				>
					{t('stats.exportDaily')}
				</button>
				<label
					class="tap grid cursor-pointer place-items-center rounded-xl border border-[var(--line)] py-2.5 text-sm"
				>
					{t('stats.importJson')}
					<input type="file" accept="application/json,.json" class="hidden" onchange={onFile} />
				</label>
			</div>

			{#if message}
				<p class="mt-3 text-xs text-accent">{message}</p>
			{/if}
			{#if error}
				<p class="mt-3 text-xs text-red-400">{error}</p>
			{/if}

			<div class="mt-4 border-t border-[var(--line)] pt-3">
				{#if confirmClear}
					<div class="flex gap-2">
						<button
							class="tap flex-1 rounded-xl bg-red-500/90 py-2.5 text-sm font-medium text-white"
							disabled={busy}
							onclick={() => run(() => clearHistory().then(() => t('stats.erased')))}
						>
							{t('stats.clearHistory')}
						</button>
						<button
							class="tap rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm text-muted"
							onclick={() => (confirmClear = false)}
						>
							{t('common.cancel')}
						</button>
					</div>
				{:else}
					<button
						class="tap w-full rounded-xl border border-[var(--line)] py-2.5 text-sm text-muted"
						onclick={() => (confirmClear = true)}
					>
						{t('stats.clearHistory')}
					</button>
				{/if}
			</div>
		</section>
	</div>
{/if}