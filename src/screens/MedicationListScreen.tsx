import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Medication } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MedicationList'>;
}

const MedicationListScreen: React.FC<Props> = ({ navigation }) => {
  const [medications, setMedications] = useState<Medication[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMedications();
    });

    return unsubscribe;
  }, [navigation]);

  const loadMedications = async () => {
    try {
      const storedMedications = await AsyncStorage.getItem('medications');
      if (storedMedications) {
        setMedications(JSON.parse(storedMedications));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load medications');
    }
  };

  const handleDeleteMedication = async (id: string) => {
    const updatedMedications = medications.filter((med) => med.id !== id);
    setMedications(updatedMedications);
    await AsyncStorage.setItem('medications', JSON.stringify(updatedMedications));
  };

  const renderMedication = ({ item }: { item: Medication }) => (
    <View style={styles.medicationCard}>
      <View>
        <Text style={styles.medicationName}>{item.name}</Text>
        <Text style={styles.medicationDetails}>{item.dosage}</Text>
        <Text style={styles.medicationDetails}>{item.frequency}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteMedication(item.id)}
        style={styles.deleteButton}
      >
        <Ionicons name="trash" size={24} color="#FF0000" />
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#000000', '#000000']} style={styles.gradient}>
      <View style={styles.container}>
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id}
          renderItem={renderMedication}
          ListEmptyComponent={<Text style={styles.emptyText}>No medications added yet.</Text>}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMedication', {
            onAddMedication: (newMedication) => {
              setMedications((prevMedications) => [...prevMedications, newMedication]);
            },
          })}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  gradient: {
    flex: 1,
  },
  medicationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  medicationDetails: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FF0000',
    borderRadius: 32,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#CCCCCC',
    marginTop: 20,
  },
});

export default MedicationListScreen;