import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  initializePushNotifications,
  setupPushNotificationListeners,
  removePushNotificationListeners,
  isNativePlatform,
  PushNotificationToken,
} from '@/lib/pushNotifications';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<PushNotificationToken | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!user || !isNativePlatform()) return;

    const init = async () => {
      const pushToken = await initializePushNotifications();
      setToken(pushToken);
      setIsInitialized(true);

      // Set up listeners
      setupPushNotificationListeners(
        // On notification received in foreground
        (notification) => {
          toast(notification.title || 'New Notification', {
            description: notification.body,
          });
        },
        // On notification tapped
        (action) => {
          const data = action.notification.data;
          
          // Navigate based on notification type
          if (data?.jobId) {
            navigate(`/job/${data.jobId}`);
          } else if (data?.type === 'proposal_received') {
            navigate('/my-jobs');
          } else if (data?.type === 'review_received') {
            navigate('/profile');
          }
        }
      );
    };

    init();

    return () => {
      removePushNotificationListeners();
    };
  }, [user, navigate]);

  return {
    token,
    isInitialized,
    isNative: isNativePlatform(),
  };
};
