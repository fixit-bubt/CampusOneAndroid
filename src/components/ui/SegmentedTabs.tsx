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

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  count?: number;
  color?: string;
}

interface SegmentedTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  style?: ViewStyle;
}

const TRACK_PADDING = 4.5;

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  style,
}: SegmentedTabsProps<T>) {
  const { C, isDark } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const animIndex = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeTab)
  );

  useEffect(() => {
    Animated.spring(animIndex, {
      toValue: activeIndex,
      tension: 190,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, animIndex]);

  const innerTrackWidth = Math.max(0, trackWidth - TRACK_PADDING * 2);
  const numTabs = Math.max(1, tabs.length);
  const tabWidth = innerTrackWidth > 0 ? innerTrackWidth / numTabs : 0;

  const translateX = animIndex.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * tabWidth),
  });

  const activeTabItem = tabs[activeIndex] || tabs[0];
  const activeColor = activeTabItem?.color || C.brand;

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : C.surface2,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
        },
        style,
      ]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: tabWidth,
              transform: [{ translateX }],
              backgroundColor: C.surface,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        />
      )}

      {tabs.map((tab, idx) => {
        const isActive = activeIndex === idx;
        const color = tab.color || C.brand;
        const badgeBg = pillBg(color, isDark);

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabBtn}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.75}
          >
            {tab.icon && (
              <Feather
                name={tab.icon}
                size={15.5}
                color={isActive ? color : C.textMuted}
              />
            )}
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? C.text : C.textMuted,
                  fontFamily: isActive ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {tab.label}
            </Text>

            {typeof tab.count === 'number' && (
              <View
                style={[
                  styles.badge,
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
                      color: isActive ? color : C.textMuted,
                      fontFamily: isActive ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {tab.count}
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
    flexDirection: 'row',
    borderRadius: 16,
    padding: TRACK_PADDING,
    borderWidth: 1,
    position: 'relative',
  } as ViewStyle,

  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    borderRadius: 12.5,
    borderWidth: 1,
    elevation: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3.5,
  } as ViewStyle,

  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    minHeight: 48,
    borderRadius: 12.5,
    zIndex: 1,
  } as ViewStyle,

  tabLabel: {
    fontSize: 13.5,
    letterSpacing: -0.1,
  },

  badge: {
    paddingHorizontal: 7.5,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  badgeText: {
    fontSize: 11.5,
  },
});
