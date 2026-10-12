// CampusOne - Color Tokens

export const LightColors = {
  // Brand
  brand:    '#2b5be3',
  brand700: '#1f47c4',
  brand50:  '#eef3ff',
  brand100: '#dde7ff',
  brandMuted: '#eef3ff',  // alias for brand50

  // Backgrounds
  bg:       '#f5f7fb',
  surface:  '#ffffff',
  surface2: '#eef2f8',
  surfaceAlt: '#eef2f8',  // alias for surface2
  surface3: '#e6ebf3',

  // Borders
  border:  '#e4e9f1',
  border2: '#d4dce8',

  // Text
  text:          '#0f1a2e',
  text2:         '#46536e',
  textSecondary: '#46536e',  // alias for text2
  text3:         '#8693aa',
  textMuted:     '#8693aa',  // alias for text3

  // Semantic - Success
  success:   '#12915e',
  successBg: '#e3f5ec',

  // Semantic - Warning
  warn:   '#b9760a',
  warnBg: '#fbefdb',

  // Semantic - Danger / Error
  danger:   '#d63d35',
  dangerBg: '#fbe7e5',
  error:    '#d63d35',  // alias for danger
  errorBg:  '#fbe7e5',

  // Semantic - Info (brand-tinted)
  info:   '#2b5be3',
  infoBg: '#eef3ff',

  // Role accent colors
  roleStudent: '#2b5be3',
  roleStaff:   '#b9760a',
  roleAdmin:   '#12915e',

  // Utility
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

export const DarkColors: typeof LightColors = {
  brand:    '#5b85f7',
  brand700: '#7b9ef8',
  brand50:  '#1a1a1a',
  brand100: '#262626',
  brandMuted: '#1a1a1a',

  bg:       '#000000',
  surface:  '#121212',
  surface2: '#1c1c1c',
  surfaceAlt: '#1c1c1c',
  surface3: '#262626',

  border:  '#262626',
  border2: '#383838',

  text:          '#f4f4f5',
  text2:         '#a1a1aa',
  textSecondary: '#a1a1aa',
  text3:         '#71717a',
  textMuted:     '#71717a',

  success:   '#34d399',
  successBg: '#0a2416',

  warn:   '#fbbf24',
  warnBg: '#261a05',

  danger:   '#f87171',
  dangerBg: '#280c0c',
  error:    '#f87171',
  errorBg:  '#280c0c',

  info:   '#5b85f7',
  infoBg: '#1a1a1a',

  roleStudent: '#5b85f7',
  roleStaff:   '#fbbf24',
  roleAdmin:   '#34d399',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

// Sector colors. IDs: 'announce' not 'announcements', 'study' not 'studyhub', etc.
export const SectorColors = {
  reports:   '#4f6bed',
  lostfound: '#c77d1a',
  clubs:     '#8b5cf0',
  events:    '#e0568a',
  jobs:      '#0e9c8a',
  announce:  '#3e7de0',
  study:     '#2ba0c9',
  bus:       '#e08a2b',
  medical:   '#e2483d',
  market:    '#2e9e63',
  ride:      '#6e8b1f',
  blood:     '#c7344a',
  directory: '#5b6b86',
  prayer:    '#1f8a5b',
  faculty:   '#0e9c8a',
  calendar:  '#d4553a',
  routines:  '#5c6bc0',
  coverpage: '#00838f',
  pdfmaker:  '#b12f8c',
  messages:  '#3d8bfd',
} as const;

export type SectorKey = keyof typeof SectorColors;
export type Colors = typeof LightColors;

// Accent palette - fixed colors for chips/pills/tiles, not theme-dependent
// (same in light & dark, like SectorColors).
// Derive a darker shade of a hex token (gradient end stops etc.)
export function darken(hex: string, factor = 0.22): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - factor));
  const g = Math.round(((n >> 8) & 255) * (1 - factor));
  const b = Math.round((n & 255) * (1 - factor));
  return `rgb(${r},${g},${b})`;
}

export const Accent = {
  gold:    '#d9870b',   // bookmark/save stars
  pink:    '#ec4899',   // category: clothing/cultural
  purple:  '#8b5cf6',   // users / IT / technical
  slate:   '#5b6b86',   // neutral category fg
  blue:    '#2b5be3',   // category: academic/books (static, = light brand)
  teal:    '#0e9c8a',   // category: sports/jobs accents
  amber:   '#b9760a',   // category: social/furniture (static, = light warn)
  sky:     '#2b88d8',   // category: plumbing
  red:     '#e2483d',   // category: safety / static red accents
  green:   '#12915e',   // category: documents / earned badges (static, = light success)
  grayBg:  '#f0f2f6',   // neutral pill bg
  tealBg:  '#e4f5f4',   // teal pill bg (resolved/jobs)
  greenBg: '#e8f8f0',   // green pill bg (approve/success chips)
} as const;

export function pillBg(fgHex: string, isDark = false): string {
  return isDark ? `${fgHex}2e` : `${fgHex}18`;
}
