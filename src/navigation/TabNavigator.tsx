import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import all screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MedicationScreen from '../screens/MedicationScreen';
import HistoryScreen from '../screens/HistoryScreen';
import PersonalInformationScreen from '../screens/PersonalInformationScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';

const Tab = createBottomTabNavigator();
const ProfileStack = createNativeStackNavigator();

// Profile Stack Navigator
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
      />
      <ProfileStack.Screen 
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
        }}
      />
      <ProfileStack.Screen 
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
        }}
      />
    </ProfileStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#FF0000', // Red color for highlighted icons
        tabBarInactiveTintColor: '#8E8E93', // Default gray for inactive icons
        headerShown: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="Medications"
        component={MedicationScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit" size={size} color={color} />
          ),
          title: 'Medications',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
          title: 'History',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    height: Platform.OS === 'ios' ? 85 : 65, // Account for iPhone home indicator
    paddingBottom: Platform.OS === 'ios' ? 20 : 5, // Extra padding for iOS
    shadowColor: '#FF0000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
    borderTopWidth: 0, // Remove default border
  },
  tabBarItem: {
    height: 50,
    paddingTop: 5,
    paddingBottom: Platform.OS === 'ios' ? 0 : 5,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});