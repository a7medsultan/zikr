<script>
	import { onMount } from 'svelte';
	import { initPwa } from '#lib/state/pwa.svelte.js';
	import { applyLocale } from '#lib/state/locale.svelte.js';
	import { applyTheme } from '#lib/state/settings.svelte.js';
	import './layout.css';

	let { children } = $props();

	onMount(() => {
		applyTheme();
		applyLocale();
		initPwa();
	});
</script>

{@render children()}