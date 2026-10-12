import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, TextInput, Image, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { localToday } from '../../utils/format';
import {
  getEventLiveStatus,
  fetchUserEventBookmarks,
  toggleBookmark,
  triggerBubtEventsSync,
  type EventLiveStatus,
} from '../../services/eventsService';
import { useToast } from '../../components/ui/Toast';
import type { Event } from '../../types/database';

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

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      activeOpacity={0.82}
    >
      {/* Banner Cover or Category Header */}
      {e.banner_url ? (
        <View style={styles.bannerWrap}>
          <Image source={{ uri: e.banner_url }} style={styles.bannerImg} resizeMode="cover" />
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
              <Feather name={isSaved ? 'bookmark' : 'bookmark'} size={15} color={isSaved ? C.warn : C.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.fallbackBanner, { backgroundColor: bg }]}>
          <View style={styles.fallbackLeft}>
            <View style={[styles.catIconCircle, { backgroundColor: `${fg}25` }]}>
              <Icon name={CAT_ICON[e.category] ?? 'events'} size={20} color={fg} />
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
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [isEventOrganizer, setIsEventOrganizer] = useState(false);
  const canPost = profile?.role === 'admin' || isEventOrganizer;
  const [events, setEvents] = useState<Event[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from('event_organizers').select('user_id').eq('user_id', user.id).limit(1),
      supabase.from('club_members').select('role').eq('user_id', user.id).in('role', ['president', 'vp']).limit(1),
      fetchUserEventBookmarks(user.id),
    ]).then(([orgRes, clubRes, bookmarksSet]) => {
      setIsEventOrganizer((orgRes.data?.length ?? 0) > 0 || (clubRes.data?.length ?? 0) > 0);
      setSavedIds(bookmarksSet);
    });
  }, [user?.id]);

  const [tab, setTab] = useState<'upcoming' | 'today' | 'past' | 'saved'>('upcoming');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    // 1. Instant cache load
    const cached = await getCache<Event[]>(CacheKeys.EVENTS);
    if (cached && cached.length > 0) {
      setEvents(cached);
      setLoadState('ready');
    }

    // 2. Fresh fetch
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .is('deleted_at', null)
      .order('date', { ascending: true })
      .limit(100);

    if (error) {
      console.error('events fetch error:', error.message);
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    if (user?.id) {
      const bSet = await fetchUserEventBookmarks(user.id);
      setSavedIds(bSet);
    }
    setRefreshing(false);
  }

  async function handleSyncBubt() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await triggerBubtEventsSync();
      toast({
        type: 'success',
        title: 'BUBT Events Synced',
        message: `Found ${res?.total_scanned ?? 0} notices, added ${res?.new_added ?? 0} new.`,
      });
      await load();
    } catch (e: any) {
      toast({
        type: 'info',
        title: 'Sync in Progress',
        message: 'BUBT crawler is updating campus calendar in background.',
      });
    } finally {
      setSyncing(false);
    }
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

  // Categorize events by live status
  const filteredByCat = category === 'All' ? events : events.filter(e => e.category === category);
  const searchedEvents = search.trim()
    ? filteredByCat.filter(e => {
        const q = search.trim().toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.organizer.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        );
      })
    : filteredByCat;

  const upcomingList = searchedEvents.filter(e => e.date > todayStr);
  const todayList = searchedEvents.filter(e => e.date === todayStr);
  const pastList = searchedEvents.filter(e => e.date < todayStr).reverse();
  const savedList = searchedEvents.filter(e => savedIds.has(e.id));

  let displayList = upcomingList;
  if (tab === 'today') displayList = todayList;
  else if (tab === 'past') displayList = pastList;
  else if (tab === 'saved') displayList = savedList;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Events"
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.topRightSlots}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleSyncBubt}
              hitSlop={10}
              activeOpacity={0.7}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={C.brand} />
              ) : (
                <Feather name="refresh-cw" size={18} color={C.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setView(v => (v === 'list' ? 'calendar' : 'list'))}
              activeOpacity={0.75}
            >
              <Feather name={view === 'list' ? 'calendar' : 'list'} size={19} color={C.text} />
            </TouchableOpacity>
            {canPost && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('EventPost')}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={22} color={C.brand} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Instant Search Bar */}
      <View style={[styles.searchBoxWrap, { paddingHorizontal: Layout.screenPadding }]}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Feather name="search" size={17} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder="Search events, clubs, venues, or speakers..."
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

      {/* Status Segment Tabs */}
      <View style={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}>
        {(
          [
            ['upcoming', 'Upcoming', upcomingList.length],
            ['today', 'Today', todayList.length],
            ['past', 'Past', pastList.length],
            ['saved', 'Saved', savedList.length],
          ] as const
        ).map(([id, label, count]) => {
          const on = tab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.chip,
                on
                  ? { backgroundColor: C.brand, borderColor: C.brand }
                  : { backgroundColor: C.surface, borderColor: C.border },
              ]}
              onPress={() => setTab(id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                {label}
              </Text>
              <View
                style={[
                  styles.countPill,
                  { backgroundColor: on ? 'rgba(255,255,255,0.25)' : C.surface2 },
                ]}
              >
                <Text
                  style={[
                    styles.chipCount,
                    { color: on ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Horizontal Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.catChips, { paddingHorizontal: Layout.screenPadding }]}
      >
        {['All', 'Academic', 'Cultural', 'Sports', 'Club', 'Career'].map(c => {
          const on = category === c;
          const catFg = CAT_COLOR[c] ?? C.text;
          return (
            <TouchableOpacity
              key={c}
              style={[
                styles.catChip,
                on
                  ? { backgroundColor: C.surface2, borderColor: catFg }
                  : { backgroundColor: C.surface, borderColor: C.border },
              ]}
              onPress={() => setCategory(c)}
              activeOpacity={0.75}
            >
              {c !== 'All' && (
                <View style={{ marginRight: 5 }}>
                  <Icon name={CAT_ICON[c] ?? 'events'} size={12} color={on ? catFg : C.textMuted} />
                </View>
              )}
              <Text
                style={[
                  styles.catChipTxt,
                  { color: on ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Main Events Feed & Agenda */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {loadState === 'loading' && events.length === 0 ? (
          <SkeletonList />
        ) : loadState === 'error' && events.length === 0 ? (
          <LoadError onRetry={load} />
        ) : view === 'calendar' ? (
          (() => {
            const base = new Date();
            base.setDate(1);
            base.setMonth(base.getMonth() + monthOffset);
            const year = base.getFullYear();
            const month = base.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDow = new Date(year, month, 1).getDay();
            const iso = (d: number) =>
              `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const eventDays = new Set(searchedEvents.map(e => e.date));
            const cells: (number | null)[] = [
              ...Array.from({ length: firstDow }, () => null),
              ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
            ];
            const dayEvents = selectedDay ? searchedEvents.filter(e => e.date === selectedDay) : [];

            return (
              <View>
                <View style={styles.calNav}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDay(null);
                      setMonthOffset(o => o - 1);
                    }}
                    hitSlop={10}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-left" size={22} color={C.text} />
                  </TouchableOpacity>
                  <Text style={[styles.calTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                    {base.toLocaleString('en', { month: 'long' })} {year}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDay(null);
                      setMonthOffset(o => o + 1);
                    }}
                    hitSlop={10}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-right" size={22} color={C.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.calGrid}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <View key={`h${i}`} style={styles.calCell}>
                      <Text style={[styles.calHead, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                        {d}
                      </Text>
                    </View>
                  ))}
                  {cells.map((d, i) => {
                    if (d === null) return <View key={`e${i}`} style={styles.calCell} />;
                    const dayISO = iso(d);
                    const has = eventDays.has(dayISO);
                    const isToday = dayISO === todayStr;
                    const isSel = selectedDay === dayISO;
                    return (
                      <TouchableOpacity
                        key={dayISO}
                        style={[
                          styles.calCell,
                          isSel && { backgroundColor: C.brand, borderRadius: 10 },
                          !isSel && isToday && { backgroundColor: C.surface2, borderRadius: 10 },
                        ]}
                        onPress={() => setSelectedDay(isSel ? null : dayISO)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.calDay,
                            {
                              color: isSel ? C.white : isToday ? C.brand : C.text,
                              fontFamily: has || isToday ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            },
                          ]}
                        >
                          {d}
                        </Text>
                        {has && (
                          <View
                            style={[
                              styles.calDot,
                              { backgroundColor: isSel ? C.white : C.brand },
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Day Agenda */}
                {selectedDay && (
                  <View style={[styles.list, { marginTop: 16 }]}>
                    <Text style={[styles.agendaHeader, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Schedule for {selectedDay}
                    </Text>
                    {dayEvents.length === 0 ? (
                      <View style={[styles.emptyDayBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 13 }}>
                          No campus events scheduled for this day
                        </Text>
                      </View>
                    ) : (
                      dayEvents.map(e => (
                        <EventCard
                          key={e.id}
                          e={e}
                          C={C}
                          isSaved={savedIds.has(e.id)}
                          onToggleSave={() => handleToggleBookmark(e.id)}
                          onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })()
        ) : displayList.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="events" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {tab === 'saved'
                ? 'No saved events'
                : tab === 'today'
                ? 'No events today'
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
        ) : (
          <View style={styles.list}>
            {displayList.map(e => (
              <EventCard
                key={e.id}
                e={e}
                C={C}
                isSaved={savedIds.has(e.id)}
                onToggleSave={() => handleToggleBookmark(e.id)}
                onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
              />
            ))}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
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
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 13.5, paddingVertical: 0 } as any,
  chips: { flexDirection: 'row', gap: 6, paddingVertical: 8 } as ViewStyle,
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  chipText: { fontSize: 12 } as any,
  countPill: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 10 } as ViewStyle,
  chipCount: { fontSize: 10.5 } as any,
  catChips: { flexDirection: 'row', gap: 6, paddingBottom: 10 } as ViewStyle,
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
  catChipTxt: { fontSize: 11.5 } as any,
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
  catIconCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
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
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  } as ViewStyle,
  calTitle: { fontSize: 15.5 } as any,
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' } as ViewStyle,
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 8, gap: 2 } as ViewStyle,
  calHead: { fontSize: 11 } as any,
  calDay: { fontSize: 13 } as any,
  calDot: { width: 5, height: 5, borderRadius: 2.5 } as ViewStyle,
  agendaHeader: { fontSize: 14, marginBottom: 8 } as any,
  emptyDayBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 } as any,
});
