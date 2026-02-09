import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.trypoo.app',
  appName: 'Poo App',
  webDir: 'dist',
  // Allow service worker and offline caching in native WebView
  server: {
    // Use https scheme on both platforms for proper cookie/CORS handling
    androidScheme: 'https',
    iosScheme: 'https',
    // Allow WebSocket and HTTP connections to backend
    allowNavigation: [
      'pooapp-convex-backend-production.up.railway.app',
      'pooapp-http.aviarytech.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      // 'native' resize mode on iOS avoids pushing the whole webview up
      resize: 'native',
      resizeOnFullScreen: true,
    },
    // No special config needed for Network plugin - it works out of the box
  },
  // iOS: allow offline usage and background fetch
  ios: {
    allowsLinkPreview: false,
  },
};

export default config;
