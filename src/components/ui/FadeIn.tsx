import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

export function FadeIn({ children, style, duration = 220 }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [opacity, duration]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
