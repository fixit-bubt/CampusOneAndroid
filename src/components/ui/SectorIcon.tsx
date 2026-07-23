import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from './Icon';
import { SectorColors } from '../../theme';
import type { SectorKey } from '../../theme';

// Icon name per sector — matches design data.jsx
const SECTOR_ICON: Record<SectorKey, string> = {
  reports:   'report',
  lostfound: 'found',
  clubs:     'clubs',
  events:    'events',
  jobs:      'jobs',
  announce:  'announce',
  study:     'study',
  bus:       'bus',
  medical:   'medical',
  market:    'market',
  ride:      'ride',
  blood:     'blood',
  directory: 'directory',
  prayer:    'moon',
  faculty:   'faculty',
  calendar:  'calendar',
  routines:  'clipboard',
  coverpage: 'fileText',
  pdfmaker:  'fileText',
  messages:  'chat',
};

const SIZE_MAP = { sm: 32, md: 42, lg: 58 } as const;
const ICON_SIZE_MAP = { sm: 17, md: 22, lg: 30 } as const;
const RADIUS_MAP = { sm: 10, md: 13, lg: 18 } as const;

type SecSize = 'sm' | 'md' | 'lg';

interface SectorIconProps {
  sector: SectorKey;
  size?: SecSize;
  dark?: boolean;
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

export function SectorIcon({ sector, size = 'md', dark = false, style }: SectorIconProps) {
  const baseFg = SectorColors[sector];
  const fg = dark ? lightenHex(baseFg) : baseFg;
  const bg = hexWithAlpha(baseFg, dark ? 0.18 : 0.12);

  const dim = SIZE_MAP[size];
  const iconSize = ICON_SIZE_MAP[size];
  const radius = RADIUS_MAP[size];

  return (
    <View
      style={[
        {
          width: dim,
          height: dim,
          borderRadius: radius,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={SECTOR_ICON[sector]} size={iconSize} color={fg} />
    </View>
  );
}
