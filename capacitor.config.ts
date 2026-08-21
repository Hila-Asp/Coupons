import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'il.vouchermanager.app',
  appName: 'Voucher Manager',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
