import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { executeQuery } from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Task names
const MISSED_DOSE_CHECKER = 'check-missed-doses';
const DAILY_RESET_TASK = 'reset-daily-statuses';
const ADHERENCE_TRACKER = 'track-adherence';
const HEALTH_INSIGHTS = 'generate-health-insights';

// Types for professional medication management
interface MedicationStatus {
  id: number;
  medication_id: number;
  user_id: number;
  date: string;
  status: 'taken' | 'missed' | 'skipped' | 'late' | 'pending';
  scheduled_time: string;
  actual_time?: string;
  delay_minutes?: number;
  notes?: string;
  created_at: string;
}

interface AdherenceMetrics {
  user_id: number;
  date: string;
  total_medications: number;
  taken_on_time: number;
  taken_late: number;
  missed: number;
  skipped: number;
  adherence_rate: number;
  average_delay_minutes: number;
}

// **TASK 1: COMPREHENSIVE MISSED DOSE DETECTION**
TaskManager.defineTask(MISSED_DOSE_CHECKER, async () => {
  try {
    console.log('🔍 === MISSED DOSE CHECKER STARTED ===');
    
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) {
      console.log('❌ No current user found');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    console.log(`🕐 Checking missed doses at: ${now.toLocaleString()}`);
    
    // Get today's medications that should have been taken by now
    const medications = await executeQuery(`
      SELECT m.*, ms.status, ms.actual_time 
      FROM medications m
      LEFT JOIN medication_statuses ms ON m.id = ms.medication_id 
        AND ms.date = ? AND ms.user_id = ?
      WHERE m.user_id = ?
    `, [today, currentUser.id, currentUser.id]);

    let missedCount = 0;
    
    for (const med of medications) {
      const medTime = new Date(`${today}T${med.time}`);
      const gracePeriod = 30 * 60 * 1000; // 30 minutes grace period
      const missedThreshold = medTime.getTime() + gracePeriod;
      
      // Check if medication time + grace period has passed
      if (now.getTime() > missedThreshold && !med.status) {
        console.log(`⚠️ Missed dose detected: ${med.name} at ${med.time}`);
        
        // Mark as missed in database
        await executeQuery(`
          INSERT OR REPLACE INTO medication_statuses 
          (medication_id, user_id, date, status, scheduled_time, delay_minutes)
          VALUES (?, ?, ?, 'missed', ?, ?)
        `, [
          med.id, 
          currentUser.id, 
          today, 
          med.time,
          Math.round((now.getTime() - medTime.getTime()) / (1000 * 60))
        ]);

        // Send missed dose notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Missed Medication',
            body: `You missed your ${med.name} scheduled for ${new Date(medTime).toLocaleTimeString()}`,
            data: {
              type: 'missed-dose',
              medicationId: med.id,
              scheduledTime: med.time,
              missedBy: Math.round((now.getTime() - medTime.getTime()) / (1000 * 60))
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            seconds: 1,
          },
        });

        missedCount++;
      }
      
      // Check for late doses (taken but after grace period)
      if (med.status === 'taken' && med.actual_time) {
        const actualTime = new Date(med.actual_time);
        const delayMinutes = Math.round((actualTime.getTime() - medTime.getTime()) / (1000 * 60));
        
        if (delayMinutes > 30) { // More than 30 minutes late
          await executeQuery(`
            UPDATE medication_statuses 
            SET status = 'late', delay_minutes = ?
            WHERE medication_id = ? AND user_id = ? AND date = ?
          `, [delayMinutes, med.id, currentUser.id, today]);
        }
      }
    }
    
    if (missedCount > 0) {
      console.log(`📊 Found ${missedCount} missed doses`);
      
      // Send daily summary if multiple missed
      if (missedCount > 1) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📊 Daily Medication Summary',
            body: `You have ${missedCount} missed medications today. Tap to review.`,
            data: { type: 'daily-summary', missedCount },
          },
          trigger: { seconds: 2 },
        });
      }
    }
    
    console.log('✅ Missed dose check completed');
    return BackgroundFetch.BackgroundFetchResult.NewData;
    
  } catch (error) {
    console.error('❌ Error in missed dose checker:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// **TASK 2: INTELLIGENT DAILY RESET WITH ANALYTICS**
TaskManager.defineTask(DAILY_RESET_TASK, async () => {
  try {
    console.log('🌅 === DAILY RESET TASK STARTED ===');
    
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Calculate yesterday's adherence metrics before reset
    const adherenceData = await calculateDailyAdherence(currentUser.id, yesterdayStr);
    
    // Store adherence metrics
    if (adherenceData.total_medications > 0) {
      await executeQuery(`
        INSERT OR REPLACE INTO adherence_metrics 
        (user_id, date, total_medications, taken_on_time, taken_late, missed, skipped, adherence_rate, average_delay_minutes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        currentUser.id,
        yesterdayStr,
        adherenceData.total_medications,
        adherenceData.taken_on_time,
        adherenceData.taken_late,
        adherenceData.missed,
        adherenceData.skipped,
        adherenceData.adherence_rate,
        adherenceData.average_delay_minutes
      ]);
      
      console.log(`📊 Adherence rate for ${yesterdayStr}: ${adherenceData.adherence_rate}%`);
      
      // Send weekly report if it's Sunday
      if (new Date().getDay() === 0) {
        await generateWeeklyReport(currentUser.id);
      }
    }
    
    // Clean up old statuses (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    await executeQuery(`
      DELETE FROM medication_statuses 
      WHERE user_id = ? AND date < ?
    `, [currentUser.id, cutoffDate]);
    
    console.log('🧹 Cleaned up old medication statuses');
    console.log('✅ Daily reset completed');
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
    
  } catch (error) {
    console.error('❌ Error in daily reset:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// **TASK 3: PROACTIVE ADHERENCE TRACKING**
TaskManager.defineTask(ADHERENCE_TRACKER, async () => {
  try {
    console.log('📈 === ADHERENCE TRACKER STARTED ===');
    
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) return;

    // Check recent adherence patterns
    const recentAdherence = await executeQuery(`
      SELECT * FROM adherence_metrics 
      WHERE user_id = ? 
      ORDER BY date DESC 
      LIMIT 7
    `, [currentUser.id]);

    if (recentAdherence.length >= 3) {
      const avgAdherence = recentAdherence.reduce((sum, day) => sum + day.adherence_rate, 0) / recentAdherence.length;
      
      // Alert if adherence is dropping
      if (avgAdherence < 80) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📉 Adherence Alert',
            body: `Your medication adherence is ${avgAdherence.toFixed(1)}%. Would you like tips to improve?`,
            data: { type: 'adherence-alert', rate: avgAdherence },
          },
          trigger: { seconds: 1 },
        });
      }
      
      // Positive reinforcement for good adherence
      if (avgAdherence >= 95) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎉 Excellent Adherence!',
            body: `You're maintaining ${avgAdherence.toFixed(1)}% adherence. Keep up the great work!`,
            data: { type: 'adherence-praise', rate: avgAdherence },
          },
          trigger: { seconds: 1 },
        });
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
    
  } catch (error) {
    console.error('❌ Error in adherence tracker:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// **HELPER FUNCTIONS**

async function calculateDailyAdherence(userId: number, date: string): Promise<AdherenceMetrics> {
  const statuses = await executeQuery(`
    SELECT status, delay_minutes FROM medication_statuses 
    WHERE user_id = ? AND date = ?
  `, [userId, date]);
  
  const total = statuses.length;
  const taken_on_time = statuses.filter(s => s.status === 'taken' && (s.delay_minutes || 0) <= 15).length;
  const taken_late = statuses.filter(s => s.status === 'late' || (s.status === 'taken' && (s.delay_minutes || 0) > 15)).length;
  const missed = statuses.filter(s => s.status === 'missed').length;
  const skipped = statuses.filter(s => s.status === 'skipped').length;
  
  const adherence_rate = total > 0 ? Math.round(((taken_on_time + taken_late) / total) * 100) : 0;
  const delays = statuses.filter(s => s.delay_minutes).map(s => s.delay_minutes);
  const average_delay_minutes = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
  
  return {
    user_id: userId,
    date,
    total_medications: total,
    taken_on_time,
    taken_late,
    missed,
    skipped,
    adherence_rate,
    average_delay_minutes
  };
}

async function generateWeeklyReport(userId: number) {
  const weeklyData = await executeQuery(`
    SELECT * FROM adherence_metrics 
    WHERE user_id = ? 
    ORDER BY date DESC 
    LIMIT 7
  `, [userId]);
  
  if (weeklyData.length > 0) {
    const avgAdherence = weeklyData.reduce((sum, day) => sum + day.adherence_rate, 0) / weeklyData.length;
    const totalMissed = weeklyData.reduce((sum, day) => sum + day.missed, 0);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Weekly Medication Report',
        body: `This week: ${avgAdherence.toFixed(1)}% adherence, ${totalMissed} missed doses. Tap for details.`,
        data: { 
          type: 'weekly-report', 
          adherence: avgAdherence,
          missed: totalMissed,
          weeklyData 
        },
      },
      trigger: { seconds: 1 },
    });
  }
}

// **INITIALIZATION FUNCTIONS**

export async function initializeBackgroundTasks() {
  try {
    console.log('🚀 Initializing professional background tasks...');
    
    // Register background fetch
    await BackgroundFetch.registerTaskAsync(MISSED_DOSE_CHECKER, {
      minimumInterval: 15 * 60, // Check every 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    await BackgroundFetch.registerTaskAsync(DAILY_RESET_TASK, {
      minimumInterval: 24 * 60 * 60, // Once daily
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    await BackgroundFetch.registerTaskAsync(ADHERENCE_TRACKER, {
      minimumInterval: 4 * 60 * 60, // Every 4 hours
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('✅ Background tasks registered successfully');
    
    // Create necessary database tables
    await createProfessionalTables();
    
  } catch (error) {
    console.error('❌ Error initializing background tasks:', error);
    throw error;
  }
}

async function createProfessionalTables() {
  try {
    // Enhanced medication statuses table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS medication_statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'skipped', 'late', 'pending')),
        scheduled_time TEXT NOT NULL,
        actual_time TEXT,
        delay_minutes INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(medication_id, user_id, date),
        FOREIGN KEY (medication_id) REFERENCES medications (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);
    
    // Adherence metrics table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS adherence_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        total_medications INTEGER NOT NULL,
        taken_on_time INTEGER NOT NULL,
        taken_late INTEGER NOT NULL,
        missed INTEGER NOT NULL,
        skipped INTEGER NOT NULL,
        adherence_rate REAL NOT NULL,
        average_delay_minutes REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);
    
    console.log('✅ Professional database tables created');
    
  } catch (error) {
    console.error('❌ Error creating professional tables:', error);
    throw error;
  }
}

export async function stopBackgroundTasks() {
  try {
    await BackgroundFetch.unregisterTaskAsync(MISSED_DOSE_CHECKER);
    await BackgroundFetch.unregisterTaskAsync(DAILY_RESET_TASK);
    await BackgroundFetch.unregisterTaskAsync(ADHERENCE_TRACKER);
    console.log('✅ Background tasks stopped');
  } catch (error) {
    console.error('❌ Error stopping background tasks:', error);
  }
}

// Export task names for external use
export { MISSED_DOSE_CHECKER, DAILY_RESET_TASK, ADHERENCE_TRACKER };