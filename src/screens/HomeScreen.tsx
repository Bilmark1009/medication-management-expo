import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { executeQuery } from '../utils/database';
import { 
  checkMissedDosesToday, 
  calculateSimpleAdherence,
  markMedicationTaken,
  markMedicationSkipped 
} from '../services/backgroundTasks';

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  daily_status?: string;
  minutesLate?: number;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [medicationsTaken, setMedicationsTaken] = useState(0);
  const [medicationsRemaining, setMedicationsRemaining] = useState(0);
  const [adherencePercentage, setAdherencePercentage] = useState(0);
  const [upcomingMedications, setUpcomingMedications] = useState<Medication[]>([]);
  const [takenMedications, setTakenMedications] = useState<Set<string>>(new Set());
  const [skippedMedications, setSkippedMedications] = useState<Set<string>>(new Set());
  
  // **NEW: States for background task integration**
  const [missedDoses, setMissedDoses] = useState<Medication[]>([]);
  const [adherenceData, setAdherenceData] = useState({ adherence: 0, total: 0, taken: 0, missed: 0 });

  // **NEW: Check missed doses when screen focuses**
  useEffect(() => {
    const checkMissedDoses = async () => {
      try {
        const missed = await checkMissedDosesToday();
        setMissedDoses(missed);
        
        const adherence = await calculateSimpleAdherence(7); // Last 7 days
        setAdherenceData(adherence);
        setAdherencePercentage(adherence.adherence);
        
        console.log(`📊 Missed doses: ${missed.length}, Adherence: ${adherence.adherence}%`);
      } catch (error) {
        console.error('❌ Error checking missed doses:', error);
      }
    };

    // Check on focus
    const unsubscribe = navigation.addListener('focus', checkMissedDoses);
    
    // Check on initial load
    if (currentUser?.id) {
      checkMissedDoses();
    }

    return unsubscribe;
  }, [navigation, currentUser]);

  // **UPDATED: Handle take medicine with background task integration**
  const handleTakeMedicine = async (medicationId: string) => {
    try {
      const success = await markMedicationTaken(parseInt(medicationId));
      if (success) {
        // Update local state
        setTakenMedications(prev => new Set(prev).add(medicationId));
        setSkippedMedications(prev => {
          const newSet = new Set(prev);
          newSet.delete(medicationId);
          return newSet;
        });
        
        Alert.alert('Medicine Taken', 'Medication marked as taken.');
        
        // Refresh missed doses and adherence data
        const missed = await checkMissedDosesToday();
        setMissedDoses(missed);
        
        const adherence = await calculateSimpleAdherence(7);
        setAdherenceData(adherence);
        setAdherencePercentage(adherence.adherence);
      } else {
        Alert.alert('Error', 'Failed to mark medication as taken.');
      }
    } catch (error) {
      console.error('❌ Error taking medicine:', error);
      Alert.alert('Error', 'Failed to mark medication as taken.');
    }
  };

  // **UPDATED: Handle skip medicine with background task integration**
  const handleSkipMedicine = async (medicationId: string) => {
    try {
      const success = await markMedicationSkipped(parseInt(medicationId), 'User skipped');
      if (success) {
        // Update local state
        setSkippedMedications(prev => new Set(prev).add(medicationId));
        setTakenMedications(prev => {
          const newSet = new Set(prev);
          newSet.delete(medicationId);
          return newSet;
        });
        
        Alert.alert('Medicine Skipped', 'Medication marked as skipped.');
        
        // Refresh missed doses and adherence data
        const missed = await checkMissedDosesToday();
        setMissedDoses(missed);
        
        const adherence = await calculateSimpleAdherence(7);
        setAdherenceData(adherence);
        setAdherencePercentage(adherence.adherence);
      } else {
        Alert.alert('Error', 'Failed to mark medication as skipped.');
      }
    } catch (error) {
      console.error('❌ Error skipping medicine:', error);
      Alert.alert('Error', 'Failed to mark medication as skipped.');
    }
  };

  // Load medications whenever currentUser changes
  useEffect(() => {
    if (currentUser?.id) {
      console.log('Current user available, loading medications for user ID:', currentUser.id);
      loadMedicationData();
    } else {
      console.log('No current user available, not loading medications');
    }
  }, [currentUser]);

  // Handle initial load and focus events
  useEffect(() => {
    const loadData = async () => {
      console.log('Loading current user...');
      await loadCurrentUser();
    };

    // Initial load
    loadData();

    // Set up focus listener
    const unsubscribe = navigation.addListener('focus', loadData);

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  // Load the current user from AsyncStorage
  const loadCurrentUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      if (!userJson) {
        // No user logged in, redirect to login
        navigation.replace('Login');
        return;
      }

      const userData = JSON.parse(userJson);
      if (!userData?.id) {
        // Invalid user data, redirect to login
        await AsyncStorage.removeItem('currentUser');
        navigation.replace('Login');
        return;
      }

      // Set the current user in state
      setCurrentUser({
        id: userData.id,
        name: userData.name || 'User',
        email: userData.email
      });
      setUserName(userData.name || 'User');
      
    } catch (error) {
      console.error('Error loading user data:', error);
      // On error, clear user data and redirect to login
      await AsyncStorage.removeItem('currentUser');
      navigation.replace('Login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMedicationData = async () => {
    console.log('loadMedicationData called, currentUser:', currentUser);
    if (!currentUser?.id) {
      console.log('No current user ID, skipping medication load');
      return;
    }
    
    try {
      console.log(`Fetching medications for user ID: ${currentUser.id}`);
      const medications = await executeQuery(
        'SELECT * FROM medications WHERE user_id = ?;',
        [currentUser.id]
      ) as Medication[];
      
      console.log('Raw medications data from DB:', medications);
      
      if (!medications || medications.length === 0) {
        console.log('No medications found for this user');
      } else {
        console.log(`Found ${medications.length} medications`);
        medications.forEach((med, index) => {
          console.log(`Medication ${index + 1}:`, {
            id: med.id,
            name: med.name,
            time: med.time,
            frequency: med.frequency,
            dosage: med.dosage,
            daily_status: med.daily_status
          });
        });
      }
      
      setUpcomingMedications(medications || []);
    } catch (error) {
      console.error('Error loading medication data from SQLite:', error);
      setUpcomingMedications([]);
    }
  };

  // **NEW: Render missed doses card**
  const renderMissedDoses = () => {
    if (missedDoses.length === 0) return null;

    return (
      <View style={styles.missedDosesCard}>
        <View style={styles.missedDosesHeader}>
          <Ionicons name="warning" size={24} color="#FF6B6B" />
          <Text style={styles.missedDosesTitle}>Missed Medications</Text>
        </View>
        <Text style={styles.missedDosesSubtitle}>
          You have {missedDoses.length} medication{missedDoses.length > 1 ? 's' : ''} that you missed today
        </Text>
        {missedDoses.map((med) => (
          <View key={med.id} style={styles.missedDoseItem}>
            <View style={styles.missedDoseInfo}>
              <Text style={styles.missedDoseName}>{med.name}</Text>
              <Text style={styles.missedDoseTime}>
                Due: {new Date(`${new Date().toISOString().split('T')[0]}T${med.time}`).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
                {med.minutesLate && ` (${med.minutesLate} min late)`}
              </Text>
              <Text style={styles.missedDoseDosage}>{med.dosage}</Text>
            </View>
            <View style={styles.missedDoseActions}>
              <TouchableOpacity 
                style={styles.takeNowButton}
                onPress={() => handleTakeMedicine(med.id.toString())}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.takeNowText}>Take Now</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={() => handleSkipMedicine(med.id.toString())}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.key === 'header') {
      return null;
    }
    return (
      <UpcomingMedicationItem
        item={item}
        now={new Date()}
        handleTakeMedicine={handleTakeMedicine}
        handleSkipMedicine={handleSkipMedicine}
      />
    );
  };

  // Animated item for upcoming medications
  const UpcomingMedicationItem = ({ item, now, handleTakeMedicine, handleSkipMedicine }) => {
    const [fadeAnim] = React.useState(new Animated.Value(1));
    const medTime = new Date(item.time);
    const minsDiff = Math.round((medTime.getTime() - now.getTime()) / 60000);
    let timeColor = '#10B981';
    if (minsDiff < 0) timeColor = '#EF4444';
    else if (minsDiff < 60) timeColor = '#F59E0B';

    const handleAction = (type: 'take' | 'skip') => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        if (type === 'take') {
          handleTakeMedicine(item.id);
        } else {
          handleSkipMedicine(item.id);
        }
      });
    };

    return (
      <Animated.View style={[styles.upcomingItem, { opacity: fadeAnim }]}> 
      <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <View style={styles.upcomingDetails}>
          <Text style={styles.upcomingMedName}>{item.name}</Text>
          <Text style={[styles.upcomingMedTime, { color: timeColor }]}> 
            {moment(item.time).format('h:mm A')} {minsDiff < 0 ? '(Overdue)' : minsDiff < 60 ? '(Soon)' : ''}
          </Text>
          <Text style={styles.upcomingMedDose}>{item.dosage}</Text>
        </View>
        <View style={styles.upcomingActions}>
          <TouchableOpacity
            style={[styles.upcomingBtn, styles.upcomingBtnTake]}
            onPress={() => handleAction('take')}
            accessibilityLabel={`Take ${item.name}`}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.upcomingBtn, styles.upcomingBtnSkip]}
            onPress={() => handleAction('skip')}
            accessibilityLabel={`Skip ${item.name}`}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
    );
  };

  // Helper: get upcoming meds sorted by time (next 12h, not taken or skipped)
  const getUpcomingMedications = () => {
    const now = new Date();
    // Only show meds due in next 12 hours and not yet taken/skipped
    return upcomingMedications
      .filter(med => {
        const medDate = new Date(med.time);
        return (
          medDate > now &&
          medDate.getTime() - now.getTime() < 12 * 60 * 60 * 1000 &&
          !takenMedications.has(med.id) &&
          !skippedMedications.has(med.id) &&
          med.daily_status !== 'taken' &&
          med.daily_status !== 'skipped'
        );
      })
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  };

  // Render Upcoming Medications Card
  const renderUpcomingMedications = () => {
    const items = getUpcomingMedications();
    const now = new Date();
    // Count due in next hour
    const dueSoon = items.filter(med => new Date(med.time).getTime() - now.getTime() < 60 * 60 * 1000).length;
    return (
      <View style={styles.upcomingCard}>
        <Text style={styles.upcomingTitle}>Upcoming Medications</Text>
        <Text style={styles.upcomingInfoText}>
          {items.length === 0
            ? 'No upcoming medications in the next 12 hours.'
            : dueSoon > 0
              ? `You have ${dueSoon} medication${dueSoon > 1 ? 's' : ''} due in the next hour.`
              : `You have ${items.length} upcoming medication${items.length > 1 ? 's' : ''}.`}
        </Text>
        <View style={styles.upcomingListContainer}>
          {items.length === 0 ? (
            <Text style={styles.upcomingEmptyText}>All caught up! 🎉</Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              style={{ maxHeight: 220 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <UpcomingMedicationItem
                  item={item}
                  now={now}
                  handleTakeMedicine={handleTakeMedicine}
                  handleSkipMedicine={handleSkipMedicine}
                />
              )}
            />
          )}
        </View>
      </View>
    );
  };

  // **UPDATED: Calculate today's medication statistics using background task data**
  const calculateMedicationStats = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Use adherence data from background task
    const total = adherenceData.total || 0;
    const taken = adherenceData.taken || 0;
    const missed = adherenceData.missed || 0;
    const remaining = Math.max(0, total - taken - missed);

    // Calculate adherence for today
    const adherence = adherenceData.adherence || 0;

    return {
      total,
      taken,
      skipped: missed, // In simplified version, missed includes skipped
      remaining,
      adherence
    };
  };

  const renderDailyOverview = () => {
    const stats = calculateMedicationStats();
    const adherenceColor = stats.adherence >= 80 ? '#10B981' : stats.adherence >= 50 ? '#F59E0B' : '#EF4444';
    const cardBackground = '#1E1E1E';
    const textPrimary = '#FFFFFF';
    const textSecondary = '#9CA3AF';
    
    return (
      <View style={[styles.dashboardContainer, { backgroundColor: cardBackground, paddingVertical: 8 }]}>
        <View style={styles.dashboardHeader}>
          <Text style={[styles.dashboardTitle, { color: textPrimary }]}>Today's Meds</Text>
          <Text style={[styles.dashboardSubtitle, { color: textSecondary }]}>
            {moment().format('dddd, MMMM D')}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          {/* Redesigned horizontal metrics row */}
          <View style={styles.metricsRowCompact}>
            {[
              {icon: 'checkmark-circle', color: '#10B981', bg: 'rgba(16,185,129,0.10)', value: stats.taken, label: 'Taken'},
              {icon: 'close-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.10)', value: stats.skipped, label: 'Missed'},
              {icon: 'time-outline', color: '#9CA3AF', bg: 'rgba(156,163,175,0.10)', value: stats.remaining, label: 'Remaining'},
              {icon: 'calendar', color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', value: stats.total, label: 'Total Today'}
            ].map((item, idx) => (
              <View key={item.label} style={styles.metricItemCompact}>
                <View style={[styles.metricIconCompact, { backgroundColor: item.bg }]}> 
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={[styles.metricValueCompact, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.metricLabelCompact}>{item.label}</Text>
              </View>
            ))}
          </View>
          {/* Divider for clarity */}
          <View style={styles.metricsDivider} />
          {/* Compact progress section visually integrated */}
          <View style={styles.progressSectionCompact}>
            <View style={styles.progressHeaderCompact}>
              <Text style={styles.progressTitleCompact}>Weekly Adherence</Text>
              <Text style={[styles.progressPercentageCompact, { color: adherenceColor }]}>{stats.adherence}%</Text>
            </View>
            <View style={styles.progressBarContainerCompact}>
              <View style={[styles.progressBarCompact, { 
                width: `${Math.min(100, Math.max(0, stats.adherence))}%`, 
                backgroundColor: adherenceColor, 
              }]} />
            </View>
            <Text style={styles.progressSubtitleCompact}>
              {stats.adherence === 100 ? 'Perfect! All medications taken' : 
               stats.adherence >= 80 ? 'Good job! Keep it up' : 
               stats.adherence >= 50 ? 'You can do better' : 'Time to take your meds'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.greeting}>Hello, {userName}!</Text>
          <Text style={styles.subHeader}>Today is {moment().format('dddd, MMMM D, YYYY')}</Text>
        </View>
        <FlatList
          data={[{ key: 'header' }]}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={
            <>
              {renderMissedDoses()}
              {renderDailyOverview()}
              {renderUpcomingMedications()}
            </>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // **NEW: Missed doses card styles**
  missedDosesCard: {
    backgroundColor: '#2A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  missedDosesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  missedDosesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  missedDosesSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 12,
  },
  missedDoseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  missedDoseInfo: {
    flex: 1,
  },
  missedDoseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  missedDoseTime: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 2,
  },
  missedDoseDosage: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  missedDoseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  takeNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  takeNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Upcoming Medications card
  upcomingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
    fontFamily: 'System',
  },
  upcomingInfoText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 6,
    fontFamily: 'System',
  },
  upcomingListContainer: {
    maxHeight: 220,
    minHeight: 36,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245,245,245,0.85)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  upcomingDetails: {
    flex: 1,
    minWidth: 0,
  },
  upcomingMedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 0,
    fontFamily: 'System',
  },
  upcomingMedTime: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 0,
    fontFamily: 'System',
  },
  upcomingMedDose: {
    fontSize: 12,
    color: '#636366',
    fontFamily: 'System',
  },
  upcomingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  upcomingBtn: {
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 13,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  upcomingBtnTake: {
    backgroundColor: '#10B981',
  },
  upcomingBtnSkip: {
    backgroundColor: '#EF4444',
  },
  upcomingEmptyText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 12,
  },

  // Compact metrics row
  metricsRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 6,
    paddingVertical: 0,
  },
  metricItemCompact: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
    minWidth: 56,
    maxWidth: 80,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  metricIconCompact: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricValueCompact: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 0,
    marginTop: 0,
    fontFamily: 'System',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  metricLabelCompact: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: -0.2,
    fontFamily: 'System',
    marginTop: 0,
    lineHeight: 12,
  },
  metricsDivider: {
    height: 1,
    backgroundColor: 'rgba(200,200,200,0.10)',
    marginVertical: 6,
    borderRadius: 1,
  },
  // Compact progress section
  progressSectionCompact: {
    marginTop: 0,
    paddingTop: 6,
    borderTopWidth: 0,
    alignItems: 'stretch',
  },
  progressHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  progressTitleCompact: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    letterSpacing: -0.2,
    fontFamily: 'System',
  },
  progressPercentageCompact: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'System',
  },
  progressBarContainerCompact: {
    height: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 2,
    marginTop: 2,
  },
  progressBarCompact: {
    height: '100%',
    backgroundColor: '#4A6CF7',
    borderRadius: 3,
  },
  progressSubtitleCompact: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
    marginTop: 2,
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 14,
  },

  container: {
    flex: 1,
    padding: 16,
  },
  gradient: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  subHeader: {
    fontSize: 16,
    color: '#9CA3AF',
    fontFamily: 'System',
  },
  // Today's Meds Section
  dashboardContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dashboardHeader: {
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'System',
  },
  statsContainer: {
    marginTop: 8,
  },
  contentContainer: {
    paddingBottom: 80,
  },
});

export default HomeScreen;