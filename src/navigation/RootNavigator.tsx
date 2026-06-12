import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

export function RootNavigator() {
  const { session, loading, profileLoaded } = useAuth();
  const { C } = useTheme();

  // Wait for the profile (role) before choosing a navigator, so an admin
  // never flashes the student UI.
  if (loading || (session && !profileLoaded)) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
