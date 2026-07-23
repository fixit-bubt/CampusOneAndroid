import { safeFileName } from '../pdfFiles';

describe('safeFileName', () => {
  it('strips path separators and control characters', () => {
    expect(safeFileName('a/b\\c.pdf')).toBe('a-b-c.pdf');
    expect(safeFileName('re:port*?.pdf')).toBe('re-port--.pdf');
  });
  it('keeps spaces, dots and unicode', () => {
    expect(safeFileName('CSE 101 রিপোর্ট.pdf')).toBe('CSE 101 রিপোর্ট.pdf');
  });
  it('falls back when nothing usable is left', () => {
    expect(safeFileName('///')).toBe('document.pdf');
    expect(safeFileName('')).toBe('document.pdf');
  });
  it('truncates very long names but keeps the extension', () => {
    const out = safeFileName('x'.repeat(300) + '.pdf');
    expect(out.length).toBeLessThanOrEqual(84);
    expect(out.endsWith('.pdf')).toBe(true);
  });
});
