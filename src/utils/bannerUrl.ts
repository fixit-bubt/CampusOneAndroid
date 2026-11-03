import type { ImageSourcePropType } from 'react-native';

export const BANNERS_MAP: Record<string, ImageSourcePropType> = {
  'blood-drive.jpg': require('../../assets/banners/blood-drive.jpg'),
  'convocation-2026.jpg': require('../../assets/banners/convocation-2026.jpg'),
  'exam-routine.jpg': require('../../assets/banners/exam-routine.jpg'),
  'hackathon-2026.jpg': require('../../assets/banners/hackathon-2026.jpg'),
};

export function resolveBannerSource(
  rawUrl?: string | null,
  fallbackLocal?: ImageSourcePropType
): ImageSourcePropType | null {
  if (!rawUrl && !fallbackLocal) return null;
  if (!rawUrl && fallbackLocal) return fallbackLocal;

  const cleaned = (rawUrl ?? '').trim();
  const filename = cleaned.split('/').pop()?.split('?')[0] || '';

  if (filename && BANNERS_MAP[filename]) {
    return BANNERS_MAP[filename];
  }

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return { uri: cleaned };
  }

  if (cleaned.startsWith('/')) {
    return { uri: `https://campusonebubt.vercel.app${cleaned}` };
  }

  if (cleaned.startsWith('notices/') || cleaned.startsWith('storage/')) {
    const withoutStorage = cleaned.replace(/^storage\//, '').replace(/^\/+/, '');
    return { uri: `https://www.bubt.edu.bd/storage/${withoutStorage}` };
  }

  if (cleaned.startsWith('uploads/')) {
    return { uri: `https://www.bubt.edu.bd/${cleaned}` };
  }

  return fallbackLocal ?? (cleaned ? { uri: cleaned } : null);
}

