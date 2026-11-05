import { indexKey, listGap } from '../../components/ui/listHelpers';
import { useAfterInteractions } from '../../hooks/useAfterInteractions';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TextInput,
  Image,
  Modal,
  Pressable,
  type ViewStyle, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { LogoMark } from '../../components/ui/Logo';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys, withTimeout } from '../../services/cacheService';
import { localToday } from '../../utils/format';
import { resolveBannerSource } from '../../components/home/HomeHeroBanner';
import {
  getEventLiveStatus,
  fetchUserEventBookmarks,
  toggleBookmark,
  triggerBubtEventsSync,
  type EventLiveStatus,
} from '../../services/eventsService';
import { useToast } from '../../components/ui/Toast';
import type { Event } from '../../types/database';

export interface EventCategoryOption {
  id: string;
  label: string;
  desc?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  color?: string;
}

export const EVENT_CATEGORIES: EventCategoryOption[] = [
  { id: 'All',      label: 'All Categories', desc: 'Browse all campus events',     icon: 'layers' },
  { id: 'Academic', label: 'Academic',       desc: 'Seminars, workshops & exams',  icon: 'book-open', color: SectorColors.reports },
  { id: 'Cultural', label: 'Cultural',       desc: 'Festivals, music & drama',     icon: 'music',     color: SectorColors.events },
  { id: 'Sports',   label: 'Sports',         desc: 'Tournaments & athletic meets', icon: 'activity',  color: SectorColors.market },
  { id: 'Club',     label: 'Club',           desc: 'Club sessions & orientations', icon: 'users',     color: SectorColors.clubs },
  { id: 'Career',   label: 'Career',         desc: 'Job fairs & industry talks',   icon: 'briefcase', color: SectorColors.jobs },
];

const CAT_COLOR: Record<string, string> = {
  Academic: SectorColors.reports,
  Cultural: SectorColors.events,
  Sports: SectorColors.market,
  Club: SectorColors.clubs,
  Career: SectorColors.jobs,
};

const CAT_ICON: Record<string, string> = {
  Academic: 'study',
  Cultural: 'star',
  Sports: 'pulse',
  Club: 'clubs',
  Career: 'jobs',
};

function StatusBadge({ status, countdown, C }: { status: EventLiveStatus; countdown: string; C: any }) {
  let bg = C.surface2;
  let fg = C.textMuted;
  let dotColor = C.textMuted;

  if (status === 'Ongoing') {
    bg = `${C.success}22`;
    fg = C.success;
    dotColor = C.success;
  } else if (status === 'Today') {
    bg = `${C.warn}22`;
    fg = C.warn;
    dotColor = C.warn;
  } else if (status === 'Upcoming') {
    bg = `${C.brand}1e`;
    fg = C.brand;
    dotColor = C.brand;
  }

  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.statusText, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
        {status === 'Ongoing' ? 'Live' : status} · {countdown}
      </Text>
    </View>
  );
}

function EventCard({
  e,
  C,
  isSaved,
  onToggleSave,
  onPress,
}: {
  e: Event;
  C: any;
  isSaved: boolean;
  onToggleSave: () => void;
  onPress: () => void;
}) {
  const fg = CAT_COLOR[e.category] ?? Accent.slate;
  const bg = `${fg}1a`;
  const { status, countdownText } = getEventLiveStatus(e);
  const isOfficial = e.source === 'bubt_news';
  const bannerSource = resolveBannerSource(e.banner_url);
  const [errorUrl, setErrorUrl] = useState<string | null>(null);
  const imgError = errorUrl !== null && errorUrl === e.banner_url;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      activeOpacity={0.82}
    >
      {/* Banner Cover or Category Header */}
      {bannerSource && !imgError ? (
        <View style={styles.bannerWrap}>
          <Image resizeMethod="resize"
            source={bannerSource}
            style={styles.bannerImg}
            resizeMode="cover"
            onError={() => setErrorUrl(e.banner_url ?? '')}
          />
          <View style={styles.bannerOverlay}>
            <View style={[styles.catTag, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <Icon name={CAT_ICON[e.category] ?? 'events'} size={12} color={C.white} />
              <Text style={[styles.catTagTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                {e.category}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onToggleSave}
              hitSlop={10}
              activeOpacity={0.7}
              style={[styles.bookmarkBtn, { backgroundColor: 'rgba(0,0,0,0.65)' }]}
            >
              <Feather name="bookmark" size={15} color={isSaved ? C.warn : C.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.fallbackBanner, { backgroundColor: bg }]}>
          <View style={styles.fallbackLeft}>
            <View style={styles.catIconCircle}>
              <Icon name={CAT_ICON[e.category] ?? 'events'} size={32} color={C.text} />
            </View>
            <Text style={[styles.fallbackCatText, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
              {e.category}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onToggleSave}
            hitSlop={10}
            activeOpacity={0.7}
            style={[styles.bookmarkBtn, { backgroundColor: C.surface2 }]}
          >
            <Feather name={isSaved ? 'bookmark' : 'bookmark'} size={15} color={isSaved ? C.warn : C.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Card Content Body */}
      <View style={styles.cardBody}>
        {/* Status + Badges Row */}
        <View style={styles.topBadgeRow}>
          <StatusBadge status={status} countdown={countdownText} C={C} />
          {isOfficial && (
            <View style={[styles.officialBadge, { backgroundColor: `${C.info}18` }]}>
              <Text style={[styles.officialBadgeText, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>
                Official
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
          {e.title}
        </Text>

        {/* Schedule & Venue Rows */}
        <View style={styles.metaRow}>
          <Feather name="calendar" size={13} color={C.textMuted} />
          <Text style={[styles.metaText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {e.date} · {e.time}{e.end_time ? ` - ${e.end_time}` : ''}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="map-pin" size={13} color={C.textMuted} />
          <Text style={[styles.metaText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {e.venue}
          </Text>
        </View>

        {/* Organizer Footer */}
        <View style={[styles.footerRow, { borderTopColor: C.border }]}>
          <Text style={[styles.organizerText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
            By <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>{e.organizer}</Text>
          </Text>
          <Icon name="chevR" size={16} color={C.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function EventsBrowseScreen({ navigation }: any) {
  const ready = useAfterInteractions();
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [isEventOrganizer, setIsEventOrganizer] = useState(false);
  const canPost = profile?.role === 'admin' || isEventOrganizer;
  const [events, setEvents] = useState<Event[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    withTimeout(
      Promise.all([
        supabase.from('event_organizers').select('user_id').eq('user_id', user.id).limit(1),
        supabase.from('club_members').select('role').eq('user_id', user.id).in('role', ['president', 'vp']).limit(1),
        fetchUserEventBookmarks(user.id),
      ]),
      5000
    ).then(([orgRes, clubRes, bookmarksSet]) => {
      if (!active) return;
      setIsEventOrganizer((orgRes.data?.length ?? 0) > 0 || (clubRes.data?.length ?? 0) > 0);
      setSavedIds(bookmarksSet);
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  type EventTab = 'upcoming' | 'past' | 'saved';
  const [tab, setTab] = useState<EventTab>('upcoming');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    // 1. Instant cache load
    const cached = await getCache<Event[]>(CacheKeys.EVENTS);
    if (cached && cached.length > 0) {
      setEvents(cached);
      setLoadState('ready');
    }

    // 2. Fresh fetch with 5s timeout
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('events')
          .select('*')
          .is('deleted_at', null)
          .order('date', { ascending: true })
          .limit(100),
        5000
      );

      if (error) {
        if (cached && cached.length > 0) {
          setIsOffline(true);
          setLoadState('ready');
        } else {
          setLoadState('error');
        }
        return;
      }

      const fetchedEvents = (data || []) as Event[];
      setIsOffline(false);
      setEvents(fetchedEvents);
      setCache(CacheKeys.EVENTS, fetchedEvents);
      setLoadState('ready');
    } catch {
      if (cached && cached.length > 0) {
        setIsOffline(true);
        setLoadState('ready');
      } else {
        setLoadState('error');
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await triggerBubtEventsSync();
    } catch {}
    await load();
    if (user?.id) {
      const bSet = await fetchUserEventBookmarks(user.id);
      setSavedIds(bSet);
    }
    setRefreshing(false);
  }

  async function handleToggleBookmark(eventId: string) {
    if (!user?.id) return;
    const wasSaved = savedIds.has(eventId);
    // Optimistic UI update
    setSavedIds(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(eventId);
      else next.add(eventId);
      return next;
    });

    try {
      await toggleBookmark(eventId);
      toast({
        type: 'success',
        title: wasSaved ? 'Event Removed' : 'Event Saved',
        message: wasSaved ? 'Removed from your saved events.' : 'Added to your saved events.',
      });
    } catch {
      // Rollback on error
      setSavedIds(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(eventId);
        else next.delete(eventId);
        return next;
      });
    }
  }

  const todayStr = localToday();

  // Categorize events by live status (memoized to eliminate unneeded passes on renders)
  const { upcomingList, pastList, savedList, displayList } = useMemo(() => {
    const filteredByCat = category === 'All' ? events : events.filter(e => e.category === category);
    const q = search.trim().toLowerCase();
    const searched = q
      ? filteredByCat.filter(e => (
          e.title.toLowerCase().includes(q) ||
          e.organizer.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        ))
      : filteredByCat;

    const upcoming = searched.filter(e => e.date >= todayStr);
    const past = searched.filter(e => e.date < todayStr).slice().reverse();
    const saved = searched.filter(e => savedIds.has(e.id));
    const display = tab === 'past' ? past : tab === 'saved' ? saved : upcoming;
    return { upcomingList: upcoming, pastList: past, savedList: saved, displayList: display };
  }, [events, category, search, todayStr, savedIds, tab]);

  const renderEvent = useCallback(({ item }: { item: Event }) => (
    <EventCard
      e={item}
      C={C}
      isSaved={savedIds.has(item.id)}
      onToggleSave={() => handleToggleBookmark(item.id)}
      onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
    />
  ), [C, savedIds, handleToggleBookmark, navigation]);

  const EVENT_TABS: TabItem<EventTab>[] = useMemo(() => [
    { id: 'upcoming', label: 'Upcoming', count: upcomingList.length > 0 ? upcomingList.length : undefined, color: C.brand },
    { id: 'past',     label: 'Past',     count: pastList.length > 0 ? pastList.length : undefined, color: C.text2 },
    { id: 'saved',    label: 'Saved',    count: savedList.length > 0 ? savedList.length : undefined, color: Accent.gold },
  ], [upcomingList.length, pastList.length, savedList.length, C.brand, C.text2]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { All: events.length };
    for (const e of events) {
      if (e.category) {
        counts[e.category] = (counts[e.category] || 0) + 1;
      }
    }
    return counts;
  }, [events]);

  const activeCatObj = EVENT_CATEGORIES.find(c => c.id === category) ?? EVENT_CATEGORIES[0];
  const isCatActive = category !== 'All';
  const activeCatColor = activeCatObj.color ?? C.brand;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Events"
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.topRightSlots}>
            {canPost && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('EventPost')}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={22} color={C.brand} />
              </TouchableOpacity>
            )}
            <LogoMark size={28} shadow={false} />
          </View>
        }
      />

      {/* Main Events Feed & Agenda with Natural Native Scrolling */}
      <FlatList
        data={ready ? displayList : []}
        keyExtractor={indexKey}
        renderItem={renderEvent}
        ItemSeparatorComponent={listGap(10)}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        ListHeaderComponent={
          <View>
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* Instant Search Bar */}
        <View style={{ paddingTop: 4, paddingBottom: 6 }}>
          <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="search" size={24} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              placeholder="Search events..."
              placeholderTextColor={C.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
                <Feather name="x-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Universal Segmented Navigation Standard */}
        <View style={{ paddingBottom: 8 }}>
          <SegmentedTabs<EventTab>
            tabs={EVENT_TABS}
            activeTab={tab}
            onTabChange={setTab}
          />
        </View>

        {/* Category Bar (72dp Standard matching Explore Community Bar) */}
        <View style={[styles.catBarRow, { marginBottom: 12 }]}>
          <TouchableOpacity
            style={[
              styles.catDropdownBtn,
              isCatActive
                ? {
                    backgroundColor: isDark ? `${activeCatColor}16` : `${activeCatColor}0e`,
                    borderColor: isDark ? `${activeCatColor}85` : `${activeCatColor}65`,
                    borderWidth: 1.5,
                  }
                : {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    borderWidth: 1,
                  },
            ]}
            onPress={() => setCategoryModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={styles.catIconBox}>
              <AnimatedIcon
                family="feather"
                name={activeCatObj.icon}
                size={32}
                color={C.text}
              />
            </View>

            <View style={styles.catTextWrap}>
              <Text
                style={[
                  styles.catTitleTxt,
                  {
                    color: isCatActive ? activeCatColor : C.text,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
                numberOfLines={1}
              >
                {activeCatObj.label}
              </Text>
              <Text
                style={[
                  styles.catSubTxt,
                  {
                    color: C.text3,
                    fontFamily: FontFamily.jakartaMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {activeCatObj.desc ?? 'Filter campus events'}
              </Text>
            </View>

            <View style={[styles.catDivider, { backgroundColor: C.border }]} />

            <View style={styles.catStatCol}>
              <Text
                style={[
                  styles.catStatVal,
                  {
                    color: isCatActive ? activeCatColor : C.text,
                    fontFamily: FontFamily.jakartaExtraBold,
                  },
                ]}
              >
                {catCounts[category] ?? 0}
              </Text>
              <Text
                style={[
                  styles.catStatSub,
                  {
                    color: C.text3,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                EVENTS
              </Text>
            </View>

            <View style={styles.catDropdownRight}>
              {isCatActive && (
                <TouchableOpacity
                  onPress={() => setCategory('All')}
                  hitSlop={8}
                  style={{ padding: 4, marginRight: 2 }}
                >
                  <Feather name="x" size={15} color={activeCatColor} />
                </TouchableOpacity>
              )}
              <View style={styles.chevBox}>
                <Icon
                  name="chevD"
                  size={18}
                  color={isCatActive ? activeCatColor : C.textMuted}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

          </View>
        }
        ListEmptyComponent={
          !ready || (loadState === 'loading' && events.length === 0) ? (
            <SkeletonList rows={5} />
          ) : loadState === 'error' && events.length === 0 ? (
            <LoadError onRetry={load} />
          ) : (
          <View style={styles.empty}>
            <Icon name="events" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {tab === 'saved'
                ? 'No saved events'
                : `No ${tab} events found`}
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {search
                ? 'Try searching with a different keyword or category.'
                : tab === 'saved'
                ? 'Tap the bookmark icon on any event to save it here.'
                : 'Stay tuned for upcoming campus seminars, workshops, and sports!'}
            </Text>
          </View>
          )
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />

      {/* Category Selection Bottom Sheet Modal (72dp Standard) */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCategoryModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="layers" size={24} color={C.text} />
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Event Categories
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalBarsContainer}>
                {EVENT_CATEGORIES.map((cat, idx) => {
                  const active = category === cat.id;
                  const catThemeColor = cat.color ?? C.brand;
                  const catCount = catCounts[cat.id] ?? 0;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.pickerBar,
                        { backgroundColor: C.surface, borderColor: C.border },
                        active && {
                          backgroundColor: isDark ? `${catThemeColor}16` : `${catThemeColor}0e`,
                          borderColor: isDark ? `${catThemeColor}85` : `${catThemeColor}65`,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => {
                        setCategory(cat.id);
                        setCategoryModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.pickerBarIconBox}>
                        <AnimatedIcon
                          family="feather"
                          name={cat.icon}
                          size={32}
                          color={C.text}
                        />
                      </View>
                      <View style={styles.pickerBarTextWrap}>
                        <Text
                          style={[
                            styles.pickerBarTitle,
                            {
                              color: active ? catThemeColor : C.text,
                              fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaSemiBold,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.label}
                        </Text>
                      </View>

                      <View style={[styles.catDivider, { backgroundColor: C.border }]} />

                      <View style={styles.catStatCol}>
                        <Text
                          style={[
                            styles.catStatVal,
                            {
                              color: active ? catThemeColor : C.text,
                              fontFamily: FontFamily.jakartaExtraBold,
                            },
                          ]}
                        >
                          {catCount}
                        </Text>
                        <Text
                          style={[
                            styles.catStatSub,
                            {
                              color: C.text3,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          EVENTS
                        </Text>
                      </View>

                      {active ? (
                        <Feather name="check-circle" size={20} color={catThemeColor} />
                      ) : (
                        <View style={[styles.radioOutline, { borderColor: C.border }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  topRightSlots: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  iconBtn: { padding: 6, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  searchBoxWrap: { paddingTop: 6, paddingBottom: 6 } as ViewStyle,
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 } as any,

  // Category Dropdown Bar (72dp Standard matching Explore Community Bar)
  catBarRow: {
    paddingBottom: 10,
  } as ViewStyle,
  catDropdownBtn: {
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  } as ViewStyle,
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  } as ViewStyle,
  catTextWrap: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
  } as ViewStyle,
  catTitleTxt: {
    fontSize: 14.5,
    lineHeight: 20,
  } as any,
  catSubTxt: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  } as any,
  catDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 4,
  } as ViewStyle,
  catStatCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    marginRight: 6,
  } as ViewStyle,
  catStatVal: {
    fontSize: 16.5,
    lineHeight: 20,
    textAlign: 'center',
  } as any,
  catStatSub: {
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 1,
  } as any,
  catDropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  chevBox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  } as ViewStyle,

  // Modal Sheet & Distinct Bars (72dp Standard)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 18,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 28,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  } as ViewStyle,
  modalTitle: {
    fontSize: 16,
  } as any,
  modalBarsContainer: {
    gap: 10,
    paddingBottom: 10,
  } as ViewStyle,

  // Distinct Rounded Picker Bar (Inside Modal - 72dp Standard)
  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'visible',
  } as ViewStyle,
  pickerBarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  } as ViewStyle,
  pickerBarTextWrap: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
  } as ViewStyle,
  pickerBarTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  } as any,
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
  } as ViewStyle,
  scroll: { paddingTop: 4, paddingBottom: 24 } as ViewStyle,
  list: { gap: 14 } as ViewStyle,
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  bannerWrap: { height: 130, width: '100%', position: 'relative' } as ViewStyle,
  bannerImg: { width: '100%', height: '100%' } as any,
  bannerOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  catTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  } as ViewStyle,
  catTagTxt: { fontSize: 11 } as any,
  bookmarkBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  fallbackBanner: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  fallbackLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  catIconCircle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  fallbackCatText: { fontSize: 12.5 } as any,
  cardBody: { padding: 14 } as ViewStyle,
  topBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 } as ViewStyle,
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusText: { fontSize: 11 } as any,
  officialBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 } as ViewStyle,
  officialBadgeText: { fontSize: 10.5 } as any,
  cardTitle: { fontSize: 15.5, lineHeight: 21, marginBottom: 8 } as any,
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 } as ViewStyle,
  metaText: { fontSize: 12.5, flex: 1 } as any,
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  organizerText: { fontSize: 12, flex: 1, marginRight: 8 } as any,
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 } as any,
});
