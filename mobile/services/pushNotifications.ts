import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { secureStorage } from './storage';
import { getActiveBaseUrl } from './dataSync';

// Configure how incoming notifications are presented when app is foregrounded or backgrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export class PushNotificationService {
  private static isInitialized = false;

  /**
   * Initialize push notification channel, request permissions, and register token
   */
  static async registerForPushNotifications(userId?: string): Promise<string | null> {
    try {
      // 1. Android notification channel configuration
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Jenista Chit Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D7A928',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
          sound: 'default',
        });
      }

      // 2. Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // 3. Get device push token (FCM token on Android)
      let token: string | null = null;
      try {
        const deviceTokenResult = await Notifications.getDevicePushTokenAsync();
        token = deviceTokenResult.data;
      } catch (err) {
        // Fallback to Expo push token
        try {
          const expoTokenResult = await Notifications.getExpoPushTokenAsync();
          token = expoTokenResult.data;
        } catch {}
      }

      if (!token) return null;

      // 4. Save token in local storage
      await secureStorage.setItem('fcm_push_token', token);

      // 5. Register with backend if user ID is known
      if (userId) {
        try {
          const baseUrl = await getActiveBaseUrl();
          await fetch(`${baseUrl}/customers/fcm-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fcmToken: token, platform: Platform.OS }),
          });
        } catch (e) {
          console.warn('Failed to upload FCM token to backend:', e);
        }
      }

      this.isInitialized = true;
      return token;
    } catch (error) {
      console.warn('PushNotificationService registration error:', error);
      return null;
    }
  }

  /**
   * Schedule a local test or reminder notification
   */
  static async triggerLocalNotification(title: string, body: string, data?: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Send immediately
      });
    } catch (e) {
      console.warn('Trigger local notification error:', e);
    }
  }
}
