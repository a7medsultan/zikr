function buzz(pattern) {
	if (typeof navigator === 'undefined' || !navigator.vibrate) return;
	try {
		navigator.vibrate(pattern);
	} catch {
		/* vibration unsupported or blocked */
	}
}

export function hapticTap(enabled = true) {
	if (enabled) buzz(8);
}

export function hapticComplete(enabled = true) {
	if (enabled) buzz([14, 40, 22]);
}

export function hapticMilestone(enabled = true) {
	if (enabled) buzz([18, 50, 18, 50, 46]);
}