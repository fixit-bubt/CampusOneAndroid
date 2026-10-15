import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput,
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
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchPeople } from '../../services/peopleService';
import { localToday, nowDhakaMinutes, formatTime, formatPrice, formatDate } from '../../utils/format';
import { useAuth } from '../../store/authStore';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import type { Ride as RideRow } from '../../types/database';

const RIDE_COLOR = SectorColors.ride;

type Ride = RideRow & {
  driver_name?: string;
  driver_dept?: string;
};

type TabKey = 'to' | 'from' | 'mine';

function isRideDeparted(dateStr: string, timeStr: string): boolean {
  const today = localToday();
  if (dateStr < today) return true;
  if (dateStr === today && timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      const curMins = nowDhakaMinutes();
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
  const [tab, setTab] = useState<TabKey>('to');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const searchInputRef = useRef<TextInput>(null);

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
    const target = rides.find(r => r.id === rideId);
    if (target?.post_type === 'request') {
      navigation.navigate('RideDetail', { rideId });
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

  // Clean 3-Tab Definition: To Campus, From Campus, My Rides
  const DIRECTION_TABS: TabItem<TabKey>[] = useMemo(() => [
    { id: 'to',   label: t.rides2.toCampus ?? 'To Campus',   color: '#16a34a' },
    { id: 'from', label: t.rides2.fromCampus ?? 'From Campus', color: '#2563eb' },
    { id: 'mine', label: t.rides2.myRidesTab ?? 'My Rides', count: myRidesCount > 0 ? myRidesCount : undefined, color: RIDE_COLOR },
  ], [t, myRidesCount]);

  // Filter pipeline
  const filteredRides = useMemo(() => {
    let list = rides;

    // 1. Tab filter
    if (tab === 'mine') {
      list = list.filter(r => r.driver_id === user?.id || requestedIds.has(r.id));
    } else if (tab === 'to') {
      list = list.filter(r => r.direction === 'To Campus');
      list = list.filter(r => !isRideDeparted(r.date, r.time) || r.driver_id === user?.id || requestedIds.has(r.id));
    } else if (tab === 'from') {
      list = list.filter(r => r.direction === 'From Campus');
      list = list.filter(r => !isRideDeparted(r.date, r.time) || r.driver_id === user?.id || requestedIds.has(r.id));
    }

    // 2. Search query (matches origin, destination, driver name, vehicle, or route notes)
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* SubBar: Without rightSlot override, SubBar restores CampusOne Logo on top right */}
      <SubBar
        title={t.rides2.rideShareTitle}
        onBack={() => navigation.goBack()}
      />

      <OfflineBanner
        visible={isOffline}
        message="Showing cached campus rides. Connect to the internet to request seats or post rides."
      />

      {/* Prominent Hero Action Bar (Universal 58dp Standard) */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6, paddingBottom: 6 }}>
        <TouchableOpacity
          style={[styles.heroActBtn, { backgroundColor: RIDE_COLOR }]}
          onPress={() => navigation.navigate('RidePost', { postType: 'offer' })}
          activeOpacity={0.85}
        >
          <Feather name="plus-circle" size={18} color="#fff" />
          <Text style={[styles.heroActBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.postRideHeroBtn ?? 'Post a Campus Ride'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Single Unified 58dp Segmented Tab Bar: [ To Campus ] [ From Campus ] [ My Rides ] */}
      <View style={{ paddingHorizontal: Layout.screenPadding, marginBottom: 8 }}>
        <SegmentedTabs<TabKey>
          tabs={DIRECTION_TABS}
          activeTab={tab}
          onTabChange={setTab}
        />
      </View>

      {/* Universal 58dp Full-Width Search Bar */}
      <View style={{ paddingHorizontal: Layout.screenPadding, marginBottom: 8 }}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TouchableOpacity onPress={() => searchInputRef.current?.focus()}>
            <Icon name="search" size={18} color={C.textMuted} />
          </TouchableOpacity>
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder={t.rides2.searchPlaceholder ?? 'Search pickup, destination, or driver…'}
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
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color={RIDE_COLOR} />
          </View>
        ) : filteredRides.length === 0 ? (
          <View style={styles.empty}>
            <AnimatedIcon family="feather" name="navigation" size={36} color={C.textMuted} animation="entrance" />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {tab === 'mine' ? (t.rides2.noMyRidesTitle ?? 'No rides found') : (t.rides2.noRidesTitle ?? 'No rides available')}
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {tab === 'mine'
                ? 'Rides you post or seats you request will appear here.'
                : searchQuery
                ? 'Try clearing your search terms.'
                : tab === 'to'
                ? 'Be the first to offer or request a ride to campus!'
                : 'Be the first to offer or request a ride from campus!'}
            </Text>
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: C.border }]}
                onPress={() => setSearchQuery('')}
              >
                <Text style={[styles.clearBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Clear Search
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredRides.map(r => {
              const isOwnRide = r.driver_id === user?.id;
              const isRequested = requestedIds.has(r.id);
              const isPassengerRequest = r.post_type === 'request';
              const taken = takenCounts[r.id] ?? 0;
              const seatsLeft = r.seats_total - taken;
              const isFull = seatsLeft <= 0 && !isRequested;
              const departureText = formatDepartureLabel(r.date, r.time, t);

              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('RideDetail', { rideId: r.id })}
                  activeOpacity={0.85}
                >
                  {/* Top Metadata: Role & Vehicle Badges, Time, and Fare */}
                  <View style={styles.cardHeader}>
                    <View style={styles.metaBadgesRow}>
                      <StatusBadge
                        variant="role"
                        value={isPassengerRequest ? 'request' : 'offer'}
                        label={isPassengerRequest ? (t.rides2.needRide ?? 'Need Ride') : (t.rides2.offers ?? 'Offer')}
                        size="sm"
                      />
                      <StatusBadge
                        variant="vehicle"
                        value={r.vehicle}
                        size="sm"
                      />
                      <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : C.surface2 }]}>
                        <Feather name="clock" size={11} color={C.textMuted} />
                        <Text style={[styles.timeTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                          {departureText}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fareStack}>
                      <Text style={[styles.fare, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                        {formatPrice(r.fare)}
                      </Text>
                      <Text style={[styles.fareSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                        {isPassengerRequest ? 'budget' : 'per seat'}
                      </Text>
                    </View>
                  </View>

                  {/* Uber-Style Route Track */}
                  <View style={styles.routeTrack}>
                    <View style={[styles.routeTrackLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]} />

                    {/* Origin / Pickup */}
                    <View style={styles.stopRow}>
                      <View style={[styles.pickupDot, { backgroundColor: '#10b981', borderColor: isDark ? '#064e3b' : '#a7f3d0' }]} />
                      <View style={styles.stopContent}>
                        <Text style={[styles.stopMicroLabel, { color: '#10b981', fontFamily: FontFamily.jakartaBold }]}>
                          PICKUP
                        </Text>
                        <Text style={[styles.stopTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {r.origin}
                        </Text>
                      </View>
                    </View>

                    {/* Destination / Drop-off */}
                    <View style={styles.stopRow}>
                      <View style={[styles.dropoffDot, { backgroundColor: '#ef4444', borderColor: isDark ? '#7f1d1d' : '#fecaca' }]} />
                      <View style={styles.stopContent}>
                        <Text style={[styles.stopMicroLabel, { color: '#ef4444', fontFamily: FontFamily.jakartaBold }]}>
                          DESTINATION
                        </Text>
                        <Text style={[styles.stopTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {r.destination}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Meeting Landmark / Notes snippet if present */}
                  {r.notes ? (
                    <View style={[styles.landmarkBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.surface2, borderColor: C.border }]}>
                      <Feather name="map-pin" size={12} color={RIDE_COLOR} />
                      <Text style={[styles.landmarkTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {r.notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Driver / Passenger Identity & seats row */}
                  <View style={styles.driverRow}>
                    <View style={styles.driverIdentity}>
                      <Avatar name={r.driver_name} size="xs" />
                      <View style={{ minWidth: 0, flex: 1 }}>
                        <Text style={[styles.driverName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {isOwnRide
                            ? (isPassengerRequest ? 'You (Passenger)' : 'You (Driver)')
                            : (r.driver_name ?? (isPassengerRequest ? 'Passenger' : t.rides2.driverFallback))}
                        </Text>
                        {r.driver_dept ? (
                          <Text style={[styles.driverDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                            {r.driver_dept}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.seatsPill, { backgroundColor: isFull ? (isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2') : (isDark ? 'rgba(255,255,255,0.05)' : C.surface2) }]}>
                      <Text style={[styles.seatsCount, { color: isFull ? C.danger : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {isPassengerRequest
                          ? `${r.seats_total} seat${r.seats_total === 1 ? '' : 's'} needed`
                          : isFull
                          ? (t.rides2.full ?? 'Full')
                          : `${Math.max(seatsLeft, 0)} ${t.rides2.seatsLeftCount(Math.max(seatsLeft, 0))}`}
                      </Text>
                    </View>
                  </View>

                  {/* Action Button & Status */}
                  {isPassengerRequest ? (
                    isOwnRide ? (
                      <View style={[styles.ownRideBadge, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.ownRideTxt, { color: RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>
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
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  heroActBtn: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: RIDE_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  } as ViewStyle,
  heroActBtnTxt: {
    fontSize: 14.5,
  } as TextStyle,

  searchBar: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 9,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingVertical: 0,
  } as TextStyle,

  scroll: { paddingTop: 4, paddingBottom: 24 },
  list: { gap: 12 },

  card: {
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  } as ViewStyle,
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  } as ViewStyle,
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
  } as ViewStyle,
  timeTxt: { fontSize: 11 } as TextStyle,

  fareStack: {
    alignItems: 'flex-end',
    flexShrink: 0,
  } as ViewStyle,
  fare: {
    fontSize: 17,
  } as TextStyle,
  fareSub: {
    fontSize: 10,
    marginTop: -1,
  } as TextStyle,

  /* Uber-Style Route Track */
  routeTrack: {
    marginTop: 12,
    paddingLeft: 2,
    position: 'relative',
    gap: 10,
  } as ViewStyle,
  routeTrackLine: {
    position: 'absolute',
    left: 8,
    top: 14,
    bottom: 14,
    width: 2,
    borderRadius: 1,
  } as ViewStyle,
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  pickupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  } as ViewStyle,
  dropoffDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  } as ViewStyle,
  stopContent: {
    flex: 1,
  } as ViewStyle,
  stopMicroLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
  } as TextStyle,
  stopTitle: {
    fontSize: 14,
    marginTop: 1,
  } as TextStyle,

  landmarkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  } as ViewStyle,
  landmarkTxt: {
    fontSize: 12,
    flex: 1,
  } as TextStyle,

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  } as ViewStyle,
  driverIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  } as ViewStyle,
  driverName: { fontSize: 13 } as TextStyle,
  driverDept: { fontSize: 11 } as TextStyle,

  seatsPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  seatsCount: { fontSize: 11.5 } as TextStyle,

  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginTop: 12,
  } as ViewStyle,
  requestBtnTxt: { fontSize: 13.5 } as TextStyle,

  requestedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    marginTop: 12,
  } as ViewStyle,
  requestedTxt: { fontSize: 13 } as TextStyle,

  ownRideBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    marginTop: 12,
  } as ViewStyle,
  ownRideTxt: { fontSize: 13 } as TextStyle,

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  } as ViewStyle,
  emptyTitle: { fontSize: 16 } as TextStyle,
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 } as TextStyle,
  clearBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
  clearBtnTxt: { fontSize: 12.5 } as TextStyle,
});
