import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tradeos.app',
  appName: 'TradeOS',
  webDir: 'public',
  server: {
    url: 'https://trade-os-f9kj.vercel.app',
    cleartext: true
  }
};

export default config;