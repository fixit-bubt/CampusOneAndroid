import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getEventLiveStatus, triggerBubtEventsSync } from '../../services/eventsService';
import { formatDateLong, formatTime } from '../../utils/format';
import type { Event } from '../../types/database';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface CategoryOption {
  id: string;
  label: string;
  icon: FeatherName;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'All',      label: 'All Categories', icon: 'layers' },
  { id: 'Academic', label: 'Academic',       icon: 'book-open' },
  { id: 'Cultural', label: 'Cultural',       icon: 'music' },
  { id: 'Sports',   label: 'Sports',         icon: 'activity' },
  { id: 'Club',     label: 'Club',           icon: 'users' },
  { id: 'Career',   label: 'Career',         icon: 'briefcase' },
];

const EventAdminCard = memo(function EventAdminCard({
  item,
  rsvpCount,
  onView,
  onDelete,
  C,
  isDark,
}: {
  item: Event;
  rsvpCount: number;
  onView: (id: string) => void;
  onDelete: (item: Event) => void;
  C: any;
  isDark: boolean;
}) {
  const liveStatus = getEventLiveStatus(item);
  const isOfficial = item.source === 'bubt_news' || item.source === 'official';
  const isClub = !!item.club_id;

  let statusBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  let statusFg = C.textMuted;
  let dotColor = C.textMuted;

  if (liveStatus.status === 'Ongoing') {
    statusBg = `${C.success}22`;
    statusFg = C.success;
    dotColor = C.success;
  } else if (liveStatus.status === 'Today') {
    statusBg = `${C.warn}22`;
    statusFg = C.warn;
    dotColor = C.warn;
  } else if (liveStatus.status === 'Upcoming') {
    statusBg = `${C.brand}1e`;
    statusFg = C.brand;
    dotColor = C.brand;
  }

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Top Header: Category, Source & Live Status Badges */}
      <View style={styles.cardTopRow}>
        <View style={styles.badgeWrapRow}>
          <View style={[styles.categoryPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.categoryPillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {item.category}
            </Text>
          </View>
          {isOfficial && (
            <View style={[styles.categoryPill, { backgroundColor: `${C.brand}1e` }]}>
              <Text style={[styles.categoryPillTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                Official
              </Text>
            </View>
          )}
          {isClub && !isOfficial && (
            <View style={[styles.categoryPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.categoryPillTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                Club
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
          <Text style={[styles.statusBadgeTxt, { color: statusFg, fontFamily: FontFamily.jakartaBold }]}>
            {liveStatus.label}
          </Text>
        </View>
      </View>

      {/* Event Title */}
      <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Organizer Row with enlarged 16dp icon */}
      {!!item.organizer && (
        <View style={styles.organizerRow}>
          <Feather name="award" size={16} color={C.textMuted} />
          <Text style={[styles.organizerTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {item.organizer}
          </Text>
        </View>
      )}

      {/* Metadata Rows with enlarged 16dp vector icons */}
      <View style={[styles.metaGrid, { borderTopColor: C.border, borderBottomColor: C.border }]}>
        <View style={styles.metaRow}>
          <Feather name="calendar" size={16} color={C.textMuted} />
          <Text style={[styles.metaTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
            {formatDateLong(item.date)} · {formatTime(item.time)}
            {item.end_time ? ` - ${formatTime(item.end_time)}` : ''}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="map-pin" size={16} color={C.textMuted} />
          <Text style={[styles.metaTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {item.venue}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="users" size={16} color={C.textMuted} />
          <Text style={[styles.metaTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
            {rsvpCount} going{item.capacity ? ` · ${item.capacity} capacity` : ''}
          </Text>
        </View>
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, { borderColor: C.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
          onPress={() => onView(item.id)}
          activeOpacity={0.75}
        >
          <Feather name="eye" size={16} color={C.text} />
          <Text style={[styles.actionBtnSecondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            View Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnDanger, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' }]}
          onPress={() => onDelete(item)}
          activeOpacity={0.75}
        >
          <Feather name="trash-2" size={16} color={C.danger} />
          <Text style={[styles.actionBtnDangerTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
            Delete Event
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export function ManageEventsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingCrawler, setSyncingCrawler] = useState(false);

  // Filters: 58dp search, 58dp category bar
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 180);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    try {
      const eventsRes = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(100);

      if (eventsRes.error) {
        console.error('ManageEvents load error:', eventsRes.error.message);
        toast({ type: 'error', title: t.common.error, message: eventsRes.error.message });
        return;
      }

      const loadedEvents = (eventsRes.data || []) as Event[];
      setEvents(loadedEvents);

      if (loadedEvents.length > 0) {
        const eventIds = loadedEvents.map((e) => e.id);
        const rsvpsRes = await supabase
          .from('event_rsvps')
          .select('event_id')
          .in('event_id', eventIds);

        const counts: Record<string, number> = {};
        (rsvpsRes.data || []).forEach((r: any) => {
          counts[r.event_id] = (counts[r.event_id] || 0) + 1;
        });
        setRsvpCounts(counts);
      } else {
        setRsvpCounts({});
      }
    } catch (err: any) {
      console.error('ManageEvents error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.common.error, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Crawler Sync Action (Matching Notice Board & Academic Calendar pattern)
  const handleSyncCrawler = useCallback(async () => {
    if (syncingCrawler) return;
    setSyncingCrawler(true);
    try {
      await triggerBubtEventsSync(true);
      toast({ type: 'success', title: 'Events Synced', message: 'Official BUBT circulars and events refreshed' });
      await loadData();
    } catch (err: any) {
      console.error('Crawler sync error:', err);
      toast({ type: 'error', title: t.common.error, message: err?.message || 'Crawler sync failed' });
    } finally {
      setSyncingCrawler(false);
    }
  }, [syncingCrawler, toast, t.common.error, loadData]);

  // Event Deletion Action
  const handleDeleteEvent = useCallback((item: Event) => {
    Alert.alert(
      t.events2.deleteEventTitle ?? 'Delete event?',
      `${item.title}\n\n${t.events2.deleteEventConfirm ?? 'Are you sure you want to delete this event from campus schedules?'}`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete ?? 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', item.id);

              if (error) {
                toast({ type: 'error', title: t.common.error, message: error.message });
                return;
              }

              setEvents((prev) => prev.filter((e) => e.id !== item.id));
              toast({
                type: 'success',
                title: t.events2.eventDeletedToast ?? 'Event deleted successfully',
              });
            } catch (err: any) {
              toast({ type: 'error', title: t.common.error, message: err?.message });
            }
          },
        },
      ]
    );
  }, [t, toast]);

  const handleViewEvent = useCallback((id: string) => {
    navigation.navigate('EventDetail', { eventId: id });
  }, [navigation]);

  // Filtered dataset
  const filteredEvents = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return events.filter((ev) => {
      // 1. Category filter
      if (selectedCategory !== 'All') {
        if (ev.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 2. Search query
      if (q) {
        const textBlob = [
          ev.title,
          ev.organizer,
          ev.venue,
          ev.description,
          ev.category,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return textBlob.includes(q);
      }

      return true;
    });
  }, [events, selectedCategory, debouncedSearch]);

  const selectedCategoryLabel =
    CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.label ?? 'All Categories';

  const renderItem = useCallback(
    ({ item }: { item: Event }) => (
      <EventAdminCard
        item={item}
        rsvpCount={rsvpCounts[item.id] || 0}
        onView={handleViewEvent}
        onDelete={handleDeleteEvent}
        C={C}
        isDark={isDark}
      />
    ),
    [rsvpCounts, handleViewEvent, handleDeleteEvent, C, isDark]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 1. Header */}
      <SubBar
        title={t.events2.manageEvents ?? 'Events Management'}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onRefresh}
            hitSlop={8}
            activeOpacity={0.75}
            accessibilityLabel="Refresh events"
          >
            <Feather name="refresh-cw" size={18} color={C.text} />
          </TouchableOpacity>
        }
      />

      <View style={styles.body}>
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.brand}
                colors={[C.brand]}
              />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                {/* 1. Strict 58dp Search Bar */}
                <View style={[styles.searchBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.iconSlot32}>
                    <Feather name="search" size={20} color={C.text} />
                  </View>
                  <TextInput
                    style={[styles.searchInputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    placeholder="Search events, clubs, venues, or speakers..."
                    placeholderTextColor={C.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} style={{ padding: 4 }}>
                      <Feather name="x" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 2. Strict 58dp Dropdown Category Bar with 28dp vector icon */}
                <TouchableOpacity
                  style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}
                  onPress={() => setCategoryModalOpen(true)}
                  activeOpacity={0.75}
                >
                  <View style={styles.iconSlot32}>
                    <Feather name="layers" size={28} color={C.text} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                    <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {selectedCategoryLabel}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={18} color={C.textMuted} />
                </TouchableOpacity>

                {/* 3. Strict 58dp Centered Create Event Action Bar */}
                <TouchableOpacity
                  style={[styles.createBar58, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('EventPost')}
                  activeOpacity={0.75}
                >
                  <Feather name="plus-circle" size={20} color={C.text} />
                  <Text style={[styles.createBarTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.events2.createCampusEvent ?? 'Create Campus Event'}
                  </Text>
                </TouchableOpacity>

                {/* 4. BUBT Automated Sync Card */}
                <View style={[styles.syncCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.syncCardTop}>
                    <View style={styles.syncIconWrap}>
                      <Feather name="refresh-cw" size={32} color={C.text} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={[styles.syncTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        BUBT Official Events Calendar
                      </Text>
                      <Text style={[styles.syncSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                        Automated crawler for bubt.edu.bd/events
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.syncActionBtn,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: C.border,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={handleSyncCrawler}
                    disabled={syncingCrawler}
                    activeOpacity={0.85}
                  >
                    {syncingCrawler ? (
                      <ActivityIndicator color={C.text} size="small" />
                    ) : (
                      <>
                        <Feather name="globe" size={18} color={C.text} />
                        <Text style={[styles.syncActionTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          Sync from BUBT Website
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            }
            ListEmptyComponent={
              loading && events.length === 0 ? (
                <View style={[styles.loaderWrap, { paddingVertical: 48 }]}>
                  <ActivityIndicator size="small" color={C.brand} />
                </View>
              ) : (
                <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.iconSlot32}>
                    <Feather name="calendar" size={36} color={C.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    No events found
                  </Text>
                  <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {searchQuery.trim() || selectedCategory !== 'All'
                      ? 'No campus events match your query or category filter.'
                      : 'No campus events found. Tap above to post or sync events.'}
                  </Text>
                </View>
              )
            }
          />
        </View>

      {/* 8. Bottom Sheet: Category Selection Modal Sheet */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setCategoryModalOpen(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            {/* Top Handle Bar */}
            <View style={[styles.handleBar, { backgroundColor: C.border }]} />

            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Category
              </Text>
              <TouchableOpacity
                onPress={() => setCategoryModalOpen(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, padding: 16 }}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.bar58,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                          : C.surface,
                        borderColor: isSelected ? C.text : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setCategoryModalOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconSlot32}>
                      <Feather name={cat.icon} size={28} color={C.text} />
                    </View>
                    <Text
                      style={[
                        styles.barTitleTxt,
                        {
                          color: C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          flex: 1,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                    {isSelected && <Feather name="check" size={18} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  } as ViewStyle,
  body: {
    flex: 1,
  } as ViewStyle,
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  listHeader: {
    paddingTop: 8,
  } as ViewStyle,

  // Strict 58dp Search Bar
  searchBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  } as ViewStyle,
  iconSlot32: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  } as ViewStyle,
  searchInputTxt: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  } as TextStyle,

  // Strict 58dp Dropdown / Action Bars
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  } as ViewStyle,
  barTitleTxt: {
    fontSize: 14.5,
  } as TextStyle,

  // Strict 58dp Centered Create Action Bar
  createBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  } as ViewStyle,
  createBarTxt: {
    fontSize: 14.5,
  } as TextStyle,

  // BUBT Crawler Sync Card (Matches ManageAnnouncementsScreen & ManageAcademicCalendarScreen)
  syncCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  } as ViewStyle,
  syncCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  } as ViewStyle,
  syncIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  syncTitle: {
    fontSize: 14.5,
  } as TextStyle,
  syncSub: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 48,
    borderRadius: 12,
  } as ViewStyle,
  syncActionTxt: {
    fontSize: 14,
  } as TextStyle,

  // List & Cards
  listContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 24,
  } as ViewStyle,
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  } as ViewStyle,
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as ViewStyle,
  badgeWrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  categoryPillTxt: {
    fontSize: 11.5,
  } as TextStyle,
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  statusBadgeTxt: {
    fontSize: 11.5,
  } as TextStyle,
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  } as TextStyle,
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  } as ViewStyle,
  organizerTxt: {
    fontSize: 12.5,
  } as TextStyle,
  metaGrid: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  } as ViewStyle,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  metaTxt: {
    fontSize: 12.5,
  } as TextStyle,

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  actionBtnSecondary: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  actionBtnSecondaryTxt: {
    fontSize: 13,
  } as TextStyle,
  actionBtnDanger: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  actionBtnDangerTxt: {
    fontSize: 13,
  } as TextStyle,

  // Empty State
  emptyWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginTop: 20,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 15,
    marginTop: 8,
    marginBottom: 4,
  } as TextStyle,
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  } as TextStyle,

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingBottom: 24,
    maxHeight: '80%',
    overflow: 'hidden',
  } as ViewStyle,
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  } as ViewStyle,
  modalTitleTxt: {
    fontSize: 16,
  } as TextStyle,
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});
