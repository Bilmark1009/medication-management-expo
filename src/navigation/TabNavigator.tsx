import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import all screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddMedicationScreen from '../screens/AddMedicationScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import HistoryScreen from '../screens/HistoryScreen';
import PersonalInformationScreen from '../screens/PersonalInformationScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';

const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();
const AddStack = createStackNavigator();
const { height } = Dimensions.get('window');

// Profile Stack Navigator
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
      <ProfileStack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
    </ProfileStack.Navigator>
  );
}

// Add Stack Navigator
function AddStackNavigator() {
  return (
    <AddStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AddStack.Screen name="AddMedicationModal" component={AddMedicationScreen} />
    </AddStack.Navigator>
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
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0, // Set to 0 to ensure it is completely at the bottom
    left: 0,
    right: 0,
    backgroundColor: '#000000', // Black background
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    height: 65,
    shadowColor: '#FF0000', // Red shadow color
    shadowOffset: {
      width: 0,
      height: -2, // Adjusted shadow offset for top shadow
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
  tabBarItem: {
    height: 50,
    paddingBottom: 5,
  },
});