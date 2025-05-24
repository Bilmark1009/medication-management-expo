import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type MedicationDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MedicationDetails'>;
type MedicationDetailsScreenRouteProp = RouteProp<RootStackParamList, 'MedicationDetails'>;

type Props = {
  navigation: MedicationDetailsScreenNavigationProp;
  route: MedicationDetailsScreenRouteProp & {
    params: {
      medication: {
        name: string;
        dosage: string;
        frequency: string;
        instructions?: string;
      };
    };
  };
};

const MedicationDetailsScreen: React.FC<Props> = ({ route }) => {
  const { medication } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{medication.name}</Text>
      <View style={styles.detailsContainer}>
        <Text style={styles.label}>Dosage:</Text>
        <Text style={styles.value}>{medication.dosage}</Text>
        
        <Text style={styles.label}>Frequency:</Text>
        <Text style={styles.value}>{medication.frequency}</Text>
        
        <Text style={styles.label}>Instructions:</Text>
        <Text style={styles.value}>{medication.instructions || 'No specific instructions'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  detailsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  value: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
});

export default MedicationDetailsScreen; 