import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type PrivacySecurityScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PrivacySecurity'>;

interface PrivacySecurityScreenProps {
  navigation: PrivacySecurityScreenNavigationProp;
}

const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({ navigation }) => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const toggleBiometric = () => {
    const newValue = !biometricEnabled;
    setBiometricEnabled(newValue);
    
    if (newValue) {
      Alert.alert(
        'Biometric Authentication',
        'Please authenticate to enable biometric login',
        [
          { text: 'Cancel', onPress: () => setBiometricEnabled(false), style: 'cancel' },
          { text: 'Continue', onPress: () => Alert.alert('Success', 'Biometric authentication enabled') },
        ]
      );
    }
  };

  const toggleAppLock = () => {
    const newValue = !appLockEnabled;
    setAppLockEnabled(newValue);
    Alert.alert(
      newValue ? 'App Lock Enabled' : 'App Lock Disabled',
      newValue 
        ? 'The app will require authentication when opened.'
        : 'The app will open without requiring authentication.'
    );
  };

  const toggleAutoLogout = () => setAutoLogoutEnabled(!autoLogoutEnabled);
  const toggleAnalytics = () => setAnalyticsEnabled(!analyticsEnabled);

  const openPrivacyPolicy = () => {
    Linking.openURL('https://pillpal.example.com/privacy').catch(err =>
      Alert.alert('Error', 'Could not open privacy policy')
    );
  };

  const openTermsOfService = () => {
    Linking.openURL('https://pillpal.example.com/terms').catch(err =>
      Alert.alert('Error', 'Could not open terms of service')
    );
  };

  const SecurityItem = ({
    icon,
    title,
    description,
    onPress,
    showSwitch = false,
    switchValue = false,
    onSwitchValueChange = () => {},
  }: {
    icon: string;
    title: string;
    description: string;
    onPress?: () => void;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchValueChange?: (value: boolean) => void;
  }) => (
    <TouchableOpacity 
      style={styles.securityItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.securityItemLeft}>
        <Ionicons name={icon as any} size={24} color="#FF0000" />
        <View style={styles.securityTextContainer}>
          <Text style={styles.securityTitle}>{title}</Text>
          <Text style={styles.securityDescription}>{description}</Text>
        </View>
      </View>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchValueChange}
          trackColor={{ false: '#767577', true: '#FF6B6B' }}
          thumbColor={switchValue ? '#FF0000' : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FF0000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <SecurityItem
            icon="finger-print"
            title="Biometric Authentication"
            description="Use your fingerprint or face to log in"
            showSwitch
            switchValue={biometricEnabled}
            onSwitchValueChange={toggleBiometric}
          />
          
          <SecurityItem
            icon="lock-closed"
            title="App Lock"
            description="Require authentication when opening the app"
            showSwitch
            switchValue={appLockEnabled}
            onSwitchValueChange={toggleAppLock}
          />
          
          <SecurityItem
            icon="time"
            title="Auto-Logout"
            description="Automatically log out after 5 minutes of inactivity"
            showSwitch
            switchValue={autoLogoutEnabled}
            onSwitchValueChange={toggleAutoLogout}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          
          <SecurityItem
            icon="analytics"
            title="Usage Analytics"
            description="Help us improve by sharing anonymous usage data"
            showSwitch
            switchValue={analyticsEnabled}
            onSwitchValueChange={toggleAnalytics}
          />
          
          <SecurityItem
            icon="document-text"
            title="Privacy Policy"
            description="Read our privacy policy"
            onPress={openPrivacyPolicy}
          />
          
          <SecurityItem
            icon="document-text"
            title="Terms of Service"
            description="Read our terms of service"
            onPress={openTermsOfService}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <SecurityItem
            icon="log-out"
            title="Logout All Devices"
            description="Sign out of all devices"
            onPress={() => {
              Alert.alert(
                'Logout All Devices',
                'Are you sure you want to log out of all devices?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: () => Alert.alert('Success', 'You have been logged out of all devices')
                  },
                ]
              );
            }}
          />
          
          <SecurityItem
            icon="trash"
            title="Delete Account"
            description="Permanently delete your account and all data"
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('Account Deleted', 'Your account has been successfully deleted');
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    } 
                  },
                ]
              );
            }}
          />
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>App Version: 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 PillPal. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF0000',
    textAlign: 'center',
    flex: 1,
    marginRight: 32,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  securityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  securityTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  versionText: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 4,
  },
  copyrightText: {
    color: '#666666',
    fontSize: 12,
  },
});

export default PrivacySecurityScreen;
