import {
  isPdfFile, isImageFile, isHeicFile, parseRanges, moveItem,
  nextQuality, nextLongEdge, baseName, fitOnPage, layoutDocumentPage, layoutIdCardPair, base64ToBytes,
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
  it('trusts the extension when the provider reports a generic type', () => {
    // Document providers hand back octet-stream for real photos.
    expect(isImageFile('shot.jpg', 'application/octet-stream')).toBe(true);
    expect(isImageFile('notes.pdf', 'application/octet-stream')).toBe(false);
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

describe('base64ToBytes', () => {
  it('decodes to the exact bytes', () => {
    // "Hi!" and a JPEG's opening marker.
    expect([...base64ToBytes('SGkh')]).toEqual([0x48, 0x69, 0x21]);
    expect([...base64ToBytes('/9j/4A==')]).toEqual([0xff, 0xd8, 0xff, 0xe0]);
  });
  it('handles both padding lengths and ignores whitespace', () => {
    expect([...base64ToBytes('QQ==')]).toEqual([0x41]);
    expect([...base64ToBytes('QUI=')]).toEqual([0x41, 0x42]);
    expect([...base64ToBytes('QU\nJD')]).toEqual([0x41, 0x42, 0x43]);
  });
  it('returns an empty array for empty input', () => {
    expect(base64ToBytes('').length).toBe(0);
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

describe('layoutDocumentPage', () => {
  it('fills 100% of the page edge-to-edge with 0 margin in borderless mode', () => {
    const r = layoutDocumentPage(1000, 1500, 'borderless');
    expect(r.pageW).toBeCloseTo(A4.w);
    expect(r.pageH).toBeCloseTo(A4.h);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.w).toBeCloseTo(A4.w);
    expect(r.h).toBeCloseTo(A4.h);
  });

  it('preserves exact aspect ratio and reserves footer space when requested', () => {
    const r = layoutDocumentPage(1800, 2400, 'borderless', { preserveAspect: true, footerReservePt: 24 });
    expect(r.pageW).toBeCloseTo(A4.w);
    expect(r.pageH).toBeCloseTo(A4.h);
    expect(r.y).toBeGreaterThanOrEqual(24);
    expect(r.w / r.h).toBeCloseTo(1800 / 2400, 2);
  });

  it('adapts to exact image aspect ratio at 150 DPI in adaptive mode', () => {
    const r = layoutDocumentPage(1500, 3000, 'adaptive');
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.pageW).toBe(720); // (1500 / 150) * 72
    expect(r.pageH).toBe(1440); // (3000 / 150) * 72
    expect(r.w).toBe(720);
    expect(r.h).toBe(1440);
  });

  it('applies uniform 12pt micro-margins in smart_fit mode without giant voids', () => {
    const r = layoutDocumentPage(1000, 1500, 'smart_fit');
    expect(r.pageW).toBeCloseTo(A4.w);
    expect(r.pageH).toBeCloseTo(A4.h);
    expect(r.x).toBeGreaterThanOrEqual(12);
    expect(r.y).toBeGreaterThanOrEqual(12);
    expect(r.w).toBeLessThanOrEqual(A4.w - 24);
    expect(r.h).toBeLessThanOrEqual(A4.h - 24);
  });
});

describe('layoutIdCardPair', () => {
  it('places front and back cards without overlapping on an A4 page', () => {
    const pair = layoutIdCardPair(1000, 630, 1000, 630, 24);
    expect(pair.pageW).toBeCloseTo(A4.w);
    expect(pair.pageH).toBeCloseTo(A4.h);
    expect(pair.bottom).toBeDefined();
    expect(pair.top.y).toBeGreaterThan(pair.bottom!.y + pair.bottom!.h);
  });
});

