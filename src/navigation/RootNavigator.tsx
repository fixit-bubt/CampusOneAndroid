import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { useT } from '../i18n';
import { FontFamily } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { registerPushToken, addNotificationTapHandler } from '../lib/push';

const navigationRef = createNavigationContainerRef();

export function RootNavigator() {
  const { session, user, profile, loading, profileLoaded, profileError, refreshProfile } = useAuth();
  const { C } = useTheme();
  const t = useT();

  // Register this device's FCM token once the user is signed in.
  React.useEffect(() => {
    if (user?.id) registerPushToken(user.id);
  }, [user?.id]);

  // Tapping a push (app backgrounded/killed) opens the Alerts tab. On a cold
  // start the navigator isn't mounted yet when the tap is delivered - retry
  // briefly instead of dropping it.
  React.useEffect(() => {
    const goToAlerts = (attempt = 0) => {
      if (navigationRef.isReady()) {
        (navigationRef.navigate as any)('Tabs', { screen: 'Notifications' });
      } else if (attempt < 10) {
        setTimeout(() => goToAlerts(attempt + 1), 400);
      }
    };
    return addNotificationTapHandler(() => goToAlerts());
  }, []);

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
    <NavigationContainer ref={navigationRef}>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
