import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';

interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  email: string;
  address: string;
}

type EmergencyContactsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmergencyContacts'>;
};

const EmergencyContactsScreen: React.FC<EmergencyContactsScreenProps> = ({ navigation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([{
    name: '',
    relationship: '',
    phoneNumber: '',
    email: '',
    address: '',
  }]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await AsyncStorage.getItem('emergencyContacts');
      if (data) {
        setContacts(JSON.parse(data));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load emergency contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (contacts.some(contact => !contact.name || !contact.phoneNumber)) {
      Alert.alert('Error', 'Name and phone number are required for all contacts');
      return;
    }

    setIsSaving(true);
    try {
      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(contacts));
      setIsEditing(false);
      Alert.alert('Success', 'Emergency contacts updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const addContact = () => {
    setContacts([
      ...contacts,
      {
        name: '',
        relationship: '',
        phoneNumber: '',
        email: '',
        address: '',
      },
    ]);
  };

  const removeContact = (index: number) => {
    const newContacts = [...contacts];
    newContacts.splice(index, 1);
    setContacts(newContacts);
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FF0000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons
            name={isEditing ? "checkmark" : "create-outline"}
            size={24}
            color="#FF0000"
            onPress={isEditing ? handleSave : undefined}
          />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['#000000', '#000000']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content}>
          {contacts.map((contact, index) => (
            <View key={index} style={styles.contactCard}>
              {isEditing && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeContact(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={contact.name}
                  onChangeText={(text) => updateContact(index, 'name', text)}
                  editable={isEditing}
                  placeholder="Contact name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={contact.relationship}
                  onChangeText={(text) => updateContact(index, 'relationship', text)}
                  editable={isEditing}
                  placeholder="Relationship to contact"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneContainer}>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled, styles.phoneInput]}
                    value={contact.phoneNumber}
                    onChangeText={(text) => updateContact(index, 'phoneNumber', text)}
                    editable={isEditing}
                    keyboardType="phone-pad"
                    placeholder="Phone number"
                  />
                  {!isEditing && contact.phoneNumber && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => Linking.openURL(`tel:${contact.phoneNumber}`)}
                    >
                      <Ionicons name="call" size={24} color="#FF0000" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={contact.email}
                  onChangeText={(text) => updateContact(index, 'email', text)}
                  editable={isEditing}
                  keyboardType="email-address"
                  placeholder="Email address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
                  value={contact.address}
                  onChangeText={(text) => updateContact(index, 'address', text)}
                  editable={isEditing}
                  multiline
                  numberOfLines={4}
                  placeholder="Address"
                />
              </View>
            </View>
          ))}

          {isEditing && (
            <TouchableOpacity style={styles.addButton} onPress={addContact}>
              <Ionicons name="add-circle" size={24} color="#FF0000" />
              <Text style={styles.addButtonText}>Add Contact</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  backButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contactCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444444',
    color: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#444444',
    color: '#666666',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
  },
  callButton: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: '#FF0000',
    borderRadius: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FF0000',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#FF0000',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmergencyContactsScreen;