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
    const checkFirstLaunch = async () => {
      try {
        // Reset the first launch condition for testing
        await AsyncStorage.removeItem('hasLaunched');
        setInitialRoute('Onboarding');
        setIsLoading(false);
      } catch (error) {
        console.error('Error resetting first launch condition:', error);
        setInitialRoute('Onboarding');
        setIsLoading(false);
      }
    };

    checkFirstLaunch();
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
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{
            gestureEnabled: false,
            animation: 'none',
          }}
        />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
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
          }}
        />
        <Stack.Screen 
          name="VerifyHash" 
          component={VerifyHashScreen as React.ComponentType<any>}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="MainApp" component={TabNavigator} />
        <Stack.Screen 
          name="PersonalInformation" 
          component={PersonalInformationScreen}
          options={{
            headerShown: true,
            title: 'Personal Information',
          }}
        />
        <Stack.Screen 
          name="EmergencyContacts" 
          component={EmergencyContactsScreen}
          options={{
            headerShown: true,
            title: 'Emergency Contacts',
          }}
        />
        <Stack.Screen 
          name="PrivacySecurity" 
          component={EmergencyContactsScreen}
          options={{
            headerShown: true,
            title: 'Privacy & Security',
          }}
        />
        <Stack.Screen 
          name="HelpSupport" 
          component={EmergencyContactsScreen}
          options={{
            headerShown: true,
            title: 'Help & Support',
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