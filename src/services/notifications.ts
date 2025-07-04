import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { executeQuery } from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request permissions
export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Warning', 'Failed to get push token for push notification!');
      return;
    }
    
    // Schedule a test notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification to verify everything is working!',
        sound: true,
        priority: 'high',
      },
      trigger: {
        seconds: 5, // Show after 5 seconds
        type: 'timeInterval',
        repeats: false
      } as Notifications.NotificationTriggerInput,
    });
    
  } else {
    Alert.alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Schedule a single notification
export async function schedulePushNotification(medication: any) {
  try {
    console.log('Scheduling notification for medication:', medication.name);
    
    // Calculate the time until the next occurrence of this time (in seconds)
    const now = new Date();
    const notificationTime = new Date(medication.time);
    
    // Set the notification time for today
    notificationTime.setFullYear(now.getFullYear());
    notificationTime.setMonth(now.getMonth());
    notificationTime.setDate(now.getDate());
    
    // If the time has already passed today, schedule for tomorrow
    if (notificationTime <= now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }
    
    console.log('Notification will trigger at:', notificationTime.toString());
    
    // Use a date-based trigger with the correct type
    const trigger = {
      type: 'date',
      date: notificationTime.getTime()
    } as Notifications.NotificationTriggerInput;

    console.log('Notification trigger:', JSON.stringify(trigger));
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "💊 Time to take your medication",
        body: `It's time to take ${medication.name} (${medication.dosage})`,
        data: { medicationId: medication.id },
        sound: true,
        priority: 'high',
      },
      trigger,
    });

    console.log('Notification scheduled with ID:', notificationId);
    
    // Store the notification ID in the database
    if (medication.id) {
      await executeQuery(
        'UPDATE medications SET notification_id = ? WHERE id = ?',
        [notificationId, medication.id]
      );
      console.log('Notification ID stored in database');
    }

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

// Cancel a scheduled notification
export async function cancelScheduledNotification(notificationId: string) {
  try {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

// Reschedule all notifications (call this on app start)
export async function rescheduleAllNotifications() {
  try {
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) return;

    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Get all medications that should have notifications
    const medications = await executeQuery(
      'SELECT * FROM medications WHERE user_id = ?',
      [currentUser.id]
    ) as any[];

    // Reschedule all notifications
    for (const med of medications) {
      if (med.time) {
        await schedulePushNotification(med);
      }
    }
  } catch (error) {
    console.error('Error rescheduling notifications:', error);
  }
}
