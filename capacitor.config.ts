import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.birthdaygame.app',
  appName: 'Birthday Game',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      clientId: '94817684781-sojeh06ql6q72brl1ml58erpetc8hobr.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      serverClientId: '94817684781-sojeh06ql6q72brl1ml58erpetc8hobr.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
