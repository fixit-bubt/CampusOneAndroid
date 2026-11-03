import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Radius } from '../../theme';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import {
  fetchAdminBannerPool,
  saveBannerOrder,
  updateAnnouncementBannerStatus,
  updateClubBannerStatus,
  type BannerSlide,
} from '../../services/announcementService';
import { BANNERS_MAP, resolveBannerSource } from '../../utils/bannerUrl';

export function ManageBannerScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeSlides, setActiveSlides] = useState<BannerSlide[]>([]);
  const [availableAnnouncements, setAvailableAnnouncements] = useState<any[]>([]);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [availableClubs, setAvailableClubs] = useState<any[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [candidateTab, setCandidateTab] = useState<'all' | 'announcements' | 'events' | 'clubs'>('all');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pool = await fetchAdminBannerPool();
      if (pool.error) {
        toast({ type: 'error', title: 'Load Error', message: pool.error });
      } else {
        setActiveSlides(pool.activeSlides);
        setAvailableAnnouncements(pool.availableAnnouncements);
        setAvailableEvents(pool.availableEvents);
        setAvailableClubs(pool.availableClubs || []);
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const activeSourceIds = useMemo(() => {
    return new Set(activeSlides.map((s) => s.sourceId));
  }, [activeSlides]);

  const handleOpenDetail = (item: {
    type: 'Notice' | 'Event' | 'Club';
    id: string;
    sourceId?: string;
    route?: string;
    params?: any;
  }) => {
    const targetId = item.sourceId || item.id;
    if (item.type === 'Notice') {
      navigation.navigate('AnnouncementDetail', { announcementId: targetId });
    } else if (item.type === 'Event') {
      navigation.navigate('EventDetail', { eventId: targetId });
    } else if (item.type === 'Club') {
      const clubId = (item as any).raw?.club_id || (item as any).params?.clubId || targetId;
      navigation.navigate('ClubDetail', { clubId });
    } else if (item.route) {
      navigation.navigate(item.route, item.params);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= activeSlides.length) return;

    const next = [...activeSlides];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;

    const updated = next.map((item, idx) => ({
      ...item,
      bannerOrder: idx + 1,
    }));

    setActiveSlides(updated);
    setPreviewIdx(targetIdx);

    const payload = updated.map((item, idx) => ({
      id: item.sourceId,
      type: (item.type === 'Event' ? 'event' : item.type === 'Club' ? 'club' : 'announcement') as 'announcement' | 'event' | 'club',
      order: idx + 1,
    }));

    const res = await saveBannerOrder(payload);
    if (!res.success) {
      toast({ type: 'error', title: 'Reorder Failed', message: res.error });
      loadData();
    } else {
      toast({ type: 'success', title: 'Banner Order Updated', message: `Moved to slot #${targetIdx + 1}` });
    }
  };

  const handleRemove = async (slide: BannerSlide) => {
    setSavingId(slide.id);
    const nextSlides = activeSlides.filter((s) => s.id !== slide.id);
    setActiveSlides(nextSlides);
    if (previewIdx >= nextSlides.length) {
      setPreviewIdx(Math.max(0, nextSlides.length - 1));
    }

    try {
      if (slide.type === 'Notice') {
        const res = await updateAnnouncementBannerStatus(slide.sourceId, false);
        if (!res.success) throw new Error(res.error);
      } else if (slide.type === 'Club') {
        const res = await updateClubBannerStatus(slide.sourceId, false);
        if (!res.success) throw new Error(res.error);
      } else {
        const payload = nextSlides.map((item, idx) => ({
          id: item.sourceId,
          type: (item.type === 'Event' ? 'event' : item.type === 'Club' ? 'club' : 'announcement') as 'announcement' | 'event' | 'club',
          order: idx + 1,
        }));
        const res = await saveBannerOrder(payload);
        if (!res.success) throw new Error(res.error);
      }

      toast({
        type: 'success',
        title: 'Removed from Banner',
        message: `"${slide.title.slice(0, 28)}..." removed from banner.`,
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Update Failed', message: err.message });
      loadData();
    } finally {
      setSavingId(null);
    }
  };

  const handleAddCandidate = async (candidate: {
    id: string;
    title: string;
    subtitle: string;
    type: 'Notice' | 'Event' | 'Club';
    image?: string | null;
    raw: any;
  }) => {
    if (activeSlides.length >= 6) {
      Alert.alert(
        'Banner Limit Reached',
        'The home carousel holds a maximum of 6 slides. Please remove an existing slide before adding a new one.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSavingId(candidate.id);
    const nextOrder = activeSlides.length + 1;

    let newSlide: BannerSlide;
    if (candidate.type === 'Notice') {
      newSlide = {
        id: `ann-${candidate.id}`,
        sourceId: candidate.id,
        type: 'Notice',
        title: candidate.title,
        subtitle: candidate.raw.department ? `${candidate.raw.department} Department` : 'BUBT Notice',
        imageUri: candidate.image,
        route: 'AnnouncementDetail',
        params: { announcementId: candidate.id },
        bannerOrder: nextOrder,
        inBanner: true,
      };
    } else if (candidate.type === 'Event') {
      newSlide = {
        id: `ev-${candidate.id}`,
        sourceId: candidate.id,
        type: 'Event',
        title: candidate.title,
        subtitle: `${candidate.raw.venue || 'Campus'}${candidate.raw.time ? ` · ${candidate.raw.time}` : ''}`,
        imageUri: candidate.image,
        route: 'EventDetail',
        params: { eventId: candidate.id },
        bannerOrder: nextOrder,
        inBanner: true,
      };
    } else {
      newSlide = {
        id: `club-${candidate.id}`,
        sourceId: candidate.id,
        type: 'Club',
        title: candidate.title,
        subtitle: candidate.subtitle,
        imageUri: candidate.image,
        route: 'ClubDetail',
        params: { clubId: candidate.raw?.club_id || candidate.id },
        bannerOrder: nextOrder,
        inBanner: true,
      };
    }

    const nextSlides = [...activeSlides, newSlide];
    setActiveSlides(nextSlides);
    setPreviewIdx(nextSlides.length - 1);

    try {
      if (candidate.type === 'Notice') {
        const res = await updateAnnouncementBannerStatus(candidate.id, true, nextOrder);
        if (!res.success) throw new Error(res.error);
      } else if (candidate.type === 'Club') {
        const res = await updateClubBannerStatus(candidate.id, true, nextOrder);
        if (!res.success) throw new Error(res.error);
      } else {
        const payload = nextSlides.map((s, idx) => ({
          id: s.sourceId,
          type: (s.type === 'Event' ? 'event' : s.type === 'Club' ? 'club' : 'announcement') as 'announcement' | 'event' | 'club',
          order: idx + 1,
        }));
        const res = await saveBannerOrder(payload);
        if (!res.success) throw new Error(res.error);
      }

      toast({
        type: 'success',
        title: 'Added to Banner',
        message: `"${candidate.title.slice(0, 28)}..." added to position #${nextOrder}.`,
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Add Failed', message: err.message });
      loadData();
    } finally {
      setSavingId(null);
    }
  };

  const candidateCounts = useMemo(() => {
    const annCount = availableAnnouncements.filter((a) => !activeSourceIds.has(a.id)).length;
    const evCount = availableEvents.filter((e) => !activeSourceIds.has(e.id)).length;
    const clCount = availableClubs.filter((c) => !activeSourceIds.has(c.id)).length;
    return {
      all: annCount + evCount + clCount,
      announcements: annCount,
      events: evCount,
      clubs: clCount,
    };
  }, [availableAnnouncements, availableEvents, availableClubs, activeSourceIds]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: 'Notice' | 'Event' | 'Club';
      priority?: string;
      image?: string | null;
      raw: any;
    }> = [];

    if (candidateTab === 'all' || candidateTab === 'announcements') {
      availableAnnouncements.forEach((a) => {
        if (activeSourceIds.has(a.id)) return;

        const img = a.banner_image_url || a.image_url ||
          (a.attachment_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(a.attachment_url) ? a.attachment_url : null);

        if (q) {
          const matchTitle = (a.title || '').toLowerCase().includes(q);
          const matchDept = (a.department || '').toLowerCase().includes(q);
          const matchCode = (a.code || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDept && !matchCode) return;
        }

        result.push({
          id: a.id,
          title: a.title,
          subtitle: a.department || 'BUBT Notice',
          type: 'Notice',
          priority: a.priority,
          image: img,
          raw: a,
        });
      });
    }

    if (candidateTab === 'all' || candidateTab === 'events') {
      availableEvents.forEach((e) => {
        if (activeSourceIds.has(e.id)) return;
        if (q) {
          const matchTitle = (e.title || '').toLowerCase().includes(q);
          const matchVenue = (e.venue || '').toLowerCase().includes(q);
          if (!matchTitle && !matchVenue) return;
        }
        result.push({
          id: e.id,
          title: e.title,
          subtitle: `${e.venue || 'Campus'}${e.time ? ` · ${e.time}` : ''}`,
          type: 'Event',
          priority: e.category,
          image: e.banner_url,
          raw: e,
        });
      });
    }

    if (candidateTab === 'all' || candidateTab === 'clubs') {
      availableClubs.forEach((cp) => {
        if (activeSourceIds.has(cp.id)) return;
        if (q) {
          const matchTitle = (cp.title || '').toLowerCase().includes(q);
          const matchBody = (cp.body || '').toLowerCase().includes(q);
          const matchClub = (cp.clubs?.name || '').toLowerCase().includes(q);
          if (!matchTitle && !matchBody && !matchClub) return;
        }
        result.push({
          id: cp.id,
          title: cp.title || 'Club Announcement',
          subtitle: cp.clubs?.name ? `${cp.clubs.name} · Club News` : 'BUBT Club News',
          type: 'Club',
          priority: cp.clubs?.category || 'Club News',
          image: cp.image_url || cp.clubs?.cover_url || null,
          raw: cp,
        });
      });
    }

    return result;
  }, [availableAnnouncements, availableEvents, availableClubs, activeSourceIds, search, candidateTab]);

  const activePreview = activeSlides[previewIdx] || activeSlides[0] || null;
  const resolvedPreviewSource = activePreview ? resolveBannerSource(activePreview.imageUri, activePreview.localImage) : null;
  const fallbackPreviewSource = activePreview
    ? (activePreview.type === 'Event'
        ? BANNERS_MAP['hackathon-2026.jpg']
        : activePreview.type === 'Club'
        ? BANNERS_MAP['blood-drive.jpg']
        : BANNERS_MAP['convocation-2026.jpg'])
    : BANNERS_MAP['convocation-2026.jpg'];
  const previewSource = resolvedPreviewSource || fallbackPreviewSource;

  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Dashboard Banner" onBack={() => navigation.goBack()} />
        <View style={styles.centerPad}>
          <Icon name="shield" size={36} color={C.textMuted} />
          <Text style={[styles.blockedTitle, { color: C.text }]}>Admin Access Required</Text>
          <Text style={[styles.blockedSub, { color: C.textMuted }]}>
            Only system administrators can curate the home carousel.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const categoryLabel =
    candidateTab === 'all'
      ? `All Candidates (${candidateCounts.all})`
      : candidateTab === 'announcements'
      ? `Announcements (${candidateCounts.announcements})`
      : candidateTab === 'events'
      ? `Campus Events (${candidateCounts.events})`
      : `Student Clubs (${candidateCounts.clubs})`;

  const categoryIcon =
    candidateTab === 'all'
      ? 'layers'
      : candidateTab === 'announcements'
      ? 'file-text'
      : candidateTab === 'events'
      ? 'calendar'
      : 'users';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Dashboard Banner"
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            onPress={loadData}
            hitSlop={10}
            style={styles.refreshIconBtn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.brand} />
            ) : (
              <Feather name="refresh-cw" size={18} color={C.text} />
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Visual Live Carousel Preview */}
        <View style={[styles.previewWrapper, { borderColor: C.border, backgroundColor: C.surface }]}>
          <View style={styles.previewHeaderRow}>
            <View style={styles.previewTagPill}>
              <Feather name="eye" size={14} color={C.textMuted} />
              <Text style={[styles.previewTagTxt, { color: C.text }]}>Student Home Preview</Text>
            </View>
            <Text style={[styles.previewCountTxt, { color: C.textMuted }]}>
              {activeSlides.length}/6 Active Slides
            </Text>
          </View>

          {activePreview ? (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => handleOpenDetail(activePreview)}
              style={styles.previewCard}
            >
              {/* Unconditional local varsity fallback */}
              <Image
                source={fallbackPreviewSource}
                style={styles.previewBgFallback}
                resizeMode="cover"
              />

              {/* Custom Image Overlay */}
              {resolvedPreviewSource && (
                <Image
                  source={resolvedPreviewSource}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}

              {/* Scrim Gradient with Nested Content on Top */}
              <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.50)', 'rgba(0,0,0,0.92)']}
                locations={[0, 0.40, 1]}
                style={styles.previewGradient}
              >
                <View style={styles.previewTopRow}>
                  <View style={[styles.typeBadge, { backgroundColor: isDark ? 'rgba(39,39,42,0.85)' : 'rgba(24,24,27,0.85)', borderColor: isDark ? '#3f3f46' : '#27272a' }]}>
                    <Text style={styles.typeBadgeTxt}>Slot #{previewIdx + 1} · {activePreview.type}</Text>
                  </View>
                  <View style={styles.tapToViewPill}>
                    <Feather name="external-link" size={11} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.tapToViewTxt}>Tap to View</Text>
                  </View>
                </View>

                <View style={styles.previewBottomContent}>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {activePreview.title}
                  </Text>
                  <Text style={styles.previewSub} numberOfLines={1}>
                    {activePreview.subtitle}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.emptyPreviewCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Feather name="alert-circle" size={24} color={C.textMuted} />
              <Text style={[styles.emptyPreviewTxt, { color: C.textMuted }]}>
                No slides currently active. Default varsity banners will display.
              </Text>
            </View>
          )}

          {/* Pagination Line Indicators matching HomeHeroBanner */}
          {activeSlides.length > 1 && (
            <View style={styles.indicatorRow}>
              {activeSlides.map((_, idx) => {
                const isActive = previewIdx === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setPreviewIdx(idx)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    style={[
                      styles.indicatorBar,
                      isActive
                        ? [styles.indicatorActive, { backgroundColor: isDark ? '#ffffff' : '#18181b' }]
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

          {/* Quick Slot Selector */}
          {activeSlides.length > 0 && (
            <View style={styles.slotRow}>
              {activeSlides.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setPreviewIdx(idx)}
                  style={[
                    styles.slotPill,
                    {
                      backgroundColor: previewIdx === idx ? (isDark ? '#27272a' : '#18181b') : C.surface2,
                      borderColor: previewIdx === idx ? (isDark ? '#3f3f46' : '#27272a') : C.border,
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text
                    style={[
                      styles.slotPillTxt,
                      { color: previewIdx === idx ? '#ffffff' : C.textMuted },
                    ]}
                  >
                    #{idx + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Section 1: Active Slides Management */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Active Banner Slides ({activeSlides.length}/6)</Text>
          <Text style={[styles.sectionHint, { color: C.textMuted }]}>Max 6</Text>
        </View>

        {activeSlides.length === 0 ? (
          <View style={[styles.emptyStateCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="layers" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>No Curated Slides</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              Add announcements, events, or clubs from below to feature them on the student home banner.
            </Text>
          </View>
        ) : (
          <View style={styles.activeListContainer}>
            {activeSlides.map((slide, index) => {
              const src = resolveBannerSource(slide.imageUri, slide.localImage) || (
                slide.type === 'Event'
                  ? BANNERS_MAP['hackathon-2026.jpg']
                  : slide.type === 'Club'
                    ? BANNERS_MAP['blood-drive.jpg']
                    : BANNERS_MAP['convocation-2026.jpg']
              );
              const isFirst = index === 0;
              const isLast = index === activeSlides.length - 1;
              const isBusy = savingId === slide.id;

              return (
                <View
                  key={slide.id}
                  style={[
                    styles.activeSlideCard,
                    {
                      backgroundColor: C.surface,
                      borderColor: previewIdx === index ? (isDark ? '#52525b' : '#a1a1aa') : C.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.activeSlideThumbWrap}
                    onPress={() => setPreviewIdx(index)}
                    activeOpacity={0.8}
                  >
                    {src ? (
                      <Image source={src} style={styles.activeSlideThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.activeSlideThumb, { backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                        <Feather name="image" size={16} color={C.textMuted} />
                      </View>
                    )}
                    <View style={[styles.orderIndexTag, { backgroundColor: isDark ? '#27272a' : '#18181b', borderColor: isDark ? '#3f3f46' : '#27272a' }]}>
                      <Text style={styles.orderIndexTxt}>#{index + 1}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.activeSlideInfo}
                    onPress={() => {
                      setPreviewIdx(index);
                      handleOpenDetail(slide);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.badgeRowTiny}>
                      <View style={[styles.typePillTiny, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.typePillTxtTiny, { color: C.text2 }]}>{slide.type}</Text>
                      </View>
                      <View style={styles.openHintRow}>
                        <Feather name="external-link" size={10} color={C.textMuted} />
                        <Text style={[styles.openHintTxt, { color: C.textMuted }]}>Open</Text>
                      </View>
                    </View>
                    <Text style={[styles.activeSlideTitle, { color: C.text }]} numberOfLines={1}>
                      {slide.title}
                    </Text>
                    <Text style={[styles.activeSlideSub, { color: C.textMuted }]} numberOfLines={1}>
                      {slide.subtitle}
                    </Text>
                  </TouchableOpacity>

                  {/* Actions: Move Up, Move Down, Delete */}
                  <View style={styles.activeSlideActions}>
                    <TouchableOpacity
                      onPress={() => handleMove(index, -1)}
                      disabled={isFirst || isBusy}
                      style={[styles.arrowBtn, { opacity: isFirst ? 0.3 : 1 }]}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Feather name="arrow-up" size={16} color={C.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleMove(index, 1)}
                      disabled={isLast || isBusy}
                      style={[styles.arrowBtn, { opacity: isLast ? 0.3 : 1 }]}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Feather name="arrow-down" size={16} color={C.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemove(slide)}
                      disabled={isBusy}
                      style={styles.trashBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color={C.textMuted} />
                      ) : (
                        <Feather name="trash-2" size={16} color={C.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Section 2: Candidate Pool */}
        <View style={styles.candidateSection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Add Announcements, Events & Clubs</Text>
          <Text style={[styles.sectionHint, { color: C.textMuted }]}>
            Select items to display on the student home banner
          </Text>

          {/* Search Bar */}
          <View style={[styles.searchBox58, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="search" size={18} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search notices..."
              placeholderTextColor={C.textMuted}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Universal 58dp Category Dropdown Bar */}
          <TouchableOpacity
            style={[
              styles.dropdownBar58,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}
            onPress={() => setFilterSheetVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.barLeft}>
              <Feather name={categoryIcon as any} size={20} color={C.text} />
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {categoryLabel}
              </Text>
            </View>
            <Feather name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* Candidates List */}
          {filteredCandidates.length === 0 ? (
            <View style={[styles.emptyPoolCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="info" size={20} color={C.textMuted} />
              <Text style={[styles.emptyPoolTxt, { color: C.textMuted }]}>
                No candidate items found matching your filter.
              </Text>
            </View>
          ) : (
            filteredCandidates.map((item) => {
              const isFull = activeSlides.length >= 6;
              const isBusy = savingId === item.id;
              const src = resolveBannerSource(item.image) || (
                item.type === 'Event'
                  ? BANNERS_MAP['hackathon-2026.jpg']
                  : item.type === 'Club'
                    ? BANNERS_MAP['blood-drive.jpg']
                    : null
              );

              return (
                <View
                  key={`${item.type}-${item.id}`}
                  style={[styles.candidateCard, { backgroundColor: C.surface, borderColor: C.border }]}
                >
                  <TouchableOpacity
                    style={styles.candidateThumbWrap}
                    onPress={() => handleOpenDetail(item)}
                    activeOpacity={0.8}
                  >
                    {src ? (
                      <Image source={src} style={styles.candidateThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.candidateThumb, { backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                        <Feather
                          name={item.type === 'Notice' ? 'file-text' : item.type === 'Event' ? 'calendar' : 'users'}
                          size={18}
                          color={C.textMuted}
                        />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.candidateInfo}
                    onPress={() => handleOpenDetail(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.badgeRowTiny}>
                      <View style={[styles.typePillTiny, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.typePillTxtTiny, { color: C.text2 }]}>{item.type}</Text>
                      </View>
                      {item.priority && (
                        <View style={[styles.typePillTiny, { backgroundColor: C.surface2 }]}>
                          <Text style={[styles.typePillTxtTiny, { color: C.textMuted }]}>{item.priority}</Text>
                        </View>
                      )}
                      <View style={styles.openHintRow}>
                        <Feather name="external-link" size={10} color={C.textMuted} />
                        <Text style={[styles.openHintTxt, { color: C.textMuted }]}>Open to verify</Text>
                      </View>
                    </View>
                    <Text style={[styles.candidateTitle, { color: C.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.candidateSub, { color: C.textMuted }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      {
                        backgroundColor: isFull ? C.surface2 : (isDark ? '#27272a' : '#18181b'),
                        borderColor: isFull ? C.border : (isDark ? '#3f3f46' : '#27272a'),
                        borderWidth: 1,
                        opacity: isFull || isBusy ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => handleAddCandidate(item)}
                    disabled={isFull || isBusy}
                    activeOpacity={0.8}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Feather name="plus" size={13} color="#ffffff" />
                        <Text style={styles.addBtnTxt}>Add</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 58dp Dropdown Category Filter Bottom Sheet */}
      <Modal
        visible={filterSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterSheetVisible(false)}
        >
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#3f3f46' : '#d4d4d8' }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Candidate Category Filter
            </Text>
            <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Choose items to browse and feature on the student home carousel
            </Text>

            <View style={{ gap: 8, marginTop: 14 }}>
              {[
                { key: 'all', label: 'All Candidates', icon: 'layers', count: candidateCounts.all },
                { key: 'announcements', label: 'BUBT Announcements', icon: 'file-text', count: candidateCounts.announcements },
                { key: 'events', label: 'Campus Events', icon: 'calendar', count: candidateCounts.events },
                { key: 'clubs', label: 'Student Clubs & Communities', icon: 'users', count: candidateCounts.clubs },
              ].map((item) => {
                const isSelected = candidateTab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.sheetOptionBar58,
                      {
                        backgroundColor: isSelected ? (isDark ? '#27272a' : '#f4f4f5') : C.surface,
                        borderColor: isSelected ? (isDark ? '#3f3f46' : '#27272a') : C.border,
                      },
                    ]}
                    onPress={() => {
                      setCandidateTab(item.key as any);
                      setFilterSheetVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.barLeft}>
                      <Feather name={item.icon as any} size={20} color={C.text} />
                      <Text
                        style={[
                          styles.sheetOptionTxt,
                          {
                            color: C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {item.label} ({item.count})
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={18} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  centerPad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  blockedTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 16,
    marginTop: 14,
  },
  blockedSub: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 13.5,
    marginTop: 8,
    textAlign: 'center',
  },
  refreshIconBtn: {
    padding: 8,
  },
  previewWrapper: {
    marginTop: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTagTxt: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 12.5,
  },
  previewCountTxt: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 12,
  },
  previewCard: {
    height: 168,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#18181b',
  },
  previewBgFallback: {
    ...StyleSheet.absoluteFill as any,
    width: '100%',
    height: '100%',
  },
  previewImage: {
    ...StyleSheet.absoluteFill as any,
    width: '100%',
    height: '100%',
  },
  previewGradient: {
    ...StyleSheet.absoluteFill as any,
    justifyContent: 'space-between',
    padding: 14,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tapToViewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tapToViewTxt: {
    color: '#ffffff',
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 10.5,
  },
  previewBottomContent: {
    gap: 3,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeTxt: {
    color: '#ffffff',
    fontFamily: FontFamily.jakartaBold,
    fontSize: 10.5,
  },
  previewTitle: {
    color: '#ffffff',
    fontFamily: FontFamily.jakartaBold,
    fontSize: 15,
    lineHeight: 20,
  },
  previewSub: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FontFamily.jakartaRegular,
    fontSize: 12,
  },
  emptyPreviewCard: {
    height: 110,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  emptyPreviewTxt: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
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
  slotRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  slotPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  slotPillTxt: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 11,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 15,
  },
  sectionHint: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 12,
  },
  activeListContainer: {
    gap: 8,
  },
  activeSlideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  activeSlideThumbWrap: {
    position: 'relative',
    width: 60,
    height: 48,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  activeSlideThumb: {
    width: '100%',
    height: '100%',
  },
  orderIndexTag: {
    position: 'absolute',
    top: 2,
    left: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  orderIndexTxt: {
    color: '#ffffff',
    fontFamily: FontFamily.jakartaBold,
    fontSize: 9,
  },
  activeSlideInfo: {
    flex: 1,
    gap: 2,
  },
  badgeRowTiny: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typePillTiny: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  typePillTxtTiny: {
    fontSize: 9.5,
    fontFamily: FontFamily.jakartaBold,
  },
  openHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  openHintTxt: {
    fontSize: 10,
    fontFamily: FontFamily.jakartaMedium,
  },
  activeSlideTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 13,
    lineHeight: 17,
  },
  activeSlideSub: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 11,
  },
  activeSlideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCard: {
    padding: 24,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 14,
    marginTop: 4,
  },
  emptySub: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  candidateSection: {
    marginTop: 24,
  },
  searchBox58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  dropdownBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 14,
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  barTitle: {
    fontSize: 14.5,
  },
  emptyPoolCard: {
    padding: 20,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyPoolTxt: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  candidateThumbWrap: {
    width: 54,
    height: 44,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  candidateThumb: {
    width: '100%',
    height: '100%',
  },
  candidateInfo: {
    flex: 1,
    gap: 2,
  },
  candidateTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 12.5,
    lineHeight: 16,
  },
  candidateSub: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 11,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
  },
  addBtnTxt: {
    color: '#ffffff',
    fontFamily: FontFamily.jakartaBold,
    fontSize: 11.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
  },
  sheetSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  sheetOptionBar58: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetOptionTxt: {
    fontSize: 14,
  },
});
