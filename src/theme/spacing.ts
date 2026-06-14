// Spacing scale (4px base unit)

export const Spacing = {
  0:   0,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  3.5: 14,
  4:   16,   // ← standard screen gutter
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  9:   36,
  10:  40,
  12:  48,
  14:  56,
  16:  64,
  20:  80,
  24:  96,
  28:  112,
} as const;

// Semantic spacing shortcuts
export const Layout = {
  screenPadding:    Spacing[4],   // 16px — side gutters on all screens
  cardPadding:      Spacing[4],   // 16px — inside cards
  cardPaddingSm:    Spacing[3],   // 12px — inside compact cards
  sectionGap:       Spacing[6],   // 24px — between sections on a screen
  itemGap:          Spacing[2.5], // 10px — between list items
  inputHeight:      Spacing[12],  // 48px — touch target height
  buttonHeight:     Spacing[12],  // 48px
  buttonHeightSm:   Spacing[9],   // 36px
  bottomNavHeight:  Spacing[20],  // 80px — tab bar
  bottomPadding:    110,          // scroll area bottom padding (clears nav)
  topBarHeight:     Spacing[14],  // 56px
} as const;
