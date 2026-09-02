import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.connectlawn.app',
  appName: 'LawnConnect',
  webDir: 'dist',
  server: {
    url: 'https://d707b523-89ba-4b25-b85c-199e9d5645a9.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
