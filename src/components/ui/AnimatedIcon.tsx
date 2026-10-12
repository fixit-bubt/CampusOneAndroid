import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export type IconFamily = 'feather' | 'mci' | 'ionicons';

export type AnimationType = 'none' | 'spring' | 'pulse' | 'entrance' | 'wobble';

export interface AnimatedIconProps {
  name: string;
  size?: number;
  color?: string;
  family?: IconFamily;
  animation?: AnimationType;
  loop?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedIcon({
  name,
  size = 20,
  color,
  family = 'feather',
  animation = 'none',
  loop = false,
  onPress,
  style,
}: AnimatedIconProps) {
  const scale = useRef(
    new Animated.Value(animation === 'entrance' ? 0.3 : animation === 'spring' ? 0.82 : 1)
  ).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (animation === 'entrance') {
      Animated.spring(scale, {
        toValue: 1,
        tension: 260,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else if (animation === 'spring') {
      scale.setValue(0.82);
      Animated.spring(scale, {
        toValue: 1,
        tension: 260,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else if (animation === 'pulse') {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else if (animation === 'wobble') {
      const wobbleAnim = Animated.sequence([
        Animated.timing(rotation, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: -1, duration: 100, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0.8, duration: 90, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: -0.8, duration: 90, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]);

      if (loop) {
        animLoop = Animated.loop(
          Animated.sequence([
            wobbleAnim,
            Animated.delay(2200),
          ])
        );
        animLoop.start();
      } else {
        wobbleAnim.start();
      }
    } else {
      scale.setValue(1);
      rotation.setValue(0);
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [animation, loop]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      tension: 300,
      friction: 15,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 260,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const spin = rotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-14deg', '0deg', '14deg'],
  });

  const animatedStyle = {
    transform: [
      { scale },
      { rotate: spin },
    ],
  };

  const renderGlyph = () => {
    if (family === 'mci') {
      return (
        <MaterialCommunityIcons
          name={name as any}
          size={size}
          color={color}
        />
      );
    }
    if (family === 'ionicons') {
      return (
        <Ionicons
          name={name as any}
          size={size}
          color={color}
        />
      );
    }
    return (
      <Feather
        name={name as any}
        size={size}
        color={color}
      />
    );
  };

  const content = (
    <Animated.View style={[animatedStyle, style]}>
      {renderGlyph()}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </TouchableWithoutFeedback>
    );
  }

  return content;
}
