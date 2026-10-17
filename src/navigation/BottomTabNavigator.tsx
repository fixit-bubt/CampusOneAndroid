import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { useMessages } from '../store/messagesStore';
import { useT } from '../i18n';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import { FontFamily } from '../theme';
import type { BottomTabParams } from '../types/navigation';

import { HomeScreen } from '../screens/main/HomeScreen';
import { StudyHubScreen } from '../screens/study/StudyHubScreen';
import { MessagesHome } from '../screens/messages/MessagesHome';
import { ExploreScreen } from '../screens/main/ExploreScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { AdminDashboardScreen } from '../screens/dashboard/AdminDashboardScreen';
import { StaffDashboardScreen } from '../screens/dashboard/StaffDashboardScreen';

const Tab = createBottomTabNavigator<BottomTabParams>();

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const TAB_ICON: Record<keyof BottomTabParams, FeatherName> = {
  Home:     'home',
  StudyHub: 'book-open',
  Messages: 'message-circle',
  Explore:  'grid',
  Settings: 'settings',
};

// 1-piece seamless SVG backdrop with midnight navy gradient,
// rounded outer corner shoulders, and a clean flat top line across all tabs.
function BottomNavBackdrop({ width, height }: { width: number; height: number }) {
  const w = width;
  const h = height;
  const r = 20; // rounded outer shoulder radius stays!

  // Left rounded shoulder -> clean flat top line across the entire middle -> right rounded shoulder -> bottom
  const bgPath = `M 0,${r} A ${r} ${r} 0 0 1 ${r},0 L ${w - r},0 A ${r} ${r} 0 0 1 ${w},${r} L ${w},${h} L 0,${h} Z`;

  // Continuous top rim highlight stroke (clean crisp glass edge)
  const rimPath = `M 0,${r} A ${r} ${r} 0 0 1 ${r},0 L ${w - r},0 A ${r} ${r} 0 0 1 ${w},${r}`;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="navBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0f2862" />
          <Stop offset="100%" stopColor="#0a1b42" />
        </SvgLinearGradient>
      </Defs>

      {/* Entire navbar background */}
      <Path d={bgPath} fill="url(#navBgGrad)" />

      {/* Clean crisp top border line */}
      <Path
        d={rimPath}
        stroke="rgba(255, 255, 255, 0.16)"
        strokeWidth={1}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// Standard Tab Item with active electric blue highlight & 120 FPS tap bounce
function StandardTabButton({
  label,
  iconName,
  isFocused,
  badge,
  onPress,
}: {
  label: string;
  iconName: FeatherName;
  isFocused: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.15,
        tension: 320,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.0,
        tension: 240,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const activeColor = '#60a5fa'; // electric blue from website
  const inactiveColor = 'rgba(148, 163, 184, 0.50)'; // soft muted slate for high contrast

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      style={styles.tabBtn}
      hitSlop={4}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        <View
          style={[
            styles.iconWrap,
            isFocused && styles.iconWrapActive,
          ]}
        >
          <AnimatedIcon
            key={`${iconName}-${isFocused}`}
            name={iconName}
            size={20}
            color={isFocused ? activeColor : inactiveColor}
            animation={isFocused ? 'entrance' : 'none'}
          />
          {badge !== undefined && badge > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeTxt}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontFamily: isFocused ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CustomBottomTabBar(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { totalUnread } = useMessages();
  const t = useT();

  const TAB_LABEL: Record<string, string> = {
    Home:     t.tabs.home,
    StudyHub: t.tabs.studyHub ?? 'Study Hub',
    Messages: t.tabs.messages ?? t.messages?.title ?? 'Messages',
    Explore:  t.tabs.explore,
    Settings: t.tabs.settings,
  };

  const barHeight = 62 + Math.max(insets.bottom, 10);

  return (
    <View style={[styles.tabBarWrapper, { height: barHeight }]}>
      {/* 1-piece SVG canvas with rounded shoulders, flat top, and midnight navy gradient */}
      <BottomNavBackdrop width={width} height={barHeight} />

      <View style={[styles.itemsRow, { height: barHeight, paddingBottom: Math.max(insets.bottom - 4, 6) }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const key = route.name as keyof BottomTabParams;
          const isMessages = route.name === 'Messages';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <StandardTabButton
              key={route.key}
              label={TAB_LABEL[key] ?? route.name}
              iconName={TAB_ICON[key] ?? 'circle'}
              isFocused={isFocused}
              badge={isMessages ? totalUnread : undefined}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

export function BottomTabNavigator() {
  const { profile } = useAuth();
  const { C } = useTheme();
  const isStudent = profile?.role === 'student';
  const showStudyHub = profile?.role !== 'staff';

  const HomeComponent =
    profile?.role === 'admin' ? AdminDashboardScreen :
    profile?.role === 'staff' ? StaffDashboardScreen :
    HomeScreen;

  return (
    <Tab.Navigator
      backBehavior="history"
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        freezeOnBlur: false,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tab.Screen name="Home" component={HomeComponent} />
      {showStudyHub && (
        <Tab.Screen name="StudyHub" component={StudyHubScreen} />
      )}
      {isStudent && (
        <Tab.Screen name="Messages" component={MessagesHome} />
      )}
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: 'transparent',
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(96, 165, 250, 0.20)',
    borderColor: 'rgba(96, 165, 250, 0.35)',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: -0.2,
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeTxt: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '800',
  },
});
