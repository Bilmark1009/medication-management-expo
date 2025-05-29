import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  email: string;
  address: string;
}

interface UserProfile {
  name: string;
  age: string;
  medicalConditions: string;
  email: string;
  profilePicture?: string;
  bloodType: string;
  allergies: string;
  emergencyContact: EmergencyContact;
  role: string;
}

const defaultProfile: UserProfile = {
  name: '',
  age: '',
  medicalConditions: '',
  email: '',
  profilePicture: undefined,
  bloodType: '',
  allergies: '',
  emergencyContact: {
    name: '',
    relationship: '',
    phoneNumber: '',
    email: '',
    address: '',
  },
  role: '',
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [profileOptionsVisible, setProfileOptionsVisible] = useState(false);
  const [viewProfileVisible, setViewProfileVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        // Merge with default profile to ensure all fields exist
        setProfile(prevProfile => ({
          ...defaultProfile,
          ...parsedUserData,
          emergencyContact: {
            ...defaultProfile.emergencyContact,
            ...(parsedUserData.emergencyContact || {}),
          },
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      setIsPickingImage(true);
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant camera roll permissions to update your profile picture',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // Save the image URI to the profile
        setProfile(prevProfile => ({
          ...prevProfile,
          profilePicture: result.assets[0].uri
        }));
        await AsyncStorage.setItem('currentUser', JSON.stringify(profile));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPickingImage(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveProfile = async () => {
    if (!profile.name || !profile.email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    if (!validateEmail(profile.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      // Save the profile data
      await AsyncStorage.setItem('currentUser', JSON.stringify(profile));
      
      // Show success message
      Alert.alert('Success', 'Profile updated successfully');
      
      // Exit edit mode
      setIsEditing(false);
      
      // Navigate back to landing screen to refresh the profile picture
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('isLoggedIn');
              await AsyncStorage.removeItem('currentUser');
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const renderSettingsItem = (
    icon: string,
    title: string,
    onPress: () => void,
    color: string = '#FF0000' // Default red color for icons
  ) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon as any} size={24} color={color} style={styles.icon} />
        <Text style={styles.settingsItemText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.profileImageContainer} onPress={() => setProfileOptionsVisible(true)}>
          {isPickingImage ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : profile.profilePicture ? (
            <Image source={{ uri: profile.profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={40} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Profile Options Modal */}
        <Modal
          visible={profileOptionsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileOptionsVisible(false)}
        >
          <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.6)'}} activeOpacity={1} onPress={() => setProfileOptionsVisible(false)}>
            <View style={{position:'absolute',top:'40%',left:'10%',right:'10%',backgroundColor:'#232323',borderRadius:18,padding:24,alignItems:'center',elevation:6}}>
              <Text style={{color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:18}}>Profile Options</Text>
              <TouchableOpacity style={{paddingVertical:12,width:'100%',alignItems:'center'}} onPress={() => { setProfileOptionsVisible(false); setViewProfileVisible(true); }}>
                <Text style={{color:'#F44336',fontSize:16}}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{paddingVertical:12,width:'100%',alignItems:'center'}} onPress={() => { setProfileOptionsVisible(false); pickImage(); }}>
                <Text style={{color:'#F44336',fontSize:16}}>Change Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{paddingVertical:12,width:'100%',alignItems:'center'}} onPress={() => setProfileOptionsVisible(false)}>
                <Text style={{color:'#fff',fontSize:16}}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* View Profile Picture Modal */}
        <Modal
          visible={viewProfileVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setViewProfileVisible(false)}
        >
          <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.95)',justifyContent:'center',alignItems:'center'}} activeOpacity={1} onPress={() => setViewProfileVisible(false)}>
            {profile.profilePicture ? (
              <Image source={{ uri: profile.profilePicture }} style={{width:280,height:280,borderRadius:140,borderWidth:4,borderColor:'#fff',marginBottom:24}} resizeMode="cover" />
            ) : (
              <View style={{width:280,height:280,borderRadius:140,backgroundColor:'#1A1A1A',justifyContent:'center',alignItems:'center',marginBottom:24}}>
                <Ionicons name="person" size={120} color="#fff" />
              </View>
            )}
            <Text style={{color:'#fff',fontSize:20,fontWeight:'bold',marginBottom:12}}>{profile.name || 'No Name'}</Text>
            <TouchableOpacity style={{backgroundColor:'#F44336',paddingVertical:10,paddingHorizontal:32,borderRadius:8,marginTop:12}} onPress={() => setViewProfileVisible(false)}>
              <Text style={{color:'#fff',fontSize:16}}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileRole}>{profile.role}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>Account Settings</Text>

        {renderSettingsItem(
          'person-outline',
          'Personal Information',
          () => navigation.navigate('PersonalInformation')
        )}

        {renderSettingsItem(
          'call-outline',
          'Emergency Contacts',
          () => navigation.navigate('EmergencyContacts')
        )}

        {renderSettingsItem(
          'shield-outline',
          'Privacy & Security',
          () => navigation.navigate('PrivacySecurity')
        )}

        {renderSettingsItem(
          'help-circle-outline',
          'Help & Support',
          () => navigation.navigate('HelpSupport')
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background
  },
  headerContainer: {
    backgroundColor: '#000000', // Black background for header
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF0000', // Red text for header title
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A', // Dark background for profile image container
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A', // Dark background for placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for profile name
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#CCCCCC', // Light gray text for profile role
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#000000', // Black background for scroll view
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF0000', // Red text for section titles
    marginTop: 30,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000', // Black background for loading container
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A', // Dark background for settings items
    padding: 16,
    marginVertical: 1,
    borderRadius: 12,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
    color: '#FF0000', // Red color for icons
  },
  settingsItemText: {
    fontSize: 16,
    color: '#FFFFFF', // White text for settings items
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A', // Dark background for sign-out button
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 16,
    color: '#FF0000', // Red text for sign-out button
    marginLeft: 8,
  },
});

export default ProfileScreen;