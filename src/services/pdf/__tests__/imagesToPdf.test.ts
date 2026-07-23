// jest hoists jest.mock() above the imports, so anything a factory closes over
// has to be named mock* — that prefix is the only out-of-scope reference babel
// allows through.
const mockEmbedJpg = jest.fn(async () => ({ tag: 'img' }));
const mockDrawImage = jest.fn();
const mockAddPage = jest.fn(() => ({ drawImage: mockDrawImage }));
const mockSave = jest.fn(async () => new Uint8Array([1, 2, 3]));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: (uri: string) => {
      const ctx: any = {
        uri,
        resize: () => ctx,
        rotate: () => ctx,
        renderAsync: async () => ({
          saveAsync: async () => ({ uri: `${uri}.jpg`, base64: 'QUJD', width: 100, height: 150 }),
        }),
      };
      return ctx;
    },
  },
}));

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
  savePdfBytes: jest.fn(async (_b: Uint8Array, name: string) => ({ uri: `file:///${name}`, bytes: 3 })),
}));

import { buildImagesPdf } from '../imagesToPdf';
import { IMAGE_PRESETS } from '../presets';

const photo = (n: number) => ({ uri: `file:///p${n}.jpg`, width: 1000, height: 1500, rotate: 0 as const });

beforeEach(() => { mockEmbedJpg.mockClear(); mockAddPage.mockClear(); mockDrawImage.mockClear(); });

describe('buildImagesPdf', () => {
  it('adds one page per photo and reports progress for each', async () => {
    const seen: number[] = [];
    const out = await buildImagesPdf(
      [photo(1), photo(2), photo(3)],
      IMAGE_PRESETS.balanced,
      { name: 'x.pdf', onProgress: (done) => seen.push(done) },
    );
    expect(mockAddPage).toHaveBeenCalledTimes(3);
    expect(out.pages).toBe(3);
    expect(seen[seen.length - 1]).toBe(3);
  });

  it('stops between photos when cancelled', async () => {
    let calls = 0;
    await expect(
      buildImagesPdf([photo(1), photo(2)], IMAGE_PRESETS.balanced, {
        name: 'x.pdf',
        isCancelled: () => ++calls > 1,
      }),
    ).rejects.toMatchObject({ code: 'cancelled' });
    expect(mockAddPage).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty selection', async () => {
    await expect(buildImagesPdf([], IMAGE_PRESETS.balanced, { name: 'x.pdf' }))
      .rejects.toMatchObject({ code: 'unknown' });
  });
});
