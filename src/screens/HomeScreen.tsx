import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
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


  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentUser();
      loadMedicationData();
    });

    // Initial load
    loadCurrentUser();
    loadMedicationData();

    return unsubscribe;
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
    if (!currentUser?.id) return;
    
    try {
      const medications = await executeQuery(
        'SELECT * FROM medications WHERE user_id = ?;',
        [currentUser.id]
      ) as Medication[];
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
    return null;
  };

  const renderDailyOverview = () => {
    const totalMeds = medicationsTaken + medicationsRemaining;
    const adherenceColor = adherencePercentage >= 80 ? '#4CAF50' : adherencePercentage >= 50 ? '#FFC107' : '#F44336';
    const cardBackground = '#1E1E1E';
    const textPrimary = '#FFFFFF';
    const textSecondary = '#A0A0A0';
    
    return (
      <View style={[styles.dashboardContainer, { backgroundColor: cardBackground }]}>
        <View style={styles.dashboardHeader}>
          <Text style={[styles.dashboardTitle, { color: textPrimary }]}>Today's Meds</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <View style={[styles.statPill, { backgroundColor: 'rgba(76, 175, 80, 0.2)' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: textPrimary }]}>{medicationsTaken}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Taken</Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statPill, { backgroundColor: 'rgba(255, 160, 0, 0.2)' }]}>
                <Ionicons name="time-outline" size={14} color="#FFA000" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: textPrimary }]}>{medicationsRemaining}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Remaining</Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statPill, { backgroundColor: 'rgba(25, 118, 210, 0.2)' }]}>
                <Ionicons name="medical-outline" size={14} color="#1976D2" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: textPrimary }]}>{totalMeds}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Total</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: textSecondary }]}>Adherence</Text>
              <Text style={[styles.progressPercentage, { color: adherenceColor }]}>
                {adherencePercentage}%
              </Text>
            </View>
            <View style={[styles.progressBarContainer, { backgroundColor: '#333333' }]}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${Math.min(adherencePercentage, 100)}%`,
                    backgroundColor: adherenceColor
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderUpcomingMedications = () => {
    const formatTime = (dateString: string) => {
      try {
        // Try to parse the date string
        const date = new Date(dateString);
        // Return formatted time in 12-hour format with AM/PM
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch (error) {
        console.error('Error formatting time:', error);
        return dateString; // Return original if parsing fails
      }
    };

    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Upcoming Medications</Text>
        </View>
        {upcomingMedications.map((medication, index) => (
          <View key={index} style={styles.medicationCard}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            <Text style={styles.medicationDetails}>{medication.dosage} - {medication.frequency}</Text>
            <Text style={styles.medicationTime}>
              {formatTime(medication.time)}
            </Text>
          </View>
        ))}
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
  dashboardContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dashboardHeader: {
    marginBottom: 12,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'column',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  statLabel: {
    fontSize: 12,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statPill: {
    padding: 6,
    borderRadius: 8,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#C5A14E', // Dark gold progress bar
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  gradient: {
    flex: 1,
    backgroundColor: '#000000', // Black background
  },
  headerContainer: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C5A14E', // Dark gold for major text
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    color: '#FFFFFF', // White for minor text
    marginBottom: 16,
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#1A1A1A', // Darker background for cards
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
  fab: {
    position: 'absolute',
    bottom: 80, // Adjusted to place the FAB above the bottom tab
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