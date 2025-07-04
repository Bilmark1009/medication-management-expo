import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { executeQuery } from '../utils/database'; // Assuming executeQuery is imported from a database utility file
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';

interface Medication {
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  status: 'taken' | 'missed';
  id: string;
  date: string;
}

const mockHistory: Medication[] = [
  {
    id: '1',
    name: 'Ibuprofen',
    form: 'Tablet',
    dosage: '200mg',
    frequency: 'Every 6 hours',
    status: 'taken',
    date: '2025-05-29T09:05:00',
  },
  {
    id: '2',
    name: 'Vitamin D',
    form: 'Capsule',
    dosage: '1000 IU',
    frequency: 'Daily',
    status: 'missed',
    date: '2025-05-29T08:00:00',
  },
  {
    id: '3',
    name: 'Paracetamol',
    form: 'Tablet',
    dosage: '500mg',
    frequency: 'Twice daily',
    status: 'taken',
    date: '2025-05-28T14:10:00',
  },
  {
    id: '4',
    name: 'Aspirin',
    form: 'Tablet',
    dosage: '100mg',
    frequency: 'Once daily',
    status: 'missed',
    date: '2025-05-27T07:30:00',
  },
  {
    id: '5',
    name: 'Metformin',
    form: 'Tablet',
    dosage: '850mg',
    frequency: 'Twice daily',
    status: 'taken',
    date: '2025-05-27T19:05:00',
  },
];

const HistoryScreen = () => {
  const [medicationHistory] = useState(mockHistory);
  const [search, setSearch] = useState('');

  // Adherence summary calculation
  const takenCount = medicationHistory.filter(m => m.status === 'taken').length;
  const totalCount = medicationHistory.length;
  const adherence = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  // Filtered list based on search
  const filteredHistory = medicationHistory.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

   const renderHistoryItem = ({ item }: { item: Medication }) => (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{item.name}</Text>
            <Text style={styles.medicationDetails}>
              {item.dosage} • {item.form} • {item.frequency}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            {item.status === 'taken' ? (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            ) : (
              <Ionicons name="close-circle" size={24} color="#FF0000" />
            )}
            <Text 
              style={[
                styles.statusText, 
                { color: item.status === 'taken' ? "#4CAF50" : "#FF0000" }
              ]}
            >
              {item.status === 'taken' ? 'Taken' : 'Missed'}
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
      <View style={styles.contentContainer}>
        <View style={styles.summaryBox}>
          <Ionicons name="stats-chart-outline" size={22} color="#4CAF50" style={{marginRight: 8}} />
          <Text style={styles.summaryText}>
            Adherence: <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>{adherence}%</Text>
            <Text style={{color: '#fff'}}>  ({takenCount}/{totalCount} taken)</Text>
          </Text>
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#aaa" style={{marginLeft: 8, marginRight: 4}} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by medication name"
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#FF0000" />
            <Text style={styles.emptyStateText}>No history found</Text>
            <Text style={styles.emptyStateSubtext}>
              No medications match your search.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.listContainer}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={true}
            bounces={true}
            nestedScrollEnabled={true}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
  },
  contentContainer: {
    flexGrow: 1,
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
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignSelf: 'center',
  },
  summaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 8,
    marginBottom: 18,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  searchInput: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
    marginLeft: 4,
    paddingVertical: 4,
  },
  listContainer: {
    paddingBottom: 24,
    flexGrow: 1,
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
  noteText: {
    fontSize: 13,
    color: '#FFC107',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
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