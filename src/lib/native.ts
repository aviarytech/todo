import { Capacitor } from '@capacitor/core';

export async function initNativePlatform() {
  if (!Capacitor.isNativePlatform()) return;
  
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  
  // Set status bar style based on current theme
  const isDark = document.documentElement.classList.contains('dark');
  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  
  // On Android, make status bar transparent for edge-to-edge
  if (Capacitor.getPlatform() === 'android') {
    await StatusBar.setBackgroundColor({ color: '#00000000' });
    await StatusBar.setOverlaysWebView({ overlay: true });
  }
}

export async function initKeyboardHandling() {
  if (!Capacitor.isNativePlatform()) return;
  await import('@capacitor/keyboard');
  // Keyboard will push content up automatically in Capacitor
  // Add any custom keyboard behavior here
}
