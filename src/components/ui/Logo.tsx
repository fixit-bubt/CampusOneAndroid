// CampusOne logo mark — gradient box + graduation-cap glyph.
// Single source of truth for the in-app logo (auth screens, top bar, sub-headers).
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, type ViewStyle } from 'react-native';
import { LightColors, darken } from '../../theme';

interface LogoMarkProps {
  size?: number;
  /** drop shadow — on for hero/auth, off for compact headers */
  shadow?: boolean;
}

export function LogoMark({ size = 56, shadow = true }: LogoMarkProps) {
  return (
    <LinearGradient
      colors={[LightColors.brand, darken(LightColors.brand)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.box,
        shadow && styles.shadow,
        { width: size, height: size, borderRadius: size * 0.3 },
      ]}
    >
      <MaterialCommunityIcons name="school" size={size * 0.52} color={LightColors.white} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  shadow: {
    shadowColor: LightColors.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 11,
    elevation: 8,
  } as ViewStyle,
});
