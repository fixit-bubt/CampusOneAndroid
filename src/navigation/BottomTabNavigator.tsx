import { useRef } from 'react';
import { View, ActivityIndicator, Pressable, Animated, type GestureResponderEvent } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../store/authStore';
import { useMessages } from '../store/messagesStore';
import { useT } from '../i18n';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import { FontFamily, FontSize, Layout } from '../theme';
import type { BottomTabParams } from '../types/navigation';

import { HomeScreen } from '../screens/main/HomeScreen';
import { StudyHubScreen } from '../screens/study/StudyHubScreen';
import { MessagesHome } from '../screens/messages/MessagesHome';
import { ExploreScreen } from '../screens/main/ExploreScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { AdminDashboardScreen } from '../screens/dashboard/AdminDashboardScreen';
import { StaffDashboardScreen } from '../screens/dashboard/StaffDashboardScreen';

function HomeLoadingScreen() {
  const { C } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.brand} size="large" />
    </View>
  );
}

const Tab = createBottomTabNavigator<BottomTabParams>();

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const TAB_ICON: Record<keyof BottomTabParams, FeatherName> = {
  Home:     'home',
  StudyHub: 'book-open',
  Messages: 'message-circle',
  Explore:  'grid',
  Settings: 'settings',
};

function AnimatedTabBarButton(props: BottomTabBarButtonProps) {
  const { style, onPress, onPressIn, children, ...rest } = props;
  const scale = useRef(new Animated.Value(1)).current;

  const triggerTapPop = () => {
    scale.setValue(0.72);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.30,
        tension: 320,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.0,
        tension: 220,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 0.84,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
    onPressIn?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    triggerTapPop();
    onPress?.(e);
  };

  return (
    <Pressable
      {...(rest as any)}
      onPress={handlePress}
      onPressIn={handlePressIn}
      style={[style, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function BottomTabNavigator() {
  const { C } = useTheme();
  const { profile } = useAuth();
  const { totalUnread } = useMessages();
  const t = useT();
  const isStudent = profile?.role === 'student';
  const showStudyHub = profile?.role !== 'staff';

  const TAB_LABEL: Record<keyof BottomTabParams, string> = {
    Home:     t.tabs.home,
    StudyHub: t.tabs.studyHub ?? 'Study Hub',
    Messages: t.tabs.messages ?? t.messages?.title ?? 'Messages',
    Explore:  t.tabs.explore,
    Settings: t.tabs.settings,
  };

  const HomeComponent =
    profile?.role === 'admin' ? AdminDashboardScreen :
    profile?.role === 'staff' ? StaffDashboardScreen :
    profile?.role === 'student' ? HomeScreen :
    HomeLoadingScreen;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const key = route.name as keyof BottomTabParams;
        return {
          headerShown: false,
          tabBarButton: (buttonProps) => <AnimatedTabBarButton {...buttonProps} />,
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
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedIcon
              key={`${key}-${focused}`}
              name={TAB_ICON[key] ?? 'circle'}
              size={focused ? size + 1 : size}
              color={color}
              animation={focused ? 'entrance' : 'none'}
            />
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeComponent} />
      {showStudyHub && (
        <Tab.Screen name="StudyHub" component={StudyHubScreen} />
      )}
      {isStudent && (
        <Tab.Screen
          name="Messages"
          component={MessagesHome}
          options={{ tabBarBadge: totalUnread > 0 ? (totalUnread > 9 ? '9+' : totalUnread) : undefined }}
        />
      )}
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
