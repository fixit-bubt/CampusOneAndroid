import { waHref } from '../link';

describe('waHref', () => {
  it('converts a local BD number (01…) to full international', () => {
    expect(waHref('01712345678')).toBe('https://wa.me/8801712345678');
  });

  it('strips spaces, dashes and punctuation first', () => {
    expect(waHref('+880 1712-345678')).toBe('https://wa.me/8801712345678');
    expect(waHref('0171-234 5678')).toBe('https://wa.me/8801712345678');
  });

  it('keeps an already-international 880 number', () => {
    expect(waHref('8801712345678')).toBe('https://wa.me/8801712345678');
  });

  it('drops a leading 00 international prefix', () => {
    expect(waHref('008801712345678')).toBe('https://wa.me/8801712345678');
  });

  it('prepends 880 to a bare 10-digit 1… number (missing the leading 0)', () => {
    expect(waHref('1712345678')).toBe('https://wa.me/8801712345678');
  });

  it('returns null for empty / missing input so the button hides', () => {
    expect(waHref('')).toBeNull();
    expect(waHref(null)).toBeNull();
    expect(waHref(undefined)).toBeNull();
    expect(waHref('   ')).toBeNull();
  });

  it('returns null for too-short numbers', () => {
    expect(waHref('12345')).toBeNull();
    expect(waHref('01712')).toBeNull();
  });
});
