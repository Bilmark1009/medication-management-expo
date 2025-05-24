import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { RootStackParamList, Medication } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { StackScreenProps } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { executeQuery } from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update Props type to use StackScreenProps
type AddMedicationScreenProps = {
  navigation: any;
  route: {
    params?: {
      onAddMedication?: (medication: Medication) => void;
    };
  };
};

const AddMedicationScreen: React.FC<AddMedicationScreenProps> = ({ navigation, route }) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [instructions, setInstructions] = useState('');
  const [time, setTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMedication = async () => {
    if (!name || !dosage || !frequency) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    // Get current user from AsyncStorage
    const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not logged in');
      setIsLoading(false);
      return;
    }

    const newMedication: Medication = {
      id: Date.now().toString(),
      name,
      dosage,
      frequency,
      instructions: instructions || undefined,
      time: time.toISOString(),
    };

    try {
      // Insert the new medication into the SQLite database
      await executeQuery(
        `INSERT INTO medications (id, user_id, name, dosage, frequency, time, instructions) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          newMedication.id,
          currentUser.id,
          newMedication.name,
          newMedication.dosage,
          newMedication.frequency,
          newMedication.time,
          newMedication.instructions || null,
        ]
      );

      // Call the callback to update the medication list
      route.params?.onAddMedication?.(newMedication);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add medication');
      console.error('SQLite Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#000000', '#000000']}
      style={styles.gradient}
    >
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <Text style={styles.label}>Medication Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter medication name"
            editable={!isLoading}
          />

          <Text style={styles.label}>Dosage *</Text>
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={setDosage}
            placeholder="Enter dosage (e.g., 100mg)"
            editable={!isLoading}
          />

          <Text style={styles.label}>Frequency *</Text>
          <TextInput
            style={styles.input}
            value={frequency}
            onChangeText={setFrequency}
            placeholder="Enter frequency (e.g., Once daily)"
            editable={!isLoading}
          />

          <Text style={styles.label}>Time *</Text>
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              if (selectedTime) {
                setTime(selectedTime);
              }
            }}
          />

          <Text style={styles.label}>Instructions</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Enter any special instructions"
            multiline
            numberOfLines={4}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.addButton, isLoading && styles.disabledButton]}
            onPress={handleAddMedication}
            disabled={isLoading}
          >
            <Text style={styles.addButtonText}>
              {isLoading ? 'Adding...' : 'Add Medication'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  gradient: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#f4511e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddMedicationScreen;