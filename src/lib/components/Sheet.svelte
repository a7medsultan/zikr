<script>
	import { fade, fly } from 'svelte/transition';
	import { t } from '#lib/state/locale.svelte.js';

	let { open = $bindable(false), title = '', children } = $props();

	let panel = $state(null);
	let opener = null;

	const FOCUSABLE =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function focusable() {
		if (!panel) return [];
		return [...panel.querySelectorAll(FOCUSABLE)].filter(
			(el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
		);
	}

	function close() {
		open = false;
	}

	function onkeydown(event) {
		if (!open) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}
		if (event.key !== 'Tab') return;

		const list = focusable();
		if (!list.length) {
			event.preventDefault();
			panel?.focus();
			return;
		}
		const first = list[0];
		const last = list[list.length - 1];
		const active = document.activeElement;

		if (event.shiftKey && (active === first || active === panel)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}

	// Keep keyboard focus inside the dialog and stop the page behind it from
	// scrolling; both are restored when the sheet closes.
	$effect(() => {
		if (!open) return;
		opener = document.activeElement;
		const body = document.body;
		const previousOverflow = body.style.overflow;
		body.style.overflow = 'hidden';
		const raf = requestAnimationFrame(() => panel?.focus());

		return () => {
			cancelAnimationFrame(raf);
			body.style.overflow = previousOverflow;
			if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
		};
	});
</script>

<svelte:window {onkeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
		<button
			class="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
			transition:fade={{ duration: 220 }}
			onclick={close}
			aria-label={t('a11y.backdropClose')}
			tabindex={-1}
		></button>

		<div
			bind:this={panel}
			tabindex="-1"
			class="panel safe-b relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl outline-none sm:rounded-3xl"
			transition:fly={{ y: 40, duration: 320, opacity: 0.9 }}
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
				<h2 class="text-sm font-medium tracking-[0.2em] text-accent uppercase">{title}</h2>
				<button
					class="tap grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-muted transition-colors hover:text-[var(--text)]"
					onclick={close}
					aria-label={t('nav.close')}
				>
					<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
						<path
							d="M6 6l12 12M18 6L6 18"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}