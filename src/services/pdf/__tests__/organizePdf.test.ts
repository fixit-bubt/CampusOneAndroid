// Factory closures must be named mock* — jest hoists jest.mock() above the
// imports and babel rejects any other out-of-scope reference.
const mockSetRotation = jest.fn();
const mockGetRotation = jest.fn(() => ({ angle: 0 }));
const mockCopyPages = jest.fn(async (_s: any, order: number[]) =>
  order.map(() => ({ setRotation: mockSetRotation, getRotation: mockGetRotation })),
);
const mockAddPage = jest.fn();
const mockSave = jest.fn(async () => new Uint8Array([9]));

jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: async () => ({
      copyPages: mockCopyPages,
      addPage: mockAddPage,
      save: mockSave,
      getPageCount: () => mockAddPage.mock.calls.length,
    }),
    load: async () => ({ getPageCount: () => 5 }),
  },
  degrees: (n: number) => ({ angle: n }),
}));

jest.mock('../pdfFiles', () => ({
  readBytes: jest.fn(async () => new Uint8Array([1])),
  savePdfBytes: jest.fn(async (_b: Uint8Array, name: string) => ({ uri: `file:///${name}`, bytes: 5 })),
}));

import { organizePdf } from '../organizePdf';

beforeEach(() => {
  mockCopyPages.mockClear();
  mockAddPage.mockClear();
  mockSetRotation.mockClear();
  mockGetRotation.mockClear();
  mockGetRotation.mockImplementation(() => ({ angle: 0 }));
});

describe('organizePdf', () => {
  it('copies exactly the kept pages, in the given order', async () => {
    const out = await organizePdf('file:///a.pdf', [{ orig: 2, rotate: 0 }, { orig: 0, rotate: 0 }], { name: 'o.pdf' });
    expect(mockCopyPages.mock.calls[0][1]).toEqual([2, 0]);
    expect(out.pages).toBe(2);
  });

  it('adds the rotation on top of the page existing angle', async () => {
    mockGetRotation.mockReturnValueOnce({ angle: 90 });
    await organizePdf('file:///a.pdf', [{ orig: 0, rotate: 90 }], { name: 'o.pdf' });
    expect(mockSetRotation).toHaveBeenCalledWith({ angle: 180 });
  });

  it('leaves an unrotated page untouched', async () => {
    await organizePdf('file:///a.pdf', [{ orig: 0, rotate: 0 }], { name: 'o.pdf' });
    expect(mockSetRotation).not.toHaveBeenCalled();
  });

  it('refuses to build a PDF with no pages', async () => {
    await expect(organizePdf('file:///a.pdf', [], { name: 'o.pdf' })).rejects.toMatchObject({ code: 'unknown' });
  });
});
