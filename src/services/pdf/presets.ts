// Shared constants for the PDF Maker tools. Kept free of React and of any
// Expo import so the pure helpers beside it stay unit-testable in node.

// A4 measured in PDF points (72 per inch). pdf-lib sizes pages in points.
export const A4 = { w: 595.28, h: 841.89 };
export const PAGE_MARGIN = 24;

export type PresetKey = 'high' | 'balanced' | 'compact';
export interface ImagePreset { key: PresetKey; maxDim: number; quality: number }

// maxDim caps the LONG edge in pixels. 2480px is A4 width at 300dpi,
// 1754px is A4 height at 150dpi.
export const IMAGE_PRESETS: Record<PresetKey, ImagePreset> = {
  high:     { key: 'high',     maxDim: 2480, quality: 0.87 },
  balanced: { key: 'balanced', maxDim: 1754, quality: 0.78 },
  compact:  { key: 'compact',  maxDim: 1240, quality: 0.62 },
};
export const DEFAULT_PRESET: PresetKey = 'balanced';

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
