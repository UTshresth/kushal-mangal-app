import React from 'react';
import 'react-native-get-random-values'; // Required for AWS Amplify in React Native
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';

// --- AWS AMPLIFY SETUP ---
import 'react-native-get-random-values'; 
import { Amplify } from 'aws-amplify';
import awsconfig from './src/aws-exports'; 

Amplify.configure(awsconfig);

// Screen Imports
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3498DB',
    accent: '#4CAF50',
    background: '#F5F7FA',
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen} 
            options={{ headerShown: false }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}