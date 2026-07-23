// Factory closures must be named mock* — jest hoists jest.mock() above the
// imports and babel rejects any other out-of-scope reference.
const mockEmbedJpg = jest.fn(async () => ({ tag: 'img' }));
const mockDrawImage = jest.fn();
const mockAddPage = jest.fn(() => ({ drawImage: mockDrawImage }));
const mockState = { size: 0 };
const mockSave = jest.fn(async () => new Uint8Array(mockState.size));

jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: async () => ({
      embedJpg: mockEmbedJpg,
      addPage: mockAddPage,
      save: mockSave,
      getPageCount: () => mockAddPage.mock.calls.length,
    }),
  },
  degrees: (n: number) => n,
}));

jest.mock('../pdfFiles', () => ({
  savePdfBytes: jest.fn(async (b: Uint8Array, name: string) => ({ uri: `file:///${name}`, bytes: b.length })),
}));

import { compressPdf } from '../compressPdf';

// A fake engine whose page size depends on the requested quality, which is
// what makes the pass-to-pass walk observable.
function fakeEngine(sizeFor: (quality: number) => number, seen: number[]) {
  return {
    open: jest.fn(),
    thumb: jest.fn(),
    cancel: jest.fn(),
    close: jest.fn(),
    render: jest.fn(async (_page: number, _longEdge: number, quality: number) => {
      seen.push(quality);
      mockState.size = sizeFor(quality);
      return { base64: 'QUJD', wPt: 595, hPt: 842 };
    }),
  } as any;
}

beforeEach(() => { mockAddPage.mockClear(); mockEmbedJpg.mockClear(); mockState.size = 0; });

describe('compressPdf', () => {
  it('stops after one pass when the first result is already under target', async () => {
    const seen: number[] = [];
    const out = await compressPdf(fakeEngine(() => 1_000_000, seen), {
      pageCount: 2,
      sourceBytes: 9_000_000,
      target: { bytes: 2 * 1024 * 1024, quality: 0.65 },
      name: 'c.pdf',
    });
    expect(seen).toHaveLength(2);
    expect(out.missedTarget).toBe(false);
  });

  it('lowers quality on later passes when the target is missed', async () => {
    const seen: number[] = [];
    // A near miss, so quality eases down instead of hitting the floor at once.
    await compressPdf(fakeEngine(() => 2_400_000, seen), {
      pageCount: 1,
      sourceBytes: 20_000_000,
      target: { bytes: 2 * 1024 * 1024, quality: 0.65 },
      name: 'c.pdf',
    });
    expect(seen).toHaveLength(3);
    expect(seen[1]).toBeLessThan(seen[0]);
    expect(seen[2]).toBeLessThan(seen[1]);
  });

  it('bottoms out at the minimum quality, then drops resolution instead', async () => {
    const seen: number[] = [];
    const edges: number[] = [];
    const engine = {
      open: jest.fn(),
      thumb: jest.fn(),
      cancel: jest.fn(),
      close: jest.fn(),
      render: jest.fn(async (_page: number, longEdge: number, quality: number) => {
        seen.push(quality);
        edges.push(longEdge);
        mockState.size = 9_000_000;
        return { base64: 'QUJD', wPt: 595, hPt: 842 };
      }),
    } as any;

    await compressPdf(engine, {
      pageCount: 1,
      sourceBytes: 20_000_000,
      target: { bytes: 2 * 1024 * 1024, quality: 0.65 },
      name: 'c.pdf',
    });

    // A 4x overshoot floors quality on the second pass, so the third pass has
    // nothing left to give but pixels.
    expect(seen[1]).toBe(0.35);
    expect(seen[2]).toBe(0.35);
    expect(edges[1]).toBe(edges[0]);
    expect(edges[2]).toBeLessThan(edges[1]);
    expect(edges[2]).toBeGreaterThanOrEqual(1000);
  });

  it('refuses to hand back a file that is not smaller', async () => {
    const seen: number[] = [];
    await expect(
      compressPdf(fakeEngine(() => 9_000_000, seen), {
        pageCount: 1,
        sourceBytes: 1_000_000,
        target: { bytes: 2 * 1024 * 1024, quality: 0.65 },
        name: 'c.pdf',
      }),
    ).rejects.toMatchObject({ code: 'already-optimized' });
  });

  it('stops between pages when cancelled', async () => {
    const seen: number[] = [];
    await expect(
      compressPdf(fakeEngine(() => 100, seen), {
        pageCount: 5,
        sourceBytes: 9_000_000,
        target: { bytes: 2 * 1024 * 1024, quality: 0.65 },
        name: 'c.pdf',
        isCancelled: () => seen.length >= 2,
      }),
    ).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('flags a result that misses the target by more than a tenth', async () => {
    const seen: number[] = [];
    const out = await compressPdf(fakeEngine(() => 3_000_000, seen), {
      pageCount: 1,
      sourceBytes: 20_000_000,
      target: { bytes: 2 * 1024 * 1024, quality: 0.65 },
      name: 'c.pdf',
    });
    expect(out.missedTarget).toBe(true);
    expect(out.pages).toBe(1);
  });
});
