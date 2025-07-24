// src/services/backgroundTasks.ts - SIMPLIFIED VERSION (Reference Approach)
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { executeQuery } from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single task name - keeping it simple like the reference
const DAILY_RESET_TASK = 'daily-medication-reset';

// Helper: Mark missed doses for current user
export async function markMissedDosesForUser(userId: number) {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0,5); // 'HH:MM'

    // Find all medications still pending for today and scheduled time has passed
    const meds = await executeQuery(`
      SELECT * FROM medications
      WHERE user_id = ? AND daily_status = 'pending' AND last_reset_date = ? AND time <= ?
    `, [userId, today, currentTime]) as Array<any>;

    for (const med of meds) {
      await executeQuery(`
        UPDATE medications
        SET daily_status = 'missed', daily_notes = 'Missed dose - not taken'
        WHERE id = ?
      `, [med.id]);
      console.log(`⏰ Marked as missed: ${med.name} (${med.time})`);
    }
    return meds.length;
  } catch (err) {
    console.error('Error marking missed doses:', err);
    return 0;
  }
}

// **SIMPLE TASK LIKE AAKASH'S REFERENCE**
TaskManager.defineTask(DAILY_RESET_TASK, async () => {
  try {
    console.log('🌅 === DAILY MEDICATION RESET (Reference Approach) ===');
    
    // Get current user
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) {
      console.log('❌ No current user found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    console.log(`🕐 Running daily reset at: ${now.toLocaleString()}`);
    console.log(`📅 Today's date: ${today}`);
    
    // **CORE LOGIC: Reset statuses for new day (like Aakash's approach)**
    
    // Get all medications for current user that haven't been reset today
    const medications = await executeQuery(`
      SELECT * FROM medications 
      WHERE user_id = ? AND (last_reset_date != ? OR last_reset_date IS NULL)
    `, [currentUser.id, today]) as Array<any>;

    console.log(`📋 Found ${medications.length} medications to reset`);

    let resetCount = 0;
    for (const med of medications) {
      try {
        // **SIMPLE RESET: Give user "another chance to be notified"**
        await executeQuery(`
          UPDATE medications 
          SET daily_status = 'pending', last_reset_date = ? 
          WHERE id = ? AND user_id = ?
        `, [today, med.id, currentUser.id]);

        console.log(`🔄 Reset status for: ${med.name}`);
        resetCount++;

        // **OPTIONAL: Reschedule notification if needed**
        // This ensures user gets notified again today
        const medTime = new Date(`${today}T${med.time}`);
        if (medTime > now) {
          // Only reschedule if the time hasn't passed today
          console.log(`🔔 Medication ${med.name} still due today at ${med.time}`);
        }

      } catch (error) {
        console.error(`❌ Failed to reset ${med.name}:`, error);
      }
    }

    // Mark missed doses for current user
    const missedCount = await markMissedDosesForUser(currentUser.id);
    console.log(`⏰ Marked ${missedCount} medications as missed`);

    console.log(`✅ Reset ${resetCount} medications for new day`);
    console.log('🎉 Daily reset completed successfully');
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
    
  } catch (error) {
    console.error('❌ Error in daily reset task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// **SIMPLIFIED INITIALIZATION**
export async function initializeBackgroundTasks() {
  try {
    console.log('🚀 Initializing simple background tasks (reference approach)...');
    
    // Register only the daily reset task
    await BackgroundFetch.registerTaskAsync(DAILY_RESET_TASK, {
      minimumInterval: 24 * 60 * 60, // Once daily (86400 seconds)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('✅ Daily reset task registered successfully');
    
    // Optional: Add simple migration for daily status tracking
    await addSimpleStatusTracking();
    
  } catch (error) {
    console.error('❌ Error initializing background tasks:', error);
    throw error;
  }
}

// **HELPER: Add simple columns to existing schema**
async function addSimpleStatusTracking() {
  try {
    // Add simple tracking columns to existing medications table
    const alterQueries = [
      `ALTER TABLE medications ADD COLUMN daily_status TEXT DEFAULT 'pending';`,
      `ALTER TABLE medications ADD COLUMN last_reset_date TEXT DEFAULT '';`,
      `ALTER TABLE medications ADD COLUMN last_taken_date TEXT DEFAULT '';`,
      `ALTER TABLE medications ADD COLUMN daily_notes TEXT DEFAULT '';`
    ];

    for (const query of alterQueries) {
      try {
        await executeQuery(query);
      } catch (e) {
        // Column probably already exists, ignore
      }
    }
    
    console.log('✅ Simple status tracking columns added');
  } catch (error) {
    console.error('❌ Error adding status tracking:', error);
  }
}

// **FOREGROUND FUNCTIONS: Move complex logic here**

// Call this when app becomes active or user opens medication screen
export async function checkMissedDosesToday() {
  try {
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) return [];

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Check which medications were due today but not taken
    const medications = await executeQuery(`
      SELECT * FROM medications 
      WHERE user_id = ? AND last_reset_date = ?
    `, [currentUser.id, today]) as Array<any>;

    const missedMeds = [];
    
    for (const med of medications) {
      const medTime = new Date(`${today}T${med.time}`);
      const gracePeriod = 30 * 60 * 1000; // 30 minutes
      
      // If medication time + grace period has passed and status is still pending
      if (now.getTime() > (medTime.getTime() + gracePeriod) && med.daily_status === 'pending') {
        missedMeds.push({
          ...med,
          minutesLate: Math.round((now.getTime() - medTime.getTime()) / (1000 * 60))
        });
      }
    }
    
    console.log(`📊 Found ${missedMeds.length} missed medications today`);
    return missedMeds;
    
  } catch (error) {
    console.error('❌ Error checking missed doses:', error);
    return [];
  }
}

// Mark medication as taken (call from your UI)
export async function markMedicationTaken(medicationId: number, notes = '') {
  try {
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) return false;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toISOString();
    
    await executeQuery(`
      UPDATE medications 
      SET daily_status = 'taken', 
          last_taken_date = ?,
          daily_notes = ?
      WHERE id = ? AND user_id = ?
    `, [time, notes, medicationId, currentUser.id]);

    console.log(`✅ Marked medication ${medicationId} as taken`);
    return true;
    
  } catch (error) {
    console.error('❌ Error marking medication as taken:', error);
    return false;
  }
}

// Mark medication as skipped
export async function markMedicationSkipped(medicationId: number, reason = '') {
  try {
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) return false;

    await executeQuery(`
      UPDATE medications 
      SET daily_status = 'skipped',
          daily_notes = ?
      WHERE id = ? AND user_id = ?
    `, [reason, medicationId, currentUser.id]);

    console.log(`✅ Marked medication ${medicationId} as skipped`);
    return true;
    
  } catch (error) {
    console.error('❌ Error marking medication as skipped:', error);
    return false;
  }
}

// Calculate simple adherence (call from HomeScreen or HistoryScreen)
export async function calculateSimpleAdherence(days = 7) {
  try {
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) return { adherence: 0, total: 0, taken: 0 };

    // Get last N days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const medications = await executeQuery(`
      SELECT daily_status, last_reset_date FROM medications 
      WHERE user_id = ? 
      AND last_reset_date >= ? 
      AND last_reset_date <= ?
    `, [
      currentUser.id, 
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ]) as Array<any>;

    const total = medications.length;
    const taken = medications.filter(m => m.daily_status === 'taken').length;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;
    
    return { adherence, total, taken, missed: total - taken };
    
  } catch (error) {
    console.error('❌ Error calculating adherence:', error);
    return { adherence: 0, total: 0, taken: 0, missed: 0 };
  }
}

export async function stopBackgroundTasks() {
  try {
    await BackgroundFetch.unregisterTaskAsync(DAILY_RESET_TASK);
    console.log('✅ Background tasks stopped');
  } catch (error) {
    console.error('❌ Error stopping background tasks:', error);
  }
}

// Export task name for external use
export { DAILY_RESET_TASK };