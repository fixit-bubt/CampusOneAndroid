import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, pillBg } from '../../theme';
import { AnimatedIcon, type IconFamily } from './AnimatedIcon';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  iconConfig?: {
    family: IconFamily;
    name: string;
  };
  count?: number;
  showZeroCount?: boolean;
  color?: string;
  accentColor?: string;
}

interface SegmentedTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  style,
  size = 'md',
}: SegmentedTabsProps<T>) {
  const { C, isDark } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const trackHeight = 58;
  const trackRadius = 16;
  const trackPadding = 4;
  const indicatorRadius = 12;
  const iconSize = 15.5;
  const fontSize = 13.5;
  const badgeHeight = 22;
  const badgeMinWidth = 20;
  const badgePaddingHorizontal = 6.5;
  const badgeFontSize = 11;

  const foundIdx = tabs.findIndex((t) => t.id === activeTab);
  const activeIndex = foundIdx >= 0 ? foundIdx : -1;
  const animIndex = useRef(new Animated.Value(Math.max(0, activeIndex))).current;
  const prevIndexRef = useRef(activeIndex);

  useEffect(() => {
    if (activeIndex >= 0 && prevIndexRef.current !== activeIndex) {
      prevIndexRef.current = activeIndex;
      Animated.spring(animIndex, {
        toValue: activeIndex,
        tension: 190,
        friction: 18,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, animIndex]);

  const innerTrackWidth = Math.max(0, trackWidth - trackPadding * 2);
  const numTabs = Math.max(1, tabs.length);
  const tabWidth = innerTrackWidth > 0 ? innerTrackWidth / numTabs : 0;

  const translateX = animIndex.interpolate({
    inputRange: tabs.length > 1 ? tabs.map((_, i) => i) : [0, 1],
    outputRange: tabs.length > 1 ? tabs.map((_, i) => i * tabWidth) : [0, tabWidth],
  });

  return (
    <View
      style={[
        styles.track,
        {
          height: trackHeight,
          padding: trackPadding,
          borderRadius: trackRadius,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : C.surface2,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
        },
        style,
      ]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {tabWidth > 0 && activeIndex >= 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              top: trackPadding,
              left: trackPadding,
              bottom: trackPadding,
              width: tabWidth,
              borderRadius: indicatorRadius,
              transform: [{ translateX }],
              backgroundColor: C.surface,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        />
      )}

      {tabs.map((tab, idx) => {
        const isActive = activeIndex === idx;
        const color = tab.color || tab.accentColor || C.brand;
        const badgeBg = pillBg(color, isDark);
        const hasCount = typeof tab.count === 'number' && (tab.count > 0 || tab.showZeroCount === true);

        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabBtn,
              {
                borderRadius: indicatorRadius,
                paddingHorizontal: 4,
                gap: 5.5,
              },
            ]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.75}
          >
            {tab.iconConfig ? (
              <AnimatedIcon
                family={tab.iconConfig.family}
                name={tab.iconConfig.name}
                size={iconSize}
                color={isActive ? color : C.textMuted}
                animation={isActive ? 'spring' : 'none'}
              />
            ) : tab.icon ? (
              <AnimatedIcon
                family="feather"
                name={tab.icon}
                size={iconSize}
                color={isActive ? color : C.textMuted}
                animation={isActive ? 'spring' : 'none'}
              />
            ) : null}
            <Text
              style={[
                styles.tabLabel,
                {
                  fontSize,
                  color: isActive ? C.text : C.textMuted,
                  fontFamily: isActive ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {tab.label}
            </Text>

            {hasCount && (
              <View
                style={[
                  styles.badge,
                  {
                    height: badgeHeight,
                    paddingHorizontal: badgePaddingHorizontal,
                    minWidth: badgeMinWidth,
                  },
                  isActive
                    ? {
                        backgroundColor: badgeBg,
                        borderColor: isDark ? `${color}45` : `${color}30`,
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)',
                      },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      fontSize: badgeFontSize,
                      color: isActive ? color : C.textMuted,
                      fontFamily: isActive ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {typeof tab.count === 'number' ? (tab.count > 99 ? 99 : tab.count) : tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  } as ViewStyle,

  indicator: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3.5,
  } as ViewStyle,

  tabBtn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 0,
    borderRadius: 12,
    zIndex: 1,
  } as ViewStyle,

  tabLabel: {
    fontSize: 13.5,
    letterSpacing: -0.1,
    flexShrink: 1,
    textAlign: 'center',
  },

  badge: {
    height: 22,
    paddingHorizontal: 6.5,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  badgeText: {
    fontSize: 11,
  },
});
