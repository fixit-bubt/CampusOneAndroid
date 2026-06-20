import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { useT } from '../i18n';
import { FontFamily } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';

export function RootNavigator() {
  const { session, profile, loading, profileLoaded, profileError, refreshProfile } = useAuth();
  const { C } = useTheme();
  const t = useT();

  // Profile load failed — don't fall through to the student UI. Offer a retry.
  if (session && profileError && !profileLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ color: C.text, fontFamily: FontFamily.jakartaBold, fontSize: 16, textAlign: 'center' }}>
          {t.auth.profileLoadFailed}
        </Text>
        <TouchableOpacity
          onPress={() => refreshProfile()}
          style={{ backgroundColor: C.brand, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: C.white, fontFamily: FontFamily.jakartaBold }}>{t.common.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Wait for the profile (role) before choosing a navigator, so an admin
  // never flashes the student UI.
  if (loading || (session && !profileLoaded)) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }

  // Students must complete onboarding (student_id) before reaching the app.
  // Staff/admin skip it.
  const needsOnboarding =
    !!session && profileLoaded && profile?.role === 'student' && !profile?.student_id;
  if (needsOnboarding) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
