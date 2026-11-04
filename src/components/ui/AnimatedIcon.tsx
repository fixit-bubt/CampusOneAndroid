import {
  View,
  TouchableWithoutFeedback,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export type IconFamily = 'feather' | 'mci' | 'ionicons';

export type AnimationType = 'none' | 'spring' | 'pulse' | 'entrance' | 'wobble' | 'float' | 'bounce';

export interface AnimatedIconProps {
  name: string;
  size?: number;
  color?: string;
  family?: IconFamily;
  animation?: AnimationType;
  loop?: boolean;
  delay?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedIcon({
  name,
  size = 20,
  color,
  family = 'feather',
  onPress,
  style,
}: AnimatedIconProps) {
  const { C } = useTheme();
  const iconColor = color ?? C.text;

  const renderGlyph = () => {
    if (family === 'mci') {
      return (
        <MaterialCommunityIcons
          name={name as any}
          size={size}
          color={iconColor}
        />
      );
    }
    if (family === 'ionicons') {
      return (
        <Ionicons
          name={name as any}
          size={size}
          color={iconColor}
        />
      );
    }
    return (
      <Feather
        name={name as any}
        size={size}
        color={iconColor}
      />
    );
  };

  const content = style ? (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {renderGlyph()}
    </View>
  ) : (
    renderGlyph()
  );

  if (onPress) {
    return (
      <TouchableWithoutFeedback onPress={onPress}>
        <View>{content}</View>
      </TouchableWithoutFeedback>
    );
  }

  return content;
}
