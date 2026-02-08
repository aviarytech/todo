import { Capacitor } from '@capacitor/core';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  
  const { PushNotifications } = await import('@capacitor/push-notifications');
  
  // Request permission
  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    console.log('Push notification permission not granted');
    return;
  }
  
  // Register with APNs / FCM
  await PushNotifications.register();
  
  // Listen for registration success
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token:', token.value);
    // TODO: Send token to backend for push delivery
    // Could store in Convex user record
  });
  
  // Listen for registration errors
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
  });
  
  // Listen for incoming notifications (app in foreground)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
    // TODO: Show in-app notification banner
  });
  
  // Listen for notification tap (app opened from notification)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push notification action:', action);
    const data = action.notification.data;
    // TODO: Navigate to relevant list/item based on notification data
    if (data?.listId) {
      window.location.href = `/list/${data.listId}`;
    }
  });
}

export async function getDeliveredNotifications() {
  if (!Capacitor.isNativePlatform()) return [];
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const { notifications } = await PushNotifications.getDeliveredNotifications();
  return notifications;
}
