import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchPeople } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { formatPrice, formatDate, formatTime, localToday } from '../../utils/format';
import { openUrl, waHref } from '../../utils/link';
import {
  getCurrentUserCoordinates,
  getDistanceMeters,
  BUBT_COORDS,
  type Coordinates,
} from '../../services/locationService';
import { findMasterLocationByName } from '../../constants/dhakaMasterLocations';
import { RideRouteMapModal } from '../../components/rides/RideRouteMapModal';

const RIDE_COLOR = SectorColors.ride;
const RIDE_BG    = `${SectorColors.ride}1e`;

function formatDepartureLabel(dateStr: string, timeStr: string, t: any): string {
  const isToday = dateStr === localToday();
  const timeFormatted = timeStr ? formatTime(timeStr) : '';
  const dayPrefix = isToday ? (t.rides2.todayText ?? 'Today') : formatDate(dateStr);
  return timeFormatted ? `${dayPrefix} · ${timeFormatted}` : dayPrefix;
}

export function RideDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { rideId } = route.params ?? {};

  const [ride, setRide] = useState<any>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [driverInfo, setDriverInfo] = useState<{ full_name?: string; department?: string; id?: string } | null>(null);
  const [contact, setContact] = useState<{ whatsapp: string; name?: string } | null>(null);
  const [requested, setRequested] = useState(false);
  const [takenCount, setTakenCount] = useState(0);
  const [requesters, setRequesters] = useState<{
    requester_id: string;
    full_name: string;
    department?: string;
    whatsapp?: string | null;
  }[]>([]);
  const [contactTarget, setContactTarget] = useState<{ name: string; phone?: string; id?: string } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [showRouteMap, setShowRouteMap] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUserCoordinates().then(coords => {
      if (mounted && coords) {
        setUserCoords(coords);
      }
    });
    return () => { mounted = false; };
  }, []);

  const load = useCallback(async () => {
    if (!rideId) { setLoadFailed(true); return; }

    const cachedRides = await getCache<any[]>(CacheKeys.RIDES);
    const cached = cachedRides?.find(r => r.id === rideId);
    if (cached) {
      setRide(cached);
      setDriverInfo({ full_name: cached.driver_name, department: cached.driver_dept, id: cached.driver_id });
    }

    try {
      const [rideRes, reqRes, takenRes, countRes] = await Promise.all([
        supabase
          .from('rides')
          .select('*')
          .eq('id', rideId)
          .maybeSingle(),
        supabase
          .from('ride_requests')
          .select('ride_id')
          .eq('ride_id', rideId)
          .eq('requester_id', user?.id ?? '')
          .maybeSingle(),
        supabase
          .from('ride_requests')
          .select('requester_id')
          .eq('ride_id', rideId),
        supabase.rpc('ride_request_counts'),
      ]);

      if (rideRes.error || !rideRes.data) {
        if (cached) {
          setIsOffline(true);
          const cachedCounts = await getCache<Record<string, number>>(CacheKeys.RIDES_TAKEN);
          if (cachedCounts && cachedCounts[rideId] !== undefined) {
            setTakenCount(cachedCounts[rideId]);
          }
          const cachedReq = user?.id ? await getCache<string[]>(CacheKeys.RIDES_REQUESTED(user.id)) : null;
          if (cachedReq && cachedReq.includes(rideId)) {
            setRequested(true);
          }
          return;
        }
        toast({ type: 'error', title: t.common.error });
        setLoadFailed(true);
        return;
      }

      setIsOffline(false);
      setRide(rideRes.data);

      const targetIds = [
        rideRes.data.driver_id,
        ...((takenRes.data as any[]) ?? []).map(r => r.requester_id),
      ];
      const people = await fetchPeople(targetIds);
      const drv = people[rideRes.data.driver_id];
      setDriverInfo({
        full_name: drv?.full_name,
        department: drv?.department ?? undefined,
        id: rideRes.data.driver_id,
      });

      if (rideRes.data.driver_id === user?.id && takenRes.data) {
        setRequesters((takenRes.data as any[]).map(r => ({
          requester_id: r.requester_id,
          full_name: people[r.requester_id]?.full_name ?? (t.rides2.unknown ?? 'Student'),
          department: people[r.requester_id]?.department ?? undefined,
        })));
      }

      if (reqRes.data) {
        setRequested(true);
        const { data: c } = await supabase.rpc('ride_contact', {
          p_code:   rideRes.data.code,
          p_target: rideRes.data.driver_id,
        });
        const row = Array.isArray(c) ? c[0] : c;
        if (row) setContact(row);
      } else {
        setRequested(false);
      }

      const cnt = (countRes.data ?? []).find((c: any) => c.ride_id === rideId);
      setTakenCount(cnt ? Number(cnt.taken) : 0);
    } catch {
      if (cached) {
        setIsOffline(true);
      } else {
        setLoadFailed(true);
      }
    }
  }, [rideId, user?.id, toast, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function revealRequester(requesterId: string) {
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to view requester contacts.' });
      return;
    }
    const { data } = await supabase.rpc('ride_contact', {
      p_code:   ride.code,
      p_target: requesterId,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.whatsapp) {
      setRequesters(prev => prev.map(r => (r.requester_id === requesterId ? { ...r, whatsapp: row.whatsapp } : r)));
      const person = requesters.find(r => r.requester_id === requesterId);
      setContactTarget({ name: person?.full_name ?? (t.rides2.contact ?? 'Student'), phone: row.whatsapp, id: requesterId });
    } else {
      toast({ type: 'info', title: t.rides2.noContactTitle, message: t.rides2.noContactBody });
    }
  }

  async function revealDriverContact() {
    if (!ride) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to view contact.' });
      return;
    }
    const isReq = ride.post_type === 'request';
    const { data: c, error } = await supabase.rpc('ride_contact', {
      p_code:   ride.code,
      p_target: ride.driver_id,
    });
    if (error) {
      toast({ type: 'error', title: t.common.error, message: error.message });
      return;
    }
    const row = Array.isArray(c) ? c[0] : c;
    const targetName = driverInfo?.full_name ?? (isReq ? (t.rides2.passengerRole ?? 'Passenger') : (t.rides2.driverFallback ?? 'Driver'));
    if (row) {
      setContact(row);
      setContactTarget({
        name: row.name || targetName,
        phone: row.whatsapp || undefined,
        id: ride.driver_id,
      });
    } else {
      setContactTarget({
        name: targetName,
        phone: undefined,
        id: ride.driver_id,
      });
    }
  }

  function deleteOwnRide() {
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to delete ride.' });
      return;
    }
    const isReq = ride?.post_type === 'request';
    Alert.alert(
      isReq
        ? (t.rides2.deleteRequestTitle ?? 'Delete this ride request?')
        : (t.rides2.deleteOwnTitle ?? 'Delete this ride?'),
      isReq
        ? (t.rides2.deleteRequestBody ?? 'Your ride request will be removed from the campus board.')
        : (t.rides2.deleteOwnBody ?? 'Your seat requests will be discarded.'),
      [
        { text: t.common.cancel ?? 'Cancel', style: 'cancel' },
        {
          text: t.common.delete ?? 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('rides').delete().eq('id', rideId);
            if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
            navigation.goBack();
          },
        },
      ]
    );
  }

  async function requestRide() {
    if (!user || requested || !ride || actionBusy || ride.post_type === 'request') return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to request a ride.' });
      return;
    }
    setActionBusy(true);
    const { error } = await supabase
      .from('ride_requests')
      .insert({ ride_id: rideId, requester_id: user.id });

    setActionBusy(false);
    if (!error || error.code === '23505') {
      const isDup = !!error && error.code === '23505';
      setRequested(true);
      if (!isDup) setTakenCount(c => c + 1);

      if (user?.id) {
        getCache<string[]>(CacheKeys.RIDES_REQUESTED(user.id)).then(cached => {
          setCache(CacheKeys.RIDES_REQUESTED(user.id), [...(cached || []), rideId]);
        });
      }

      const { data: c } = await supabase.rpc('ride_contact', {
        p_code:   ride.code,
        p_target: ride.driver_id,
      });
      const row = Array.isArray(c) ? c[0] : c;
      if (row) {
        setContact(row);
        if (row.whatsapp) {
          setContactTarget({ name: driverInfo?.full_name ?? (t.rides2.driverFallback ?? 'Driver'), phone: row.whatsapp, id: ride.driver_id });
        }
      }
      toast({ type: 'success', title: t.rides2.requestSent, message: 'Driver has been notified.' });
    } else {
      toast({ type: 'error', title: t.common.error, message: error.message });
    }
  }

  function cancelMySeat() {
    if (!user || actionBusy) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to cancel seat.' });
      return;
    }

    Alert.alert(
      t.rides2.cancelConfirmTitle ?? 'Cancel Seat?',
      t.rides2.cancelConfirmBody ?? 'Your reserved seat will be released for other students.',
      [
        { text: t.common.cancel ?? 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Release Seat',
          style: 'destructive',
          onPress: async () => {
            setActionBusy(true);
            const { error } = await supabase
              .from('ride_requests')
              .delete()
              .eq('ride_id', rideId)
              .eq('requester_id', user.id);

            setActionBusy(false);
            if (error) {
              toast({ type: 'error', title: t.common.error, message: error.message });
              return;
            }
            setRequested(false);
            setContact(null);
            setTakenCount(c => Math.max(c - 1, 0));
            if (user?.id) {
              getCache<string[]>(CacheKeys.RIDES_REQUESTED(user.id)).then(cached => {
                if (cached) setCache(CacheKeys.RIDES_REQUESTED(user.id), cached.filter(id => id !== rideId));
              });
            }
            toast({ type: 'success', title: t.rides2.cancelSuccess ?? 'Seat request cancelled' });
          },
        },
      ]
    );
  }

  function removeRider(requesterId: string, riderName: string) {
    if (!user || actionBusy) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to remove rider.' });
      return;
    }

    Alert.alert(
      t.rides2.removeRiderTitle ?? 'Remove Passenger?',
      `${t.rides2.removeRiderBody ?? 'This seat will become available for other students.'} (${riderName})`,
      [
        { text: t.common.cancel ?? 'Cancel', style: 'cancel' },
        {
          text: t.common.delete ?? 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionBusy(true);
            const { error } = await supabase
              .from('ride_requests')
              .delete()
              .eq('ride_id', rideId)
              .eq('requester_id', requesterId);

            setActionBusy(false);
            if (error) {
              toast({ type: 'error', title: t.common.error, message: error.message });
              return;
            }
            setRequesters(prev => prev.filter(r => r.requester_id !== requesterId));
            setTakenCount(c => Math.max(c - 1, 0));
            toast({ type: 'success', title: 'Passenger removed' });
          },
        },
      ]
    );
  }

  function adminDelete() {
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to delete ride.' });
      return;
    }
    Alert.alert(
      t.rides2.adminDeleteTitle ?? 'Delete ride',
      t.rides2.adminDeleteBody ?? 'Remove this ride post permanently?',
      [
        { text: t.common.cancel ?? 'Cancel', style: 'cancel' },
        {
          text: t.common.delete ?? 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('rides').delete().eq('id', rideId);
            if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
            navigation.goBack();
          },
        },
      ]
    );
  }

  const originLoc = ride?.origin ? findMasterLocationByName(ride.origin) : null;
  const destLoc = ride?.destination ? findMasterLocationByName(ride.destination) : null;

  const originCoords = originLoc?.coords || (ride?.origin?.toLowerCase().includes('bubt') ? BUBT_COORDS : null);
  const destCoords = destLoc?.coords || (ride?.destination?.toLowerCase().includes('bubt') ? BUBT_COORDS : null);

  let proximityText: string | null = null;
  let proximityEstimate: string | null = null;

  if (userCoords && originCoords) {
    const distMeters = getDistanceMeters(
      userCoords.latitude,
      userCoords.longitude,
      originCoords.latitude,
      originCoords.longitude
    );
    if (distMeters < 1000) {
      proximityText = `${Math.round(distMeters)}m from you`;
      const walkMin = Math.max(1, Math.round(distMeters / 80));
      proximityEstimate = `~${walkMin} min walk`;
    } else {
      const km = (distMeters / 1000).toFixed(1);
      proximityText = `${km} km from you`;
      const driveMin = Math.max(3, Math.round((distMeters / 1000) / 25 * 60));
      proximityEstimate = `~${driveMin} min drive`;
    }
  }

  function openRouteNavigation() {
    if (!ride) return;
    const originParam = originCoords
      ? `${originCoords.latitude},${originCoords.longitude}`
      : encodeURIComponent(`${ride.origin}, Dhaka`);
    const destParam = destCoords
      ? `${destCoords.latitude},${destCoords.longitude}`
      : encodeURIComponent(`${ride.destination}, Dhaka`);
    openUrl(`https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`);
  }

  function openGoogleMaps() {
    if (!ride) return;
    const query = originCoords
      ? `${originCoords.latitude},${originCoords.longitude}`
      : encodeURIComponent(`${ride.origin}, Dhaka`);
    openUrl(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  if (!ride) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.rides2.rideDetailTitle} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {loadFailed
            ? <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>{t.rides2.rideUnavailable}</Text>
            : <ActivityIndicator color={C.brand} />}
        </View>
      </SafeAreaView>
    );
  }

  const isOwnRide = ride.driver_id === user?.id;
  const isPassengerRequest = ride.post_type === 'request';
  const seatsLeft = (ride.seats_total ?? 0) - takenCount;
  const isFull = seatsLeft <= 0 && !requested && !isPassengerRequest;
  const departureText = formatDepartureLabel(ride.date, ride.time, t);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.rides2.rideDetailTitle} onBack={() => navigation.goBack()} />
      <OfflineBanner
        visible={isOffline}
        message="Showing cached ride details. Connect to the internet to request seats or view contacts."
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero */}
        <View style={styles.header}>
          <View style={[styles.thumb, { backgroundColor: isPassengerRequest ? (isDark ? 'rgba(139, 92, 246, 0.2)' : '#f3effe') : RIDE_BG }]}>
            <Icon name="ride" size={26} color={isPassengerRequest ? (isDark ? '#c4b5fd' : '#7c3aed') : RIDE_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.route, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={2}>
              {ride.origin} → {ride.destination}
            </Text>
            <View style={styles.badgeRow}>
              <StatusBadge
                variant="role"
                value={isPassengerRequest ? 'request' : 'offer'}
                label={isPassengerRequest ? (t.rides2.needRide ?? 'Need Ride') : (t.rides2.offers ?? 'Offer')}
                size="sm"
              />
              <StatusBadge
                variant="vehicle"
                value={ride.vehicle}
                size="sm"
              />
              {/* Direction pill */}
              <View style={[styles.pill, { backgroundColor: RIDE_BG }]}>
                <Text style={[styles.pillTxt, { color: RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                  {ride.direction === 'To Campus' ? (t.rides2.toCampus ?? 'To Campus') : (t.rides2.fromCampus ?? 'From Campus')}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Feather name="clock" size={12} color={C.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.subTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {departureText}
              </Text>
            </View>
          </View>
        </View>

        {/* Info grid */}
        <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.infoCell}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {isPassengerRequest ? (t.rides2.seatsNeeded ?? 'Seats needed') : t.rides2.seatsLeftLabel}
            </Text>
            <Text style={[styles.infoCellTxt, { color: isPassengerRequest ? C.text : isFull ? C.danger : C.text, fontFamily: FontFamily.jakartaBold }]}>
              {isPassengerRequest
                ? `${ride.seats_total} ${t.rides2.seatsNeededCount?.(ride.seats_total) ?? 'needed'}`
                : isFull ? (t.rides2.full ?? 'Full') : `${Math.max(seatsLeft, 0)} / ${ride.seats_total}`}
            </Text>
          </View>
          <View style={[styles.infoCell, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {isPassengerRequest ? (t.rides2.budget ?? 'Budget') : t.rides2.farePerSeat}
            </Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {formatPrice(ride.fare)}
            </Text>
          </View>
        </View>

        {/* Uber Connected Route Card */}
        <View style={[styles.uberRouteCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.uberCardHeader}>
            <View style={styles.uberCardHeaderLeft}>
              <View style={[styles.microIconBox, { backgroundColor: RIDE_BG }]}>
                <Feather name="navigation" size={12} color={RIDE_COLOR} />
              </View>
              <Text style={[styles.uberCardTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
                ROUTE & PICKUP TIMELINE
              </Text>
            </View>
          </View>

          {/* Connected Route Spine */}
          <View style={styles.routeSpineContainer}>
            {/* Continuous vertical connecting line */}
            <View style={[styles.spineTrackLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' }]} />

            {/* 🟢 Pickup Point */}
            <View style={styles.spineStopRow}>
              <View style={[styles.pickupBeaconOuter, { borderColor: isDark ? '#064e3b' : '#a7f3d0', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5' }]}>
                <View style={[styles.pickupBeaconInner, { backgroundColor: '#10b981' }]} />
              </View>
              <View style={styles.spineStopContent}>
                <View style={styles.stopHeaderRow}>
                  <Text style={[styles.stopMicroTag, { color: '#10b981', fontFamily: FontFamily.jakartaBold }]}>
                    PICKUP
                  </Text>
                  {originLoc?.zone ? (
                    <Text style={[styles.zoneBadge, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      · {originLoc.zone}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.spineStopTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {ride.origin}
                </Text>
                {originLoc?.subLocation || originLoc?.address ? (
                  <Text style={[styles.spineStopSub, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
                    {originLoc.subLocation || originLoc.address}
                  </Text>
                ) : null}

                {/* Live GPS Proximity directly under Pickup (Zero-Cutoff Ergonomics) */}
                {proximityText ? (
                  <View style={[styles.proximityBeacon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0' }]}>
                    <AnimatedIcon family="feather" name="map-pin" size={11} color="#10b981" animation="pulse" />
                    <Text style={[styles.proximityTxt, { color: '#10b981', fontFamily: FontFamily.jakartaBold }]}>
                      {proximityText} {proximityEstimate ? `· ${proximityEstimate}` : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* 📍 Meeting Spot / Notes (along the spine) */}
            {ride.notes ? (
              <View style={styles.meetingSpotRow}>
                <View style={[styles.meetingSpotNode, { backgroundColor: isDark ? '#78350f' : '#fef3c7', borderColor: isDark ? '#f59e0b' : '#fbbf24' }]}>
                  <Feather name="map-pin" size={10} color="#f59e0b" />
                </View>
                <View style={[styles.meetingSpotBubble, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffdf5', borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[styles.meetingSpotLabel, { color: isDark ? '#fbbf24' : '#d97706', fontFamily: FontFamily.jakartaBold }]}>
                      MEETING SPOT:
                    </Text>
                    <Text style={[styles.meetingSpotTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                      {ride.notes}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* 🔴 Drop-off / Destination */}
            <View style={styles.spineStopRow}>
              <View style={[styles.dropoffBeaconOuter, { borderColor: isDark ? '#7f1d1d' : '#fecaca', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                <View style={[styles.dropoffBeaconInner, { backgroundColor: '#ef4444' }]} />
              </View>
              <View style={styles.spineStopContent}>
                <View style={styles.stopHeaderRow}>
                  <Text style={[styles.stopMicroTag, { color: '#ef4444', fontFamily: FontFamily.jakartaBold }]}>
                    DESTINATION
                  </Text>
                  {destLoc?.zone ? (
                    <Text style={[styles.zoneBadge, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      · {destLoc.zone}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.spineStopTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {ride.destination}
                </Text>
                {destLoc?.subLocation || destLoc?.address ? (
                  <Text style={[styles.spineStopSub, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
                    {destLoc.subLocation || destLoc.address}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Action Row inside Card: 58dp Navigation Bar */}
          <View style={styles.routeActionWrap}>
            <TouchableOpacity
              style={[styles.routeNavBtn, { backgroundColor: isDark ? 'rgba(39, 94, 254, 0.15)' : '#eff6ff', borderColor: isDark ? 'rgba(39, 94, 254, 0.35)' : '#bfdbfe' }]}
              onPress={() => setShowRouteMap(true)}
              activeOpacity={0.8}
            >
              <Feather name="map" size={17} color={C.brand} />
              <Text style={[styles.routeNavBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                View In-App Route Map
              </Text>
              <Feather name="maximize-2" size={14} color={C.brand} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Driver / Passenger Section */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {isPassengerRequest ? (t.rides2.passenger ?? 'PASSENGER') : (t.rides2.driver ?? 'DRIVER')}
        </Text>
        <View style={[styles.driverCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar name={driverInfo?.full_name} size="md" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.driverName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {isOwnRide
                ? (isPassengerRequest ? 'You (Passenger)' : 'You (Driver)')
                : (driverInfo?.full_name ?? (isPassengerRequest ? (t.rides2.passengerRole ?? 'Passenger') : (t.rides2.unknown ?? 'Driver')))}
            </Text>
            {driverInfo?.department ? (
              <Text style={[styles.driverDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                {driverInfo.department}
              </Text>
            ) : null}
            {contact?.whatsapp ? (
              <View style={styles.contactRow}>
                <Feather name="phone" size={13} color={C.textMuted} />
                <Text style={[styles.contactTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                  {contact.whatsapp}
                </Text>
              </View>
            ) : null}
          </View>

          {/* If not own ride, quick action */}
          {!isOwnRide && (
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: contact?.whatsapp ? C.successBg : (isDark ? 'rgba(139, 92, 246, 0.2)' : '#f5f0ff') }]}
              onPress={revealDriverContact}
              activeOpacity={0.8}
            >
              <Feather
                name={contact?.whatsapp ? "phone" : "message-circle"}
                size={16}
                color={contact?.whatsapp ? C.success : (isPassengerRequest ? '#8b5cf6' : RIDE_COLOR)}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Recurring routine pills (if present) */}
        {Array.isArray(ride.recurring) && ride.recurring.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.rides2.repeats ?? 'REPEATS'}
            </Text>
            <View style={styles.dayRow}>
              {ride.recurring.map((d: string) => (
                <View key={d} style={[styles.dayPill, { backgroundColor: RIDE_BG }]}>
                  <Text style={[styles.dayTxt, { color: RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>{d}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* 1. PASSENGER REQUEST FLOW */}
        {isPassengerRequest ? (
          isOwnRide ? (
            /* Passenger's Own Request Management */
            <View style={{ marginTop: 20 }}>
              <View style={[styles.ownRideBanner, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Feather name="info" size={16} color="#8b5cf6" />
                <Text style={[styles.ownRideBannerTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.rides2.contactPassengerSub ?? 'Your ride request is posted on campus. Drivers and carpoolers can reach out to you.'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.deleteRideBtn, { backgroundColor: C.dangerBg, borderColor: C.danger, marginTop: 14 }]}
                onPress={deleteOwnRide}
                activeOpacity={0.85}
              >
                <Icon name="trash" size={16} color={C.danger} />
                <Text style={[styles.deleteRideTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                  {t.rides2.deleteMyRequest ?? 'Delete My Request'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Driver / Peer View of Passenger Request */
            <View style={styles.bookedActionBlock}>
              {/* Direct In-App Chat with Passenger */}
              <TouchableOpacity
                style={[styles.inAppChatBtn, { backgroundColor: '#8b5cf6' }]}
                onPress={() => {
                  navigation.navigate('MessageThread', {
                    kind: 'dm',
                    id: ride.driver_id,
                    title: driverInfo?.full_name ?? (t.rides2.passengerRole ?? 'Passenger'),
                  });
                }}
                activeOpacity={0.85}
              >
                <Feather name="message-square" size={17} color="#fff" />
                <Text style={[styles.inAppChatBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.rides2.messageRider ?? 'Message Passenger'}
                </Text>
              </TouchableOpacity>

              {/* Reveal Phone / WhatsApp / Contact Sheet */}
              <TouchableOpacity
                style={[
                  styles.whatsappBtn,
                  {
                    backgroundColor: contact?.whatsapp ? '#25D366' : C.surface2,
                    borderColor: C.border,
                    borderWidth: contact?.whatsapp ? 0 : 1,
                  },
                ]}
                onPress={revealDriverContact}
                activeOpacity={0.85}
              >
                <Feather
                  name={contact?.whatsapp ? "message-circle" : "phone-call"}
                  size={17}
                  color={contact?.whatsapp ? '#fff' : C.text}
                />
                <Text
                  style={[
                    styles.whatsappBtnTxt,
                    {
                      color: contact?.whatsapp ? '#fff' : C.text,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  {contact?.whatsapp ? `WhatsApp: ${contact.whatsapp}` : (t.rides2.offerLiftOrContact ?? 'Offer a Lift / Contact Rider')}
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* 2. DRIVER OFFER FLOW */
          isOwnRide ? (
            /* Driver Section: Seat Requesters */
            <>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.rides2.seatRequests?.(requesters.length) ?? 'PASSENGERS'} ({requesters.length})
              </Text>
              {requesters.length === 0 ? (
                <Text style={[styles.emptyRidersTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.rides2.noRequestsYet ?? 'No passengers yet.'}
                </Text>
              ) : (
                <View style={[styles.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {requesters.map((r, i) => (
                    <View key={r.requester_id}>
                      {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }} />}
                      <View style={styles.reqRow}>
                        <Avatar name={r.full_name} size="sm" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.riderName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {r.full_name}
                          </Text>
                          {r.department ? (
                            <Text style={[styles.riderDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                              {r.department}
                            </Text>
                          ) : null}
                        </View>

                        {/* Contact / Reveal */}
                        {r.whatsapp ? (
                          <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: C.successBg }]}
                            onPress={() => setContactTarget({ name: r.full_name, phone: r.whatsapp!, id: r.requester_id })}
                            activeOpacity={0.75}
                          >
                            <Feather name="phone" size={12} color={C.success} />
                            <Text style={[styles.smallBtnTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                              {r.whatsapp}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: C.surface2 }]}
                            onPress={() => revealRequester(r.requester_id)}
                            activeOpacity={0.75}
                          >
                            <Feather name="phone" size={12} color={C.text2} />
                            <Text style={[styles.smallBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                              {t.rides2.contact ?? 'Contact'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Remove Rider Button */}
                        <TouchableOpacity
                          style={[styles.removeBtn, { backgroundColor: C.dangerBg }]}
                          onPress={() => removeRider(r.requester_id, r.full_name)}
                          activeOpacity={0.75}
                        >
                          <Feather name="x" size={14} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.deleteRideBtn, { backgroundColor: C.dangerBg, borderColor: C.danger }]}
                onPress={deleteOwnRide}
                activeOpacity={0.85}
              >
                <Icon name="trash" size={16} color={C.danger} />
                <Text style={[styles.deleteRideTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                  {t.rides2.deleteMyRide ?? 'Delete My Ride'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Passenger Booking Actions */
            requested ? (
              <View style={styles.bookedActionBlock}>
                <View style={[styles.confirmedBanner, { backgroundColor: C.successBg }]}>
                  <Feather name="check-circle" size={18} color={C.success} />
                  <Text style={[styles.confirmedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                    {t.rides2.seatBooked ?? 'Seat Reserved'}
                  </Text>
                </View>

                {/* Direct In-App Chat with Driver */}
                <TouchableOpacity
                  style={[styles.inAppChatBtn, { backgroundColor: RIDE_COLOR }]}
                  onPress={() => {
                    navigation.navigate('MessageThread', {
                      kind: 'dm',
                      id: ride.driver_id,
                      title: driverInfo?.full_name ?? (t.rides2.driverFallback ?? 'Driver'),
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name="message-square" size={17} color="#fff" />
                  <Text style={[styles.inAppChatBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.rides2.messageDriver ?? 'Message Driver'}
                  </Text>
                </TouchableOpacity>

                {/* Instant WhatsApp Driver Button */}
                {contact?.whatsapp ? (
                  <TouchableOpacity
                    style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
                    onPress={() => {
                      const wa = waHref(contact.whatsapp);
                      if (wa) openUrl(wa);
                    }}
                    activeOpacity={0.85}
                  >
                    <Feather name="message-circle" size={18} color="#fff" />
                    <Text style={[styles.whatsappBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      Chat on WhatsApp
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Cancel Seat Request Button */}
                <TouchableOpacity
                  style={[styles.cancelSeatBtn, { borderColor: C.danger }]}
                  onPress={cancelMySeat}
                  disabled={actionBusy}
                  activeOpacity={0.8}
                >
                  <Feather name="x-circle" size={16} color={C.danger} />
                  <Text style={[styles.cancelSeatTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                    {t.rides2.cancelSeat ?? 'Cancel Seat Request'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isFull ? C.surface2 : RIDE_COLOR,
                    opacity: isFull ? 0.6 : 1,
                  },
                ]}
                onPress={requestRide}
                disabled={isFull || actionBusy}
                activeOpacity={0.85}
              >
                {actionBusy ? (
                  <ActivityIndicator color={isFull ? C.textMuted : C.white} size="small" />
                ) : (
                  <>
                    <Icon name="ride" size={17} color={isFull ? C.textMuted : C.white} />
                    <Text style={[styles.actionTxt, { color: isFull ? C.textMuted : C.white, fontFamily: FontFamily.jakartaBold }]}>
                      {isFull ? (t.rides2.rideFull ?? 'Ride Full') : (t.rides2.requestRide ?? 'Request a Seat')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )
          )
        )}

        {/* Admin Moderation */}
        {!isOwnRide && isAdmin && (
          <TouchableOpacity
            style={[styles.deleteRideBtn, { backgroundColor: C.dangerBg, marginTop: 12 }]}
            onPress={adminDelete}
            activeOpacity={0.85}
          >
            <Icon name="trash" size={16} color={C.danger} />
            <Text style={[styles.deleteRideTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
              {t.rides2.deleteRideAdmin ?? 'Delete Ride (Admin)'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Standard ContactSheet with in-app messaging fallback */}
      <ContactSheet
        visible={!!contactTarget}
        onClose={() => setContactTarget(null)}
        title={t.rides2.contact ?? 'Contact'}
        name={contactTarget?.name ?? ''}
        phone={contactTarget?.phone}
        inAppChatAction={
          contactTarget?.id
            ? () => {
                const targetId = contactTarget.id!;
                const targetName = contactTarget.name;
                setContactTarget(null);
                navigation.navigate('MessageThread', { kind: 'dm', id: targetId, title: targetName });
              }
            : undefined
        }
      />

      {/* In-App Interactive Route Map Modal */}
      <RideRouteMapModal
        visible={showRouteMap}
        onClose={() => setShowRouteMap(false)}
        origin={ride.origin}
        destination={ride.destination}
        originCoords={originCoords}
        destCoords={destCoords}
        notes={ride.notes}
        fare={ride.fare}
        vehicle={ride.vehicle}
        direction={ride.direction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 14, paddingBottom: 24 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  route: {
    fontSize: 17,
    lineHeight: 24,
  } as TextStyle,
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillTxt: { fontSize: 11 } as TextStyle,
  subTime: {
    fontSize: 12.5,
    marginTop: 6,
  } as TextStyle,

  infoGrid: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 16,
  },
  infoCell: { flex: 1, padding: 12 },
  infoCellLabel: { fontSize: 11, marginBottom: 4 } as TextStyle,
  infoCellTxt: { fontSize: 15 } as TextStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
  } as TextStyle,

  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  driverName: { fontSize: 14.5 } as TextStyle,
  driverDept: { fontSize: 12, marginTop: 2 } as TextStyle,
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  contactTxt: { fontSize: 12.5 } as TextStyle,
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  uberRouteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  uberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  uberCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  microIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uberCardTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as TextStyle,
  proximityBeacon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  proximityTxt: {
    fontSize: 11,
  } as TextStyle,

  routeSpineContainer: {
    position: 'relative',
    paddingLeft: 6,
    paddingRight: 4,
  },
  spineTrackLine: {
    position: 'absolute',
    left: 17,
    top: 14,
    bottom: 24,
    width: 2,
    borderRadius: 1,
  },
  spineStopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  pickupBeaconOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    zIndex: 2,
  },
  pickupBeaconInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropoffBeaconOuter: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    zIndex: 2,
  },
  dropoffBeaconInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  spineStopContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stopMicroTag: {
    fontSize: 10.5,
    letterSpacing: 0.6,
  } as TextStyle,
  zoneBadge: {
    fontSize: 10.5,
  } as TextStyle,
  spineStopTitle: {
    fontSize: 15,
    lineHeight: 20,
  } as TextStyle,
  spineStopSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,

  meetingSpotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
    marginLeft: 3,
  },
  meetingSpotNode: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    zIndex: 2,
  },
  meetingSpotBubble: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  meetingSpotLabel: {
    fontSize: 9.5,
    letterSpacing: 0.5,
    marginBottom: 2,
  } as TextStyle,
  meetingSpotTxt: {
    fontSize: 12.5,
    lineHeight: 17,
  } as TextStyle,

  routeActionWrap: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  routeNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  },
  routeNavBtnTxt: {
    fontSize: 13.5,
  } as TextStyle,

  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dayTxt: { fontSize: 11.5 } as TextStyle,

  emptyRidersTxt: {
    fontSize: 13,
    marginVertical: 4,
  } as TextStyle,
  reqCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  riderName: { fontSize: 13.5 } as TextStyle,
  riderDept: { fontSize: 11, marginTop: 2 } as TextStyle,
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  smallBtnTxt: { fontSize: 11.5 } as TextStyle,
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookedActionBlock: {
    marginTop: 20,
    gap: 12,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  confirmedTxt: { fontSize: 14 } as TextStyle,
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
  },
  whatsappBtnTxt: { fontSize: 15 } as TextStyle,
  cancelSeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  },
  cancelSeatTxt: { fontSize: 14 } as TextStyle,

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
    marginTop: 22,
  },
  actionTxt: { fontSize: 15 } as TextStyle,

  deleteRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
    marginTop: 18,
  },
  deleteRideTxt: { fontSize: 14 } as TextStyle,

  inAppChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
  },
  inAppChatBtnTxt: { fontSize: 15 } as TextStyle,

  ownRideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  ownRideBannerTxt: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  } as TextStyle,
});
