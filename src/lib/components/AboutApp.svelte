<script>
	import { APP } from '#lib/app.config.js';
	import { t } from '#lib/state/locale.svelte.js';

	let status = $state('');

	const features = $derived(t('about.features'));

	async function share() {
		const payload = {
			title: t('app.title'),
			text: t('about.description'),
			url: APP.url
		};

		if (navigator.share) {
			try {
				await navigator.share(payload);
				flash(t('about.shared'));
				return;
			} catch (err) {
				// A cancelled share is not an error; anything else falls back.
				if (err?.name === 'AbortError') return;
			}
		}

		try {
			await navigator.clipboard.writeText(APP.url);
			flash(t('about.copied'));
		} catch {
			flash(APP.url);
		}
	}

	let handle;
	function flash(message) {
		status = message;
		clearTimeout(handle);
		handle = setTimeout(() => (status = ''), 2600);
	}
</script>

<div class="space-y-5">
	<p class="text-sm leading-relaxed text-[var(--text)]">{t('about.description')}</p>

	<div>
		<h4 class="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t('about.featuresTitle')}</h4>
		<ul class="space-y-1.5">
			{#each features as feature, i (i)}
				<li class="flex gap-2.5 text-sm text-[var(--text)]">
					<svg viewBox="0 0 24 24" class="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true">
						<path
							d="m5 13 4 4L19 7"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<span>{feature}</span>
				</li>
			{/each}
		</ul>
	</div>

	<button
		class="tap flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-[#0a2118]"
		onclick={share}
	>
		<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
			<circle cx="18" cy="5" r="2.6" fill="currentColor" />
			<circle cx="6" cy="12" r="2.6" fill="currentColor" />
			<circle cx="18" cy="19" r="2.6" fill="currentColor" />
			<path
				d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
			/>
		</svg>
		{t('about.share')}
	</button>

	<p class="min-h-4 text-center text-xs text-accent">{status}</p>

	<div class="space-y-2 border-t border-[var(--line)] pt-4 text-sm">
		<a
			class="tap flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3.5 py-3 transition-colors hover:border-[var(--accent)]"
			href={APP.url}
			target="_blank"
			rel="noopener noreferrer"
		>
			<span class="flex min-w-0 items-center gap-2.5">
				<svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none" />
					<path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" stroke="currentColor" stroke-width="1.5" fill="none" />
				</svg>
				<span class="min-w-0">
					<span class="block text-xs text-muted">{t('about.website')}</span>
					<span class="block truncate">{APP.url.replace(/^https?:\/\//, '')}</span>
				</span>
			</span>
			<svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
				<path d="M7 17 17 7m0 0h-7m7 0v7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</a>

		<a
			class="tap flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3.5 py-3 transition-colors hover:border-[var(--accent)]"
			href="mailto:{APP.contact}"
		>
			<span class="flex min-w-0 items-center gap-2.5">
				<svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
					<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" />
					<path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
				<span class="min-w-0">
					<span class="block text-xs text-muted">{t('about.contact')}</span>
					<span class="block truncate">{APP.contact}</span>
				</span>
			</span>
		</a>
	</div>

	<div class="border-t border-[var(--line)] pt-3 text-center">
		<p class="text-[0.68rem] text-muted">{t('about.version', { version: APP.version })}</p>
		<p class="mt-0.5 text-[0.68rem] text-muted">{t('about.closing')}</p>
	</div>
</div>