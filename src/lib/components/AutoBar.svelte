<script>
	import { auto, setAutoSeconds, stopAuto, toggleAuto } from '#lib/state/auto.svelte.js';
	import { formatPlain } from '#lib/i18n/format.js';
	import { t } from '#lib/state/locale.svelte.js';
	import { settings, updateSettings } from '#lib/state/settings.svelte.js';
	import { resetCurrent } from '#lib/state/session.svelte.js';

	const STEPS = [1, 2, 3, 4, 5];

	function pick(seconds) {
		setAutoSeconds(seconds);
		updateSettings({ autoSeconds: auto.seconds });
	}
</script>

<div class="flex items-center gap-1">
	<button
		class="tap flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-sm transition-colors {auto.running
			? 'border-[var(--accent)] text-accent'
			: 'border-[var(--line)] text-muted hover:text-[var(--text)]'}"
		onclick={toggleAuto}
		aria-pressed={auto.running}
	>
		{#if auto.running}
			<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
				<path d="M8 6h3v12H8zM13 6h3v12h-3z" fill="currentColor" />
			</svg>
			{t('auto.pause', { seconds: formatPlain(auto.remaining) })}
		{:else}
			<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
				<path d="M8 5.5v13l11-6.5z" fill="currentColor" />
			</svg>
			{t('auto.start')}
		{/if}
	</button>

	<div class="flex items-center gap-1">
		{#each STEPS as step (step)}
			<button
				class="tap h-11 w-9 rounded-xl border text-xs transition-colors sm:w-11 sm:text-sm {auto.seconds === step
					? 'border-[var(--accent)] text-accent'
					: 'border-[var(--line)] text-muted'}"
				onclick={() => pick(step)}
				aria-label={t('auto.oneEvery', { seconds: formatPlain(step) })}
			>
				{formatPlain(step)}{t('auto.unit')}
			</button>
		{/each}
	</div>

	<button
		class="tap h-11 w-11 shrink-0 rounded-xl border border-[var(--line)] text-muted transition-colors hover:text-[var(--text)]"
		onclick={() => {
			stopAuto();
			resetCurrent();
		}}
		aria-label={t('counter.resetCounter')}
		title={t('counter.resetCounter')}
	>
		<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
			<path
				d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>
</div>

{#if auto.running}
	<p class="mt-2 text-center text-xs text-muted">
		{t('auto.running', { count: formatPlain(auto.ticks) })}
	</p>
{/if}