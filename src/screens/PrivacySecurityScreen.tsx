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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="finger-print" size={24} color="#FF3A44" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Biometric Authentication</Text>
                <Text style={styles.settingDescription}>Use your fingerprint or face to log in</Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: '#767577', true: '#FF3A4455' }}
              thumbColor={biometricEnabled ? '#FF3A44' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed" size={24} color="#FF3A44" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>App Lock</Text>
                <Text style={styles.settingDescription}>Require authentication when opening the app</Text>
              </View>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={toggleAppLock}
              trackColor={{ false: '#767577', true: '#FF3A4455' }}
              thumbColor={appLockEnabled ? '#FF3A44' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="log-out" size={24} color="#FF3A44" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Auto Logout</Text>
                <Text style={styles.settingDescription}>Log out after 5 minutes of inactivity</Text>
              </View>
            </View>
            <Switch
              value={autoLogoutEnabled}
              onValueChange={toggleAutoLogout}
              trackColor={{ false: '#767577', true: '#FF3A4455' }}
              thumbColor={autoLogoutEnabled ? '#FF3A44' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="analytics" size={24} color="#FF3A44" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Usage Analytics</Text>
                <Text style={styles.settingDescription}>Help us improve by sharing usage data</Text>
              </View>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={toggleAnalytics}
              trackColor={{ false: '#767577', true: '#FF3A4455' }}
              thumbColor={analyticsEnabled ? '#FF3A44' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity 
            style={[styles.settingItem, { justifyContent: 'space-between' }]}
            onPress={openPrivacyPolicy}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="document-text" size={24} color="#FF3A44" style={styles.settingIcon} />
              <Text style={styles.settingTitle}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { justifyContent: 'space-between' }]}
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
          >
            <View style={styles.settingInfo}>
              <Ionicons name="log-out" size={24} color="#FF3A44" style={styles.settingIcon} />
              <Text style={styles.settingTitle}>Logout All Devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { justifyContent: 'space-between' }]}
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
          >
            <View style={styles.settingInfo}>
              <Ionicons name="trash" size={24} color="#FF3A44" style={styles.settingIcon} />
              <Text style={styles.settingTitle}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>App Version: 1.0.0</Text>
          <Text style={styles.copyrightText}> 2025 PillPal. All rights reserved.</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
    paddingTop: 10,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3A44',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#0D0D0D',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#AAAAAA',
    lineHeight: 18,
    paddingRight: 10,
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
    marginTop: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  versionText: {
    color: '#777777',
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'center',
  },
  copyrightText: {
    color: '#555555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PrivacySecurityScreen;
