<script>
	import { availableLocales, locale, setLocale } from '#lib/state/locale.svelte.js';

	let { onpick } = $props();

	function choose(code) {
		setLocale(code);
		onpick?.();
	}
</script>

<ul class="space-y-2">
	{#each availableLocales as option (option.code)}
		<li>
			<button
				class="tap flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-start transition-colors {option.code ===
				locale.code
					? 'border-[var(--accent)] text-accent'
					: 'border-[var(--line)] text-[var(--text)]'}"
				onclick={() => choose(option.code)}
				aria-pressed={option.code === locale.code}
			>
				<span class="min-w-0">
					<span class="block truncate text-base">{option.nativeName}</span>
					<span class="block text-xs text-muted">{option.name}</span>
				</span>

				<span class="flex shrink-0 items-center gap-2">
					<span class="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[0.6rem] tracking-wider text-muted uppercase">
						{option.dir}
					</span>
					{#if option.code === locale.code}
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path
								d="m5 13 4 4L19 7"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{/if}
				</span>
			</button>
		</li>
	{/each}
</ul>