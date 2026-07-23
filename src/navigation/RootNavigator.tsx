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
import { registerPushToken, addPushTokenRotationHandler, addNotificationTapHandler } from '../lib/push';
import { resolveNotifTarget } from '../utils/notifTarget';

const navigationRef = createNavigationContainerRef();

export function RootNavigator() {
  const { session, user, profile, loading, profileLoaded, profileError, refreshProfile } = useAuth();
  const { C } = useTheme();
  const t = useT();

  // Claim this device's FCM token once the user is signed in, and keep it
  // current if FCM rotates the token while the app is running.
  React.useEffect(() => {
    if (!user?.id) return;
    registerPushToken();
    return addPushTokenRotationHandler();
  }, [user?.id]);

  // Tapping a push deep-links to the referenced item (falling back to the
  // Alerts tab). On a cold start the navigator isn't mounted yet when the tap
  // is delivered - retry briefly instead of dropping it.
  React.useEffect(() => {
    const go = (screen: string, params: object | undefined, attempt = 0) => {
      if (navigationRef.isReady()) {
        (navigationRef.navigate as any)(screen, params);
      } else if (attempt < 10) {
        setTimeout(() => go(screen, params, attempt + 1), 400);
      }
    };
    return addNotificationTapHandler(async (data) => {
      const target = await resolveNotifTarget(data.reference_type, data.reference_id)
        .catch(() => null);
      if (target) go(target.screen, target.params);
      else go('Tabs', { screen: 'Notifications' });
    });
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
