import React from 'react';
import {
  View,
  Pressable,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { SectorKey } from '../../theme';
import { AnimatedIcon, type IconFamily, type AnimationType } from './AnimatedIcon';

interface SectorIconConfig {
  name: string;
  family: IconFamily;
}

const SECTOR_ICON: Record<SectorKey, SectorIconConfig> = {
  reports:   { name: 'tool',           family: 'feather' },
  lostfound: { name: 'search',         family: 'feather' },
  clubs:     { name: 'users',          family: 'feather' },
  events:    { name: 'calendar',       family: 'feather' },
  jobs:      { name: 'briefcase',      family: 'feather' },
  announce:  { name: 'volume-2',       family: 'feather' },
  study:     { name: 'book-open',      family: 'feather' },
  bus:       { name: 'bus-side',       family: 'mci'     },
  medical:   { name: 'heart',          family: 'feather' },
  market:    { name: 'shopping-bag',   family: 'feather' },
  ride:      { name: 'navigation',     family: 'feather' },
  blood:     { name: 'droplet',        family: 'feather' },
  directory: { name: 'users',          family: 'feather' },
  prayer:    { name: 'moon',           family: 'feather' },
  faculty:   { name: 'user-check',     family: 'feather' },
  calendar:  { name: 'calendar',       family: 'feather' },
  routines:  { name: 'clipboard',      family: 'feather' },
  coverpage: { name: 'file-text',      family: 'feather' },
  pdfmaker:  { name: 'file-pdf-box',   family: 'mci'     },
  messages:  { name: 'message-circle', family: 'feather' },
};

const SIZE_MAP = { sm: 32, md: 44, lg: 58 } as const;
const ICON_SIZE_MAP = { sm: 24, md: 32, lg: 40 } as const;
const RADIUS_MAP = { sm: 10, md: 13, lg: 18 } as const;

type SecSize = 'sm' | 'md' | 'lg';

export interface SectorIconProps {
  sector: SectorKey;
  size?: SecSize;
  dark?: boolean;
  color?: string;
  interactive?: boolean;
  animation?: AnimationType;
  delay?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export function SectorIcon({
  sector,
  size = 'md',
  dark,
  color,
  onPress,
  style,
}: SectorIconProps) {
  const { isDark } = useTheme();

  const isDarkMode = dark !== undefined ? dark : isDark;
  const defaultMonochrome = isDarkMode ? '#f4f4f5' : '#18181b';
  const fg = color ?? defaultMonochrome;

  const dim = SIZE_MAP[size];
  const iconSize = ICON_SIZE_MAP[size];
  const radius = RADIUS_MAP[size];
  const iconConfig = SECTOR_ICON[sector] ?? { name: 'help-circle', family: 'feather' };

  const content = (
    <View
      style={[
        {
          width: dim,
          height: dim,
          borderRadius: radius,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        style,
      ]}
    >
      <AnimatedIcon
        family={iconConfig.family}
        name={iconConfig.name}
        size={iconSize}
        color={fg}
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}
