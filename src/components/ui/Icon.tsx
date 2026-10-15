import React from 'react';
import { Feather } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';
import { AnimatedIcon, type AnimationType } from './AnimatedIcon';

// Maps design icon names → Feather icon names
export const ICON_MAP: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  // Chrome
  home:     'home',
  grid:     'grid',
  bell:     'bell',
  bellOff:  'bell-off',
  user:     'user',
  settings: 'settings',
  sliders:  'sliders',
  sun:      'sun',
  moon:     'moon',
  chevR:    'chevron-right',
  chevL:    'chevron-left',
  chevD:    'chevron-down',
  arrowL:   'arrow-left',
  check:    'check',
  checkAll: 'check-circle',
  plus:     'plus',
  edit:     'edit-2',
  logout:   'log-out',
  annex:    'external-link',
  // Content
  globe:    'globe',
  flag:     'flag',
  wallet:   'credit-card',
  key:      'key',
  idcard:   'credit-card',
  bag:      'shopping-bag',
  handshake:'thumbs-up',
  x:        'x',
  dots:     'more-horizontal',
  clock:    'clock',
  mail:     'mail',
  image:    'image',
  chat:     'message-circle',
  phone:    'phone',
  search:   'search',
  pin:      'map-pin',
  sparkle:  'star',
  flame:    'zap',
  wifi:     'wifi',
  chair:    'home',
  trash:    'trash-2',
  shield:   'shield',
  userPlus: 'user-plus',
  layers:   'layers',
  inbox:    'inbox',
  pulse:    'activity',
  award:    'award',
  copy:     'copy',
  calendar: 'calendar',
  eye:      'eye',
  eyeOff:   'eye-off',
  star:     'star',
  bolt:     'zap',
  wrench:   'tool',
  box:      'box',
  droplets: 'droplet',
  sparkles: 'wind',
  // Sectors
  report:   'tool',
  found:    'search',
  clubs:    'users',
  events:   'calendar',
  jobs:     'briefcase',
  announce: 'volume-2',
  study:    'book-open',
  bus:      'truck',
  medical:  'heart',
  market:   'shopping-bag',
  ride:     'navigation',
  blood:    'droplet',
  directory:'users',
  faculty:  'user-check',
  prayer:   'moon',
  clipboard:'clipboard',
  fileText:  'file-text',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  stroke?: number;
  animation?: AnimationType;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 21, color, stroke, animation = 'none', delay, style }: IconProps) {
  const featherName = ICON_MAP[name] ?? (name as any);
  if (animation !== 'none') {
    return (
      <AnimatedIcon
        family="feather"
        name={featherName}
        size={size}
        color={color}
        animation={animation}
        delay={delay}
        style={style}
      />
    );
  }
  return <Feather name={featherName} size={size} color={color} style={style} />;
}
