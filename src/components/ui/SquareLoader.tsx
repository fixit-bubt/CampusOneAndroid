import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SquareLoaderProps {
  scale?: number;
  color?: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

// Keyframes matching CampusOne website square-animation
const BASE_KEYFRAMES = [
  { t: 0.000, x: 0, y: 0 },
  { t: 0.105, x: 0, y: 0 },
  { t: 0.125, x: 1, y: 0 },
  { t: 0.230, x: 1, y: 0 },
  { t: 0.250, x: 2, y: 0 },
  { t: 0.355, x: 2, y: 0 },
  { t: 0.375, x: 2, y: 1 },
  { t: 0.480, x: 2, y: 1 },
  { t: 0.500, x: 1, y: 1 },
  { t: 0.605, x: 1, y: 1 },
  { t: 0.625, x: 1, y: 2 },
  { t: 0.730, x: 1, y: 2 },
  { t: 0.750, x: 0, y: 2 },
  { t: 0.855, x: 0, y: 2 },
  { t: 0.875, x: 0, y: 1 },
  { t: 0.980, x: 0, y: 1 },
  { t: 1.000, x: 0, y: 0 },
];

// Spanned across 2 full cycles so each staggered square (offset 0..6/7) has seamless range
const FULL_KEYFRAMES = [
  ...BASE_KEYFRAMES,
  ...BASE_KEYFRAMES.slice(1).map((k) => ({ t: k.t + 1.0, x: k.x, y: k.y })),
];

const INPUT_RANGE = FULL_KEYFRAMES.map((k) => k.t);

export function SquareLoader({
  scale = 0.75,
  color,
  duration = 7500,
  style,
}: SquareLoaderProps) {
  const { isDark, C } = useTheme();

  const squareColor = color ?? (isDark ? '#ffffff' : C.brand);
  const baseStep = 32 * scale;
  const squareSize = 28 * scale;
  const containerSize = 96 * scale;
  const wrapperSize = containerSize * 1.45;

  const outputRangeX = FULL_KEYFRAMES.map((k) => k.x * baseStep);
  const outputRangeY = FULL_KEYFRAMES.map((k) => k.y * baseStep);

  // 7 squares chasing on 8 positions
  const anims = useRef(
    Array.from({ length: 7 }, (_, i) => new Animated.Value(i / 7))
  ).current;

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const startVal = i / 7;
      anim.setValue(startVal);
      return Animated.loop(
        Animated.timing(anim, {
          toValue: startVal + 1.0,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
    });

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [anims, duration]);

  return (
    <View style={[styles.outerWrapper, { width: wrapperSize, height: wrapperSize }, style]}>
      {/* 45-degree diamond stage */}
      <View
        style={[
          styles.diamondStage,
          {
            width: containerSize,
            height: containerSize,
          },
        ]}
      >
        {anims.map((anim, i) => {
          const translateX = anim.interpolate({
            inputRange: INPUT_RANGE,
            outputRange: outputRangeX,
          });

          const translateY = anim.interpolate({
            inputRange: INPUT_RANGE,
            outputRange: outputRangeY,
          });

          return (
            <Animated.View
              key={i}
              style={[
                styles.square,
                {
                  width: squareSize,
                  height: squareSize,
                  borderRadius: Math.max(3 * scale, 2),
                  backgroundColor: squareColor,
                  transform: [{ translateX }, { translateY }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  diamondStage: {
    position: 'relative',
    transform: [{ rotate: '45deg' }],
  },
  square: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});

