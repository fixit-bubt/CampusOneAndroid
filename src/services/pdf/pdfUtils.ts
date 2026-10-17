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

export interface LayoutPageOpts {
  preserveAspect?: boolean;
  footerReservePt?: number;
  headerReservePt?: number;
}

// Professional document scanner layout engine:
// - 'borderless': CamScanner standard. When preserveAspect is true, centers the
//   exact image aspect ratio on an A4 sheet without stretching handwriting.
// - 'adaptive': Natural aspect ratio at 150 DPI. Exact fit with 0 margin.
// - 'smart_fit': Uniform crisp 12pt micro-margin without giant letterbox gaps.
export function layoutDocumentPage(
  imgW: number,
  imgH: number,
  mode: LayoutMode = 'borderless',
  opts?: LayoutPageOpts,
): DocumentPageLayout {
  const safeW = Math.max(1, imgW);
  const safeH = Math.max(1, imgH);
  const landscape = safeW > safeH;
  const standardPageW = landscape ? A4.h : A4.w;
  const standardPageH = landscape ? A4.w : A4.h;
  const footerReserve = Math.max(0, opts?.footerReservePt ?? 0);
  const headerReserve = Math.max(0, opts?.headerReservePt ?? 0);

  if (mode === 'adaptive') {
    const ptW = Math.max(100, Math.round((safeW / 150) * 72));
    const ptH = Math.max(100, Math.round((safeH / 150) * 72));
    return {
      pageW: ptW,
      pageH: ptH + footerReserve + headerReserve,
      x: 0,
      y: footerReserve,
      w: ptW,
      h: ptH,
    };
  }

  if (mode === 'borderless' && !opts?.preserveAspect && !footerReserve && !headerReserve) {
    return {
      pageW: standardPageW,
      pageH: standardPageH,
      x: 0,
      y: 0,
      w: standardPageW,
      h: standardPageH,
    };
  }

  const microMargin = mode === 'smart_fit' ? 12 : 0;
  const availW = Math.max(40, standardPageW - microMargin * 2);
  const availH = Math.max(40, standardPageH - microMargin * 2 - footerReserve - headerReserve);
  const scale = Math.min(availW / safeW, availH / safeH);
  const w = Math.floor(safeW * scale);
  const h = Math.floor(safeH * scale);
  return {
    pageW: standardPageW,
    pageH: standardPageH,
    x: Math.round((standardPageW - w) / 2),
    y: Math.round(footerReserve + microMargin + (availH - h) / 2),
    w,
    h,
  };
}

// Centers up to two cards (Front & Back of ID / Admit Card) on a single portrait A4 sheet.
export function layoutIdCardPair(
  topW: number,
  topH: number,
  botW?: number,
  botH?: number,
  footerReservePt: number = 0,
): { pageW: number; pageH: number; top: { x: number; y: number; w: number; h: number }; bottom?: { x: number; y: number; w: number; h: number } } {
  const pageW = A4.w;
  const pageH = A4.h;
  const sideMargin = 42;
  const gap = 28;
  const usableW = pageW - sideMargin * 2;
  const usableH = pageH - 72 - footerReservePt;
  const slotH = (usableH - gap) / 2;

  const fitSlot = (iw: number, ih: number, centerY: number) => {
    const sw = Math.max(1, iw);
    const sh = Math.max(1, ih);
    const scale = Math.min(usableW / sw, slotH / sh);
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    return {
      x: Math.round((pageW - w) / 2),
      y: Math.round(centerY - h / 2),
      w,
      h,
    };
  };

  if (!botW || !botH) {
    const midY = footerReservePt + 36 + usableH * 0.56;
    return { pageW, pageH, top: fitSlot(topW, topH, midY) };
  }

  const topCenterY = footerReservePt + 36 + slotH + gap + slotH / 2;
  const botCenterY = footerReservePt + 36 + slotH / 2;
  return {
    pageW,
    pageH,
    top: fitSlot(topW, topH, topCenterY),
    bottom: fitSlot(botW, botH, botCenterY),
  };
}

