import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.trypoo.app',
  appName: 'Poo App',
  webDir: 'dist',
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
  },
};

export default config;
