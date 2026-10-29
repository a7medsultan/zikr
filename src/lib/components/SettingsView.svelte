<script>
	import AboutApp from '#lib/components/AboutApp.svelte';
	import LanguagePicker from '#lib/components/LanguagePicker.svelte';
	import { setAutoSeconds } from '#lib/state/auto.svelte.js';
	import { formatPlain } from '#lib/i18n/format.js';
	import { t } from '#lib/state/locale.svelte.js';
	import { install, pwa, applyUpdate } from '#lib/state/pwa.svelte.js';
	import {
		GRADIENTS,
		GRADIENT_CSS,
		PATTERNS,
		SOUNDS,
		THEMES,
		resetSettings,
		settings,
		updateSettings
	} from '#lib/state/settings.svelte.js';
	import { flush, resetAll } from '#lib/state/session.svelte.js';
	import { restoreDefaults } from '#lib/state/zikrs.svelte.js';
	import { clearHistory } from '#lib/utils/export.js';

	let { open = $bindable(false) } = $props();

	let confirmReset = $state(false);

	const BEAD_OPTIONS = [11, 33, 99];

	const soundKey = { wood: 'wood', mech: 'mech', soft: 'soft', none: 'none' };
	const patternKey = { none: 'none', girih: 'girih', stars: 'stars', waves: 'waves' };

	function options(list, current) {
		return list.map((value) => ({ value, active: current === value }));
	}
</script>

{#if open}
	<div class="space-y-6">
		<!-- Language -->
		<section>
			<h3 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('settings.language')}</h3>
			<LanguagePicker />
		</section>

		<!-- Appearance -->
		<section>
			<h3 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('settings.appearance')}</h3>

			<div class="flex gap-2">
				{#each options(THEMES, settings.theme) as option (option.value)}
					<button
						class="tap flex-1 rounded-xl border py-2 text-sm {option.active
							? 'border-[var(--accent)] text-accent'
							: 'border-[var(--line)] text-muted'}"
						onclick={() => updateSettings({ theme: option.value })}
						aria-pressed={option.active}
					>
						{t(`settings.theme.${option.value}`)}
					</button>
				{/each}
			</div>

			<p class="mt-3 mb-1.5 text-xs text-muted">{t('settings.backdrop')}</p>
			<div class="grid grid-cols-4 gap-2">
				{#each GRADIENTS as gradient (gradient)}
					<button
						class="tap h-14 rounded-xl border-2 text-[0.65rem] transition-colors {settings.gradient ===
						gradient
							? 'border-[var(--accent)] text-accent'
							: 'border-[var(--line)] text-muted'}"
						style="background: {GRADIENT_CSS[gradient]}"
						onclick={() => updateSettings({ gradient })}
						aria-pressed={settings.gradient === gradient}
					>
						{t(`settings.gradients.${gradient}`)}
					</button>
				{/each}
			</div>

			<p class="mt-3 mb-1.5 text-xs text-muted">{t('settings.pattern.label')}</p>
			<div class="grid grid-cols-4 gap-2">
				{#each options(PATTERNS, settings.pattern) as option (option.value)}
					<button
						class="tap rounded-xl border py-2 text-sm {option.active
							? 'border-[var(--accent)] text-accent'
							: 'border-[var(--line)] text-muted'}"
						onclick={() => updateSettings({ pattern: option.value })}
						aria-pressed={option.active}
					>
						{t(`settings.pattern.${patternKey[option.value]}`)}
					</button>
				{/each}
			</div>

			<p class="mt-3 mb-1.5 text-xs text-muted">{t('settings.beads')}</p>
			<div class="flex gap-2">
				{#each BEAD_OPTIONS as option (option)}
					<button
						class="tap flex-1 rounded-xl border py-2 text-sm {settings.beads === option
							? 'border-[var(--accent)] text-accent'
							: 'border-[var(--line)] text-muted'}"
						onclick={() => updateSettings({ beads: option })}
						aria-pressed={settings.beads === option}
					>
						{formatPlain(option)}
					</button>
				{/each}
			</div>

			<div class="mt-3 space-y-2">
				<label class="flex items-center justify-between gap-3 text-sm">
					<span>{t('settings.showArabic')}</span>
					<input
						type="checkbox"
						class="h-5 w-5 shrink-0 accent-[var(--accent)]"
						checked={settings.showArabic}
						onchange={(e) => updateSettings({ showArabic: e.currentTarget.checked })}
					/>
				</label>
				<label class="flex items-center justify-between gap-3 text-sm">
					<span>{t('settings.showTranslation')}</span>
					<input
						type="checkbox"
						class="h-5 w-5 shrink-0 accent-[var(--accent)]"
						checked={settings.showTranslation}
						onchange={(e) => updateSettings({ showTranslation: e.currentTarget.checked })}
					/>
				</label>
			</div>
		</section>

		<!-- Sound & feel -->
		<section>
			<h3 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('settings.sound')}</h3>

			<label class="mb-3 flex items-center justify-between gap-3 text-sm">
				<span>{settings.muted ? t('settings.mute') : t('settings.unmute')}</span>
				<input
					type="checkbox"
					class="h-5 w-5 shrink-0 accent-[var(--accent)]"
					checked={settings.muted}
					onchange={(e) => updateSettings({ muted: e.currentTarget.checked })}
				/>
			</label>

			<div class="grid grid-cols-4 gap-2 opacity-60 transition-opacity {settings.muted
					? 'pointer-events-none'
					: ''}">
				{#each options(SOUNDS, settings.sound) as option (option.value)}
					<button
						class="tap rounded-xl border py-2 text-xs {option.active
							? 'border-[var(--accent)] text-accent'
							: 'border-[var(--line)] text-muted'}"
						onclick={() => updateSettings({ sound: option.value })}
						aria-pressed={option.active}
					>
						{t(`settings.sounds.${soundKey[option.value]}`)}
					</button>
				{/each}
			</div>

			<label class="mt-3 block text-sm">
				<span class="flex justify-between text-xs text-muted">
					<span>{t('settings.volume')}</span>
					<span>{formatPlain(Math.round(settings.volume * 100))}%</span>
				</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					class="mt-1.5 w-full accent-[var(--accent)]"
					aria-label={t('settings.volume')}
					value={settings.volume}
					oninput={(e) => updateSettings({ volume: Number(e.currentTarget.value) })}
				/>
			</label>

			<label class="mt-2 flex items-center justify-between gap-3 text-sm">
				<span>{t('settings.haptics')}</span>
				<input
					type="checkbox"
					class="h-5 w-5 shrink-0 accent-[var(--accent)]"
					checked={settings.haptics}
					onchange={(e) => updateSettings({ haptics: e.currentTarget.checked })}
				/>
			</label>
		</section>

		<!-- Goals -->
		<section>
			<h3 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('settings.goals')}</h3>
			<label class="flex items-center justify-between gap-3 text-sm">
				<span>{t('settings.dailyGoal')}</span>
				<input
					type="number"
					min="1"
					class="tap w-24 rounded-xl border border-[var(--line)] bg-transparent px-2 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)]"
					value={settings.dailyGoal}
					onchange={(e) => updateSettings({ dailyGoal: Math.max(1, Number(e.currentTarget.value) || 500) })}
				/>
			</label>

			<div class="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
				<span>{t('settings.autoInterval')}</span>
				<span class="flex items-center gap-1">
					{#each [1, 2, 3, 4, 5] as second (second)}
						<button
							class="tap h-8 w-9 rounded-lg border text-xs {settings.autoSeconds === second
								? 'border-[var(--accent)] text-accent'
								: 'border-[var(--line)] text-muted'}"
							onclick={() => setAutoSeconds(second)}
							aria-pressed={settings.autoSeconds === second}
							aria-label={t('auto.oneEvery', { seconds: formatPlain(second) })}
						>
							{formatPlain(second)}{t('auto.unit')}
						</button>
					{/each}
				</span>
			</div>

			<label class="mt-2 flex items-center justify-between gap-3 text-sm">
				<span>{t('settings.zenOnLaunch')}</span>
				<input
					type="checkbox"
					class="h-5 w-5 shrink-0 accent-[var(--accent)]"
					checked={settings.zenOnLaunch}
					onchange={(e) => updateSettings({ zenOnLaunch: e.currentTarget.checked })}
				/>
			</label>
		</section>

		<!-- App -->
		<section>
			<h3 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('settings.app')}</h3>
			{#if pwa.canInstall}
				<button
					class="tap w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-medium text-[#0a2118]"
					onclick={install}
				>
					{t('settings.install')}
				</button>
			{:else if pwa.installed}
				<p class="text-sm text-muted">{t('settings.installed')}</p>
			{:else}
				<p class="text-sm text-muted">{t('settings.installHint')}</p>
			{/if}

			{#if pwa.updateReady}
				<button
					class="tap mt-2 w-full rounded-xl border border-[var(--accent)] py-2.5 text-sm text-accent"
					onclick={applyUpdate}
				>
					{t('settings.update')}
				</button>
			{/if}

			<div class="mt-4 space-y-2 border-t border-[var(--line)] pt-3">
				{#if confirmReset}
					<p class="text-xs text-muted">{t('settings.resetWarn')}</p>
					<div class="flex gap-2">
						<button
							class="tap flex-1 rounded-xl bg-red-500/90 py-2.5 text-sm font-medium text-white"
							onclick={async () => {
								await flush();
								await clearHistory();
								resetAll();
								resetSettings();
								await restoreDefaults();
								confirmReset = false;
							}}
						>
							{t('settings.erase')}
						</button>
						<button
							class="tap rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm text-muted"
							onclick={() => (confirmReset = false)}
						>
							{t('common.cancel')}
						</button>
					</div>
				{:else}
					<button
						class="tap w-full rounded-xl border border-[var(--line)] py-2.5 text-sm text-muted"
						onclick={() => (confirmReset = true)}
					>
						{t('settings.reset')}
					</button>
				{/if}
			</div>
		</section>

		<!-- About -->
		<section>
			<h3 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('about.heading')}</h3>
			<AboutApp />
		</section>
	</div>
{/if}