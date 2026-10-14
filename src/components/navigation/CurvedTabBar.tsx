import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, FontSize } from '../../theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const TAB_ICONS: Record<string, FeatherName> = {
  Home: 'home',
  Explore: 'grid',
  Messages: 'message-circle',
  Annex: 'external-link',
  Settings: 'settings',
};

const SCOOP_WIDTH = 86;
const SCOOP_HEIGHT = 22;
const BUBBLE_SIZE = 50;

export function CurvedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get('window').width
  );

  const routesCount = state.routes.length;
  const tabWidth = containerWidth / (routesCount || 1);
  const activeIndex = state.index;

  const slideAnim = useRef(new Animated.Value(activeIndex)).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: activeIndex,
        tension: 190,
        friction: 15,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(bubbleScale, {
          toValue: 0.82,
          tension: 400,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1.12,
          tension: 300,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1.0,
          tension: 220,
          friction: 12,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [activeIndex, slideAnim, bubbleScale]);

  const activeRoute = state.routes[activeIndex];
  const activeIconName = TAB_ICONS[activeRoute?.name] ?? 'circle';
  const activeDescriptor = descriptors[activeRoute?.key];
  const activeBadge = activeDescriptor?.options?.tabBarBadge;

  const scoopTranslateX = slideAnim.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => (i + 0.5) * tabWidth - SCOOP_WIDTH / 2
    ),
  });

  const bubbleTranslateX = slideAnim.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map(
      (_, i) => (i + 0.5) * tabWidth - BUBBLE_SIZE / 2
    ),
  });

  const barHeight = 60 + Math.max(insets.bottom, 10);

  return (
    <View
      style={[styles.wrapper, { height: barHeight }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 1) {
          setContainerWidth(w);
        }
      }}
    >
      {/* Flat Bar Body */}
      <View
        style={[
          styles.barBody,
          {
            height: barHeight,
            backgroundColor: C.surface,
            borderTopColor: C.border,
          },
        ]}
      />

      {/* Sliding Curved Scoop SVG Cutout */}
      <Animated.View
        style={[
          styles.scoopContainer,
          {
            width: SCOOP_WIDTH,
            height: SCOOP_HEIGHT,
            transform: [{ translateX: scoopTranslateX }],
          },
        ]}
        pointerEvents="none"
      >
        <Svg
          width={SCOOP_WIDTH}
          height={SCOOP_HEIGHT}
          viewBox="0 0 86 22"
          style={StyleSheet.absoluteFill}
        >
          {/* Fill matches bar background to carve out notch */}
          <Path
            d="M0,0 C12,0 18,3 26,12 C34,21 38,22 43,22 C48,22 52,21 60,12 C68,3 74,0 86,0 L86,22 L0,22 Z"
            fill={C.surface}
          />
          {/* Top border curve */}
          <Path
            d="M0,0 C12,0 18,3 26,12 C34,21 38,22 43,22 C48,22 52,21 60,12 C68,3 74,0 86,0"
            fill="none"
            stroke={C.border}
            strokeWidth={1.2}
          />
        </Svg>
      </Animated.View>

      {/* Floating Active Bubble */}
      <Animated.View
        style={[
          styles.floatingBubble,
          {
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            borderRadius: BUBBLE_SIZE / 2,
            backgroundColor: C.brand,
            transform: [
              { translateX: bubbleTranslateX },
              { scale: bubbleScale },
            ],
            shadowColor: C.brand,
          },
        ]}
        pointerEvents="none"
      >
        <Feather name={activeIconName} size={22} color="#ffffff" />

        {/* Floating Bubble Badge */}
        {activeBadge !== undefined && (
          <View style={[styles.bubbleBadge, { backgroundColor: C.danger }]}>
            <Text style={styles.badgeText}>{String(activeBadge)}</Text>
          </View>
        )}
      </Animated.View>

      {/* Interactive Tabs Row */}
      <View style={[styles.tabsRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const descriptor = descriptors[route.key];
          const options = descriptor.options;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const iconName = TAB_ICONS[route.name] ?? 'circle';
          const badge = options.tabBarBadge;

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
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={typeof label === 'string' ? label : route.name}
            >
              <View style={[styles.iconWrap, { opacity: isFocused ? 0 : 1 }]}>
                <Feather
                  name={iconName}
                  size={20}
                  color={C.textMuted}
                />
                {badge !== undefined && !isFocused && (
                  <View style={[styles.tabBadge, { backgroundColor: C.danger }]}>
                    <Text style={styles.badgeText}>{String(badge)}</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? C.brand : C.textMuted,
                    opacity: isFocused ? 0 : 1,
                  },
                ]}
                numberOfLines={1}
              >
                {typeof label === 'string' ? label : route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  barBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
  },
  scoopContainer: {
    position: 'absolute',
    top: -1,
    left: 0,
    zIndex: 10,
  },
  floatingBubble: {
    position: 'absolute',
    top: -16,
    left: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  bubbleBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 15,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrap: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontFamily: FontFamily.jakartaBold,
    textAlign: 'center',
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaSemiBold,
    marginTop: 2,
    textAlign: 'center',
  },
});
