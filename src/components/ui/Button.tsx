import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, FontFamily, FontSize } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { C } = useTheme();

  const bgColor: Record<Variant, string> = {
    primary: C.brand,
    secondary: C.surfaceAlt,
    ghost: 'transparent',
    danger: C.error,
  };

  const textColor: Record<Variant, string> = {
    primary: C.white,
    secondary: C.text,
    ghost: C.brand,
    danger: C.white,
  };

  const paddingV: Record<Size, number> = { sm: 8, md: 12, lg: 16 };
  const paddingH: Record<Size, number> = { sm: 16, md: 20, lg: 28 };
  const fontSize: Record<Size, number> = { sm: FontSize.sm, md: FontSize.md, lg: FontSize.lg };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: bgColor[variant],
          paddingVertical: paddingV[size],
          paddingHorizontal: paddingH[size],
          borderRadius: Radius.md,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          borderWidth: variant === 'ghost' ? 1.5 : 0,
          borderColor: variant === 'ghost' ? C.brand : 'transparent',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: textColor[variant],
              fontSize: fontSize[size],
              fontFamily: FontFamily.jakartaSemiBold,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  label: {
    letterSpacing: 0.2,
  } as TextStyle,
});
