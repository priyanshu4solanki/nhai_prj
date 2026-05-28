import React from 'react';

import {
NavigationContainer
}
from '@react-navigation/native';

import {
createNativeStackNavigator
}
from '@react-navigation/native-stack';

import SplashScreen from
'../screens/SplashScreen';

import LoginScreen from
'../screens/LoginScreen';

import HomeScreen from
'../screens/HomeScreen';

import AttendanceScreen from
'../screens/AttendanceScreen';

const Stack=
createNativeStackNavigator();

export default function AppNavigator(){

return(

<NavigationContainer>

<Stack.Navigator
screenOptions={{
headerShown:false
}}
>

<Stack.Screen
name="Splash"
component={SplashScreen}
/>

<Stack.Screen
name="Login"
component={LoginScreen}
/>

<Stack.Screen
name="Home"
component={HomeScreen}
/>

<Stack.Screen
name="Attendance"
component={AttendanceScreen}
/>

</Stack.Navigator>

</NavigationContainer>

)

}