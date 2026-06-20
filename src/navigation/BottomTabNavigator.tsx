// 4 tabs with Feather icons. The Home tab is the role's dashboard for
// admin/staff; students get the regular home feed. All roles keep
// Explore/Alerts/Settings.
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../store/authStore';
import { useT } from '../i18n';
import { FontFamily, FontSize, Layout } from '../theme';
import type { BottomTabParams } from '../types/navigation';

import { HomeScreen } from '../screens/main/HomeScreen';
import { ExploreScreen } from '../screens/main/ExploreScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { AdminDashboardScreen } from '../screens/dashboard/AdminDashboardScreen';
import { StaffDashboardScreen } from '../screens/dashboard/StaffDashboardScreen';

const Tab = createBottomTabNavigator<BottomTabParams>();

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const TAB_ICON: Record<keyof BottomTabParams, FeatherName> = {
  Home:          'home',
  Explore:       'grid',
  Notifications: 'bell',
  Settings:      'settings',
};

export function BottomTabNavigator() {
  const { C } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const TAB_LABEL: Record<keyof BottomTabParams, string> = {
    Home: t.tabs.home,
    Explore: t.tabs.explore,
    Notifications: t.tabs.alerts,
    Settings: t.tabs.settings,
  };
  const HomeComponent =
    profile?.role === 'admin' ? AdminDashboardScreen :
    profile?.role === 'staff' ? StaffDashboardScreen :
    HomeScreen;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const key = route.name as keyof BottomTabParams;
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
          tabBarLabel: TAB_LABEL[key] ?? route.name,
          tabBarIcon: ({ color, size }) => (
            <Feather name={TAB_ICON[key] ?? 'circle'} size={size} color={color} />
          ),
        };
      }}
    >
      <Tab.Screen name="Home"          component={HomeComponent} />
      <Tab.Screen name="Explore"       component={ExploreScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Settings"      component={SettingsScreen} />
    </Tab.Navigator>
  );
}
