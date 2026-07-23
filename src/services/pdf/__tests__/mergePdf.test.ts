// Factory closures must be named mock* — jest hoists jest.mock() above the
// imports and babel rejects any other out-of-scope reference.
const mockCopyPages = jest.fn(async (_src: any, idx: number[]) => idx.map((i) => ({ page: i })));
const mockDrawImage = jest.fn();
const mockAddPage = jest.fn(() => ({ drawImage: mockDrawImage }));
const mockEmbedJpg = jest.fn(async () => ({ tag: 'img' }));
const mockSave = jest.fn(async () => new Uint8Array([1]));
const mockLoad = jest.fn(async () => ({ getPageIndices: () => [0, 1] }));

jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: async () => ({
      copyPages: mockCopyPages,
      addPage: mockAddPage,
      embedJpg: mockEmbedJpg,
      save: mockSave,
      getPageCount: () => mockAddPage.mock.calls.length,
    }),
    load: (...args: any[]) => (mockLoad as any)(...args),
  },
  degrees: (n: number) => n,
}));

jest.mock('../pdfFiles', () => ({
  readBytes: jest.fn(async () => new Uint8Array([1, 2])),
  savePdfBytes: jest.fn(async (_b: Uint8Array, name: string) => ({ uri: `file:///${name}`, bytes: 10 })),
}));

jest.mock('../imagesToPdf', () => ({
  rasterisePhoto: jest.fn(async () => ({ base64: 'QUJD', width: 100, height: 150 })),
}));

import { mergeToPdf } from '../mergePdf';

const pdfItem = (n: number) => ({ kind: 'pdf' as const, uri: `file:///a${n}.pdf`, name: `a${n}.pdf` });

beforeEach(() => {
  mockCopyPages.mockClear();
  mockAddPage.mockClear();
  mockEmbedJpg.mockClear();
  mockLoad.mockClear();
  mockLoad.mockImplementation(async () => ({ getPageIndices: () => [0, 1] }));
});

describe('mergeToPdf', () => {
  it('copies every page of every PDF in order', async () => {
    const out = await mergeToPdf([pdfItem(1), pdfItem(2)], { name: 'm.pdf' });
    expect(mockLoad).toHaveBeenCalledTimes(2);
    expect(mockAddPage).toHaveBeenCalledTimes(4);
    expect(out.pages).toBe(4);
  });

  it('rasterises an image item onto its own page', async () => {
    await mergeToPdf(
      [pdfItem(1), { kind: 'image', uri: 'file:///p.jpg', name: 'p.jpg', width: 100, height: 150 }],
      { name: 'm.pdf' },
    );
    expect(mockEmbedJpg).toHaveBeenCalledTimes(1);
    expect(mockAddPage).toHaveBeenCalledTimes(3);
  });

  it('reports which file failed', async () => {
    mockLoad.mockRejectedValueOnce(new Error('EncryptedPDFError: password'));
    await expect(mergeToPdf([pdfItem(1), pdfItem(2)], { name: 'm.pdf' }))
      .rejects.toMatchObject({ code: 'encrypted', detail: 'a1.pdf' });
  });

  it('needs at least two items', async () => {
    await expect(mergeToPdf([pdfItem(1)], { name: 'm.pdf' })).rejects.toMatchObject({ code: 'unknown' });
  });
});
