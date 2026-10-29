<script>
	import { onMount } from 'svelte';
	import { initPwa } from '#lib/state/pwa.svelte.js';
	import { applyLocale } from '#lib/state/locale.svelte.js';
	import { applyTheme, resolveTheme } from '#lib/state/settings.svelte.js';
	import { initNative } from '#lib/utils/native.js';
	import './layout.css';

	let { children } = $props();

	let stopNative = null;

	onMount(() => {
		applyTheme();
		applyLocale();
		initPwa();
		initNative(resolveTheme() === 'dark').then((cleanup) => {
			stopNative = cleanup;
		});

		return () => stopNative?.();
	});
</script>

{@render children()}