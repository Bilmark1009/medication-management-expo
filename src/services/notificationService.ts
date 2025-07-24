import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { executeQuery } from '../utils/database';

// **ENHANCED NOTIFICATION HANDLER** - Replace your notification handler with this
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 === NOTIFICATION HANDLER CALLED ===');
    console.log(`📱 Notification ID: ${notification.request.identifier}`);
    console.log(`📱 Title: ${notification.request.content.title}`);
    console.log(`📱 Body: ${notification.request.content.body}`);
    console.log(`📱 Data:`, notification.request.content.data);
    
    // Get current time
    const now = new Date();
    console.log(`📱 Current time: ${now.toLocaleString()}`);
    
    // Check if this has scheduling data
    const notificationData = notification.request.content.data;
    
    if (notificationData && notificationData.scheduledFor) {
      const scheduledTime = new Date(notificationData.scheduledFor);
      const actualScheduleTime = notificationData.actualScheduleTime ? 
        new Date(notificationData.actualScheduleTime) : null;
      
      console.log(`📱 Original scheduled for: ${scheduledTime.toLocaleString()}`);
      if (actualScheduleTime) {
        console.log(`📱 Should fire at: ${actualScheduleTime.toLocaleString()}`);
      }
      
      // Calculate time differences
      const timeDiffFromScheduled = now.getTime() - scheduledTime.getTime();
      const timeDiffFromActual = actualScheduleTime ? 
        now.getTime() - actualScheduleTime.getTime() : timeDiffFromScheduled;
      
      console.log(`📱 Time diff from scheduled: ${Math.round(timeDiffFromScheduled / 1000)} seconds`);
      console.log(`📱 Time diff from actual: ${Math.round(timeDiffFromActual / 1000)} seconds`);
      
      // Check if it's firing too early (more than 30 seconds before scheduled time)
      const tolerance = 30000; // 30 seconds
      
      if (actualScheduleTime) {
        // Use actual schedule time if available
        if (now.getTime() < (actualScheduleTime.getTime() - tolerance)) {
          console.log('🚫 BLOCKING: Notification fired too early (using actual time)');
          console.log(`🚫 Expected: ${actualScheduleTime.toLocaleString()}`);
          console.log(`🚫 Current: ${now.toLocaleString()}`);
          console.log(`🚫 Early by: ${Math.round((actualScheduleTime.getTime() - now.getTime()) / 1000)} seconds`);
          
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
      } else {
        // Fallback to scheduled time
        if (now.getTime() < (scheduledTime.getTime() - tolerance)) {
          console.log('🚫 BLOCKING: Notification fired too early (using scheduled time)');
          console.log(`🚫 Expected: ${scheduledTime.toLocaleString()}`);
          console.log(`🚫 Current: ${now.toLocaleString()}`);
          console.log(`🚫 Early by: ${Math.round((scheduledTime.getTime() - now.getTime()) / 1000)} seconds`);
          
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
      }
      
      console.log('✅ ALLOWING: Notification timing is correct');
    } else {
      console.log('📱 No scheduling data found, allowing notification');
    }
    
    console.log('📱 === SHOWING NOTIFICATION ===');
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export type MedicationNotification = {
  id: number;
  name: string;
  dosage: string;
  time: string;
  notification_id?: string;
  user_id?: number;
  timezone_offset?: number;
};

// **FIXED NOTIFICATION CHANNEL CONFIGURATION**
const configureNotifications = async () => {
  console.log('🔧 Configuring notifications...');
  
  if (Platform.OS === 'android') {
    // Delete existing channel first
    try {
      await Notifications.deleteNotificationChannelAsync('medication-reminders');
      console.log('🗑️ Deleted existing notification channel');
    } catch (e) {
      console.log('ℹ️ No existing channel to delete');
    }
    
    // Create fresh channel
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
    
    console.log('✅ Created fresh notification channel');
  }
  
  // Check current permission status
  const { status } = await Notifications.getPermissionsAsync();
  console.log(`📱 Current permission status: ${status}`);
  
  if (status !== 'granted') {
    console.log('⚠️ Notification permissions not granted');
  }
  
  console.log('✅ Notification configuration complete');
};

// Request notification permissions with proper error handling
const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    console.log(`📱 Existing permission status: ${existingStatus}`);
    
    if (existingStatus !== 'granted') {
      console.log('📱 Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        },
      });
      finalStatus = status;
      console.log(`📱 Permission request result: ${finalStatus}`);
    }
    
    if (finalStatus === 'granted') {
      console.log('✅ Notification permissions granted');
      return true;
    } else {
      console.log('❌ Notification permissions denied');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
};

// **SIMPLE FIX: Use DAILY triggers like the GitHub project**
// Replace your scheduleMedicationNotification function with this:

// Setup notification categories for actionable buttons
const setupNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync('MEDICATION_ACTIONS', [
    {
      identifier: 'TAKE_ACTION',
      buttonTitle: 'Taken ✅',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SKIP_ACTION',
      buttonTitle: 'Skip ⏭️',
      options: { opensAppToForeground: false },
    },
  ]);
};

// Call setupNotificationCategories at startup (should be called in App.tsx or main entry)
setupNotificationCategories();

const scheduleMedicationNotification = async (medication: MedicationNotification) => {
  try {
    console.log('🔔 Scheduling DAILY notification for:', medication.name);
    console.log('📅 Time:', medication.time);
    
    // Cancel existing notification
    if (medication.notification_id) {
      console.log('🗑️ Canceling existing notification');
      await Notifications.cancelScheduledNotificationAsync(medication.notification_id);
    }

    // Parse the time from your database format
    const notificationTime = new Date(medication.time);
    const hour = notificationTime.getHours();
    const minute = notificationTime.getMinutes();
    
    console.log(`⏰ Scheduling for: ${hour}:${minute.toString().padStart(2, '0')}`);

    // **KEY FIX: Use DAILY trigger instead of seconds**
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Medication Reminder',
        body: `Time to take ${medication.dosage} of ${medication.name}`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          medicationId: medication.id?.toString(),
          type: 'medication_reminder',
          scheduledFor: new Date().toISOString(),
          status: 'pending',
          action: 'TAKE_MEDICATION',
        },
        categoryIdentifier: 'MEDICATION_ACTIONS',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hour,
        minute: minute,
        repeats: true, // This makes it repeat daily
      },
    });

    console.log('✅ DAILY notification scheduled with ID:', notificationId);
    
    // Update database
    if (medication.user_id && medication.id) {
      await executeQuery(
        'UPDATE medications SET notification_id = ? WHERE id = ? AND user_id = ?',
        [notificationId, medication.id, medication.user_id]
      );
      console.log('💾 Database updated');
    }

    // **VERIFICATION: Check if it was scheduled correctly**
    setTimeout(async () => {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const found = scheduled.find(n => n.identifier === notificationId);
      
      if (found) {
        console.log('✅ VERIFICATION: DAILY notification found in schedule');
        console.log('📋 Trigger:', found.trigger);
      } else {
        console.log('❌ VERIFICATION: Notification not found');
      }
      console.log(`📊 Total scheduled: ${scheduled.length}`);
    }, 2000);

    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling DAILY notification:', error);
    throw error;
  }
};

// Rest of your functions remain the same...
const cancelScheduledNotification = async (notificationId: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`✅ Cancelled notification: ${notificationId}`);
    return true;
  } catch (error) {
    console.error('❌ Error canceling notification:', error);
    return false;
  }
};

const cancelAllNotifications = async (userId: number) => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`🗑️ Cancelling ${scheduled.length} scheduled notifications for user ${userId}`);
    
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    await executeQuery(
      'UPDATE medications SET notification_id = NULL WHERE user_id = ?',
      [userId]
    );
    
    console.log(`✅ Cancelled all notifications for user ${userId}`);
  } catch (error) {
    console.error('❌ Error cancelling all notifications:', error);
    throw error;
  }
};

const rescheduleAllNotifications = async (userId: number) => {
  try {
    console.log(`🔄 Rescheduling all notifications for user ${userId}`);
    
    await cancelAllNotifications(userId);
    
    const medications = await executeQuery(
      'SELECT * FROM medications WHERE user_id = ?',
      [userId]
    ) as Array<any>;

    console.log(`📋 Found ${medications.length} medications to reschedule`);

    let successCount = 0;
    for (const med of medications) {
      try {
        await scheduleMedicationNotification({
          id: med.id,
          name: med.name,
          dosage: med.dosage,
          time: med.time,
          user_id: userId,
          timezone_offset: med.timezone_offset
        });
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to reschedule notification for medication ${med.id}:`, error);
      }
    }
    
    console.log(`✅ Successfully rescheduled ${successCount}/${medications.length} notifications`);
  } catch (error) {
    console.error('❌ Error rescheduling notifications:', error);
  }
};

const debugNotificationService = {
  listScheduled: async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const now = new Date();
    
    console.log('=== 📋 SCHEDULED NOTIFICATIONS ===');
    console.log(`Current time: ${now.toLocaleString()}`);
    console.log(`Total scheduled: ${scheduled.length}`);
    
    if (scheduled.length === 0) {
      console.log('No notifications currently scheduled');
      return scheduled;
    }
    
    scheduled.forEach((notif, index) => {
      console.log(`[${index + 1}] ID: ${notif.identifier}`);
      console.log(`    Title: ${notif.content.title}`);
      console.log(`    Trigger:`, notif.trigger);
    });
    console.log('=== END SCHEDULED NOTIFICATIONS ===');
    return scheduled;
  },

  sendTest: async (inSeconds = 5) => {
    const now = new Date();
    console.log(`🧪 Scheduling test for ${inSeconds} seconds from ${now.toLocaleString()}`);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Simple Test',
        body: `Should fire in ${inSeconds} seconds`,
        data: { test: true, scheduledAt: now.toISOString() },
      },
      trigger: { 
        seconds: inSeconds,
      },
    });
    
    console.log(`✅ Test scheduled with ID: ${notificationId}`);
    return notificationId;
  },

  checkPermissions: async () => {
    const permissions = await Notifications.getPermissionsAsync();
    console.log('📱 Current notification permissions:', permissions);
    return permissions;
  },

  clearAll: async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`🧹 Clearing ${scheduled.length} scheduled notifications`);
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ All notifications cleared');
  }
};

// Notification response handler to update medication status
Notifications.addNotificationResponseReceivedListener(async response => {
  const { actionIdentifier, notification } = response;
  const { medicationId } = notification.request.content.data || {};
  if (!medicationId) return;
  try {
    if (actionIdentifier === 'TAKE_ACTION') {
      // Mark as taken via backgroundTasks
      const { markMedicationTaken } = await import('./backgroundTasks');
      await markMedicationTaken(parseInt(medicationId), 'Taken via notification');
    } else if (actionIdentifier === 'SKIP_ACTION') {
      const { markMedicationSkipped } = await import('./backgroundTasks');
      await markMedicationSkipped(parseInt(medicationId), 'Skipped via notification');
    }
  } catch (err) {
    console.error('Error handling notification action:', err);
  }
});

export {
  configureNotifications,
  requestNotificationPermission,
  scheduleMedicationNotification,
  cancelScheduledNotification,
  cancelAllNotifications,
  rescheduleAllNotifications,
  debugNotificationService,
};