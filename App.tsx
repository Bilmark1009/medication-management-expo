import 'react-native-gesture-handler';
import 'formdata-polyfill';
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { initializeDatabase, executeQuery } from './src/utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const appRef = useRef(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database
        await initializeDatabase();
        
        // Initialize any other app-specific setup
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <PaperProvider theme={MD3LightTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppNavigator />
      </GestureHandlerRootView>
    </PaperProvider>
  );
}
