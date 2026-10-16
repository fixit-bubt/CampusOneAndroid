import React, { useRef } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  type ViewStyle,
} from 'react-native';
import { SectorColors } from '../../theme';
import type { SectorKey } from '../../theme';
import { AnimatedIcon, type IconFamily, type AnimationType } from './AnimatedIcon';

interface SectorIconConfig {
  name: string;
  family: IconFamily;
}

const SECTOR_ICON: Record<SectorKey, SectorIconConfig> = {
  reports:   { name: 'tool',         family: 'feather' },
  lostfound: { name: 'search',       family: 'feather' },
  clubs:     { name: 'users',        family: 'feather' },
  events:    { name: 'calendar',     family: 'feather' },
  jobs:      { name: 'briefcase',    family: 'feather' },
  announce:  { name: 'volume-2',     family: 'feather' },
  study:     { name: 'book-open',    family: 'feather' },
  bus:       { name: 'bus-side',     family: 'mci'     },
  medical:   { name: 'heart',        family: 'feather' },
  market:    { name: 'shopping-bag', family: 'feather' },
  ride:      { name: 'navigation',   family: 'feather' },
  blood:     { name: 'droplet',      family: 'feather' },
  directory: { name: 'users',        family: 'feather' },
  prayer:    { name: 'moon',         family: 'feather' },
  faculty:   { name: 'user-check',   family: 'feather' },
  calendar:  { name: 'calendar',     family: 'feather' },
  routines:  { name: 'clipboard',    family: 'feather' },
  coverpage: { name: 'file-text',    family: 'feather' },
  pdfmaker:  { name: 'file-pdf-box', family: 'mci'     },
  messages:  { name: 'message-circle', family: 'feather' },
};

const SIZE_MAP = { sm: 32, md: 42, lg: 58 } as const;
const ICON_SIZE_MAP = { sm: 17, md: 22, lg: 30 } as const;
const RADIUS_MAP = { sm: 10, md: 13, lg: 18 } as const;

type SecSize = 'sm' | 'md' | 'lg';

export interface SectorIconProps {
  sector: SectorKey;
  size?: SecSize;
  dark?: boolean;
  interactive?: boolean;
  animation?: AnimationType;
  delay?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

function lightenHex(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * 0.32);
  g = Math.round(g + (255 - g) * 0.32);
  b = Math.round(b + (255 - b) * 0.32);
  return `rgb(${r},${g},${b})`;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SectorIcon({
  sector,
  size = 'md',
  dark = false,
  animation = 'none',
  delay,
  onPress,
  style,
}: SectorIconProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const baseFg = SectorColors[sector] ?? '#3b82f6';
  const fg = dark ? lightenHex(baseFg) : baseFg;
  const bg = hexWithAlpha(baseFg, dark ? 0.18 : 0.12);

  const dim = SIZE_MAP[size];
  const iconSize = ICON_SIZE_MAP[size];
  const radius = RADIUS_MAP[size];
  const iconConfig = SECTOR_ICON[sector] ?? { name: 'help-circle', family: 'feather' };

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.90,
      tension: 300,
      friction: 12,
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

  const content = (
    <Animated.View
      style={[
        {
          width: dim,
          height: dim,
          borderRadius: radius,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <AnimatedIcon
        family={iconConfig.family}
        name={iconConfig.name}
        size={iconSize}
        color={fg}
        animation={animation}
        delay={delay}
      />
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
