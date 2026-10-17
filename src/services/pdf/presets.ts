// Shared constants for the PDF Maker tools. Kept free of React and of any
// Expo import so the pure helpers beside it stay unit-testable in node.

// A4 measured in PDF points (72 per inch). pdf-lib sizes pages in points.
export const A4 = { w: 595.28, h: 841.89 };
export const PAGE_MARGIN = 24;

export type PresetKey = 'high' | 'balanced' | 'compact';
export interface ImagePreset { key: PresetKey; maxDim: number; quality: number }

export type LayoutMode = 'borderless' | 'smart_fit' | 'adaptive';
export const DEFAULT_LAYOUT_MODE: LayoutMode = 'borderless';

export type FilterMode =
  | 'magic'
  | 'bleed_erase'
  | 'bw'
  | 'whiteboard'
  | 'grayscale'
  | 'original';
export const DEFAULT_FILTER_MODE: FilterMode = 'magic';

export type ScanPageMode = 'single' | 'id_card' | 'book_split';
export const DEFAULT_SCAN_PAGE_MODE: ScanPageMode = 'single';

export type TargetSizeKey = 'none' | '5mb' | '2mb';
export const DEFAULT_TARGET_SIZE: TargetSizeKey = 'none';
export const SCAN_SIZE_TARGETS: Record<TargetSizeKey, number> = {
  none: 0,
  '5mb': 5 * 1024 * 1024,
  '2mb': 2 * 1024 * 1024,
};

export interface ScanPoint {
  x: number;
  y: number;
}

// Clockwise normalized [0..1] quad: [topLeft, topRight, bottomRight, bottomLeft]
export type ScanQuad = [ScanPoint, ScanPoint, ScanPoint, ScanPoint];

export type StudioBrushMode = 'erase' | 'mosaic';

export interface WhiteoutStroke {
  points: ScanPoint[];
  size: number;
  mode?: StudioBrushMode;
}

// maxDim caps the LONG edge in pixels.
// high (3000px @ 0.88) preserves crisp HD clarity for fine math subscripts;
// balanced (2480px @ 0.84) is 300 DPI A4; compact (1754px @ 0.72) is 150 DPI A4.
export const IMAGE_PRESETS: Record<PresetKey, ImagePreset> = {
  high:     { key: 'high',     maxDim: 3000, quality: 0.88 },
  balanced: { key: 'balanced', maxDim: 2480, quality: 0.84 },
  compact:  { key: 'compact',  maxDim: 1754, quality: 0.72 },
};
export const DEFAULT_PRESET: PresetKey = 'high';

export type CompressTargetKey = '2mb' | '5mb';
export const COMPRESS_TARGETS: Record<CompressTargetKey, { key: CompressTargetKey; bytes: number; quality: number }> = {
  '2mb': { key: '2mb', bytes: 2 * 1024 * 1024, quality: 0.65 },
  '5mb': { key: '5mb', bytes: 5 * 1024 * 1024, quality: 0.75 },
};

export const MAX_COMPRESS_PASSES = 3;
export const COMPRESS_LONG_EDGE = 1754;
export const MIN_LONG_EDGE = 1000;
export const MIN_QUALITY = 0.35;
export const THUMB_MAX_DIM = 160;

// A PDF counts as text-heavy, and so a poor compress candidate, when sampled
// pages average more than this many characters of extractable text.
export const TEXT_HEAVY_CHARS_PER_PAGE = 200;
export const TEXT_SAMPLE_PAGES = 5;

// Every cap here is a point where an uncapped run could exhaust a cheap
// phone's memory. Lower than the web's caps on purpose.
export const LIMITS = {
  images:   { maxFiles: 30, maxBytes: 25 * 1024 * 1024 },
  merge:    { maxFiles: 10, maxBytes: 40 * 1024 * 1024, maxPages: 500 },
  organize: { maxBytes: 40 * 1024 * 1024, maxPages: 200 },
  compress: { maxBytes: 25 * 1024 * 1024, maxPages: 100 },
};

export type PdfErrorCode =
  | 'encrypted' | 'corrupt' | 'unsupported-image' | 'heic'
  | 'too-large' | 'too-many-pages' | 'already-optimized'
  | 'cant-hit-target' | 'engine-failed' | 'cancelled' | 'unknown';

// Carries a code rather than a message: the screens map the code to i18n copy
// so every tool phrases the same failure identically.
export class PdfError extends Error {
  code: PdfErrorCode;
  detail?: string;
  constructor(code: PdfErrorCode, detail?: string) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}
