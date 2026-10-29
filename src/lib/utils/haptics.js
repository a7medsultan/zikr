import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const native = typeof window !== 'undefined' && Capacitor.isNativePlatform();

function buzz(pattern) {
	if (typeof navigator === 'undefined' || !navigator.vibrate) return;
	try {
		navigator.vibrate(pattern);
	} catch {
		/* vibration unsupported or blocked */
	}
}

export function hapticTap(enabled = true) {
	if (!enabled) return;
	if (native) {
		Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
		return;
	}
	buzz(8);
}

export function hapticMilestone(enabled = true) {
	if (!enabled) return;
	if (native) {
		Haptics.notification({ type: NotificationType.Success }).catch(() => {});
		return;
	}
	buzz([18, 50, 18, 50, 46]);
}
