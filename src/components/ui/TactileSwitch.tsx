import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  StyleSheet,
  View,
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
  const trackWidth   = isSmall ? 40 : 48;
  const trackHeight  = isSmall ? 24 : 28;
  const trackRadius  = trackHeight / 2;
  const inset        = isSmall ? 2.5 : 3;
  const thumbSize    = isSmall ? 19 : 22;
  // Exact travel distance from resting left-inset to resting right-inset
  const travel       = trackWidth - thumbSize - inset * 2;

  const posAnim    = useRef(new Animated.Value(value ? 1 : 0)).current;
  const pressAnim  = useRef(new Animated.Value(0)).current;
  const prevValRef = useRef(value);

  // Animate thumb position only when value actually changes
  useEffect(() => {
    if (prevValRef.current !== value) {
      prevValRef.current = value;
      Animated.spring(posAnim, {
        toValue: value ? 1 : 0,
        tension: 280,
        friction: 20,
        useNativeDriver: true,
      }).start();
    }
  }, [value, posAnim]);

  const handlePressIn = () => {
    if (disabled || !onValueChange) return;
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 350,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || !onValueChange) return;
    Animated.spring(pressAnim, {
      toValue: 0,
      tension: 300,
      friction: 16,
      useNativeDriver: true,
    }).start();
  };

  const handleToggle = () => {
    if (disabled || !onValueChange) return;
    onValueChange(!value);
  };

  const inactiveTrackColor = trackColor?.false ?? (isDark ? C.surface3 : C.border2);
  const activeTrackColor   = trackColor?.true  ?? C.brand;

  // 100% native-driven transforms:
  // 1. translateX travels from 0 to travel dp
  const translateX = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel],
    extrapolate: 'clamp',
  });

  // 2. Flight stretch: peak stretch (1.20x) occurs mid-flight at 0.5 posAnim
  const flightScale = posAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.20, 1],
    extrapolate: 'clamp',
  });

  // 3. Anticipation press squash: stretches slightly (1.10x) while user holds thumb down
  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.10],
    extrapolate: 'clamp',
  });

  // Combined scale: multiplication runs entirely on Android RenderThread
  const finalScaleX = Animated.multiply(flightScale, pressScale);

  // Active track overlay opacity fades in/out with posAnim
  const activeOpacity = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      onPress={handleToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !onValueChange}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={1}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
    >
      {/*
        Track container has NO overflow:hidden — that clips native-driver scaleX on Android Fabric.
        The pill shape comes from borderRadius on both the base track and active overlay.
      */}
      <View
        style={[
          styles.track,
          {
            width: trackWidth,
            height: trackHeight,
            borderRadius: trackRadius,
            backgroundColor: inactiveTrackColor,
          },
        ]}
      >
        {/* Active color overlay fades in as posAnim → 1 */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: trackRadius,
              backgroundColor: activeTrackColor,
              opacity: activeOpacity,
            },
          ]}
        />

        {/*
          Thumb positioned at (left: inset, top: inset) so layout origin is symmetrical.
          translateX moves 0 → travel dp. scaleX squishes organically around center.
        */}
        <Animated.View
          style={[
            styles.thumb,
            {
              position: 'absolute',
              top: inset,
              left: inset,
              height: thumbSize,
              width: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: thumbColor ?? '#ffffff',
              transform: [
                { translateX },
                { scaleX: finalScaleX as any },
              ],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    // Intentionally no overflow:hidden — clipping cuts scaleX on Android Fabric
  },
  thumb: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
  },
});
