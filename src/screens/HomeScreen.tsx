import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { executeQuery } from '../utils/database';

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;

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

  const handleTakeMedicine = (medicationId: string) => {
    // Add to taken set and remove from skipped if it was there
    setTakenMedications(prev => new Set(prev).add(medicationId));
    setSkippedMedications(prev => {
      const newSet = new Set(prev);
      newSet.delete(medicationId);
      return newSet;
    });
    
    // Here you would typically update the database
    // For example: markMedicationAsTaken(medicationId);
    
    Alert.alert('Medicine Taken', `You have marked the medication as taken.`);
  };

  const handleSkipMedicine = (medicationId: string) => {
    // Add to skipped set and remove from taken if it was there
    setSkippedMedications(prev => new Set(prev).add(medicationId));
    setTakenMedications(prev => {
      const newSet = new Set(prev);
      newSet.delete(medicationId);
      return newSet;
    });
    
    // Here you would typically update the database
    // For example: markMedicationAsSkipped(medicationId);
    
    Alert.alert('Medicine Skipped', `You have chosen to skip this dose.`);
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
            dosage: med.dosage
          });
        });
      }
      
      setUpcomingMedications(medications || []);
    } catch (error) {
      console.error('Error loading medication data from SQLite:', error);
      setUpcomingMedications([]);
    }
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
          Alert.alert('Medication marked as taken!');
        } else {
          handleSkipMedicine(item.id);
          Alert.alert('Medication marked as skipped!');
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
          !skippedMedications.has(med.id)
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

  // Calculate today's medication statistics
  // Calculate today's medication statistics
  const calculateMedicationStats = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Helper to robustly get the date and time from med.time (supports ISO string or 'HH:mm')
    const getDateString = (timeStr: string) => {
      // If timeStr is ISO (2025-05-30T07:00:00.000Z), return date part
      if (timeStr.includes('T')) {
        return timeStr.split('T')[0];
      }
      // Else, fallback to today (used if only 'HH:mm' is stored)
      return today;
    };
    const getHourMinute = (timeStr: string) => {
      if (timeStr.includes('T')) {
        const d = new Date(timeStr);
        return [d.getHours(), d.getMinutes()];
      }
      // Assume 'HH:mm' format
      const [h, m] = timeStr.split(':').map(Number);
      return [h || 0, m || 0];
    };

    // Filter all doses scheduled for today (not just unique meds)
    const todayMedications = upcomingMedications.filter(med => {
      return getDateString(med.time) === today;
    });

    // Each dose (row) is counted, not just unique med names
    const takenCount = todayMedications.filter(med => takenMedications.has(med.id)).length;
    const skippedCount = todayMedications.filter(med => skippedMedications.has(med.id)).length;
    const remainingCount = todayMedications.length - takenCount - skippedCount;

    // Calculate adherence for doses that are in the past (time <= now)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const pastMedications = todayMedications.filter(med => {
      const [hours, minutes] = getHourMinute(med.time);
      return hours < currentHour || (hours === currentHour && minutes <= currentMinute);
    });
    const totalPastMeds = pastMedications.length;
    const takenPastMeds = pastMedications.filter(med => takenMedications.has(med.id)).length;
    const adherence = totalPastMeds > 0 ? Math.round((takenPastMeds / totalPastMeds) * 100) : 100;

    return {
      total: todayMedications.length,
      taken: takenCount,
      skipped: skippedCount,
      remaining: remainingCount,
      adherence: adherence
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
              {icon: 'close-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.10)', value: stats.skipped, label: 'Skipped'},
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
              <Text style={styles.progressTitleCompact}>Today's Adherence</Text>
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
  // ... rest of the styles below (keep all previous styles)

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
  dashboardDate: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'System',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 8,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'System',
  },
  // Progress Section
  progressContainer: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
  },

  // Card Container
  cardContainer: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B0000', // Red border for emphasis
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C5A14E', // Dark gold for major text
  },
  cardContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardContentText: {
    fontSize: 16,
    color: '#FFFFFF', // White for minor text
  },
  cardFooterText: {
    fontSize: 14,
    color: '#FFFFFF', // White for minor text
  },
  medicationCard: {
    backgroundColor: '#333333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C5A14E', // Dark gold for major text
  },
  medicationDetails: {
    fontSize: 14,
    color: '#FFFFFF', // White for minor text
  },
  medicationTime: {
    fontSize: 14,
    color: '#FFFFFF', // White for minor text
  },
  contentContainer: {
    paddingBottom: 80,
  },
  dashboardContainer: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    backgroundColor: '#23262F', // deep gray
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(60, 65, 80, 0.5)', // subtle border
    // Soft outer glow
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F4F6FB', // light for dark bg
    letterSpacing: -0.2,
    marginBottom: 4,
    fontFamily: 'System',
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#A1A7B3', // muted for subtitle
    fontWeight: '400',
    fontFamily: 'System',
  },
  statsContainer: {
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    marginHorizontal: -6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  statPill: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(74, 108, 247, 0.13)',
    borderWidth: 1.5,
    borderColor: '#313543',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F4F6FB',
    marginTop: 2,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 13,
    color: '#A1A7B3',
    fontWeight: '500',
    letterSpacing: -0.2,
    fontFamily: 'System',
  },
  progressSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A6CF7',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#313543',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
    marginTop: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A6CF7',
    borderRadius: 5,
    transitionProperty: 'width',
    transitionDuration: '0.4s',
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C5A14E', // Dark gold color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalScrollView: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 5,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
    height: 50,
    fontSize: 16,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  datePickerButton: {
    marginVertical: 10,
    backgroundColor: '#C5A14E',
    height: 50,
    justifyContent: 'center',
  },
  addButton: {
    marginTop: 10,
    backgroundColor: '#C5A14E',
    height: 50,
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: '#C5A14E',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;