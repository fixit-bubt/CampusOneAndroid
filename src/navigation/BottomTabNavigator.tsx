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
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/authStore';
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

// 1-piece seamless SVG backdrop with mathematically smooth organic cradle valley,
// ported 1:1 from CampusOneWeb AppShell.jsx
function BottomNavBackdrop({ width, hasFab, height }: { width: number; hasFab: boolean; height: number }) {
  const w = width;
  const h = height;
  const r = 20; // rounded outer shoulder radius
  const cx = w / 2;
  const nw = 46; // notch half-width (92px total)
  const nd = 26; // notch depth

  // 1-piece path: left rounded shoulder -> flat top -> cradle valley -> flat top -> right rounded shoulder -> bottom
  const bgPath = hasFab
    ? `M 0,${r} A ${r} ${r} 0 0 1 ${r},0 L ${cx - nw},0 C ${cx - nw + 18},0 ${cx - 16},${nd} ${cx},${nd} C ${cx + 16},${nd} ${cx + nw - 18},0 ${cx + nw},0 L ${w - r},0 A ${r} ${r} 0 0 1 ${w},${r} L ${w},${h} L 0,${h} Z`
    : `M 0,${r} A ${r} ${r} 0 0 1 ${r},0 L ${w - r},0 A ${r} ${r} 0 0 1 ${w},${r} L ${w},${h} L 0,${h} Z`;

  // Continuous top rim highlight stroke (zero glow, crisp glass edge)
  const rimPath = hasFab
    ? `M 0,${r} A ${r} ${r} 0 0 1 ${r},0 L ${cx - nw},0 C ${cx - nw + 18},0 ${cx - 16},${nd} ${cx},${nd} C ${cx + 16},${nd} ${cx + nw - 18},0 ${cx + nw},0 L ${w - r},0 A ${r} ${r} 0 0 1 ${w},${r}`
    : `M 0,${r} A ${r} ${r} 0 0 1 ${r},0 L ${w - r},0 A ${r} ${r} 0 0 1 ${w},${r}`;

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

// Center Floating Cosmic Glass Luxury Orb button for Messages
function CenterOrbButton({
  isFocused,
  unreadCount,
  onPress,
}: {
  isFocused: boolean;
  unreadCount: number;
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
    scale.setValue(0.72);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.25,
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
    onPress();
  };

  return (
    <View style={styles.centerFabSlot}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        style={styles.centerFabPressable}
        hitSlop={8}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {/* Outer ring gradient */}
          <LinearGradient
            colors={
              isFocused
                ? ['rgba(96, 165, 250, 0.9)', 'rgba(59, 130, 246, 0.5)', 'rgba(15, 23, 42, 0.95)']
                : ['rgba(129, 140, 248, 0.55)', 'rgba(49, 46, 129, 0.35)', 'rgba(15, 23, 42, 0.9)']
            }
            style={styles.orbRing}
          >
            {/* Deep Cosmic Glass radial gradient orb */}
            <LinearGradient
              colors={['#38bdf8', '#1e40af', '#0f172a', '#030712']}
              locations={[0, 0.35, 0.75, 1]}
              style={[
                styles.orbInner,
                isFocused && { borderColor: 'rgba(96, 165, 250, 0.7)' },
              ]}
            >
              {/* Specular glass reflection */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.0)']}
                style={styles.orbReflection}
              />

              <Feather
                name="message-circle"
                size={22}
                color="#ffffff"
                style={isFocused ? { transform: [{ scale: 1.05 }] } : undefined}
              />

              {unreadCount > 0 && (
                <View style={styles.orbBadge}>
                  <Text style={styles.orbBadgeTxt}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// Standard Tab Item with active electric blue dot indicator & 120 FPS tap bounce
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
      toValue: 0.84,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
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
    onPress();
  };

  const activeColor = '#60a5fa'; // electric blue
  const inactiveColor = 'rgba(203, 213, 225, 0.85)'; // sharp slate

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      style={styles.tabBtn}
      hitSlop={4}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        <View style={styles.iconWrap}>
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

        {/* Active blue dot indicator */}
        <View
          style={[
            styles.activeDot,
            { backgroundColor: isFocused ? activeColor : 'transparent' },
          ]}
        />
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

  const hasFab = state.routes.some((r) => r.name === 'Messages');
  const barHeight = 62 + Math.max(insets.bottom, 12);
  const topExtra = hasFab ? 26 : 0;
  const totalHeight = barHeight + topExtra;

  return (
    <View style={[styles.tabBarWrapper, { height: totalHeight, marginTop: -topExtra }]} pointerEvents="box-none">
      {/* 1-piece SVG canvas with continuous cradle valley & midnight navy gradient */}
      <View style={[StyleSheet.absoluteFill, { top: topExtra, height: barHeight }]} pointerEvents="none">
        <BottomNavBackdrop width={width} hasFab={hasFab} height={barHeight} />
      </View>

      <View style={[styles.itemsRow, { marginTop: topExtra, height: barHeight, paddingBottom: Math.max(insets.bottom - 4, 6) }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const key = route.name as keyof BottomTabParams;
          const isCenterFab = route.name === 'Messages';

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

          if (isCenterFab) {
            return (
              <CenterOrbButton
                key={route.key}
                isFocused={isFocused}
                unreadCount={totalUnread}
                onPress={onPress}
              />
            );
          }

          return (
            <StandardTabButton
              key={route.key}
              label={TAB_LABEL[key] ?? route.name}
              iconName={TAB_ICON[key] ?? 'circle'}
              isFocused={isFocused}
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
  const isStudent = profile?.role === 'student';
  const showStudyHub = profile?.role !== 'staff';

  const HomeComponent =
    profile?.role === 'admin' ? AdminDashboardScreen :
    profile?.role === 'staff' ? StaffDashboardScreen :
    HomeScreen;

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2.5,
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
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
  centerFabSlot: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFabPressable: {
    position: 'absolute',
    top: -24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  orbInner: {
    width: 53,
    height: 53,
    borderRadius: 26.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    overflow: 'hidden',
  },
  orbReflection: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 20,
    height: 8,
    borderRadius: 4,
  },
  orbBadge: {
    position: 'absolute',
    top: 3,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0a1b42',
  },
  orbBadgeTxt: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});
