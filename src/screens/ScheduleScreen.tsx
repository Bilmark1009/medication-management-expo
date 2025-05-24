import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { LinearGradient } from 'expo-linear-gradient';

interface MedicationSchedule {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
}

interface DailySchedule {
  [key: string]: MedicationSchedule[];
}

const ScheduleScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [schedules, setSchedules] = useState<DailySchedule>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const savedSchedules = await AsyncStorage.getItem('medicationSchedules');
      if (savedSchedules) {
        setSchedules(JSON.parse(savedSchedules));
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      Alert.alert('Error', 'Failed to load medication schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMedicationTaken = async (medicationId: string) => {
    try {
      const updatedSchedules = { ...schedules };
      if (updatedSchedules[selectedDate]) {
        const medicationIndex = updatedSchedules[selectedDate].findIndex(
          med => med.id === medicationId
        );
        if (medicationIndex !== -1) {
          updatedSchedules[selectedDate][medicationIndex].taken = 
            !updatedSchedules[selectedDate][medicationIndex].taken;
          
          setSchedules(updatedSchedules);
          await AsyncStorage.setItem('medicationSchedules', JSON.stringify(updatedSchedules));
        }
      }
    } catch (error) {
      console.error('Error updating medication status:', error);
      Alert.alert('Error', 'Failed to update medication status');
    }
  };

  const renderCalendarHeader = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <View style={styles.calendarHeader}>
        {weekDays.map(day => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>
    );
  };

  const renderCalendar = () => {
    const monthStart = moment(currentMonth).startOf('month');
    const monthEnd = moment(currentMonth).endOf('month');
    const startDate = moment(monthStart).startOf('week');
    const endDate = moment(monthEnd).endOf('week');

    const calendar = [];
    let week = [];
    let day = startDate;

    while (day <= endDate) {
      const dateString = day.format('YYYY-MM-DD');
      const isCurrentMonth = day.month() === currentMonth.month();
      const isSelected = dateString === selectedDate;
      const hasMedications = schedules[dateString]?.length > 0;
      const allTaken = hasMedications && schedules[dateString]?.every(med => med.taken);
      const someTaken = hasMedications && schedules[dateString]?.some(med => med.taken);

      week.push(
        <TouchableOpacity
          key={dateString}
          style={[
            styles.calendarDay,
            !isCurrentMonth && styles.calendarDayDisabled,
            isSelected && styles.calendarDaySelected,
          ]}
          onPress={() => setSelectedDate(dateString)}
          disabled={!isCurrentMonth}
        >
          <Text style={[
            styles.calendarDayText,
            !isCurrentMonth && styles.calendarDayTextDisabled,
            isSelected && styles.calendarDayTextSelected,
          ]}>
            {day.date()}
          </Text>
          {hasMedications && (
            <View style={[
              styles.medicationDot,
              { backgroundColor: allTaken ? '#4CAF50' : someTaken ? '#FFA726' : '#F44336' }
            ]} />
          )}
        </TouchableOpacity>
      );

      if (week.length === 7) {
        calendar.push(
          <View key={day.format('YYYY-MM-DD')} style={styles.calendarWeek}>
            {week}
          </View>
        );
        week = [];
      }

      day = day.add(1, 'day');
    }

    if (week.length > 0) {
      calendar.push(
        <View key={day.format('YYYY-MM-DD')} style={styles.calendarWeek}>
          {week}
        </View>
      );
    }

    return calendar;
  };

  const renderTimeSlot = (time: string, medications: MedicationSchedule[]) => {
    const timeSlotMedications = medications.filter(med => med.time === time);
    if (timeSlotMedications.length === 0) return null;

    return (
      <View style={styles.timeSlot} key={time}>
        <View style={styles.timeHeader}>
          <Ionicons name="time-outline" size={20} color="#FF0000" />
          <Text style={styles.timeText}>{time}</Text>
        </View>
        {timeSlotMedications.map(medication => (
          <TouchableOpacity
            key={medication.id}
            style={[
              styles.medicationItem,
              medication.taken && styles.medicationTaken,
            ]}
            onPress={() => toggleMedicationTaken(medication.id)}
          >
            <View style={styles.medicationInfo}>
              <Text style={styles.medicationName}>{medication.name}</Text>
              <Text style={styles.medicationDosage}>{medication.dosage}</Text>
            </View>
            <Ionicons
              name={medication.taken ? "checkmark-circle" : "radio-button-off"}
              size={24}
              color={medication.taken ? "#4CAF50" : "#666"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#000000', '#000000']} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
        </View>
      </LinearGradient>
    );
  }

  const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const selectedDateMedications = schedules[selectedDate] || [];

  return (
    <LinearGradient colors={['#000000', '#000000']} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Schedule</Text>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={() => setCurrentMonth(moment(currentMonth).subtract(1, 'month'))}
            >
              <Ionicons name="chevron-back" size={24} color="#FF0000" />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {currentMonth.format('MMMM YYYY')}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentMonth(moment(currentMonth).add(1, 'month'))}
            >
              <Ionicons name="chevron-forward" size={24} color="#FF0000" />
            </TouchableOpacity>
          </View>
          {renderCalendarHeader()}
          {renderCalendar()}
        </View>

        <View style={styles.scheduleContainer}>
          <Text style={styles.dateHeader}>
            {moment(selectedDate).format('dddd, MMMM D, YYYY')}
          </Text>

          <ScrollView style={styles.scheduleList}>
            {selectedDateMedications.length === 0 ? (
              <View style={styles.noMedicationsContainer}>
                <Ionicons name="calendar-outline" size={48} color="#CCCCCC" />
                <Text style={styles.noMedicationsText}>
                  No medications scheduled for this day
                </Text>
              </View>
            ) : (
              timeSlots.map(time => renderTimeSlot(time, selectedDateMedications))
            )}
          </ScrollView>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF0000', // Red color for the header title
  },
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background for the container
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#1A1A1A', // Dark background for the calendar
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000', // Red color for the month and year text
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    color: '#FF0000', // Red color for the week day text
    fontSize: 14,
    fontWeight: '500',
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
  },
  calendarDaySelected: {
    backgroundColor: '#FF0000', // Red background for the selected day
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#FFFFFF', // White text for calendar days
  },
  calendarDayTextSelected: {
    color: '#FFFFFF', // White text for the selected day
  },
  calendarDayTextDisabled: {
    color: '#999',
  },
  medicationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  scheduleContainer: {
    flex: 1,
    padding: 16,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF0000', // Red color for the date header
    marginBottom: 16,
  },
  scheduleList: {
    flex: 1,
  },
  timeSlot: {
    backgroundColor: '#1A1A1A', // Dark background for time slots
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF0000', // Red color for time text
    marginLeft: 8,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333', // Darker border for medication items
  },
  medicationTaken: {
    opacity: 0.7,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF', // White text for medication names
  },
  medicationDosage: {
    fontSize: 14,
    color: '#CCCCCC', // Light gray for medication dosage
    marginTop: 4,
  },
  noMedicationsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  noMedicationsText: {
    fontSize: 16,
    color: '#CCCCCC', // Light gray for no medications text
    marginTop: 16,
    textAlign: 'center',
  },
});

export default ScheduleScreen;