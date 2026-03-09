import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../screens/LoadingScreen';
import { AuthNavigator } from './AuthNavigator';
import { RootStackNavigator } from './RootStackNavigator';

export function AppNavigator() {
  const { user, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return <RootStackNavigator />;
}
