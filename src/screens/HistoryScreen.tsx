import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { executeQuery } from '../utils/database'; // Assuming executeQuery is imported from a database utility file
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  taken: boolean;
  id: string;
  date: string;
}

const HistoryScreen = () => {
  const [medicationHistory, setMedicationHistory] = useState<Medication[]>([]);

  useEffect(() => {
    loadMedicationHistory();
  }, []);

  const loadMedicationHistory = async () => {
    try {
      const result = await executeQuery('SELECT * FROM medication_history ORDER BY date DESC;', []);
      const history = result.rows._array;
      setMedicationHistory(history);
    } catch (error) {
      console.error('Error loading medication history from SQLite:', error);
    }
  };

  const renderHistoryItem = ({ item }: { item: Medication }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{item.name}</Text>
          <Text style={styles.medicationDetails}>{item.dosage} - {item.frequency}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={item.taken ? "checkmark-circle" : "close-circle"} 
            size={24} 
            color={item.taken ? "#4CAF50" : "#FF0000"} 
          />
          <Text style={[styles.statusText, { color: item.taken ? "#4CAF50" : "#FF0000" }]}>
            {item.taken ? "Taken" : "Missed"}
          </Text>
        </View>
      </View>
      <View style={styles.historyFooter}>
        <Text style={styles.dateText}>
          {moment(item.date).format('MMMM D, YYYY h:mm A')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medication History</Text>
        <Text style={styles.subtitle}>Track your medication adherence</Text>
      </View>
      
      {medicationHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color="#FF0000" />
          <Text style={styles.emptyStateText}>No history available</Text>
          <Text style={styles.emptyStateSubtext}>
            Your medication history will appear here once you start taking medications
          </Text>
        </View>
      ) : (
        <FlatList
          data={medicationHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  listContainer: {
    paddingBottom: 16,
  },
  historyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  medicationDetails: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  statusContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    marginTop: 4,
  },
  historyFooter: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
  },
});

export default HistoryScreen;