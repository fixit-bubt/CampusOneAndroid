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

const BUBBLE_SIZE = 52;
const SCOOP_HALF_WIDTH = 42;
const SCOOP_DEPTH = 24;

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
  const [animIndex, setAnimIndex] = useState(activeIndex);

  useEffect(() => {
    const listenerId = slideAnim.addListener(({ value }) => {
      setAnimIndex(value);
    });

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: activeIndex,
        tension: 190,
        friction: 15,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(bubbleScale, {
          toValue: 0.85,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1.12,
          tension: 280,
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

    return () => {
      slideAnim.removeListener(listenerId);
    };
  }, [activeIndex, slideAnim, bubbleScale]);

  const activeRoute = state.routes[activeIndex];
  const activeIconName = TAB_ICONS[activeRoute?.name] ?? 'circle';
  const activeDescriptor = descriptors[activeRoute?.key];
  const activeBadge = activeDescriptor?.options?.tabBarBadge;

  const barHeight = 60 + Math.max(insets.bottom, 10);
  const currentCx = (animIndex + 0.5) * tabWidth;

  const left = Math.max(0, currentCx - SCOOP_HALF_WIDTH);
  const right = Math.min(containerWidth, currentCx + SCOOP_HALF_WIDTH);

  const barPath = `
    M 0 0
    L ${left} 0
    C ${left + 12} 0, ${left + 18} 4, ${left + 24} 12
    C ${left + 30} ${SCOOP_DEPTH}, ${currentCx - 12} ${SCOOP_DEPTH}, ${currentCx} ${SCOOP_DEPTH}
    C ${currentCx + 12} ${SCOOP_DEPTH}, ${right - 30} ${SCOOP_DEPTH}, ${right - 24} 12
    C ${right - 18} 4, ${right - 12} 0, ${right} 0
    L ${containerWidth} 0
    L ${containerWidth} ${barHeight}
    L 0 ${barHeight}
    Z
  `;

  const borderPath = `
    M 0 0.5
    L ${left} 0.5
    C ${left + 12} 0.5, ${left + 18} 4, ${left + 24} 12
    C ${left + 30} ${SCOOP_DEPTH}, ${currentCx - 12} ${SCOOP_DEPTH}, ${currentCx} ${SCOOP_DEPTH}
    C ${currentCx + 12} ${SCOOP_DEPTH}, ${right - 30} ${SCOOP_DEPTH}, ${right - 24} 12
    C ${right - 18} 4, ${right - 12} 0.5, ${right} 0.5
    L ${containerWidth} 0.5
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
      {/* Seamless Carved SVG Background Bar */}
      <Svg
        width={containerWidth}
        height={barHeight}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path d={barPath} fill={C.surface} />
        <Path
          d={borderPath}
          fill="none"
          stroke={C.border}
          strokeWidth={1}
        />
      </Svg>

      {/* Floating Active Circle Bubble with Spring Pop */}
      <Animated.View
        style={[
          styles.floatingBubble,
          {
            left: currentCx - BUBBLE_SIZE / 2,
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            borderRadius: BUBBLE_SIZE / 2,
            backgroundColor: C.brand,
            transform: [{ scale: bubbleScale }],
            shadowColor: C.brand,
          },
        ]}
        pointerEvents="none"
      >
        <Feather name={activeIconName} size={22} color="#ffffff" />

        {activeBadge !== undefined && (
          <View style={[styles.bubbleBadge, { backgroundColor: C.danger }]}>
            <Text style={styles.badgeText}>{String(activeBadge)}</Text>
          </View>
        )}
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
              {/* Baseline icon: only visible when inactive */}
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

              {/* Uniform Label: matches baseline across all tabs */}
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
  floatingBubble: {
    position: 'absolute',
    top: -12,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
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
    marginTop: 3,
    textAlign: 'center',
  },
});
