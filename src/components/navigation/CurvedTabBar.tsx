import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
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

const BUBBLE_SIZE = 48;
const HILL_WIDTH = 96;
const HILL_HEIGHT = 18;

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
        tension: 200,
        friction: 17,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(bubbleScale, {
          toValue: 0.85,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1.12,
          tension: 300,
          friction: 9,
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

  const barHeight = 58 + Math.max(insets.bottom, 10);

  const translateX = slideAnim.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * tabWidth),
  });

  const hillFillPath = `
    M 0 ${HILL_HEIGHT}
    C 20 ${HILL_HEIGHT}, 32 0, 48 0
    C 64 0, 76 ${HILL_HEIGHT}, 96 ${HILL_HEIGHT}
    L 96 ${HILL_HEIGHT + 2}
    L 0 ${HILL_HEIGHT + 2}
    Z
  `;

  const hillBorderPath = `
    M 0 ${HILL_HEIGHT}
    C 20 ${HILL_HEIGHT}, 32 0, 48 0
    C 64 0, 76 ${HILL_HEIGHT}, 96 ${HILL_HEIGHT}
  `;

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
      {/* Tab Bar Body Background */}
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

      {/* Sliding Organic Hill Arch & Floating Active Bubble (100% Native Driver) */}
      <Animated.View
        style={[
          styles.sliderTrack,
          {
            width: tabWidth,
            transform: [{ translateX }],
          },
        ]}
        pointerEvents="none"
      >
        {/* The Organic Curved Hill Pedestal */}
        <View style={styles.hillWrapper}>
          <Svg
            width={HILL_WIDTH}
            height={HILL_HEIGHT + 2}
            viewBox={`0 0 ${HILL_WIDTH} ${HILL_HEIGHT + 2}`}
          >
            <Path d={hillFillPath} fill={C.surface} />
            <Path
              d={hillBorderPath}
              fill="none"
              stroke={C.border}
              strokeWidth={1}
            />
          </Svg>
        </View>

        {/* Elevated Active Circle Bubble with Spring Pop */}
        <Animated.View
          style={[
            styles.floatingBubble,
            {
              backgroundColor: C.brand,
              transform: [{ scale: bubbleScale }],
              shadowColor: C.brand,
            },
          ]}
        >
          <Feather name={activeIconName} size={21} color="#ffffff" />

          {activeBadge !== undefined && (
            <View style={[styles.bubbleBadge, { backgroundColor: C.danger }]}>
              <Text style={styles.badgeText}>{String(activeBadge)}</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>

      {/* Interactive Tabs Row */}
      <View
        style={[
          styles.tabsRow,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
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
              accessibilityLabel={
                typeof label === 'string' ? label : route.name
              }
            >
              {/* Baseline icon: visible when inactive, active tab has elevated bubble above */}
              <View
                style={[
                  styles.iconWrap,
                  { opacity: isFocused ? 0 : 1 },
                ]}
              >
                <Feather name={iconName} size={20} color={C.textMuted} />
                {badge !== undefined && !isFocused && (
                  <View
                    style={[
                      styles.tabBadge,
                      { backgroundColor: C.danger },
                    ]}
                  >
                    <Text style={styles.badgeText}>{String(badge)}</Text>
                  </View>
                )}
              </View>

              {/* Uniform Baseline Label: ALWAYS visible across all tabs */}
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? C.brand : C.textMuted,
                    fontFamily: isFocused
                      ? FontFamily.jakartaBold
                      : FontFamily.jakartaMedium,
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
  sliderTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  hillWrapper: {
    position: 'absolute',
    top: -HILL_HEIGHT,
    alignItems: 'center',
  },
  floatingBubble: {
    position: 'absolute',
    top: -HILL_HEIGHT - 6,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
  },
  bubbleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
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
    height: 22,
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
    marginTop: 3,
    textAlign: 'center',
  },
});
