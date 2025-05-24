import 'formdata-polyfill';
import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { initializeDatabase } from './src/utils/database';

export default function App() {
  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <PaperProvider theme={MD3LightTheme}>
      <AppNavigator />
    </PaperProvider>
  );
}
