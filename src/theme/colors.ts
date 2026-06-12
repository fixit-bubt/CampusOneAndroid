// ─────────────────────────────────────────────────────────────────────────────
// CampusOne — Color Tokens (source of truth — matches design_handoff_campusone)
// ─────────────────────────────────────────────────────────────────────────────

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

  // Semantic — Success
  success:   '#12915e',
  successBg: '#e3f5ec',

  // Semantic — Warning
  warn:   '#b9760a',
  warnBg: '#fbefdb',

  // Semantic — Danger / Error
  danger:   '#d63d35',
  dangerBg: '#fbe7e5',
  error:    '#d63d35',  // alias for danger
  errorBg:  '#fbe7e5',

  // Semantic — Info (brand-tinted)
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
  brand:    '#6a8cf2',
  brand700: '#8aa4f7',
  brand50:  '#1a2340',
  brand100: '#222d4e',
  brandMuted: '#1a2340',

  bg:       '#0a0f1c',
  surface:  '#111829',
  surface2: '#182034',
  surfaceAlt: '#182034',
  surface3: '#202a42',

  border:  '#232f48',
  border2: '#2e3b58',

  text:          '#e9eefb',
  text2:         '#a4b1cc',
  textSecondary: '#a4b1cc',
  text3:         '#6c7a99',
  textMuted:     '#6c7a99',

  success:   '#36c98a',
  successBg: '#0d2e20',

  warn:   '#e0a23c',
  warnBg: '#2e1e05',

  danger:   '#f0685e',
  dangerBg: '#2e0d0b',
  error:    '#f0685e',
  errorBg:  '#2e0d0b',

  info:   '#6a8cf2',
  infoBg: '#1a2340',

  roleStudent: '#6a8cf2',
  roleStaff:   '#e0a23c',
  roleAdmin:   '#36c98a',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sector colors — exact fg values from design data.jsx
// IDs match the design exactly: 'announce' not 'announcements', 'study' not 'studyhub', etc.
// ─────────────────────────────────────────────────────────────────────────────
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
} as const;

export type SectorKey = keyof typeof SectorColors;
export type Colors = typeof LightColors;

// ─────────────────────────────────────────────────────────────────────────────
// Accent palette — fixed decorative colors used in chips/pills/tiles that are
// not theme-dependent (same in light & dark, like SectorColors). Screens must
// import these instead of hardcoding hexes.
// ─────────────────────────────────────────────────────────────────────────────
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
  pink:    '#ec4899',   // category: clothing
  purple:  '#8b5cf6',   // users / IT tiles
  slate:   '#5b6b86',   // neutral category fg
  grayBg:  '#f0f2f6',   // neutral pill bg
  tealBg:  '#e4f5f4',   // teal pill bg (resolved/jobs)
  greenBg: '#e8f8f0',   // green pill bg (approve/success chips)
} as const;
