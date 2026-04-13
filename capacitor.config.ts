import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.za.outsec.chatr',
  appName: 'ChatR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://main.d1imfsef8qotjc.amplifyapp.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
