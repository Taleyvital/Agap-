import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.agape.app",
  appName: "AGAPE",
  webDir: "out",
  server: {
    url: 'https://agap-a4j6.vercel.app',
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#141414",
      showSpinner: false,
    },
    Keyboard: {
      resize: "native",
      style: "dark",
      resizeOnFullScreen: true,
      hideFormAccessoryBar: false,
    },
  },
};

export default config;
