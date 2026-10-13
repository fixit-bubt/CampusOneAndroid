import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export type IconFamily = 'feather' | 'mci' | 'ionicons';

export type AnimationType = 'none' | 'spring' | 'pulse' | 'entrance' | 'wobble' | 'float' | 'bounce';

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
  const scale = useRef(new Animated.Value(animation === 'entrance' ? 0.3 : 1)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (animation === 'entrance') {
      scale.setValue(0.3);
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.25,
          tension: 280,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 220,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (animation === 'spring') {
      scale.setValue(1);
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.34,
          tension: 320,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 200,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (animation === 'pulse') {
      const pulseAnim = Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.22,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]);
      if (loop) {
        animLoop = Animated.loop(pulseAnim);
        animLoop.start();
      } else {
        pulseAnim.start();
      }
    } else if (animation === 'bounce') {
      const bounceAnim = Animated.sequence([
        Animated.spring(translateY, {
          toValue: -6,
          tension: 300,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 220,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.delay(1200),
      ]);
      if (loop) {
        animLoop = Animated.loop(bounceAnim);
        animLoop.start();
      } else {
        bounceAnim.start();
      }
    } else if (animation === 'float') {
      const floatAnim = Animated.sequence([
        Animated.timing(translateY, {
          toValue: -4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]);
      if (loop) {
        animLoop = Animated.loop(floatAnim);
        animLoop.start();
      } else {
        floatAnim.start();
      }
    } else if (animation === 'wobble') {
      const wobbleAnim = Animated.sequence([
        Animated.timing(rotation, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0.8, duration: 70, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: -0.8, duration: 70, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]);

      if (loop) {
        animLoop = Animated.loop(
          Animated.sequence([
            wobbleAnim,
            Animated.delay(1800),
          ])
        );
        animLoop.start();
      } else {
        wobbleAnim.start();
      }
    } else {
      scale.setValue(1);
      rotation.setValue(0);
      translateY.setValue(0);
    }

    return () => {
      if (animLoop) {
        animLoop.stop();
      }
      scale.stopAnimation();
      rotation.stopAnimation();
      translateY.stopAnimation();
    };
  }, [animation, loop]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.78,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.25,
        tension: 300,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.0,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const spin = rotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-14deg', '0deg', '14deg'],
  });

  const animatedStyle = {
    transform: [
      { scale },
      { translateY },
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
