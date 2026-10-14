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
import Svg, { Defs, Filter, FeGaussianBlur, FeColorMatrix, FeComposite } from 'react-native-svg';
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
  const thumbSize   = isSmall ? 20 : 24; // Plump, balanced, ergonomic diameter
  const inset       = isSmall ? 3 : 4;   // Uniform 4dp margin (3dp on sm)
  const travel      = trackWidth - thumbSize - inset * 2; // Exactly 20dp (18dp on sm)

  // Primary animation value (0 = OFF / left, 1 = ON / right)
  const posAnim   = useRef(new Animated.Value(isChecked ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const prevVal   = useRef(isChecked);

  useEffect(() => {
    if (prevVal.current !== isChecked) {
      prevVal.current = isChecked;

      // Primary fluid glide & stretch: 460ms silky smooth cubic bezier
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

  // Color tokens
  const inactiveColor = trackColor?.false ?? (isDark ? C.surface3 : '#D2D6E9');
  const activeColor   = trackColor?.true ?? (variant ? VARIANT_COLORS[variant] : C.brand);

  // 1. Fluid Horizontal Travel: from 0 (OFF / left) to travel (ON / right)
  const thumbTranslateX = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel],
    extrapolate: 'clamp',
  });

  // 2. Liquid Viscous Elongation (Squash & Stretch along X-axis):
  // Expands organically during mid-flight (peak at 0.50), then snaps back to 1.0
  const liquidStretchX = posAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1.0, 1.24, 1.40, 1.24, 1.0],
    extrapolate: 'clamp',
  });

  // 3. Liquid Vertical Compression (Volume conservation along Y-axis):
  // Compresses organically during mid-flight (dip at 0.50), then recovers to 1.0
  const liquidCompressY = posAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1.0, 0.90, 0.84, 0.90, 1.0],
    extrapolate: 'clamp',
  });

  // 4. Tactile Press Squish (Touch down anticipation):
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
        {/* Active track color overlay (Smooth crossfade on native RenderThread) */}
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

        {/* Unified Liquid Droplet Thumb (Single cohesive body: ZERO seams, ZERO distortion, pure fluid) */}
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

/**
 * GooeyFilter: Provided for 1:1 parity with the web component specification.
 * Renders the SVG filter definitions (#goo) using react-native-svg primitives.
 */
export function GooeyFilter() {
  return (
    <Svg width={0} height={0} style={styles.hiddenSvg} pointerEvents="none">
      <Defs>
        <Filter id="goo" x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur in="SourceGraphic" stdDeviation={2} result="blur" />
          <FeColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <FeComposite in="SourceGraphic" in2="goo" operator="atop" />
        </Filter>
      </Defs>
    </Svg>
  );
}

// Aliases for parity with user's component and existing codebase
export const Toggle = LiquidToggle;
export const LiquidSwitch = LiquidToggle;
export const TactileSwitch = LiquidToggle;

function ToggleWithState({ variant }: { variant: ToggleVariant }) {
  const [checked, setChecked] = React.useState(false);
  return (
    <Toggle 
      variant={variant}
      checked={checked}
      onCheckedChange={setChecked}
    />
  );
}

export function DefaultToggleDemo() {
  return (
    <View style={{ position: 'relative' }}>
      <GooeyFilter />
      <ToggleWithState variant="default" />
    </View>
  );
}

export function SuccessToggleDemo() {
  return (
    <View style={{ position: 'relative' }}>
      <GooeyFilter />
      <ToggleWithState variant="success" />
    </View>
  );
}

export function WarningToggleDemo() {
  return (
    <View style={{ position: 'relative' }}>
      <GooeyFilter />
      <ToggleWithState variant="warning" />
    </View>
  );
}

export function DangerToggleDemo() {
  return (
    <View style={{ position: 'relative' }}>
      <GooeyFilter />
      <ToggleWithState variant="danger" />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'relative',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.16,
    shadowRadius: 2.5,
  },
  hiddenSvg: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});
