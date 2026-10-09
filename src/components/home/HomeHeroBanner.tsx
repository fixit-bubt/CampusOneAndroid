import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  type ImageSourcePropType,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../utils/format';
import { FontFamily } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export interface BannerSlide {
  id: string;
  type: 'Event' | 'Notice';
  title: string;
  subtitle: string;
  imageUri?: string;
  localImage?: ImageSourcePropType;
  route: string;
  params?: any;
}

const BANNERS_MAP: Record<string, ImageSourcePropType> = {
  'blood-drive.jpg': require('../../../assets/banners/blood-drive.jpg'),
  'convocation-2026.jpg': require('../../../assets/banners/convocation-2026.jpg'),
  'exam-routine.jpg': require('../../../assets/banners/exam-routine.jpg'),
  'hackathon-2026.jpg': require('../../../assets/banners/hackathon-2026.jpg'),
};

export function resolveBannerSource(
  rawUrl?: string,
  fallbackLocal?: ImageSourcePropType
): ImageSourcePropType | null {
  if (!rawUrl && !fallbackLocal) return null;
  if (!rawUrl && fallbackLocal) return fallbackLocal;

  const cleaned = (rawUrl ?? '').trim();
  const filename = cleaned.split('/').pop()?.split('?')[0] || '';

  // 1. Matches bundled local varsity asset
  if (filename && BANNERS_MAP[filename]) {
    return BANNERS_MAP[filename];
  }

  // 2. Full remote web URL
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return { uri: cleaned };
  }

  // 3. Relative web path from database seed (e.g. /events/... or /announcements/...)
  if (cleaned.startsWith('/')) {
    return { uri: `https://campus-theta.vercel.app${cleaned}` };
  }

  return fallbackLocal ?? null;
}

const FALLBACK_SLIDES: BannerSlide[] = [
  {
    id: 'fallback-blood',
    type: 'Event',
    title: 'Voluntary Blood Donation Drive & Free Health Camp',
    subtitle: 'Building 2 Main Lobby · 10:00',
    localImage: BANNERS_MAP['blood-drive.jpg'],
    route: 'Blood',
  },
  {
    id: 'fallback-routine',
    type: 'Notice',
    title: 'Tri-Semester Final Examination Routine Published',
    subtitle: 'Examination Controller Department',
    localImage: BANNERS_MAP['exam-routine.jpg'],
    route: 'RoutinesBrowse',
  },
  {
    id: 'fallback-convocation',
    type: 'Notice',
    title: '10th Convocation Ceremony - Registration Open',
    subtitle: 'Office of the Registrar · Graduating Students',
    localImage: BANNERS_MAP['convocation-2026.jpg'],
    route: 'Announcements',
  },
  {
    id: 'fallback-hackathon',
    type: 'Event',
    title: 'Innovate & Code: BUBT Inter-University Hackathon 2026',
    subtitle: 'Campus Auditorium & CSE Lab 402 · 09:30 AM',
    localImage: BANNERS_MAP['hackathon-2026.jpg'],
    route: 'EventsBrowse',
  },
];

export function HomeHeroBanner() {
  const navigation = useNavigation<any>();
  const { C } = useTheme();
  const [slides, setSlides] = useState<BannerSlide[]>(FALLBACK_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const fetchLiveSlides = useCallback(async () => {
    try {
      const today = localToday();
      const [annRes, evRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('id, title, department, priority, image_url, attachment_url')
          .is('deleted_at', null)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('events')
          .select('id, title, venue, time, date, category, banner_url')
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(6),
      ]);

      const liveList: BannerSlide[] = [];

      if (evRes.data && evRes.data.length > 0) {
        evRes.data.forEach((e: any) => {
          if (!e.banner_url) return;
          liveList.push({
            id: `ev-${e.id}`,
            type: 'Event',
            title: e.title,
            subtitle: `${e.venue || 'Campus'}${e.time ? ` · ${e.time}` : ''}`,
            imageUri: e.banner_url,
            route: 'EventDetail',
            params: { eventId: e.id },
          });
        });
      }

      if (annRes.data && annRes.data.length > 0) {
        annRes.data.forEach((a: any) => {
          const img =
            a.image_url ||
            (a.attachment_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(a.attachment_url)
              ? a.attachment_url
              : null);
          if (!img) return;
          liveList.push({
            id: `ann-${a.id}`,
            type: 'Notice',
            title: a.title,
            subtitle: a.department ? `${a.department} Department` : 'BUBT Notice',
            imageUri: img,
            route: 'AnnouncementDetail',
            params: { announcementId: a.id },
          });
        });
      }

      if (liveList.length > 0) {
        setSlides(liveList);
      } else {
        setSlides(FALLBACK_SLIDES);
      }
    } catch {
      setSlides(FALLBACK_SLIDES);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLiveSlides();
    }, [fetchLiveSlides])
  );

  // 4.2 second auto-rotation
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [slides.length]);

  const activeSlide = slides[currentIndex] || slides[0];

  const handlePress = () => {
    if (!activeSlide) return;
    if (activeSlide.params) {
      navigation.navigate(activeSlide.route, activeSlide.params);
    } else {
      navigation.navigate(activeSlide.route);
    }
  };

  const handleTouchStart = (pageX: number) => {
    touchStartX.current = pageX;
  };

  const handleTouchEnd = (pageX: number) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - pageX;
    if (diff > 40) {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    } else if (diff < -40) {
      setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
    touchStartX.current = null;
  };

  return (
    <View style={styles.container}>
      <View
        onTouchStart={(e: GestureResponderEvent) => handleTouchStart(e.nativeEvent.pageX)}
        onTouchEnd={(e: GestureResponderEvent) => handleTouchEnd(e.nativeEvent.pageX)}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handlePress}
          style={styles.card}
        >
          {(() => {
            const imgSource = resolveBannerSource(
              activeSlide.imageUri,
              activeSlide.localImage
            );
            return imgSource ? (
              <Image source={imgSource} style={styles.bgImage} />
            ) : null;
          })()}

          {/* Gradient Scrim for guaranteed contrast */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Text info overlaid at bottom */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {activeSlide.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {activeSlide.subtitle}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Pagination Line Indicators */}
      {slides.length > 1 && (
        <View style={styles.indicatorRow}>
          {slides.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setCurrentIndex(idx)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={[
                styles.indicatorBar,
                currentIndex === idx
                  ? [styles.indicatorActive, { backgroundColor: C.brand }]
                  : styles.indicatorInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 8,
  },
  card: {
    height: 168,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#05070c',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  bgImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FontFamily.jakartaBold,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12.5,
    marginTop: 4,
    fontFamily: FontFamily.jakartaRegular,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  indicatorBar: {
    height: 2.5,
    borderRadius: 2,
  },
  indicatorActive: {
    width: 24,
  },
  indicatorInactive: {
    width: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});
