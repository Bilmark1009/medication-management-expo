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
  Animated,
  Easing,
  Dimensions
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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    {
      name: '',
      relationship: '',
      phoneNumber: '',
      email: '',
      address: '',
    },
  ]);

  // Animation value for emergency button press
  const emergencyScale = new Animated.Value(1);

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

  useEffect(() => {
    loadContacts();
  }, []);

  const handleEmergencyPress = (type: 'call' | 'message', phoneNumber?: string) => {
    const contactNumber = phoneNumber || (contacts[0]?.phoneNumber || '');
    if (!contactNumber) return;

    const url = type === 'call' 
      ? `tel:${contactNumber}`
      : `sms:${contactNumber}`;

    Linking.openURL(url).catch(err => {
      console.error('Error opening URL:', err);
      Alert.alert('Error', 'Could not open the messaging app');
    });
    // Animation
    Animated.sequence([
      Animated.timing(emergencyScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(emergencyScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Find the first contact with a phone number
    const contact = contacts.find(c => c.phoneNumber);
    if (!contact) {
      Alert.alert('No Contact', 'Please add a contact with a phone number first.');
      return;
    }

    if (type === 'call') {
      Linking.openURL(`tel:${contact.phoneNumber}`);
    } else {
      Linking.openURL(`sms:${contact.phoneNumber}`);
    }
  };

  const getInputStyle = (isFocused: boolean, isDisabled: boolean) => [
    styles.input,
    isFocused && styles.inputFocused,
    isDisabled && styles.inputDisabled,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#FF3A44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            if (isEditing) {
              handleSave();
            }
            setIsEditing(!isEditing);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isEditing ? 'checkmark' : 'create-outline'}
            size={20}
            color="#FF3A44"
          />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['#0A0A0A', '#121212']}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >

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
                {isEditing ? (
                  <TextInput
                    style={getInputStyle(
                      focusedInput === `name-${index}`,
                      !isEditing
                    )}
                    value={contact.name}
                    onChangeText={(text) => updateContact(index, 'name', text)}
                    onFocus={() => setFocusedInput(`name-${index}`)}
                    onBlur={() => setFocusedInput(null)}
                    editable={isEditing}
                    placeholder="Contact name"
                    placeholderTextColor="#555555"
                    selectionColor="#FF3A44"
                  />
                ) : (
                  <Text style={styles.valueText}>
                    {contact.name || 'Not specified'}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship</Text>
                {isEditing ? (
                  <TextInput
                    style={getInputStyle(
                      focusedInput === `relationship-${index}`,
                      !isEditing
                    )}
                    value={contact.relationship}
                    onChangeText={(text) => updateContact(index, 'relationship', text)}
                    onFocus={() => setFocusedInput(`relationship-${index}`)}
                    onBlur={() => setFocusedInput(null)}
                    editable={isEditing}
                    placeholder="Relationship to contact"
                    placeholderTextColor="#555555"
                    selectionColor="#FF3A44"
                  />
                ) : (
                  <Text style={styles.valueText}>
                    {contact.relationship || 'Not specified'}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneContainer}>
                  {isEditing ? (
                    <TextInput
                      style={[
                        ...getInputStyle(
                          focusedInput === `phone-${index}`,
                          !isEditing
                        ),
                        styles.phoneInput
                      ]}
                      value={contact.phoneNumber}
                      onChangeText={(text) => updateContact(index, 'phoneNumber', text)}
                      onFocus={() => setFocusedInput(`phone-${index}`)}
                      onBlur={() => setFocusedInput(null)}
                      editable={isEditing}
                      keyboardType="phone-pad"
                      placeholder="Phone number"
                      placeholderTextColor="#555555"
                      selectionColor="#FF3A44"
                    />
                  ) : (
                    <View style={styles.phoneNumberRow}>
                      <Text style={styles.phoneNumberText}>
                        {contact.phoneNumber || 'Not specified'}
                      </Text>
                      {contact.phoneNumber && (
                        <View style={styles.phoneActions}>
                          <TouchableOpacity 
                            style={styles.phoneActionButton}
                            onPress={() => handleEmergencyPress('call', contact.phoneNumber)}
                          >
                            <Ionicons name="call" size={18} color="#FF3A44" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.phoneActionButton, { marginLeft: 12 }]}
                            onPress={() => handleEmergencyPress('message', contact.phoneNumber)}
                          >
                            <Ionicons name="chatbubbles" size={18} color="#FF3A44" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                {isEditing ? (
                  <TextInput
                    style={getInputStyle(
                      focusedInput === `email-${index}`,
                      !isEditing
                    )}
                    value={contact.email}
                    onChangeText={(text) => updateContact(index, 'email', text)}
                    onFocus={() => setFocusedInput(`email-${index}`)}
                    onBlur={() => setFocusedInput(null)}
                    editable={isEditing}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Email address"
                    placeholderTextColor="#555555"
                    selectionColor="#FF3A44"
                  />
                ) : (
                  <Text style={styles.valueText}>
                    {contact.email || 'Not specified'}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      ...getInputStyle(
                        focusedInput === `address-${index}`,
                        !isEditing
                      ),
                      styles.textArea
                    ]}
                    value={contact.address}
                    onChangeText={(text) => updateContact(index, 'address', text)}
                    onFocus={() => setFocusedInput(`address-${index}`)}
                    onBlur={() => setFocusedInput(null)}
                    editable={isEditing}
                    multiline
                    numberOfLines={4}
                    placeholder="Address"
                    placeholderTextColor="#555555"
                    selectionColor="#FF3A44"
                  />
                ) : (
                  <Text style={[styles.valueText, { lineHeight: 24 }]}>
                    {contact.address || 'Not specified'}
                  </Text>
                )}
              </View>
            </View>
          ))}

          {isEditing && (
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={addContact}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={22} color="#FF3A44" />
              <Text style={styles.addButtonText}>Add Contact</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
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
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF3A44',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 58, 68, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  contactCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3A44',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: '#A0A0A0',
    marginBottom: 2,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: 16,
    color: '#F5F5F5',
    marginTop: 4,
    lineHeight: 22,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  input: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#333333',
    color: '#F5F5F5',
    fontWeight: '500',
    lineHeight: 22,
    minHeight: 54, // Ensure consistent height
  },
  inputFocused: {
    borderColor: '#FF3A44',
    backgroundColor: '#252525',
  },
  inputDisabled: {
    backgroundColor: 'transparent',
    color: '#F5F5F5',
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 'auto',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54, // Match input height
  },
  phoneNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  phoneNumberText: {
    color: '#F5F5F5',
    fontSize: 16,
    flex: 1,
  },
  phoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneActionButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#252525',
  },
  phoneInput: {
    flex: 1,
  },
  callButton: {
    marginLeft: 12,
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    height: 50, // Match input height
    aspectRatio: 1, // Keep it square
  },
  callButtonActive: {
    backgroundColor: '#FF3A44',
    transform: [{ scale: 1.05 }],
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: 22,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#333333',
    borderStyle: 'dashed',
  },
  addButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#FF3A44',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  saveButton: {
    backgroundColor: '#FF3A44',
    margin: 20,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#FF3A44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  emergencyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  emergencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    minWidth: 0, // Ensure text can shrink below content size
  },
  emergencyButtonText: {
    marginLeft: 8,
    color: '#FF3A44',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.1,
    flexShrink: 1,
    includeFontPadding: false,
    textAlign: 'center',
  },
});

export default EmergencyContactsScreen;