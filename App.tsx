// App.tsx - Professional Integration (Updated for Simplified Background Tasks)
import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { Platform, View, LogBox, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { initializeDatabase } from './src/utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { configureNotifications, rescheduleAllNotifications } from './src/services/notificationService';
import { initializeBackgroundTasks } from './src/services/backgroundTasks'; // Updated import
import { executeQuery } from './src/utils/database';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Background tasks',
]);

export default function App() {
  const appRef = useRef(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🏥 === INITIALIZING PROFESSIONAL MEDICATION APP ===');
        
        // Initialize database first
        await initializeDatabase();
        console.log('✅ Database initialized');
        
        // Configure notifications
        await configureNotifications();
        console.log('✅ Notifications configured');
        
        // Request notification permissions with professional messaging
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Professional Medication Management', 
            'This app requires notification permissions to provide reliable medication reminders and adherence tracking. Please enable notifications for optimal healthcare management.',
            [
              { text: 'Settings', onPress: () => Notifications.requestPermissionsAsync() },
              { text: 'Continue', style: 'cancel' }
            ]
          );
        } else {
          console.log('✅ Notification permissions granted');
          
          // Initialize SIMPLIFIED background tasks (reference approach)
          if (Device.isDevice) {
            try {
              await initializeBackgroundTasks(); // Simplified version
              console.log('✅ Simple background tasks initialized (reference approach)');
            } catch (backgroundError) {
              console.error('⚠️ Background tasks failed to initialize:', backgroundError);
              // Continue without background tasks but notify user
              Alert.alert(
                'Background Processing',
                'Some features may not be available. The app will still function for basic medication reminders.'
              );
            }
          } else {
            console.log('ℹ️ Background tasks not available in simulator');
          }
          
          // Reschedule notifications for current user
          const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
          if (currentUser?.id) {
            await rescheduleAllNotifications(currentUser.id);
            console.log('✅ Notifications rescheduled for current user');
          }
        }
        
        console.log('🎉 Professional medication app initialized successfully');
        
      } catch (error) {
        console.error('❌ Error initializing professional app:', error);
        Alert.alert(
          'Initialization Error',
          'There was an issue starting the app. Some features may not work correctly. Please restart the app.'
        );
      }
    };

    // Initialize the app
    initializeApp();

    // **PROFESSIONAL NOTIFICATION HANDLING**
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Professional notification received:', {
        id: notification.request.identifier,
        title: notification.request.content.title,
        type: notification.request.content.data?.type,
        timestamp: new Date().toISOString()
      });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async response => {
      console.log('👆 User interacted with notification:', response);
      
      const { notification } = response;
      const data = notification.request.content.data;
      
      if (data?.type) {
        switch (data.type) {
          case 'medication-reminder':
            // Navigate to take medication screen
            console.log('📋 Navigating to medication tracking');
            break;
            
          case 'missed-dose':
            // Show missed dose recovery options
            console.log('⚠️ Handling missed dose interaction');
            Alert.alert(
              'Missed Medication',
              `You missed your medication. Would you like to take it now or mark it as skipped?`,
              [
                { text: 'Take Now', onPress: () => handleLateDose(data.medicationId) },
                { text: 'Skip', onPress: () => handleSkippedDose(data.medicationId) },
                { text: 'Remind Later', onPress: () => snoozeReminder(data.medicationId, 30) }
              ]
            );
            break;
            
          case 'adherence-alert':
            // Show adherence improvement suggestions
            console.log('📈 Showing adherence guidance');
            break;
            
          case 'weekly-report':
            // Navigate to analytics screen
            console.log('📊 Navigating to weekly report');
            break;
            
          default:
            console.log('📱 Unknown notification type:', data.type);
        }
      }
    });

    // Clean up listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // **PROFESSIONAL HELPER FUNCTIONS**
  const handleLateDose = async (medicationId: number) => {
    try {
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      // Mark as taken late using simplified approach
      await executeQuery(`
        UPDATE medications 
        SET daily_status = 'taken', 
            last_taken_date = ?,
            daily_notes = ?
        WHERE id = ? AND user_id = ?
      `, [now, 'Taken after missed dose alert', medicationId, currentUser.id]);
      
      Alert.alert('Recorded', 'Late dose has been recorded. Great job catching up!');
      
    } catch (error) {
      console.error('❌ Error recording late dose:', error);
    }
  };

  const handleSkippedDose = async (medicationId: number) => {
    try {
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      
      // Mark as skipped using simplified approach
      await executeQuery(`
        UPDATE medications 
        SET daily_status = 'skipped',
            daily_notes = ?
        WHERE id = ? AND user_id = ?
      `, ['Intentionally skipped by user', medicationId, currentUser.id]);
      
      Alert.alert('Recorded', 'Dose marked as skipped.');
      
    } catch (error) {
      console.error('❌ Error recording skipped dose:', error);
    }
  };

  const snoozeReminder = async (medicationId: number, minutes: number) => {
    try {
      // Schedule a snooze reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Snoozed Medication Reminder',
          body: `Reminder: It's time to take your medication`,
          data: { 
            type: 'snoozed-reminder',
            medicationId,
            originallyDue: new Date().toISOString()
          },
        },
        trigger: {
          seconds: minutes * 60,
        },
      });
      
      Alert.alert('Snoozed', `Reminder set for ${minutes} minutes from now.`);
      
    } catch (error) {
      console.error('❌ Error snoozing reminder:', error);
    }
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={MD3LightTheme}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppNavigator />
        </GestureHandlerRootView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}