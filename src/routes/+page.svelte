<script>
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import AutoBar from '#lib/components/AutoBar.svelte';
	import Background from '#lib/components/Background.svelte';
	import Beads from '#lib/components/Beads.svelte';
	import Celebration from '#lib/components/Celebration.svelte';
	import CountRing from '#lib/components/CountRing.svelte';
	import Ripples from '#lib/components/Ripples.svelte';
	import SettingsView from '#lib/components/SettingsView.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import StatsView from '#lib/components/StatsView.svelte';
	import ZikrList from '#lib/components/ZikrList.svelte';

	import { meaningOf } from '#lib/data/defaults.js';
	import { formatPlain } from '#lib/i18n/format.js';
	import { locale, t } from '#lib/state/locale.svelte.js';
	import { stopAutoOnBlur } from '#lib/state/auto.svelte.js';
	import { settings, updateSettings } from '#lib/state/settings.svelte.js';
	import {
		currentCount,
		dismissCelebration,
		session,
		tap,
		undo
	} from '#lib/state/session.svelte.js';
	import { recomputeStats, stats } from '#lib/state/stats.svelte.js';
	import { currentZikr, loadZikrs, selectZikr, zikrState } from '#lib/state/zikrs.svelte.js';

	let zen = $state(false);
	let mounted = $state(false);
	let ripples = $state([]);
	let ring = $state(300);

	let statsOpen = $state(false);
	let settingsOpen = $state(false);
	let zikrsOpen = $state(false);

	let rippleId = 0;
	let tapCount = 0;
	let circleEl = $state(null);

	const logoUrl = asset('logo.png');

	// The progress ring sits at 100/120 of the half-width; a little slack makes
	// it a comfortable target without spilling outside the circle.
	const tapRadius = $derived((ring * (100 / 120)) / 2 + 12);

	onMount(() => {
		const measure = () => {
			ring = Math.max(200, Math.min(window.innerWidth * 0.8, window.innerHeight * 0.42, 330));
		};
		measure();
		window.addEventListener('resize', measure);

		(async () => {
			await loadZikrs();
			await recomputeStats();
			mounted = true;
			zen = settings.zenOnLaunch;
		})();

		const onVisibility = async () => {
			if (document.visibilityState === 'visible') {
				await recomputeStats();
			} else {
				stopAutoOnBlur();
			}
		};
		document.addEventListener('visibilitychange', onVisibility);

		(async () => {
			await loadZikrs();
			await recomputeStats();
			mounted = true;
			zen = settings.zenOnLaunch;
		})();

		return () => {
			window.removeEventListener('resize', measure);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});

	$effect(() => {
		if (!session.celebratingAt) return;
		const timer = setTimeout(dismissCelebration, 3400);
		return () => clearTimeout(timer);
	});

	/** Taps only count inside the counter circle, so the rest of the UI stays usable. */
	function isInsideCircle(event) {
		// Keyboard activation carries no pointer position; treat it as a hit.
		if (event.detail === 0) return true;
		const rect = circleEl?.getBoundingClientRect();
		if (!rect) return false;
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		return Math.hypot(event.clientX - cx, event.clientY - cy) <= tapRadius;
	}

	function registerTap(event) {
		if (!mounted || !active) return;
		if (!isInsideCircle(event)) return;

		tapCount++;
		if (ripples.length < 26) {
			ripples = [
				...ripples,
				{ id: rippleId++, x: event.clientX ?? 0, y: event.clientY ?? 0, tone: tapCount }
			];
			const id = rippleId - 1;
			setTimeout(() => (ripples = ripples.filter((r) => r.id !== id)), 900);
		}
		tap(1);
	}

	function onCirclePointerDown(event) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		registerTap(event);
	}

	function onCircleClick(event) {
		// detail === 0 means the keyboard or an assistive technology activated it.
		if (event.detail === 0) registerTap(event);
	}

	function onKeydown(event) {
		if (event.key === 'Escape' && zen) zen = false;
	}

	function choose(id) {
		selectZikr(id);
	}

	const items = $derived([...zikrState.items].sort((a, b) => a.order - b.order));
	const active = $derived(currentZikr());
	const count = $derived(active ? currentCount() : 0);
	const dailyPercent = $derived(
		settings.dailyGoal > 0 ? Math.min(100, Math.round((stats.today / settings.dailyGoal) * 100)) : 0
	);
</script>

<svelte:window onkeydown={onKeydown} />

<Background />

<div class="pointer-events-none fixed inset-0 z-20 overflow-hidden">
	<Ripples {ripples} />
</div>

<div class="relative flex min-h-dvh flex-col">
	{#if !zen}
		<header class="safe-t flex items-center justify-between gap-2 px-4">
			<div class="flex items-baseline gap-2">
				<img
					src={logoUrl}
					alt=""
					width="36"
					height="36"
					class="h-9 w-9 rounded-xl ring-1 ring-[var(--line)]"
				/>
				<span class="text-xs tracking-[0.3em] text-muted uppercase">{t('app.title')}</span>
			</div>

			<div class="flex items-center gap-1">
				<button
					class="tap h-10 w-10 rounded-full border border-[var(--line)] transition-colors {settings.muted
						? 'text-accent'
						: 'text-muted active:text-[var(--text)]'}"
					onclick={() => updateSettings({ muted: !settings.muted })}
					aria-pressed={settings.muted}
					aria-label={settings.muted ? t('nav.unmute') : t('nav.mute')}
					title={settings.muted ? t('nav.unmute') : t('nav.mute')}
				>
					{#if settings.muted}
						<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
							<path
								d="M11 5 6.5 9H3v6h3.5L11 19V5Z"
								fill="currentColor"
								stroke="currentColor"
								stroke-width="1.4"
								stroke-linejoin="round"
							/>
							<path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
							<path
								d="M11 5 6.5 9H3v6h3.5L11 19V5Z"
								fill="currentColor"
								stroke="currentColor"
								stroke-width="1.4"
								stroke-linejoin="round"
							/>
							<path
								d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							/>
						</svg>
					{/if}
				</button>
				<button
					class="tap h-10 w-10 rounded-full border border-[var(--line)] text-muted transition-colors active:text-[var(--text)]"
					onclick={() => (statsOpen = true)}
					aria-label={t('nav.stats')}
				>
					<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
						<path d="M5 19V11M12 19V5M19 19v-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
				</button>
				<button
					class="tap h-10 w-10 rounded-full border border-[var(--line)] text-muted transition-colors active:text-[var(--text)]"
					onclick={() => (zen = true)}
					aria-label={t('nav.enterFocus')}
					title={t('nav.enterFocus')}
				>
					<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
						<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" fill="none" />
						<circle cx="12" cy="12" r="3" fill="currentColor" />
					</svg>
				</button>
				<button
					class="tap h-10 w-10 rounded-full border border-[var(--line)] text-muted transition-colors active:text-[var(--text)]"
					onclick={() => (settingsOpen = true)}
					aria-label={t('nav.settings')}
				>
					<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
						<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6" fill="none" />
						<path
							d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>
		</header>
	{/if}

	{#if zen}
		<button
			class="safe-t tap absolute top-0 end-3 z-30 h-10 w-10 rounded-full border border-[var(--line)] text-muted opacity-40 transition-opacity hover:opacity-90"
			onclick={() => (zen = false)}
			aria-label={t('nav.exitFocus')}
		>
			<svg viewBox="0 0 24 24" class="mx-auto h-4 w-4" aria-hidden="true">
				<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
			</svg>
		</button>
	{/if}

	<main class="flex flex-1 flex-col items-center justify-center px-4 py-6">
		{#if active}
			<div class="animate-fade-up mb-6 text-center">
				{#if settings.showArabic && active.arabic}
					<p class="font-arabic text-4xl leading-tight" dir="rtl" lang="ar">
						{active.arabic}
					</p>
				{/if}
				<p class="mt-1 text-sm tracking-wide">{active.translit}</p>
				{#if settings.showTranslation && meaningOf(active, locale.code)}
					<p class="text-xs text-muted">{meaningOf(active, locale.code)}</p>
				{/if}
			</div>

			<div bind:this={circleEl} class="relative" style="width:{ring}px;height:{ring}px">
				<button
					type="button"
					class="tap absolute inset-0 rounded-full"
					aria-label={t('counter.tapLabel')}
					onpointerdown={onCirclePointerDown}
					onclick={onCircleClick}
				></button>

				<div class="pointer-events-none absolute inset-0 grid place-items-center">
					<Beads count={count} beads={settings.beads} size={ring} radius={ring * 0.27} />
				</div>
				<div class="pointer-events-none absolute inset-0 grid place-items-center">
					<CountRing count={count} target={active.target ?? 0} size={ring} />
				</div>
			</div>

			<p class="mt-5 text-center text-[0.7rem] text-muted">{zen ? t('counter.hint') : t('counter.tap')}</p>
		{:else if mounted}
			<p class="text-sm text-muted">{t('counter.loading')}</p>
		{/if}
	</main>

	{#if !zen && active}
		<footer class="safe-b px-4">
			<div class="mx-auto mb-3 flex max-w-md items-center gap-2 overflow-x-auto pb-1">
				{#each items as zikr (zikr.id)}
					<button
						class="tap shrink-0 rounded-full border px-3.5 py-2 text-xs whitespace-nowrap transition-colors {zikr.id ===
						active.id
							? 'border-[var(--accent)] text-accent'
							: 'border-[var(--line)] text-muted'}"
						onclick={() => choose(zikr.id)}
					>
						{zikr.translit}
					</button>
				{/each}
				<button
					class="tap shrink-0 rounded-full border border-[var(--line)] px-3.5 py-2 text-xs whitespace-nowrap text-muted"
					onclick={() => (zikrsOpen = true)}
				>
					{t('nav.manage')}
				</button>
			</div>

			<div class="mx-auto max-w-md space-y-3">
				<AutoBar />

				<div class="flex items-center gap-2">
					<button
						class="tap h-11 flex-1 rounded-xl border border-[var(--line)] text-sm text-muted transition-colors active:text-[var(--text)]"
						onclick={undo}
					>
						{t('common.undo')}
					</button>
					<button
						class="tap h-11 flex-1 rounded-xl border border-[var(--line)] text-sm text-muted transition-colors active:text-[var(--text)]"
						onclick={() => (statsOpen = true)}
					>
						{t('counter.today', { count: formatPlain(stats.today) })}
					</button>
					<button
						class="tap h-11 flex-1 rounded-xl border border-[var(--line)] text-sm text-muted transition-colors active:text-[var(--text)]"
						onclick={() => (zen = true)}
						aria-label={t('nav.enterFocus')}
					>
						{t('nav.focusShort')}
					</button>
				</div>

				<div class="flex items-center justify-between px-1 text-[0.65rem] text-muted">
					<span>{t('counter.streakShort', { count: formatPlain(stats.streak) })}</span>
					<span>{t('counter.goalShort', { count: formatPlain(dailyPercent) })}</span>
					<span>{t('counter.totalShort', { count: formatPlain(stats.lifetime) })}</span>
				</div>
			</div>
		</footer>
	{/if}
</div>

<Celebration
	key={session.celebratingAt}
	title={active ? `${active.translit} · ${formatPlain(count)}` : t('celebration.completed')}
	subtitle={active?.target ? t('celebration.targetReached', { target: formatPlain(active.target) }) : ''}
/>

<Sheet bind:open={statsOpen} title={t('stats.heading')}>
	<StatsView bind:open={statsOpen} />
</Sheet>

<Sheet bind:open={settingsOpen} title={t('settings.heading')}>
	<SettingsView bind:open={settingsOpen} />
</Sheet>

<Sheet bind:open={zikrsOpen} title={t('zikr.heading')}>
	<ZikrList bind:open={zikrsOpen} />
</Sheet>

<p class="sr-only" aria-live="polite">{session.announcement}</p>