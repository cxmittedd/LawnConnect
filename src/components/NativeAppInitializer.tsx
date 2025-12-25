import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { isNativePlatform } from '@/lib/pushNotifications';
import { SplashScreen } from '@capacitor/splash-screen';

export const NativeAppInitializer = () => {
  const { isInitialized } = usePushNotifications();

  useEffect(() => {
    // Hide splash screen once app is ready
    const hideSplash = async () => {
      if (isNativePlatform()) {
        try {
          await SplashScreen.hide();
        } catch (error) {
          console.log('Splash screen already hidden or not available');
        }
      }
    };

    // Wait a bit for the app to fully render
    const timer = setTimeout(hideSplash, 500);
    return () => clearTimeout(timer);
  }, []);

  // This component doesn't render anything
  return null;
};
