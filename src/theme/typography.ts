// Typography tokens

export const FontFamily = {
  // English — Plus Jakarta Sans (loaded via expo-font)
  regular:            'PlusJakartaSans_400Regular',
  medium:             'PlusJakartaSans_500Medium',
  semiBold:           'PlusJakartaSans_600SemiBold',
  bold:               'PlusJakartaSans_700Bold',
  extraBold:          'PlusJakartaSans_800ExtraBold',
  // Aliases used across components
  jakartaRegular:     'PlusJakartaSans_400Regular',
  jakartaMedium:      'PlusJakartaSans_500Medium',
  jakartaSemiBold:    'PlusJakartaSans_600SemiBold',
  jakartaBold:        'PlusJakartaSans_700Bold',
  jakartaExtraBold:   'PlusJakartaSans_800ExtraBold',

  // Bengali — Hind Siliguri (loaded via expo-font)
  bnRegular:   'HindSiliguri_400Regular',
  bnMedium:    'HindSiliguri_500Medium',
  bnSemiBold:  'HindSiliguri_600SemiBold',
  bnBold:      'HindSiliguri_700Bold',

  // System fallbacks (used before fonts load)
  system:      'System',
} as const;

export const FontSize = {
  xs:    11,   // captions, badges
  sm:    12,   // secondary labels
  base:  13,   // small body
  md:    14,   // body
  lg:    15,   // large body / buttons
  xl:    16,   // section titles
  '2xl': 18,   // h2
  '3xl': 21,   // h1
  '4xl': 26,   // display small
  '5xl': 32,   // display large
} as const;

export const LineHeight = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.6,  // Bengali needs more space for matras
  loose:   1.75,
} as const;

export const LetterSpacing = {
  tighter: -0.5,
  tight:   -0.3,
  normal:   0,
  wide:     0.5,
  wider:    1,
  widest:   2,   // uppercase labels
} as const;

// Pre-built text style presets — use these in components
export const TextPreset = {
  display:     { fontSize: FontSize['5xl'], fontFamily: FontFamily.extraBold, letterSpacing: LetterSpacing.tighter },
  h1:          { fontSize: FontSize['3xl'], fontFamily: FontFamily.extraBold, letterSpacing: LetterSpacing.tight },
  h2:          { fontSize: FontSize['2xl'], fontFamily: FontFamily.extraBold, letterSpacing: LetterSpacing.tight },
  title:       { fontSize: FontSize.xl,    fontFamily: FontFamily.bold },
  bodyLarge:   { fontSize: FontSize.lg,    fontFamily: FontFamily.medium },
  body:        { fontSize: FontSize.md,    fontFamily: FontFamily.medium },
  bodySmall:   { fontSize: FontSize.base,  fontFamily: FontFamily.medium },
  label:       { fontSize: FontSize.sm,    fontFamily: FontFamily.bold,    letterSpacing: LetterSpacing.wide },
  caption:     { fontSize: FontSize.xs,    fontFamily: FontFamily.bold,    letterSpacing: LetterSpacing.wider },
  button:      { fontSize: FontSize.lg,    fontFamily: FontFamily.bold },
  buttonSm:    { fontSize: FontSize.base,  fontFamily: FontFamily.bold },
  numericLarge:{ fontSize: FontSize['4xl'],fontFamily: FontFamily.extraBold },
} as const;
