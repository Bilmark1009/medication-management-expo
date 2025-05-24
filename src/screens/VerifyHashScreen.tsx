import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { findUserByEmail } from '../utils/database';

type VerifyHashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerifyHash'>;
type VerifyHashScreenRouteProp = RouteProp<RootStackParamList, 'VerifyHash'>;

interface VerifyHashScreenProps {
  route: VerifyHashScreenRouteProp & {
    params: {
      email: string;
      password: string;
      fromRegistration?: boolean;
    };
  };
  navigation: VerifyHashScreenNavigationProp;
}

const VerifyHashScreen: React.FC<VerifyHashScreenProps> = ({ route, navigation }) => {
  const { email, password } = route.params;
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    passwordHash: string;
    emailHash: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await findUserByEmail(email);
        if (user) {
          const emailHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256, 
            user.email
          );
          
          setUserData({
            name: user.name,
            email: user.email,
            passwordHash: user.password_hash,
            emailHash: emailHash
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [email]);

  const handleContinue = async () => {
    if (route.params?.fromRegistration) {
      // If coming from registration, go to login screen
      navigation.replace('Login');
    } else {
      try {
        // Get the full user data to include the ID
        const user = await findUserByEmail(email);
        if (!user) {
          throw new Error('User not found');
        }

        // Store authentication state with user ID
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('currentUser', JSON.stringify({
          id: user.id,  // Make sure to include the ID
          email: user.email,
          name: user.name,
        }));
        
        // Navigate to MainApp
        navigation.replace('MainApp');
      } catch (error) {
        console.error('Error during login:', error);
        Alert.alert('Error', 'Failed to complete login. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={60} color="#FF0000" />
            <Text style={styles.title}>Security Verification</Text>
            <Text style={styles.subtitle}>Your password has been securely hashed</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{userData?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email Hash:</Text>
              <Text style={[styles.value, styles.hashValue]} numberOfLines={1} ellipsizeMode="middle">
                {userData?.emailHash}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Password Hash:</Text>
              <Text style={[styles.value, styles.hashValue]} numberOfLines={1} ellipsizeMode="middle">
                {userData?.passwordHash}
              </Text>
            </View>
            <View style={styles.noteContainer}>
              <Ionicons name="shield-checkmark" size={18} color="#4CAF50" />
              <Text style={styles.noteText}>
                Your password is securely hashed and never stored in plain text.
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continue to App</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  label: {
    color: '#999',
    fontSize: 16,
    flex: 1,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    flex: 2,
    textAlign: 'right',
  },
  hashValue: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  noteText: {
    color: '#999',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  continueButton: {
    backgroundColor: '#FF0000',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default VerifyHashScreen;
