import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, Platform, Linking } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, Portal, Button, Provider } from 'react-native-paper';
import { TextInput } from 'react-native';
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
  const [medicationsTaken, setMedicationsTaken] = useState(0);
  const [medicationsRemaining, setMedicationsRemaining] = useState(0);
  const [adherencePercentage, setAdherencePercentage] = useState(0);
  const [upcomingMedications, setUpcomingMedications] = useState<Medication[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [time, setTime] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserName(); // Ensure this function is called when the screen is focused
      loadMedicationData();
    });

    return unsubscribe;
  }, [navigation]);

  // Fetch the first (and assumed current) user from personal_info. If none, fallback to 'Guest'.
  const loadUserName = async () => {
    try {
      // Query the first user in the table (id = 1 or LIMIT 1)
      const result = await executeQuery('SELECT name FROM personal_info ORDER BY id ASC LIMIT 1;', []);
      const user = await result.getFirstAsync();
      if (user && user.name) {
        setUserName(user.name);
      } else {
        setUserName('Guest');
      }
    } catch (error) {
      console.error('Error loading user name from SQLite:', error);
      setUserName('Guest');
    }
  };

  const loadMedicationData = async () => {
    try {
      const result = await executeQuery('SELECT * FROM medications;', []);
      const medications = await result.getAllAsync();
      setUpcomingMedications(medications);
    } catch (error) {
      console.error('Error loading medication data from SQLite:', error);
      setUpcomingMedications([]);
    }
  };

  const scheduleNotification = async (medication: Medication) => {
    try {
      // Parse the time string to get hours and minutes
      let scheduledTime = new Date(medication.time);
      const now = new Date();

      console.log(`Current time: ${now.toISOString()}`);
      console.log(`Scheduled time before adjustment: ${scheduledTime.toISOString()}`);

      // If the scheduled time is in the past for today, move it to the next day
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
        console.log(`Scheduled time adjusted to next day: ${scheduledTime.toISOString()}`);
      }

      const secondsUntilScheduled = Math.floor((scheduledTime.getTime() - now.getTime()) / 1000);

      console.log(`Seconds until scheduled: ${secondsUntilScheduled}`);

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication Reminder',
          body: `It's time to take your medication: ${medication.name}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: secondsUntilScheduled,
          channelId: 'medication-reminders',
        },
      });

      console.log('Scheduled medication notification:', {
        medication: medication.name,
        time: medication.time,
        notificationId,
        secondsUntilScheduled,
        scheduledTime: scheduledTime.toLocaleString(),
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const handleAddMedication = async () => {
    try {
      if (!name || !dosage || !frequency || !time) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const newMedication: Medication = {
        id: Date.now().toString(),
        name,
        dosage,
        frequency,
        time: selectedTime.toISOString(),
      };

      // Insert the new medication into the SQLite database
      await executeQuery(
        `INSERT INTO medications (id, name, dosage, frequency, time) VALUES (?, ?, ?, ?, ?);`,
        [
          newMedication.id,
          newMedication.name,
          newMedication.dosage,
          newMedication.frequency,
          newMedication.time,
        ]
      );

      const updatedMedications = [...upcomingMedications, newMedication];
      setUpcomingMedications(updatedMedications);

      // Reset form and close modal
      setName('');
      setDosage('');
      setFrequency('');
      setTime('');
      setSelectedTime(new Date());
      setIsModalVisible(false);

      Alert.alert('Success', 'Medication added successfully');
    } catch (error) {
      console.error('Error adding medication to SQLite:', error);
      Alert.alert('Error', 'Failed to add medication');
    }
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSelectedTime(selectedTime);
      const formattedTime = moment(selectedTime).format('hh:mm A');
      setTime(formattedTime);
      console.log('Selected time:', formattedTime);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.key === 'header') {
      return null;
    }
    return null;
  };

  const renderDailyOverview = () => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Daily Medication Overview</Text>
      </View>
      <View style={styles.cardContentRow}>
        <Text style={styles.cardContentText}>Taken: {medicationsTaken}</Text>
        <Text style={styles.cardContentText}>Remaining: {medicationsRemaining}</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${adherencePercentage}%` }]} />
      </View>
      <Text style={styles.cardFooterText}>{adherencePercentage}% adherence</Text>
    </View>
  );

  const renderUpcomingMedications = () => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Upcoming Medications</Text>
      </View>
      {upcomingMedications.map((medication, index) => (
        <View key={index} style={styles.medicationCard}>
          <Text style={styles.medicationName}>{medication.name}</Text>
          <Text style={styles.medicationDetails}>{medication.dosage} - {medication.frequency}</Text>
          <Text style={styles.medicationTime}>{medication.time}</Text>
        </View>
      ))}
    </View>
  );

  const renderAddMedicationModal = () => (
    <Portal>
      <Modal
        visible={isModalVisible}
        onDismiss={() => {
          setIsModalVisible(false);
          setName('');
          setDosage('');
          setFrequency('');
          setTime('');
          setSelectedTime(new Date());
        }}
        contentContainerStyle={styles.modalContent}
      >
        <ScrollView style={styles.modalScrollView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Medication</Text>
            <TouchableOpacity 
              onPress={() => {
                setIsModalVisible(false);
                setName('');
                setDosage('');
                setFrequency('');
                setTime('');
                setSelectedTime(new Date());
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Medication Name"
              placeholderTextColor="#666"
              autoCapitalize="words"
              returnKeyType="next"
            />

            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="Dosage (e.g., 500mg)"
              placeholderTextColor="#666"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <TextInput
              style={styles.input}
              value={frequency}
              onChangeText={setFrequency}
              placeholder="Frequency (e.g., Once daily)"
              placeholderTextColor="#666"
              autoCapitalize="words"
              returnKeyType="done"
            />

            <Button
              mode="contained"
              onPress={() => setShowTimePicker(true)}
              style={styles.datePickerButton}
            >
              {time || 'Select Time'}
            </Button>

            {showTimePicker && (
              <DateTimePicker
                mode="time"
                value={selectedTime}
                display="default"
                onChange={handleTimeChange}
                is24Hour={false}
              />
            )}

            <Button
              mode="contained"
              onPress={handleAddMedication}
              disabled={!name || !dosage || !frequency || !time}
              style={styles.addButton}
            >
              Add Medication
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );

  const testScheduledNotifications = async () => {
    try {
      // Cancel all existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all existing notifications before scheduling new ones');

      // Calculate future times
      const now = new Date();
      const fiveSecondsFromNow = new Date(now.getTime() + 5000);
      const oneMinuteFromNow = new Date(now.getTime() + 60000);

      // Schedule notification for 1 minute from now
      const testNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification scheduled for 1 minute from now',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: 60,
          channelId: 'medication-reminders',
        },
      });

      console.log('First notification scheduled with ID:', testNotificationId, 'for time:', oneMinuteFromNow.toISOString());

      // Schedule notification for 5 seconds from now
      const quickTestNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Medication Reminder',
          body: 'This is a test notification for your medication reminder!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: 5,
          channelId: 'medication-reminders',
        },
      });

      console.log('Second notification scheduled with ID:', quickTestNotificationId, 'for time:', fiveSecondsFromNow.toISOString());

      // Set up a listener for notification received
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        const receivedTime = new Date().toISOString();
        console.log('Notification received:', {
          id: notification.request.identifier,
          receivedTime,
          content: notification.request.content
        });
      });

      Alert.alert(
        'Test Notifications Scheduled',
        'Test notifications will be sent in 5 seconds and 1 minute. Check your device notifications.',
        [
          {
            text: 'View Scheduled',
            onPress: async () => {
              const notifications = await Notifications.getAllScheduledNotificationsAsync();
              console.log('Current scheduled notifications:', notifications.map(n => ({
                id: n.identifier,
                content: n.content,
                currentTime: new Date().toISOString()
              })));
              Alert.alert(
                'Scheduled Notifications',
                `Found ${notifications.length} scheduled notifications. Check console for details.`
              );
            },
          },
          {
            text: 'Cancel All',
            onPress: async () => {
              await Notifications.cancelAllScheduledNotificationsAsync();
              subscription.remove();
              console.log('Cancelled all notifications');
              Alert.alert('Success', 'All notifications cancelled');
            },
          },
          {
            text: 'OK',
            style: 'cancel',
            onPress: () => {
              // Remove the listener after 2 minutes
              setTimeout(() => {
                subscription.remove();
              }, 120000);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error testing notifications:', error);
      Alert.alert('Error', 'Failed to schedule test notifications');
    }
  };

  return (
    <Provider>
      <View style={styles.gradient}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.greeting}>Hello, {userName}!</Text>
            <Text style={styles.subHeader}>Today is {moment().format('dddd, MMMM D, YYYY')}</Text>
            <TouchableOpacity
              style={styles.testButton}
              onPress={testScheduledNotifications}
            >
              <Text style={styles.testButtonText}>Test Notifications</Text>
            </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setIsModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
          {renderAddMedicationModal()}
        </View>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
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
  progressBarContainer: {
    height: 10,
    backgroundColor: '#333333',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#C5A14E', // Dark gold progress bar
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