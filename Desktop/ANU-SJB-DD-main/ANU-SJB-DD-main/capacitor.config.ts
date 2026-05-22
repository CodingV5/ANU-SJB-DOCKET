import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anusjb.docket',
  appName: 'ANU SJB DOCKET',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#ffffff",
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
      webClientId: "171580750009-vbe9vm8o3g680ln0j5eac7aoh4f7bcap.apps.googleusercontent.com",
    },
  },
};

export default config;
