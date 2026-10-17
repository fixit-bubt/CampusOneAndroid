import React, { useRef, useEffect, useCallback, useMemo } from 'react';
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
const BottomNavBackdrop = React.memo(function BottomNavBackdrop({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const w = width;
  const h = height;
  const r = 20;

  const bgPath = `M 0,${r} A ${r} ${r} 0 0 1 ${r},0 L ${w - r},0 A ${r} ${r} 0 0 1 ${w},${r} L ${w},${h} L 0,${h} Z`;
  const rimPath = `M 0,${r} A ${r} ${r} 0 0 1 ${r},0 L ${w - r},0 A ${r} ${r} 0 0 1 ${w},${r}`;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="navBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0f2862" />
          <Stop offset="100%" stopColor="#0a1b42" />
        </SvgLinearGradient>
      </Defs>

      <Path d={bgPath} fill="url(#navBgGrad)" />
      <Path
        d={rimPath}
        stroke="rgba(255, 255, 255, 0.16)"
        strokeWidth={1}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
});

// Clean Tab Item with zero bounce, memoized to eliminate redundant renders
const StandardTabButton = React.memo(function StandardTabButton({
  index,
  label,
  iconName,
  isFocused,
  badge,
  onPress,
}: {
  index: number;
  label: string;
  iconName: FeatherName;
  isFocused: boolean;
  badge?: number;
  onPress: (index: number) => void;
}) {
  const activeColor = '#60a5fa'; // electric blue from website
  const inactiveColor = 'rgba(148, 163, 184, 0.55)'; // soft muted slate for high contrast

  const handlePress = useCallback(() => {
    onPress(index);
  }, [onPress, index]);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabBtn}
      hitSlop={4}
    >
      <View style={styles.tabContent}>
        <View style={styles.iconWrap}>
          <Feather
            name={iconName}
            size={20}
            color={isFocused ? activeColor : inactiveColor}
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
              // Fixed font family prevents Android requestLayout/measure passes on tab changes
              fontFamily: FontFamily.jakartaSemiBold,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
});

function CustomBottomTabBar(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { totalUnread } = useMessages();
  const t = useT();

  const TAB_LABEL: Record<string, string> = useMemo(() => ({
    Home:     t.tabs.home,
    StudyHub: t.tabs.studyHub ?? 'Study Hub',
    Messages: t.tabs.messages ?? t.messages?.title ?? 'Messages',
    Explore:  t.tabs.explore,
    Settings: t.tabs.settings,
  }), [t]);

  const barHeight = 62 + Math.max(insets.bottom, 10);
  const bottomPadding = Math.max(insets.bottom - 4, 6);

  const numTabs = Math.max(state.routes.length, 1);
  const rowPaddingH = 8;
  const rowWidth = width - rowPaddingH * 2;
  const tabWidth = rowWidth / numTabs;

  const pillMarginH = 3;
  const pillWidth = Math.max(tabWidth - pillMarginH * 2, 20);
  const pillHeight = 50;
  const pillTop = Math.max(Math.round((barHeight - bottomPadding - pillHeight) / 2), 4);

  const translateX = useRef(new Animated.Value(state.index * tabWidth)).current;

  // Immediate 120 FPS native spring animation with ZERO bounce (overshootClamping: true)
  const animateToIndex = useCallback((targetIndex: number) => {
    Animated.spring(translateX, {
      toValue: targetIndex * tabWidth,
      damping: 24,
      stiffness: 220,
      mass: 0.8,
      overshootClamping: true, // strictly zero bounce!
      useNativeDriver: true,
    }).start();
  }, [tabWidth, translateX]);

  // Keep in sync with external state changes (e.g. Android hardware Back button)
  useEffect(() => {
    animateToIndex(state.index);
  }, [state.index, animateToIndex]);

  // Handle tab press: trigger slide on Frame 1, THEN navigate
  const handleTabPress = useCallback((targetIndex: number) => {
    const route = state.routes[targetIndex];
    if (!route) return;

    // 1. Instantly trigger slide on native thread (0ms latency!)
    animateToIndex(targetIndex);

    // 2. Emit navigation event
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    // 3. Navigate if not already focused and not cancelled
    if (state.index !== targetIndex && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }, [state.routes, state.index, animateToIndex, navigation]);

  return (
    <View style={[styles.tabBarWrapper, { height: barHeight }]}>
      {/* 1-piece SVG canvas with rounded shoulders, flat top, and midnight navy gradient */}
      <BottomNavBackdrop width={width} height={barHeight} />

      <View style={[styles.itemsRow, { height: barHeight, paddingBottom: bottomPadding }]}>
        {/* Full-tab sliding blue indicator with Android GPU hardware layer acceleration */}
        <Animated.View
          pointerEvents="none"
          renderToHardwareTextureAndroid={true}
          style={[
            styles.slidingIndicator,
            {
              width: pillWidth,
              height: pillHeight,
              top: pillTop,
              left: rowPaddingH + pillMarginH,
              transform: [{ translateX }],
            },
          ]}
        />

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const key = route.name as keyof BottomTabParams;
          const isMessages = route.name === 'Messages';

          return (
            <StandardTabButton
              key={route.key}
              index={index}
              label={TAB_LABEL[key] ?? route.name}
              iconName={TAB_ICON[key] ?? 'circle'}
              isFocused={isFocused}
              badge={isMessages ? totalUnread : undefined}
              onPress={handleTabPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const renderTabBar = (props: BottomTabBarProps) => <CustomBottomTabBar {...props} />;

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
      tabBar={renderTabBar}
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
  slidingIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(96, 165, 250, 0.18)',
    borderColor: 'rgba(96, 165, 250, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    zIndex: 1,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: -0.2,
  },
  tabBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
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
