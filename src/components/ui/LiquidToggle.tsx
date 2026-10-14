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
  const thumbSize   = isSmall ? 16 : 20;
  const inset       = isSmall ? 5 : 6;
  const delta       = isSmall ? 8.5 : 11; // translation offset of morphing circles
  const travel      = trackWidth - thumbSize - inset * 2; // total travel distance
  const dropSize    = isSmall ? 3.5 : 4.5;
  const bridgeH     = isSmall ? 9 : 12;

  // Primary animation value (0 = OFF / left, 1 = ON / right)
  const posAnim   = useRef(new Animated.Value(isChecked ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const prevVal   = useRef(isChecked);

  useEffect(() => {
    if (prevVal.current !== isChecked) {
      prevVal.current = isChecked;
      // 420ms fluid cubic-bezier curve: eliminates abrupt snap and shows luxurious liquid flow
      Animated.timing(posAnim, {
        toValue: isChecked ? 1 : 0,
        duration: 420,
        easing: Easing.bezier(0.38, 0.0, 0.22, 1.0),
        useNativeDriver: true,
      }).start();
    }
  }, [isChecked, posAnim]);

  const handlePressIn = () => {
    if (disabled || !triggerChange) return;
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || !triggerChange) return;
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 200,
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

  // 1. Circle 1 (Left resting circle):
  // When OFF (posAnim=0): at x=0, scale=1, opacity=1.
  // When ON (posAnim=1): translates right by +delta px, scale=0, opacity=0 (cleanly extinguished).
  const circle1TranslateX = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, delta],
    extrapolate: 'clamp',
  });
  const circle1Scale = posAnim.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 0.42, 0.001],
    extrapolate: 'clamp',
  });
  const circle1Opacity = posAnim.interpolate({
    inputRange: [0, 0.65, 0.95, 1],
    outputRange: [1, 0.85, 0, 0],
    extrapolate: 'clamp',
  });

  // 2. Circle 2 (Right resting circle):
  // When OFF (posAnim=0): at x = travel - delta, scale=0, opacity=0.
  // When ON (posAnim=1): translates to travel, scale=1, opacity=1.
  const circle2TranslateX = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [travel - delta, travel],
    extrapolate: 'clamp',
  });
  const circle2Scale = posAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0.001, 0.42, 1],
    extrapolate: 'clamp',
  });
  const circle2Opacity = posAnim.interpolate({
    inputRange: [0, 0.05, 0.35, 1],
    outputRange: [0, 0, 0.85, 1],
    extrapolate: 'clamp',
  });

  // 3. Liquid Connecting Neck / Bridge (Metaball Waist):
  // Bridges Circle 1 and Circle 2 seamlessly without independent shadow artifacts.
  const bridgeTranslateX = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [delta * 0.4, travel - delta * 0.4],
    extrapolate: 'clamp',
  });
  const bridgeScaleX = posAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 1.3, 0.2],
    extrapolate: 'clamp',
  });
  const bridgeScaleY = posAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.82, 0.5],
    extrapolate: 'clamp',
  });
  const bridgeOpacity = posAnim.interpolate({
    inputRange: [0, 0.18, 0.5, 0.82, 1],
    outputRange: [0, 0.95, 1, 0.95, 0],
    extrapolate: 'clamp',
  });

  // 4. Liquid Micro-Droplet (dropCircle):
  // Contained within the thumb's top margin, zero overflow or external floating artifacts.
  const dropTranslateX = posAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [inset + thumbSize * 0.3, inset + travel * 0.5, inset + travel - 2],
    extrapolate: 'clamp',
  });
  const dropTranslateY = posAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [inset + 2, inset - 3, inset - 1, inset - 3, inset + 2],
    extrapolate: 'clamp',
  });
  const dropScale = posAnim.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: [0.001, 1.0, 0.35, 1.0, 0.001],
    extrapolate: 'clamp',
  });
  const dropOpacity = posAnim.interpolate({
    inputRange: [0, 0.15, 0.5, 0.85, 1],
    outputRange: [0, 0.9, 0.25, 0.9, 0],
    extrapolate: 'clamp',
  });

  // 5. Tactile Press Squish (Anticipation physics):
  const pressScaleX = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
    extrapolate: 'clamp',
  });
  const pressScaleY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
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

        {/* Liquid Connecting Bridge (Mid-flight metaball waist, NO shadow to avoid artifacts) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bridge,
            {
              top: (trackHeight - bridgeH) / 2,
              left: inset + thumbSize / 2,
              width: thumbSize,
              height: bridgeH,
              borderRadius: bridgeH / 2,
              backgroundColor: thumbColor,
              opacity: bridgeOpacity,
              transform: [
                { translateX: bridgeTranslateX },
                { scaleX: bridgeScaleX },
                { scaleY: bridgeScaleY },
              ],
            },
          ]}
        />

        {/* Liquid Micro-Droplet (dropCircle, NO shadow to avoid artifacts) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.drop,
            {
              width: dropSize,
              height: dropSize,
              borderRadius: dropSize / 2,
              backgroundColor: thumbColor,
              opacity: dropOpacity,
              transform: [
                { translateX: dropTranslateX },
                { translateY: dropTranslateY },
                { scale: dropScale },
              ],
            },
          ]}
        />

        {/* Circle 1: Left Morphing Thumb */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              position: 'absolute',
              top: inset,
              left: inset,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: thumbColor,
              opacity: circle1Opacity,
              transform: [
                { translateX: circle1TranslateX },
                { scale: circle1Scale },
                { scaleX: pressScaleX },
                { scaleY: pressScaleY },
              ],
            },
          ]}
        />

        {/* Circle 2: Right Morphing Thumb */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              position: 'absolute',
              top: inset,
              left: inset,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: thumbColor,
              opacity: circle2Opacity,
              transform: [
                { translateX: circle2TranslateX },
                { scale: circle2Scale },
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
    overflow: 'hidden', // Cleanly clips any subpixel edge bleeding to keep the pill pristine
  },
  thumb: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.18,
    shadowRadius: 2.5,
  },
  // Bridge and Drop have NO elevation/shadows to completely eliminate shadowy smudge artifacts
  bridge: {
    position: 'absolute',
  },
  drop: {
    position: 'absolute',
  },
  hiddenSvg: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});
