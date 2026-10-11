<script>
	import { formatPlain } from '#lib/i18n/format.js';
	import { t } from '#lib/state/locale.svelte.js';
	import { addZikr } from '#lib/state/zikrs.svelte.js';

	let { ondone } = $props();

	const PRESETS = [10, 33, 99, 100];

	let arabic = $state('');
	let translit = $state('');
	let translation = $state('');
	let target = $state(33);
	let infinite = $state(false);

	function setPreset(value) {
		infinite = false;
		target = value;
	}

	function submit(event) {
		event.preventDefault();
		if (!translit.trim() && !arabic.trim()) return;
		addZikr({
			arabic: arabic || translit,
			translit,
			meaning: translation
		});
		arabic = '';
		translit = '';
		translation = '';
		target = 33;
		infinite = false;
		ondone?.();
	}
</script>

<form class="space-y-4" onsubmit={submit}>
	<label class="block">
		<span class="mb-1 block text-xs tracking-wider text-muted uppercase">{t('zikr.form.translit')}</span>
		<input
			class="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-base outline-none focus:border-[var(--accent)]"
			bind:value={translit}
			placeholder={t('zikr.form.translitPlaceholder')}
			autocomplete="off"
		/>
	</label>

	<label class="block">
		<span class="mb-1 block text-xs tracking-wider text-muted uppercase">{t('zikr.form.arabic')}</span>
		<input
			class="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-xl outline-none focus:border-[var(--accent)]"
			bind:value={arabic}
			dir="rtl"
			lang="ar"
			placeholder={t('zikr.form.arabicPlaceholder')}
			autocomplete="off"
		/>
	</label>

	<label class="block">
		<span class="mb-1 block text-xs tracking-wider text-muted uppercase">{t('zikr.form.meaning')}</span>
		<input
			class="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-base outline-none focus:border-[var(--accent)]"
			bind:value={translation}
			placeholder={t('zikr.form.meaningPlaceholder')}
			autocomplete="off"
		/>
	</label>

	<div>
		<span class="mb-1.5 block text-xs tracking-wider text-muted uppercase">{t('zikr.form.target')}</span>
		<div class="flex flex-wrap items-center gap-2">
			{#each PRESETS as preset (preset)}
				<button
					type="button"
					class="tap h-10 min-w-12 rounded-xl border px-3 text-sm transition-colors {target === preset &&
					!infinite
						? 'border-[var(--accent)] text-accent'
						: 'border-[var(--line)] text-muted'}"
					onclick={() => setPreset(preset)}
				>
					{formatPlain(preset)}
				</button>
			{/each}

			<input
				type="number"
				min="1"
				class="tap h-10 w-20 rounded-xl border border-[var(--line)] bg-transparent px-3 text-center text-sm outline-none focus:border-[var(--accent)]"
				bind:value={target}
				disabled={infinite}
			/>

			<button
				type="button"
				class="tap h-10 rounded-xl border px-3 text-sm transition-colors {infinite
					? 'border-[var(--accent)] text-accent'
					: 'border-[var(--line)] text-muted'}"
				onclick={() => (infinite = !infinite)}
				aria-pressed={infinite}
				aria-label={t('zikr.form.infiniteHelp')}
			>
				∞
			</button>
		</div>
		<p class="mt-1.5 text-xs text-muted">
			{infinite ? t('zikr.form.infiniteHelp') : t('zikr.form.targetHelp')}
		</p>
	</div>

	<div class="flex gap-2 pt-1">
		<button
			type="submit"
			class="tap flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-[#0a2118] transition-opacity hover:opacity-90"
		>
			{t('zikr.save')}
		</button>
	</div>
</form>