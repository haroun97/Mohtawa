import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const headerStyle = {
  headerStyle: { backgroundColor: '#1e293b' },
  headerTintColor: '#f1f5f9',
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#0f172a' },
};

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={headerStyle}
      initialRouteName="Login"
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Sign in' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Sign up' }}
      />
    </Stack.Navigator>
  );
}
