import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VerifyHashScreen from '../screens/VerifyHashScreen';
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import PersonalInformationScreen from '../screens/PersonalInformationScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import SplashScreen from '../screens/SplashScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4A90E2" />
  </View>
);

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Splash');

  useEffect(() => {
    const checkAppState = async () => {
      try {
        // Check if it's the first time launching the app
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        
        if (hasLaunched === null) {
          // First time launching - show onboarding
          setInitialRoute('Onboarding');
          await AsyncStorage.setItem('hasLaunched', 'true');
        } else {
          // App has been launched before - check if user is logged in
          const currentUser = await AsyncStorage.getItem('currentUser');
          
          if (currentUser) {
            // User is logged in - go to main app
            setInitialRoute('MainApp');
          } else {
            // User is not logged in - go to login
            setInitialRoute('Login');
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking app state:', error);
        // Default to onboarding if there's an error
        setInitialRoute('Onboarding');
        setIsLoading(false);
      }
    };

    checkAppState();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={initialRoute}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen} 
          options={{
            gestureEnabled: false,
            animation: 'none',
          }}
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{
            gestureEnabled: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="TermsAndConditions" 
          component={TermsAndConditionsScreen}
          options={{
            headerShown: true,
            title: 'Terms & Conditions',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen}
          options={{
            headerShown: true,
            title: 'Reset Password',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="VerifyHash" 
          component={VerifyHashScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="MainApp" 
          component={TabNavigator}
          options={{
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen 
          name="PersonalInformation" 
          component={PersonalInformationScreen}
          options={{
            headerShown: true,
            title: 'Personal Information',
            headerStyle: {
              backgroundColor: '#4A90E2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="EmergencyContacts" 
          component={EmergencyContactsScreen}
          options={{
            headerShown: true,
            title: 'Emergency Contacts',
            headerStyle: {
              backgroundColor: '#4A90E2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="PrivacySecurity" 
          component={PrivacySecurityScreen}
          options={{
            headerShown: true,
            title: 'Privacy & Security',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="HelpSupport" 
          component={HelpSupportScreen}
          options={{
            headerShown: true,
            title: 'Help & Support',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigator;