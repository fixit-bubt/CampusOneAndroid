import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Animated,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchPeople } from '../../services/peopleService';
import { localToday, formatTime, formatPrice, formatDate } from '../../utils/format';
import { useAuth } from '../../store/authStore';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import type { Ride as RideRow } from '../../types/database';

const RIDE_COLOR = SectorColors.ride;
const RIDE_BG    = `${SectorColors.ride}1e`;

type Ride = RideRow & {
  driver_name?: string;
  driver_dept?: string;
};

type TabKey = 'all' | 'to' | 'from' | 'mine';

const TAB_COLORS: Record<TabKey, { fg: string }> = {
  all:  { fg: RIDE_COLOR },
  to:   { fg: '#16a34a' },
  from: { fg: '#2563eb' },
  mine: { fg: '#8b5cf6' },
};

const VEHICLE_META: Record<string, { icon: string; label: string }> = {
  Car:      { icon: '🚗', label: 'Car'      },
  CNG:      { icon: '🛺', label: 'CNG'      },
  Bike:     { icon: '🏍️', label: 'Bike'     },
  Rickshaw: { icon: '🚲', label: 'Rickshaw' },
};

function isRideDeparted(dateStr: string, timeStr: string): boolean {
  const today = localToday();
  if (dateStr < today) return true;
  if (dateStr === today && timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      const now = new Date();
      const curMins = now.getHours() * 60 + now.getMinutes();
      const rideMins = h * 60 + m;
      // Filter out rides that departed more than 15 minutes ago
      return rideMins + 15 < curMins;
    }
  }
  return false;
}

function formatDepartureLabel(dateStr: string, timeStr: string, t: any): string {
  const isToday = dateStr === localToday();
  const timeFormatted = timeStr ? formatTime(timeStr) : '';
  const dayPrefix = isToday ? (t.rides2.todayText ?? 'Today') : formatDate(dateStr);
  return timeFormatted ? `${dayPrefix} · ${timeFormatted}` : dayPrefix;
}

export function RidesScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();

  const [rides, setRides] = useState<Ride[]>([]);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [takenCounts, setTakenCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Animated sliding indicator
  const [trackWidth, setTrackWidth] = useState(0);
  const animIndex = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const idx = ['all', 'to', 'from', 'mine'].indexOf(tab);
    Animated.spring(animIndex, {
      toValue: idx >= 0 ? idx : 0,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [tab, animIndex]);

  const load = useCallback(async () => {
    // 1. Optimistic cache load
    const [cachedRides, cachedCounts, cachedReq] = await Promise.all([
      getCache<Ride[]>(CacheKeys.RIDES),
      getCache<Record<string, number>>(CacheKeys.RIDES_TAKEN),
      user?.id ? getCache<string[]>(CacheKeys.RIDES_REQUESTED(user.id)) : Promise.resolve(null),
    ]);
    if (cachedRides && cachedRides.length > 0) {
      setRides(cachedRides);
      if (cachedCounts) setTakenCounts(cachedCounts);
      if (cachedReq) setRequestedIds(new Set(cachedReq));
      setLoading(false);
    }

    // 2. Network sync
    try {
      await supabase.rpc('delete_expired_rides').then(() => {}, () => {});
      const [ridesRes, reqRes, countRes] = await Promise.all([
        supabase
          .from('rides')
          .select('*')
          .gte('date', localToday())
          .order('date')
          .order('time')
          .limit(60),
        supabase.from('ride_requests').select('ride_id').eq('requester_id', user?.id ?? ''),
        supabase.rpc('ride_request_counts'),
      ]);

      if (ridesRes.error) {
        if (!cachedRides || cachedRides.length === 0) {
          toast({ type: 'error', title: t.common.error });
        }
        setIsOffline(true);
        setLoading(false);
        return;
      }

      setIsOffline(false);
      const people = await fetchPeople((ridesRes.data ?? []).map((r: any) => r.driver_id));
      const rows = (ridesRes.data ?? []).map((r: any) => ({
        ...r,
        driver_name: people[r.driver_id]?.full_name,
        driver_dept: people[r.driver_id]?.department ?? undefined,
      })) as Ride[];
      setRides(rows);
      setCache(CacheKeys.RIDES, rows);

      const map: Record<string, number> = {};
      if (!countRes.error && countRes.data) {
        (countRes.data ?? []).forEach((c: any) => { map[c.ride_id] = Number(c.taken); });
        setTakenCounts(map);
        setCache(CacheKeys.RIDES_TAKEN, map);
      }

      if (reqRes.data) {
        const reqList = reqRes.data.map((r: any) => r.ride_id);
        setRequestedIds(new Set(reqList));
        if (user?.id) setCache(CacheKeys.RIDES_REQUESTED(user.id), reqList);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function requestRide(rideId: string) {
    if (!user) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to request a ride.' });
      return;
    }
    if (requestedIds.has(rideId)) return;
    const { error } = await supabase.from('ride_requests').insert({ ride_id: rideId, requester_id: user.id });
    if (error) {
      if (error.code === '23505') {
        setRequestedIds(prev => new Set([...prev, rideId]));
      } else if (error.message?.includes('full')) {
        toast({ type: 'info', title: t.rides2.rideFull, message: 'This ride has already reached capacity.' });
      } else {
        toast({ type: 'error', title: t.common.error, message: error.message });
      }
      return;
    }
    setRequestedIds(prev => new Set([...prev, rideId]));
    setTakenCounts(prev => ({ ...prev, [rideId]: (prev[rideId] ?? 0) + 1 }));
    toast({ type: 'success', title: t.rides2.requestSent, message: 'Driver has been notified.' });
  }

  // Count user's active rides (both offered and requested)
  const myRidesCount = useMemo(() => {
    return rides.filter(r => r.driver_id === user?.id || requestedIds.has(r.id)).length;
  }, [rides, user?.id, requestedIds]);

  // Tab definitions
  const TABS: { id: TabKey; label: string }[] = [
    { id: 'all',  label: t.rides2.allRides ?? t.common.all },
    { id: 'to',   label: t.rides2.toCampus ?? 'To Campus' },
    { id: 'from', label: t.rides2.fromCampus ?? 'From Campus' },
    { id: 'mine', label: t.rides2.myRidesTab ?? 'My Rides' },
  ];

  // Filter pipeline
  const filteredRides = useMemo(() => {
    let list = rides;

    // 1. Tab filter
    if (tab === 'mine') {
      // In "My Rides", show both rides offered by user and rides requested by user!
      // NEVER filter out departed rides in My Rides so the user can always see/manage them!
      list = list.filter(r => r.driver_id === user?.id || requestedIds.has(r.id));
    } else if (tab === 'to') {
      list = list.filter(r => r.direction === 'To Campus');
      list = list.filter(r => !isRideDeparted(r.date, r.time) || r.driver_id === user?.id || requestedIds.has(r.id));
    } else if (tab === 'from') {
      list = list.filter(r => r.direction === 'From Campus');
      list = list.filter(r => !isRideDeparted(r.date, r.time) || r.driver_id === user?.id || requestedIds.has(r.id));
    } else {
      // 'all'
      list = list.filter(r => !isRideDeparted(r.date, r.time) || r.driver_id === user?.id || requestedIds.has(r.id));
    }

    // 2. Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        (r.origin && r.origin.toLowerCase().includes(q)) ||
        (r.destination && r.destination.toLowerCase().includes(q)) ||
        (r.driver_name && r.driver_name.toLowerCase().includes(q)) ||
        (r.vehicle && r.vehicle.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [rides, tab, searchQuery, user?.id, requestedIds]);

  const TRACK_PADDING = 3;
  const innerTrackWidth = Math.max(0, trackWidth - TRACK_PADDING * 2);
  const tabWidth = innerTrackWidth > 0 ? innerTrackWidth / 4 : 0;
  const translateX = animIndex.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.rides2.rideShareTitle}
        onBack={() => navigation.goBack()}
      />

      <OfflineBanner
        visible={isOffline}
        message="Showing cached campus rides. Connect to the internet to request seats or post rides."
      />

      {/* Prominent Hero Action Bar: Offer Ride vs Request Ride */}
      <View style={styles.heroRow}>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: RIDE_COLOR }]}
          onPress={() => navigation.navigate('RidePost', { postType: 'offer' })}
          activeOpacity={0.85}
        >
          <Feather name="plus-circle" size={15} color="#fff" />
          <Text style={[styles.actBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
            Offer Ride
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actBtn,
            {
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.16)' : '#f5f0ff',
              borderColor: isDark ? 'rgba(139, 92, 246, 0.45)' : '#d8b4fe',
              borderWidth: 1,
            },
          ]}
          onPress={() => navigation.navigate('RidePost', { postType: 'request' })}
          activeOpacity={0.85}
        >
          <Feather name="user-check" size={15} color={isDark ? '#c4b5fd' : '#7c3aed'} />
          <Text style={[styles.actBtnTxt, { color: isDark ? '#c4b5fd' : '#7c3aed', fontFamily: FontFamily.jakartaBold }]}>
            Request Ride
          </Text>
        </TouchableOpacity>
      </View>

      {/* Unified Segmented Track Switcher with Native Spring Animation & Colors */}
      <View
        style={[styles.tabContainer, { backgroundColor: C.surface2 }]}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                width: tabWidth,
                transform: [{ translateX }],
                backgroundColor: C.surface,
                borderColor: isDark ? `${TAB_COLORS[tab].fg}55` : `${TAB_COLORS[tab].fg}35`,
              },
            ]}
          />
        )}
        {TABS.map(tItem => {
          const active = tab === tItem.id;
          const cfg = TAB_COLORS[tItem.id];
          const isMine = tItem.id === 'mine';
          return (
            <TouchableOpacity
              key={tItem.id}
              style={styles.tabBtn}
              onPress={() => setTab(tItem.id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.tabBtnTxt,
                  {
                    color: active ? cfg.fg : C.textMuted,
                    fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {tItem.label}
              </Text>
              {isMine && myRidesCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: active ? `${cfg.fg}22` : C.surface }]}>
                  <Text style={[styles.tabBadgeTxt, { color: active ? cfg.fg : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {myRidesCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Clutter-Free Search Bar */}
      <View style={[styles.searchWrapper, { paddingHorizontal: Layout.screenPadding }]}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Icon name="search" size={17} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder={t.rides2.searchPlaceholder ?? 'Search pickup, destination, or area…'}
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} style={{ padding: 4 }}>
              <Icon name="x" size={15} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {loading && rides.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={C.brand} />
        ) : filteredRides.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="ride" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {searchQuery
                ? t.common.noResults
                : tab === 'mine'
                ? (t.rides2.noMyRidesTitle ?? 'No Rides Yet')
                : (t.rides2.noRidesTitle ?? 'No rides available')}
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {searchQuery
                ? 'Try clearing your search query'
                : tab === 'mine'
                ? (t.rides2.noMyRidesSub ?? "You haven't offered or requested any rides yet.")
                : (t.rides2.noRidesSub ?? 'No campus rides currently posted for this route.')}
            </Text>
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                style={[styles.clearBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.75}
              >
                <Text style={[styles.clearBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  Clear search
                </Text>
              </TouchableOpacity>
            ) : tab === 'mine' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.clearBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => navigation.navigate('RidePost', { postType: 'offer' })}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.clearBtnTxt, { color: RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                    Offer Ride
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.clearBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => navigation.navigate('RidePost', { postType: 'request' })}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.clearBtnTxt, { color: '#8b5cf6', fontFamily: FontFamily.jakartaBold }]}>
                    Request Ride
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredRides.map(r => {
              const taken = takenCounts[r.id] ?? 0;
              const isRequested = requestedIds.has(r.id);
              const isOwnRide = r.driver_id === user?.id;
              const isPassengerRequest = r.post_type === 'request';
              const seatsLeft = r.seats_total - taken;
              const isFull = seatsLeft <= 0 && !isRequested;
              const departureText = formatDepartureLabel(r.date, r.time, t);
              const vMeta = VEHICLE_META[r.vehicle] ?? { icon: '🚗', label: r.vehicle };

              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('RideDetail', { rideId: r.id })}
                  activeOpacity={0.85}
                >
                  {/* Top route & fare */}
                  <View style={styles.cardHeader}>
                    <View style={styles.routeCol}>
                      <Text style={[styles.routeTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
                        {r.origin} → {r.destination}
                      </Text>
                      {/* Vehicle & Type & Time Row */}
                      <View style={styles.subMetaRow}>
                        {isPassengerRequest ? (
                          <View style={[styles.typePill, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#f3effe' }]}>
                            <Text style={[styles.typePillTxt, { color: isDark ? '#c4b5fd' : '#7c3aed', fontFamily: FontFamily.jakartaBold }]}>
                              🙋 Need Ride
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.typePill, { backgroundColor: RIDE_BG }]}>
                            <Text style={[styles.typePillTxt, { color: RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                              🚗 Offer
                            </Text>
                          </View>
                        )}
                        <View style={[styles.vehPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : C.surface2 }]}>
                          <Text style={[styles.vehTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                            {vMeta.icon} {vMeta.label}
                          </Text>
                        </View>
                        <View style={[styles.dirPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : C.surface2 }]}>
                          <Text style={[styles.dirPillTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                            {r.direction === 'To Campus' ? (t.rides2.toCampus ?? 'To Campus') : (t.rides2.fromCampus ?? 'From Campus')}
                          </Text>
                        </View>
                        <Text style={[styles.timeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {departureText}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.fare, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {formatPrice(r.fare)}
                    </Text>
                  </View>

                  {/* Notes snippet if present */}
                  {r.notes ? (
                    <Text style={[styles.notesSnippet, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                      {r.notes}
                    </Text>
                  ) : null}

                  {/* Driver / Passenger Identity & seats row */}
                  <View style={styles.driverRow}>
                    <View style={styles.driverIdentity}>
                      <Avatar name={r.driver_name} size="xs" />
                      <View style={{ minWidth: 0 }}>
                        <Text style={[styles.driverName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {isOwnRide
                            ? (isPassengerRequest ? 'You (Passenger)' : 'You (Driver)')
                            : (r.driver_name ?? (isPassengerRequest ? 'Passenger' : t.rides2.driverFallback))}
                        </Text>
                        {r.driver_dept ? (
                          <Text style={[styles.driverDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                            {r.driver_dept}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Text style={[styles.seatsCount, { color: isFull ? C.danger : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {isPassengerRequest
                        ? `${r.seats_total} seat${r.seats_total === 1 ? '' : 's'} needed`
                        : isFull
                        ? (t.rides2.full ?? 'Full')
                        : `${Math.max(seatsLeft, 0)} ${t.rides2.seatsLeftCount(Math.max(seatsLeft, 0))}`}
                    </Text>
                  </View>

                  {/* Action Button & Status */}
                  {isPassengerRequest ? (
                    isOwnRide ? (
                      <View style={[styles.ownRideBadge, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.ownRideTxt, { color: '#8b5cf6', fontFamily: FontFamily.jakartaBold }]}>
                          Your Ride Request · Tap to manage
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.requestBtn,
                          {
                            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#f5f0ff',
                            borderColor: isDark ? 'rgba(139, 92, 246, 0.5)' : '#d8b4fe',
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => navigation.navigate('RideDetail', { rideId: r.id })}
                        activeOpacity={0.75}
                      >
                        <Feather name="message-circle" size={15} color={isDark ? '#c4b5fd' : '#7c3aed'} />
                        <Text style={[styles.requestBtnTxt, { color: isDark ? '#c4b5fd' : '#7c3aed', fontFamily: FontFamily.jakartaBold }]}>
                          Offer a Lift / Contact Rider
                        </Text>
                      </TouchableOpacity>
                    )
                  ) : isOwnRide ? (
                    <View style={[styles.ownRideBadge, { backgroundColor: C.surface2 }]}>
                      <Text style={[styles.ownRideTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                        {t.rides2.manageMyRide ?? 'Manage My Ride'} · {taken}/{r.seats_total} Booked
                      </Text>
                    </View>
                  ) : isRequested ? (
                    <View style={[styles.requestedBanner, { backgroundColor: C.successBg }]}>
                      <Feather name="check" size={15} color={C.success} />
                      <Text style={[styles.requestedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                        {t.rides2.seatBooked ?? 'Seat Booked'} · Tap for Details
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.requestBtn,
                        {
                          backgroundColor: isFull ? C.surface2 : RIDE_COLOR,
                          opacity: isFull ? 0.6 : 1,
                        },
                      ]}
                      onPress={(e) => { e.stopPropagation?.(); requestRide(r.id); }}
                      disabled={isFull}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                    >
                      <Icon name="ride" size={16} color={isFull ? C.textMuted : C.white} />
                      <Text
                        style={[
                          styles.requestBtnTxt,
                          {
                            color: isFull ? C.textMuted : C.white,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                      >
                        {isFull ? t.rides2.rideFull : t.rides2.requestRide}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  heroRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 6,
    paddingBottom: 4,
  } as ViewStyle,
  actBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 12,
  } as ViewStyle,
  actBtnTxt: {
    fontSize: 13,
  } as TextStyle,

  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginHorizontal: Layout.screenPadding,
    marginTop: 6,
    marginBottom: 8,
    position: 'relative',
  } as ViewStyle,
  activeIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 11,
    zIndex: 1,
  } as ViewStyle,
  tabBtnTxt: { fontSize: 12 } as any,
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  } as ViewStyle,
  tabBadgeTxt: { fontSize: 10 } as any,

  searchWrapper: { paddingTop: 2, paddingBottom: 6 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  } as TextStyle,

  scroll: { paddingTop: 4, paddingBottom: 24 },
  list: { gap: 12 },

  card: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  routeCol: { flex: 1 },
  routeTitle: {
    fontSize: 15.5,
    lineHeight: 22,
  } as TextStyle,
  fare: {
    fontSize: 16,
    flexShrink: 0,
    marginTop: 2,
  } as TextStyle,

  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillTxt: { fontSize: 10.5 } as TextStyle,
  vehPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vehTxt: { fontSize: 11 } as TextStyle,
  dirPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dirPillTxt: { fontSize: 11 } as TextStyle,
  timeTxt: { fontSize: 12 } as TextStyle,

  notesSnippet: {
    fontSize: 12,
    marginTop: 8,
  } as TextStyle,

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  driverIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  driverName: { fontSize: 12.5 } as TextStyle,
  driverDept: { fontSize: 11 } as TextStyle,
  seatsCount: { fontSize: 12 } as TextStyle,

  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginTop: 12,
  },
  requestBtnTxt: { fontSize: 13.5 } as TextStyle,

  requestedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    marginTop: 12,
  },
  requestedTxt: { fontSize: 13 } as TextStyle,

  ownRideBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    marginTop: 12,
  },
  ownRideTxt: { fontSize: 13 } as TextStyle,

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: { fontSize: 16 } as TextStyle,
  emptySub: { fontSize: 13 } as TextStyle,
  clearBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  clearBtnTxt: { fontSize: 12.5 } as TextStyle,
});
