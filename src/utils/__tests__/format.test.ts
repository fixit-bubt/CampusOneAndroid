import {
  localToday, formatFileSize, isValidDate, truncate, formatTime, bloodGroupSlug,
} from '../format';

describe('localToday', () => {
  it('returns the local calendar date as YYYY-MM-DD', () => {
    const s = localToday();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(s).toBe(expected);
  });
});

describe('formatFileSize', () => {
  it('formats bytes, KB and MB', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });
});

describe('isValidDate', () => {
  it('rejects impossible calendar dates', () => {
    expect(isValidDate('2026-13-40')).toBe(false);
    expect(isValidDate('2026-02-31')).toBe(false);
  });
  it('rejects malformed shapes', () => {
    expect(isValidDate('2026-1-1')).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
  });
  it('accepts a real future date', () => {
    const next = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    expect(isValidDate(next)).toBe(true);
  });
  it('rejects a past date unless allowPast', () => {
    expect(isValidDate('2000-01-01')).toBe(false);
    expect(isValidDate('2000-01-01', true)).toBe(true);
  });
});

describe('formatTime', () => {
  it('converts 24h to 12h', () => {
    expect(formatTime('14:30')).toBe('2:30 PM');
    expect(formatTime('09:05')).toBe('9:05 AM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
  });
});

describe('truncate / bloodGroupSlug', () => {
  it('truncates with an ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hell…');
    expect(truncate('short', 10)).toBe('short');
  });
  it('slugs blood groups', () => {
    expect(bloodGroupSlug('A+')).toBe('apos');
    expect(bloodGroupSlug('O-')).toBe('oneg');
  });
});
