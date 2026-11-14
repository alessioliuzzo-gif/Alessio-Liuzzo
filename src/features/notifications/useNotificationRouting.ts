import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerForPush } from './notifications';

/** Öffnet beim Antippen einer Benachrichtigung den passenden Screen. */
export function useNotificationRouting(signedIn: boolean) {
  useEffect(() => {
    if (Platform.OS === 'web' || !signedIn) return;
    void registerForPush();
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
    });
    return () => subscription.remove();
  }, [signedIn]);
}
