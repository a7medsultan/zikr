<script>
	import { scale, fade } from 'svelte/transition';

	let { ripples = [] } = $props();

	const colors = [
		'var(--accent)',
		'color-mix(in srgb, var(--accent) 60%, #7fd8c0)',
		'color-mix(in srgb, var(--accent) 45%, #ffffff)'
	];
</script>

{#each ripples as ripple (ripple.id)}
	<div
		class="gpu pointer-events-none absolute z-10 rounded-full"
		style="
			left:{ripple.x}px;
			top:{ripple.y}px;
			width:18px;
			height:18px;
			margin:-9px 0 0 -9px;
			border:2px solid {colors[ripple.tone % colors.length]};
		"
		in:scale={{ start: 0.2, duration: 520, easing: (t) => 1 - Math.pow(1 - t, 3) }}
		out:fade={{ duration: 380 }}
	></div>
{/each}