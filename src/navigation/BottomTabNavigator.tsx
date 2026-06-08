// Matches design chrome.jsx BottomNav — 4 tabs with Feather icons
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { FontFamily, FontSize, Layout } from '../theme';
import type { BottomTabParams } from '../types/navigation';

import { HomeScreen } from '../screens/main/HomeScreen';
import { ExploreScreen } from '../screens/main/ExploreScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator<BottomTabParams>();

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const TAB_CONFIG: Record<keyof BottomTabParams, { icon: FeatherName; label: string }> = {
  Home:          { icon: 'home',     label: 'Home' },
  Explore:       { icon: 'grid',     label: 'Explore' },
  Notifications: { icon: 'bell',     label: 'Alerts' },
  Profile:       { icon: 'user',     label: 'Profile' },
};

export function BottomTabNavigator() {
  const { C } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const cfg = TAB_CONFIG[route.name as keyof BottomTabParams];
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            height: Layout.bottomNavHeight,
            paddingBottom: 14,
            paddingTop: 6,
          },
          tabBarActiveTintColor: C.brand,
          tabBarInactiveTintColor: C.textMuted,
          tabBarLabelStyle: {
            fontFamily: FontFamily.jakartaSemiBold,
            fontSize: FontSize.xs,
          },
          tabBarLabel: cfg?.label ?? route.name,
          tabBarIcon: ({ color, size }) => (
            <Feather name={cfg?.icon ?? 'circle'} size={size} color={color} />
          ),
        };
      }}
    >
      <Tab.Screen name="Home"          component={HomeScreen} />
      <Tab.Screen name="Explore"       component={ExploreScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile"       component={ProfileScreen} />
    </Tab.Navigator>
  );
}
