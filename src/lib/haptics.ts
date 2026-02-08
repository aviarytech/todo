import { Capacitor } from '@capacitor/core';

// Lazy import to avoid issues on web
let HapticsModule: any = null;

export function supportsHaptics(): boolean {
  return Capacitor.isNativePlatform();
}

async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!HapticsModule) {
    HapticsModule = await import('@capacitor/haptics');
  }
  return HapticsModule.Haptics;
}

export async function hapticLight() {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  await Haptics.impact({ style: 'light' });  // ImpactStyle.Light
}

export async function hapticMedium() {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  await Haptics.impact({ style: 'medium' });
}

export async function hapticSuccess() {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  await Haptics.notification({ type: 'success' });
}

export async function hapticWarning() {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  await Haptics.notification({ type: 'warning' });
}

export async function hapticSelection() {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  await Haptics.selectionStart();
  await Haptics.selectionChanged();
  await Haptics.selectionEnd();
}

export async function hapticError() {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  await Haptics.notification({ type: 'error' });
}

export async function hapticHeavy() {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  await Haptics.impact({ style: 'heavy' });
}

// Main export function that matches the pattern used by useSettings
export function haptic(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') {
  switch (pattern) {
    case 'light':
      hapticLight();
      break;
    case 'medium':
      hapticMedium();
      break;
    case 'heavy':
      hapticHeavy();
      break;
    case 'success':
      hapticSuccess();
      break;
    case 'error':
      hapticError();
      break;
    case 'warning':
      hapticWarning();
      break;
  }
}
