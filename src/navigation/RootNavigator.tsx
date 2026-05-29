import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FaceAuthScreen from '../screens/FaceAuthScreen';
import LivenessScreen from '../screens/LivenessScreen';
import RecognitionScreen from '../screens/RecognitionScreen';
import ResultScreen from '../screens/ResultScreen';
import SyncScreen from '../screens/SyncScreen';

import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#ffffff' },
        }}>
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />
        <Stack.Screen
          name="FaceAuth"
          component={FaceAuthScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Liveness"
          component={LivenessScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Recognition"
          component={RecognitionScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Sync"
          component={SyncScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
