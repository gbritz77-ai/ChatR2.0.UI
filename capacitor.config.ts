import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.za.outsec.chatr',
  appName: 'ChatR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Load live content from Amplify so every deployment is instantly available.
    // The bundled files inside the APK are kept as a build artefact but the
    // WebView always loads from this URL instead.
    url: 'https://main.d1imfsef8qotjc.amplifyapp.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
