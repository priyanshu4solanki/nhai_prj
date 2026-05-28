import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
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
          cardStyle: { backgroundColor: '#ffffff' },
        }}>
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ animationEnabled: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            animationEnabled: true,
            cardStyle: { backgroundColor: '#ffffff' },
          }}
        />
        <Stack.Screen
          name="FaceAuth"
          component={FaceAuthScreen}
          options={{
            animationEnabled: true,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Liveness"
          component={LivenessScreen}
          options={{
            animationEnabled: true,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Recognition"
          component={RecognitionScreen}
          options={{
            animationEnabled: true,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            animationEnabled: true,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Sync"
          component={SyncScreen}
          options={{
            animationEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
