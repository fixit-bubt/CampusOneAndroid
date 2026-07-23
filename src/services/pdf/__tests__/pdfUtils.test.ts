import {
  isPdfFile, isImageFile, isHeicFile, parseRanges, moveItem,
  nextQuality, nextLongEdge, baseName, fitOnPage,
} from '../pdfUtils';
import { A4, MIN_QUALITY, MIN_LONG_EDGE } from '../presets';

describe('file type checks', () => {
  it('detects PDFs by mime or extension', () => {
    expect(isPdfFile('a.pdf')).toBe(true);
    expect(isPdfFile('SCAN.PDF')).toBe(true);
    expect(isPdfFile('note.txt', 'application/pdf')).toBe(true);
    expect(isPdfFile('note.txt', 'text/plain')).toBe(false);
  });
  it('detects images by mime or extension', () => {
    expect(isImageFile('p.jpg')).toBe(true);
    expect(isImageFile('p.PNG')).toBe(true);
    expect(isImageFile('blob', 'image/webp')).toBe(true);
    expect(isImageFile('a.pdf', 'application/pdf')).toBe(false);
  });
  it('detects HEIC separately from other images', () => {
    expect(isHeicFile('IMG_0001.HEIC')).toBe(true);
    expect(isHeicFile('x', 'image/heif')).toBe(true);
    expect(isHeicFile('p.jpg', 'image/jpeg')).toBe(false);
  });
});

describe('parseRanges', () => {
  it('expands single pages and ranges', () => {
    expect([...parseRanges('1-3,7', 10)!]).toEqual([1, 2, 3, 7]);
    expect([...parseRanges(' 2 , 4 ', 10)!]).toEqual([2, 4]);
  });
  it('rejects unusable input', () => {
    expect(parseRanges('0', 10)).toBeNull();
    expect(parseRanges('5-2', 10)).toBeNull();
    expect(parseRanges('1-99', 10)).toBeNull();
    expect(parseRanges('abc', 10)).toBeNull();
    expect(parseRanges('', 10)).toBeNull();
  });
});

describe('moveItem', () => {
  it('moves an item and leaves the rest in order', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
  it('returns the same list for a no-op or out-of-bounds move', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, 0)).toBe(list);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 0, 5)).toBe(list);
  });
});

describe('compress walk', () => {
  it('lowers quality toward the target and never rises', () => {
    const q = nextQuality(0.75, 4_000_000, 2_000_000);
    expect(q).toBeLessThan(0.75);
    expect(q).toBeGreaterThanOrEqual(MIN_QUALITY);
  });
  it('never returns a quality above the current one', () => {
    expect(nextQuality(0.5, 1_000_000, 2_000_000)).toBeLessThanOrEqual(0.5);
  });
  it('floors at MIN_QUALITY however far off the target is', () => {
    expect(nextQuality(0.4, 50_000_000, 1_000_000)).toBe(MIN_QUALITY);
  });
  it('shrinks the raster and floors at MIN_LONG_EDGE', () => {
    expect(nextLongEdge(1754, 4_000_000, 2_000_000)).toBeLessThan(1754);
    expect(nextLongEdge(1100, 90_000_000, 1_000_000)).toBe(MIN_LONG_EDGE);
  });
});

describe('baseName', () => {
  it('strips the extension and trims', () => {
    expect(baseName('report.pdf')).toBe('report');
    expect(baseName('scan 2.PDF')).toBe('scan 2');
  });
  it('falls back for empty or extension-only names', () => {
    expect(baseName('')).toBe('document');
    expect(baseName(undefined)).toBe('document');
  });
});

describe('fitOnPage', () => {
  it('gives a portrait page to a portrait image', () => {
    const r = fitOnPage(1000, 1500);
    expect(r.pageW).toBeCloseTo(A4.w);
    expect(r.pageH).toBeCloseTo(A4.h);
  });
  it('gives a landscape page to a wide image', () => {
    const r = fitOnPage(1500, 1000);
    expect(r.pageW).toBeCloseTo(A4.h);
    expect(r.pageH).toBeCloseTo(A4.w);
  });
  it('centres the image inside the margin', () => {
    const r = fitOnPage(1000, 1000);
    expect(r.w).toBeLessThanOrEqual(r.pageW - 48);
    expect(r.h).toBeLessThanOrEqual(r.pageH - 48);
    expect(r.x).toBeCloseTo((r.pageW - r.w) / 2);
    expect(r.y).toBeCloseTo((r.pageH - r.h) / 2);
  });
});
