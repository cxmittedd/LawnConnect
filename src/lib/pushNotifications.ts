import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

// Check if we're running on a native platform
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Initialize push notifications
export const initializePushNotifications = async (): Promise<PushNotificationToken | null> => {
  if (!isNativePlatform()) {
    console.log('Push notifications are only available on native platforms');
    return null;
  }

  try {
    // Request permission
    const permissionStatus = await PushNotifications.requestPermissions();
    
    if (permissionStatus.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Return a promise that resolves with the token
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        
        const platform = Capacitor.getPlatform() as 'ios' | 'android';
        
        // Save token to database
        await saveDeviceToken(token.value, platform);
        
        resolve({
          token: token.value,
          platform,
        });
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return null;
  }
};

// Save device token to database
const saveDeviceToken = async (token: string, platform: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in, cannot save device token');
      return;
    }

    // Upsert the device token
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: token,
        p256dh: platform, // Using p256dh to store platform info
        auth: 'native', // Marking as native push
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint',
      });

    if (error) {
      console.error('Error saving device token:', error);
    } else {
      console.log('Device token saved successfully');
    }
  } catch (error) {
    console.error('Error in saveDeviceToken:', error);
  }
};

// Set up notification listeners
export const setupPushNotificationListeners = (
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationAction?: (action: ActionPerformed) => void
): void => {
  if (!isNativePlatform()) return;

  // Notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('Push notification received:', notification);
    onNotificationReceived?.(notification);
  });

  // Notification action performed (user tapped on notification)
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('Push notification action performed:', action);
    onNotificationAction?.(action);
  });
};

// Remove all listeners
export const removePushNotificationListeners = async (): Promise<void> => {
  if (!isNativePlatform()) return;
  await PushNotifications.removeAllListeners();
};

// Get current notification permissions
export const checkNotificationPermissions = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  
  const status = await PushNotifications.checkPermissions();
  return status.receive === 'granted';
};

// Get delivered notifications
export const getDeliveredNotifications = async () => {
  if (!isNativePlatform()) return [];
  
  const { notifications } = await PushNotifications.getDeliveredNotifications();
  return notifications;
};

// Remove all delivered notifications
export const clearDeliveredNotifications = async (): Promise<void> => {
  if (!isNativePlatform()) return;
  await PushNotifications.removeAllDeliveredNotifications();
};
