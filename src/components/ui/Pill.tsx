import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Radius, FontFamily, FontSize, Spacing } from '../../theme';

type PillVariant = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info';

const BG_ALPHA = '22'; // ~13% opacity hex

interface PillProps {
  label: string;
  variant?: PillVariant;
  customColor?: string;
  style?: ViewStyle;
}

export function Pill({ label, variant = 'default', customColor, style }: PillProps) {
  const { C } = useTheme();

  const colorMap: Record<PillVariant, string> = {
    default: C.textSecondary,
    brand: C.brand,
    success: C.success,
    warning: C.warn,
    error: C.error,
    info: C.info,
  };

  const color = customColor ?? colorMap[variant];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: color + BG_ALPHA, borderRadius: Radius.full },
        style,
      ]}
    >
      <Text style={[styles.label, { color, fontFamily: FontFamily.jakartaMedium }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 3,
    alignSelf: 'flex-start',
  } as ViewStyle,
  label: { fontSize: FontSize.xs } as any,
});
