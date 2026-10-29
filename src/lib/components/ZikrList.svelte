<script>
	import ZikrForm from '#lib/components/ZikrForm.svelte';
	import { meaningOf } from '#lib/data/defaults.js';
	import { formatPlain } from '#lib/i18n/format.js';
	import { locale, t } from '#lib/state/locale.svelte.js';
	import { session } from '#lib/state/session.svelte.js';
	import { settings } from '#lib/state/settings.svelte.js';
	import { stats } from '#lib/state/stats.svelte.js';
	import {
		moveZikr,
		removeZikr,
		selectZikr,
		updateZikr,
		zikrState
	} from '#lib/state/zikrs.svelte.js';

	let { open = $bindable(false) } = $props();

	let adding = $state(false);
	let editingId = $state(null);
	let confirmDelete = $state(null);

	const items = $derived([...zikrState.items].sort((a, b) => a.order - b.order));

	function pick(id) {
		selectZikr(id);
		open = false;
	}

	function startEdit(id) {
		editingId = editingId === id ? null : id;
	}

	async function setTarget(id, value) {
		await updateZikr(id, { target: value });
	}
</script>

{#if open}
	<div class="space-y-3">
		{#each items as zikr, i (zikr.id)}
			<div
				class="rounded-2xl border p-3 transition-colors {zikr.id === zikrState.currentId
					? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]'
					: 'border-[var(--line)]'}"
			>
				<div class="flex items-start gap-3">
					<button class="min-w-0 flex-1 text-start" onclick={() => pick(zikr.id)}>
						{#if settings.showArabic && zikr.arabic}
							<span
								class="block overflow-hidden text-ellipsis whitespace-nowrap font-arabic text-2xl leading-[1.9]"
								dir="rtl"
								lang="ar"
							>
								{zikr.arabic}
							</span>
						{/if}
						<span class="block truncate text-sm font-medium">{zikr.translit}</span>
						{#if settings.showTranslation && meaningOf(zikr, locale.code)}
							<span class="block truncate text-xs text-muted">{meaningOf(zikr, locale.code)}</span>
						{/if}
						<span class="mt-1 block text-[0.68rem] tracking-wide text-muted">
							{zikr.target > 0
								? t('zikr.target', { target: formatPlain(zikr.target) })
								: t('zikr.noTarget')}
							·
							{t('zikr.stats', {
								session: formatPlain(session.counts[zikr.id] ?? 0),
								total: formatPlain(stats.byZikr[zikr.id] ?? 0)
							})}
						</span>
					</button>

					<div class="flex flex-col items-end gap-1.5">
						<button
							class="tap h-9 w-9 rounded-lg border border-[var(--line)] text-muted transition-colors hover:text-[var(--text)]"
							onclick={() => moveZikr(zikr.id, -1)}
							disabled={i === 0}
							aria-label={t('zikr.moveUp', { name: zikr.translit })}
						>
							<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
								<path d="M12 18V6m0 0l-5 5m5-5l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
							</svg>
						</button>
						<button
							class="tap h-9 w-9 rounded-lg border border-[var(--line)] text-muted transition-colors hover:text-[var(--text)]"
							onclick={() => moveZikr(zikr.id, 1)}
							disabled={i === items.length - 1}
							aria-label={t('zikr.moveDown', { name: zikr.translit })}
						>
							<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
								<path d="M12 6v12m0 0l-5-5m5 5l5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
							</svg>
						</button>
					</div>
				</div>

				{#if editingId === zikr.id}
					<div class="mt-3 space-y-3 border-t border-[var(--line)] pt-3">
						<div>
							<span class="mb-1.5 block text-xs tracking-wider text-muted uppercase">{t('zikr.form.target')}</span>
							<div class="flex flex-wrap items-center gap-2">
								{#each [10, 33, 99, 100] as preset (preset)}
									<button
										class="tap h-9 rounded-lg border px-3 text-sm {zikr.target === preset
											? 'border-[var(--accent)] text-accent'
											: 'border-[var(--line)] text-muted'}"
										onclick={() => setTarget(zikr.id, preset)}
									>
										{formatPlain(preset)}
									</button>
								{/each}
								<input
									type="number"
									min="0"
									class="tap h-9 w-20 rounded-lg border border-[var(--line)] bg-transparent px-2 text-center text-sm outline-none focus:border-[var(--accent)]"
									value={zikr.target}
									onchange={(e) => setTarget(zikr.id, e.currentTarget.value)}
								/>
								<button
									class="tap h-9 rounded-lg border px-3 text-sm border-[var(--line)] text-muted"
									onclick={() => setTarget(zikr.id, 0)}
									aria-label={t('zikr.form.infiniteHelp')}
								>
									∞
								</button>
							</div>
						</div>

						<div class="flex gap-2">
							<button
								class="tap flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-medium text-[#0a2118]"
								onclick={() => startEdit(zikr.id)}
							>
								{t('common.done')}
							</button>

							{#if !zikr.builtin}
								{#if confirmDelete === zikr.id}
									<button
										class="tap flex-1 rounded-xl border border-red-500/60 py-2.5 text-sm text-red-400"
										onclick={async () => {
											await removeZikr(zikr.id);
											confirmDelete = null;
											editingId = null;
										}}
									>
										{t('zikr.confirmDelete')}
									</button>
								{:else}
									<button
										class="tap rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm text-muted"
										onclick={() => (confirmDelete = zikr.id)}
									>
										{t('common.delete')}
									</button>
								{/if}
							{/if}
						</div>
					</div>
				{:else}
					<div class="mt-2 flex gap-2">
						<button
							class="tap flex-1 rounded-lg border border-[var(--line)] py-1.5 text-xs text-muted transition-colors hover:text-[var(--text)]"
							onclick={() => startEdit(zikr.id)}
						>
							{t('common.edit')}
						</button>
						<button
							class="tap flex-1 rounded-lg border border-[var(--line)] py-1.5 text-xs text-muted transition-colors hover:text-[var(--text)]"
							onclick={() => pick(zikr.id)}
						>
							{t('zikr.edit')}
						</button>
					</div>
				{/if}
			</div>
		{/each}

		{#if adding}
			<div class="rounded-2xl border border-[var(--line)] p-4">
				<ZikrForm ondone={() => (adding = false)} />
			</div>
		{:else}
			<button
				class="tap w-full rounded-2xl border border-dashed border-[var(--line)] py-3 text-sm text-muted transition-colors hover:text-accent"
				onclick={() => (adding = true)}
			>
				{t('zikr.add')}
			</button>
		{/if}
	</div>
{/if}