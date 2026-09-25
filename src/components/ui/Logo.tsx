import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { LightColors } from '../../theme';

interface LogoMarkProps {
  size?: number;
  /** drop shadow — on for hero/auth, off for compact headers */
  shadow?: boolean;
}

export function LogoMark({ size = 56, shadow = true }: LogoMarkProps) {
  return (
    <View
      style={[
        styles.box,
        shadow && styles.shadow,
        { width: size, height: size },
      ]}
    >
      <Image
        source={require('../../../assets/logo-mark.png')}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        resizeMode="contain"
      />
    </View>
  );
}

export function LogoFull({ width = 180, height }: { width?: number; height?: number }) {
  const calculatedHeight = height ?? width * (871 / 1013);
  return (
    <Image
      source={require('../../../assets/logo.png')}
      style={{ width, height: calculatedHeight }}
      resizeMode="contain"
    />
  );
}

export function LogoText({ width = 140, height }: { width?: number; height?: number }) {
  const calculatedHeight = height ?? width * (182 / 1003);
  return (
    <Image
      source={require('../../../assets/logo-text.png')}
      style={{ width, height: calculatedHeight }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  shadow: {
    shadowColor: LightColors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  } as ViewStyle,
});
