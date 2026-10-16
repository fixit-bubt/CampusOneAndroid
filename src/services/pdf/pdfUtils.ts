// Pure helpers for the PDF Maker. No React, no Expo, no I/O, so every rule
// below is unit-testable.
import { A4, PAGE_MARGIN, MIN_QUALITY, MIN_LONG_EDGE, type LayoutMode } from './presets';

export function isPdfFile(name?: string, mime?: string): boolean {
  if ((mime ?? '').toLowerCase() === 'application/pdf') return true;
  return /\.pdf$/i.test(name ?? '');
}

export function isImageFile(name?: string, mime?: string): boolean {
  const m = (mime ?? '').toLowerCase();
  if (m.startsWith('image/')) return true;
  // A specific non-image type is trusted; a generic one is not. Document
  // providers routinely hand back application/octet-stream for a real JPEG,
  // so fall through to the extension rather than rejecting it.
  if (m && m !== 'application/octet-stream' && m !== 'binary/octet-stream') return false;
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name ?? '');
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Decode base64 to bytes without depending on atob, which is not guaranteed to
// exist under Hermes. Used to put engine output on disk instead of holding it
// as a data URI string.
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = B64_ALPHABET.indexOf(clean[i]);
    if (v < 0) continue;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >> bits) & 0xff;
    }
  }
  return o === out.length ? out : out.subarray(0, o);
}

// HEIC gets its own check because it is what every default iPhone camera
// produces and the fix is a phone setting, not something the app can do.
export function isHeicFile(name?: string, mime?: string): boolean {
  const m = (mime ?? '').toLowerCase();
  if (m.includes('heic') || m.includes('heif')) return true;
  return /\.(heic|heif)$/i.test(name ?? '');
}

// "1-3,7" becomes Set{1,2,3,7}. Returns null when the text is not usable, so
// the caller can show one clear message instead of guessing an intent.
export function parseRanges(text: string, max: number): Set<number> | null {
  const out = new Set<number>();
  for (const chunk of String(text).split(',')) {
    const part = chunk.trim();
    if (!part) continue;
    const m = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(part);
    if (!m) return null;
    const from = parseInt(m[1], 10);
    const to = m[2] ? parseInt(m[2], 10) : from;
    if (!from || from > max || to > max || to < from) return null;
    for (let n = from; n <= to; n++) out.add(n);
  }
  return out.size ? out : null;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Walk JPEG quality toward the size target. Never rises, never drops below
// MIN_QUALITY, and eases with an exponent so one huge overshoot does not
// collapse straight to the floor.
export function nextQuality(current: number, outBytes: number, targetBytes: number): number {
  if (outBytes <= 0) return current;
  const ratio = targetBytes / outBytes;
  return Math.max(MIN_QUALITY, Math.min(current, current * Math.pow(ratio, 0.9)));
}

// Only called once quality has bottomed out: losing resolution hurts
// legibility more than JPEG artefacts do, so it is the last lever.
export function nextLongEdge(current: number, outBytes: number, targetBytes: number): number {
  if (outBytes <= 0) return current;
  const ratio = targetBytes / outBytes;
  return Math.max(MIN_LONG_EDGE, Math.round(current * Math.sqrt(ratio)));
}

export function baseName(filename?: string): string {
  return (filename ?? '').replace(/\.[^.]+$/, '').trim() || 'document';
}

// Page size and image box for one photo on an A4 page. A photo wider than it
// is tall gets a landscape page so it is not squeezed into a portrait column.
export function fitOnPage(imgW: number, imgH: number) {
  const landscape = imgW > imgH;
  const pageW = landscape ? A4.h : A4.w;
  const pageH = landscape ? A4.w : A4.h;
  const availW = pageW - PAGE_MARGIN * 2;
  const availH = pageH - PAGE_MARGIN * 2;
  const scale = Math.min(availW / imgW, availH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { pageW, pageH, x: (pageW - w) / 2, y: (pageH - h) / 2, w, h };
}

export interface DocumentPageLayout {
  pageW: number;
  pageH: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Professional document scanner layout engine:
// - 'borderless': CamScanner standard. Fills the entire A4 sheet with 0 margin, eliminating all void bars.
// - 'adaptive': Natural aspect ratio at 150 DPI. Exact fit with 0 margin.
// - 'smart_fit': Uniform crisp 12pt micro-margin without giant letterbox gaps.
export function layoutDocumentPage(
  imgW: number,
  imgH: number,
  mode: LayoutMode = 'borderless',
): DocumentPageLayout {
  const safeW = Math.max(1, imgW);
  const safeH = Math.max(1, imgH);
  const landscape = safeW > safeH;
  const standardPageW = landscape ? A4.h : A4.w;
  const standardPageH = landscape ? A4.w : A4.h;

  if (mode === 'borderless') {
    return {
      pageW: standardPageW,
      pageH: standardPageH,
      x: 0,
      y: 0,
      w: standardPageW,
      h: standardPageH,
    };
  }

  if (mode === 'adaptive') {
    // 150 DPI document print points (72pt / 150px)
    const ptW = Math.max(100, Math.round((safeW / 150) * 72));
    const ptH = Math.max(100, Math.round((safeH / 150) * 72));
    return { pageW: ptW, pageH: ptH, x: 0, y: 0, w: ptW, h: ptH };
  }

  // mode === 'smart_fit': uniform 12pt micro-margin
  const microMargin = 12;
  const availW = standardPageW - microMargin * 2;
  const availH = standardPageH - microMargin * 2;
  const scale = Math.min(availW / safeW, availH / safeH);
  const w = Math.floor(safeW * scale);
  const h = Math.floor(safeH * scale);
  return {
    pageW: standardPageW,
    pageH: standardPageH,
    x: Math.round((standardPageW - w) / 2),
    y: Math.round((standardPageH - h) / 2),
    w,
    h,
  };
}
