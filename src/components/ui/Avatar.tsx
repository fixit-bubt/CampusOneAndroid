import React from 'react';
import { View, Image, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, FontSize } from '../../theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 72,
};

const FONT_MAP: Record<AvatarSize, number> = {
  xs: FontSize.xs,
  sm: FontSize.sm,
  md: FontSize.md,
  lg: FontSize.lg,
  xl: FontSize.xl,
};

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

export const Avatar = React.memo(function Avatar({ uri, name, size = 'md', style }: AvatarProps) {
  const { C } = useTheme();
  const dim = SIZE_MAP[size];

  const initials = name
    ? name
        .trim()
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    backgroundColor: C.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
    <View style={[containerStyle, style]}>
      {uri ? (
        <Image source={{ uri }} style={[StyleSheet.absoluteFill]} resizeMode="cover" />
      ) : (
        <Text style={{ color: C.brand, fontSize: FONT_MAP[size], fontFamily: FontFamily.jakartaSemiBold }}>
          {initials}
        </Text>
      )}
    </View>
  );
});
