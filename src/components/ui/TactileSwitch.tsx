import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface TactileSwitchProps {
  value: boolean;
  onValueChange?: (nextValue: boolean) => void;
  disabled?: boolean;
  trackColor?: { false?: string; true?: string };
  thumbColor?: string;
  size?: 'default' | 'sm';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function TactileSwitch({
  value,
  onValueChange,
  disabled = false,
  trackColor,
  thumbColor,
  size = 'default',
  style,
  accessibilityLabel,
}: TactileSwitchProps) {
  const { C, isDark } = useTheme();

  const isSmall = size === 'sm';
  const trackWidth = isSmall ? 40 : 48;
  const trackHeight = isSmall ? 24 : 28;
  const trackRadius = trackHeight / 2;
  const inset = isSmall ? 2.5 : 3;
  const thumbSize = isSmall ? 19 : 22;
  const travel = trackWidth - thumbSize - inset * 2;

  const posAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const scaleXAnim = useRef(new Animated.Value(1)).current;
  const isPressedRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(posAnim, {
        toValue: value ? 1 : 0,
        tension: 260,
        friction: 18,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(scaleXAnim, {
          toValue: 1.18,
          duration: 90,
          useNativeDriver: false,
        }),
        Animated.spring(scaleXAnim, {
          toValue: isPressedRef.current ? 1.22 : 1.0,
          tension: 280,
          friction: 14,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [value, posAnim, scaleXAnim]);

  const handlePressIn = () => {
    if (disabled) return;
    isPressedRef.current = true;
    Animated.spring(scaleXAnim, {
      toValue: 1.22,
      tension: 350,
      friction: 12,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    isPressedRef.current = false;
    Animated.spring(scaleXAnim, {
      toValue: 1.0,
      tension: 300,
      friction: 12,
      useNativeDriver: false,
    }).start();
  };

  const handleToggle = () => {
    if (disabled) return;
    onValueChange?.(!value);
  };

  const inactiveTrackColor =
    trackColor?.false ?? (isDark ? C.surface3 : C.border2);
  const activeTrackColor = trackColor?.true ?? C.brand;

  const interpolatedTrackBg = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveTrackColor, activeTrackColor],
  });

  const translateX = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel],
  });

  const finalThumbColor = thumbColor ?? '#ffffff';

  return (
    <Pressable
      onPress={handleToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Animated.View
        style={[
          styles.track,
          {
            width: trackWidth,
            height: trackHeight,
            borderRadius: trackRadius,
            padding: inset,
            backgroundColor: interpolatedTrackBg,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              height: thumbSize,
              width: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: finalThumbColor,
              transform: [{ translateX }, { scaleX: scaleXAnim }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
  },
  thumb: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 2.5,
    elevation: 3,
  },
});
