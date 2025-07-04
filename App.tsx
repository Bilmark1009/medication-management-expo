import 'formdata-polyfill';
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { initializeDatabase } from './src/utils/database';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, rescheduleAllNotifications } from './src/services/notifications';

// Configure how notifications are handled when received and interacted with
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Initialize database and notifications
    const initApp = async () => {
      await initializeDatabase();
      await registerForPushNotificationsAsync();
      await rescheduleAllNotifications();
    };

    initApp();

    // This listener is called when a notification is received while the app is in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // You can handle the notification here if needed
      console.log('Notification received:', notification);
    });

    // This listener is called when a user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // You can navigate to a specific screen when a notification is tapped
      // For example: navigation.navigate('MedicationDetails', { id: response.notification.request.content.data.medicationId });
    });

    return () => {
      // Clean up the notification listeners when the component unmounts
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <PaperProvider theme={MD3LightTheme}>
      <AppNavigator />
    </PaperProvider>
  );
}
