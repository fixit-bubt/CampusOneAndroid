jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

import {
  ANNOUNCEMENT_CATEGORIES,
  KNOWN_DEPARTMENTS,
  FALLBACK_SLIDES,
} from '../announcementService';
import { resolveBannerSource } from '../../utils/bannerUrl';

describe('announcementService constants and categories', () => {
  it('should include all required official BUBT categories', () => {
    const ids = ANNOUNCEMENT_CATEGORIES.map(c => c.id);
    expect(ids).toContain('all');
    expect(ids).toContain('exam');
    expect(ids).toContain('holiday');
    expect(ids).toContain('semester');
    expect(ids).toContain('class');
    expect(ids).toContain('general');
  });

  it('should contain all major academic departments in KNOWN_DEPARTMENTS', () => {
    const codes = KNOWN_DEPARTMENTS.map(d => d.id);
    expect(codes).toContain('ALL');
    expect(codes).toContain('CSE');
    expect(codes).toContain('EEE');
    expect(codes).toContain('Civil');
    expect(codes).toContain('Textile');
    expect(codes).toContain('Business');
    expect(codes).toContain('Law');
    expect(codes).toContain('English');
  });

  it('should have valid slug mappings for scrapable categories', () => {
    const examCat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === 'exam');
    expect(examCat?.slug).toBe('exam-related');

    const holidayCat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === 'holiday');
    expect(holidayCat?.slug).toBe('offday');

    const semesterCat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === 'semester');
    expect(semesterCat?.slug).toBe('semester');
  });

  it('should have exactly 4 valid fallback slides with non-empty titles and routes', () => {
    expect(FALLBACK_SLIDES.length).toBe(4);
    FALLBACK_SLIDES.forEach(slide => {
      expect(slide.title.length).toBeGreaterThan(0);
      expect(slide.route.length).toBeGreaterThan(0);
      expect(slide.inBanner).toBe(true);
    });
  });

  it('should resolve local asset banner and external web URLs cleanly', () => {
    const local = resolveBannerSource('convocation-2026.jpg');
    expect(local).toBeDefined();

    const web = resolveBannerSource('https://example.com/banner.jpg');
    expect(web).toEqual({ uri: 'https://example.com/banner.jpg' });

    const relative = resolveBannerSource('/announcements/test.jpg');
    expect(web).toBeDefined();
  });
});
