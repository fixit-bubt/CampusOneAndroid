import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { FontFamily } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { getCacheSync, CacheKeys } from '../../services/cacheService';
import {
  fetchCuratedBannerSlides,
  type BannerSlide,
  FALLBACK_SLIDES,
} from '../../services/announcementService';
import { resolveBannerSource, BANNERS_MAP } from '../../utils/bannerUrl';
export { resolveBannerSource } from '../../utils/bannerUrl';

export interface HomeHeroBannerProps {
  refreshTrigger?: number;
}

export function HomeHeroBanner({ refreshTrigger }: HomeHeroBannerProps = {}) {
  const navigation = useNavigation<any>();
  const { C, isDark } = useTheme();
  const [slides, setSlides] = useState<BannerSlide[]>(
    () => getCacheSync<BannerSlide[]>(CacheKeys.HOME_BANNER) ?? FALLBACK_SLIDES
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedId, setFailedId] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSlides = useCallback(async (force = false) => {
    try {
      const data = await fetchCuratedBannerSlides(force);
      if (data && data.length > 0) {
        setSlides(data);
        setCurrentIndex((prev) => (prev >= data.length ? 0 : prev));
      }
    } catch {
      setSlides(FALLBACK_SLIDES);
    }
  }, []);

  const loadOnFocus = useCallback(() => { loadSlides(false); }, [loadSlides]);
  useFocusRefresh(loadOnFocus);

  useEffect(() => {
    if (refreshTrigger) {
      loadSlides(true);
    }
  }, [refreshTrigger, loadSlides]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isFocused || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4200);
  }, [isFocused, slides.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const handleSelectIndex = (idx: number) => {
    setCurrentIndex(idx);
    startTimer();
  };

  const activeSlide = slides[currentIndex] || slides[0] || null;

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
      startTimer();
    } else if (diff < -40) {
      setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
      startTimer();
    }
    touchStartX.current = null;
  };

  if (!activeSlide) return null;

  // A missing or broken remote image would leave the card pure black
  const imgSource =
    (failedId !== activeSlide.id
      ? resolveBannerSource(activeSlide.imageUri, activeSlide.localImage)
      : null) ?? BANNERS_MAP['convocation-2026.jpg'];

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
          {imgSource ? (
            <Image
              resizeMethod="resize"
              source={imgSource}
              style={styles.bgImage}
              onError={() => setFailedId(activeSlide.id)}
            />
          ) : null}

          {/* Gradient Scrim for contrast */}
          <LinearGradient
            colors={['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.50)', 'rgba(0,0,0,0.92)']}
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
          {slides.map((_, idx) => {
            const isActive = currentIndex === idx;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSelectIndex(idx)}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                style={[
                  styles.indicatorBar,
                  isActive
                    ? [styles.indicatorActive, { backgroundColor: C.brand }]
                    : [
                        styles.indicatorInactive,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.35)'
                            : 'rgba(15, 26, 46, 0.22)',
                        },
                      ],
                ]}
              />
            );
          })}
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
    backgroundColor: '#000000',
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
    height: 3,
    borderRadius: 2,
  },
  indicatorActive: {
    width: 24,
  },
  indicatorInactive: {
    width: 12,
  },
});
