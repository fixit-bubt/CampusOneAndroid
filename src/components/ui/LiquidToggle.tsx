import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  StyleSheet,
  View,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export type ToggleVariant = 'default' | 'success' | 'warning' | 'danger';

export interface LiquidToggleProps {
  /** Checked state (supports both `checked` and `value`) */
  checked?: boolean;
  value?: boolean;
  /** Change callback (supports both `onCheckedChange` and `onValueChange`) */
  onCheckedChange?: (checked: boolean) => void;
  onValueChange?: (checked: boolean) => void;
  /** Color variant matching the user's design */
  variant?: ToggleVariant;
  /** Custom track colors (optional override) */
  trackColor?: { false?: string; true?: string };
  /** Custom thumb color (default '#FFFFFF') */
  thumbColor?: string;
  /** Size preset: 'default' (52x32) or 'sm' (44x26) */
  size?: 'default' | 'sm';
  /** Disabled state */
  disabled?: boolean;
  /** Container style */
  style?: StyleProp<ViewStyle>;
  /** Optional custom className for web parity */
  className?: string;
  accessibilityLabel?: string;
}

export const VARIANT_COLORS: Record<ToggleVariant, string> = {
  default: '#275EFE',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export function LiquidToggle({
  checked,
  value,
  onCheckedChange,
  onValueChange,
  variant = 'default',
  trackColor,
  thumbColor = '#FFFFFF',
  size = 'default',
  disabled = false,
  style,
  accessibilityLabel,
}: LiquidToggleProps) {
  const { C, isDark } = useTheme();

  // Support both checked and value props
  const isChecked = Boolean(checked ?? value ?? false);
  const triggerChange = onCheckedChange ?? onValueChange;

  const isSmall = size === 'sm';
  const trackWidth  = isSmall ? 44 : 52;
  const trackHeight = isSmall ? 26 : 32;
  const trackRadius = trackHeight / 2;
  const thumbSize   = isSmall ? 20 : 24;
  const inset       = isSmall ? 3 : 4;
  const travel      = trackWidth - thumbSize - inset * 2;

  const posAnim   = useRef(new Animated.Value(isChecked ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const prevVal   = useRef(isChecked);

  useEffect(() => {
    if (prevVal.current !== isChecked) {
      prevVal.current = isChecked;

      Animated.timing(posAnim, {
        toValue: isChecked ? 1 : 0,
        duration: 460,
        easing: Easing.bezier(0.32, 0.0, 0.18, 1.0),
        useNativeDriver: true,
      }).start();
    }
  }, [isChecked, posAnim]);

  const handlePressIn = () => {
    if (disabled || !triggerChange) return;
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || !triggerChange) return;
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handleToggle = () => {
    if (disabled || !triggerChange) return;
    triggerChange(!isChecked);
  };

  const inactiveColor = trackColor?.false ?? (isDark ? C.surface3 : '#D2D6E9');
  const activeColor   = trackColor?.true ?? (variant ? VARIANT_COLORS[variant] : C.brand);

  const thumbTranslateX = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel],
    extrapolate: 'clamp',
  });

  const liquidStretchX = posAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1.0, 1.24, 1.40, 1.24, 1.0],
    extrapolate: 'clamp',
  });

  const liquidCompressY = posAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1.0, 0.90, 0.84, 0.90, 1.0],
    extrapolate: 'clamp',
  });

  const pressScaleX = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.08],
    extrapolate: 'clamp',
  });
  const pressScaleY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 0.92],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      onPress={handleToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !triggerChange}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={1}
      accessibilityRole="switch"
      accessibilityState={{ checked: isChecked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
    >
      <View
        style={[
          styles.track,
          {
            width: trackWidth,
            height: trackHeight,
            borderRadius: trackRadius,
            backgroundColor: inactiveColor,
          },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: trackRadius,
              backgroundColor: activeColor,
              opacity: posAnim,
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              top: inset,
              left: inset,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: thumbColor,
              transform: [
                { translateX: thumbTranslateX },
                { scaleX: liquidStretchX },
                { scaleY: liquidCompressY },
                { scaleX: pressScaleX },
                { scaleY: pressScaleY },
              ],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

export const Toggle = LiquidToggle;
export const LiquidSwitch = LiquidToggle;
export const TactileSwitch = LiquidToggle;

const styles = StyleSheet.create({
  track: {
    position: 'relative',
    overflow: 'visible',
  },
  thumb: {
    position: 'absolute',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.16,
    shadowRadius: 2.5,
  },
});
