// Pure helpers for the PDF Maker. No React, no Expo, no I/O, so every rule
// below is unit-testable.
import { A4, PAGE_MARGIN, MIN_QUALITY, MIN_LONG_EDGE } from './presets';

export function isPdfFile(name?: string, mime?: string): boolean {
  if ((mime ?? '').toLowerCase() === 'application/pdf') return true;
  return /\.pdf$/i.test(name ?? '');
}

export function isImageFile(name?: string, mime?: string): boolean {
  if ((mime ?? '').toLowerCase().startsWith('image/')) return true;
  if ((mime ?? '').length > 0) return false;
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name ?? '');
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
