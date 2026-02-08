import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.trypoo.app',
  appName: 'Poo App',
  webDir: 'dist',
  // Allow service worker and offline caching in native WebView
  server: {
    // Allow mixed content for local service worker
    androidScheme: 'https',
  },
  plugins: {
    // No special config needed for Network plugin - it works out of the box
  },
  // iOS: allow offline usage and background fetch
  ios: {
    allowsLinkPreview: false,
  },
};

export default config;
