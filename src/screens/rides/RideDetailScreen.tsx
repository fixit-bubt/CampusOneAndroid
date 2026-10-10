import { useState, useCallback } from 'react';
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
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchPeople } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { getCache, CacheKeys } from '../../services/cacheService';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { formatPrice, formatDate, formatTime, localToday } from '../../utils/format';
import { openUrl, waHref } from '../../utils/link';

const RIDE_COLOR = SectorColors.ride;
const RIDE_BG    = `${SectorColors.ride}1e`;

const VEHICLE_META: Record<string, { icon: string; label: string }> = {
  Car:      { icon: '🚗', label: 'Car'      },
  CNG:      { icon: '🛺', label: 'CNG'      },
  Bike:     { icon: '🏍️', label: 'Bike'     },
  Rickshaw: { icon: '🚲', label: 'Rickshaw' },
};

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

  function deleteOwnRide() {
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to delete ride.' });
      return;
    }
    Alert.alert(
      t.rides2.deleteOwnTitle ?? 'Delete this ride?',
      t.rides2.deleteOwnBody ?? 'Your seat requests will be discarded.',
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
    if (!user || requested || !ride || actionBusy) return;
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

  function openGoogleMaps() {
    if (!ride) return;
    const query = encodeURIComponent(`${ride.origin}, Dhaka`);
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
  const seatsLeft = (ride.seats_total ?? 0) - takenCount;
  const isFull = seatsLeft <= 0 && !requested;
  const departureText = formatDepartureLabel(ride.date, ride.time, t);
  const vMeta = VEHICLE_META[ride.vehicle] ?? { icon: '🚗', label: ride.vehicle };

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
          <View style={[styles.thumb, { backgroundColor: RIDE_BG }]}>
            <Icon name="ride" size={26} color={RIDE_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.route, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={2}>
              {ride.origin} → {ride.destination}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : C.surface2, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                {ride.vehicle === 'Rickshaw' ? (
                  <MaterialCommunityIcons name="rickshaw" size={13} color={C.text2} />
                ) : (
                  <Text style={{ fontSize: 11 }}>{vMeta.icon}</Text>
                )}
                <Text style={[styles.pillTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {vMeta.label}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: RIDE_BG }]}>
                <Text style={[styles.pillTxt, { color: RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                  {ride.direction === 'To Campus' ? (t.rides2.toCampus ?? 'To Campus') : (t.rides2.fromCampus ?? 'From Campus')}
                </Text>
              </View>
              {ride.code ? (
                <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
                  <Text style={[styles.pillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {ride.code}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.subTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              🕒 {departureText}
            </Text>
          </View>
        </View>

        {/* Info grid */}
        <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.infoCell}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.rides2.seatsLeftLabel}
            </Text>
            <Text style={[styles.infoCellTxt, { color: isFull ? C.danger : C.text, fontFamily: FontFamily.jakartaBold }]}>
              {isFull ? (t.rides2.full ?? 'Full') : `${Math.max(seatsLeft, 0)} / ${ride.seats_total}`}
            </Text>
          </View>
          <View style={[styles.infoCell, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.rides2.farePerSeat}
            </Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {formatPrice(ride.fare)}
            </Text>
          </View>
        </View>

        {/* Driver Section */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.rides2.driver ?? 'DRIVER'}
        </Text>
        <View style={[styles.driverCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar name={driverInfo?.full_name} size="md" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.driverName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {driverInfo?.full_name ?? (t.rides2.unknown ?? 'Driver')}
            </Text>
            {driverInfo?.department ? (
              <Text style={[styles.driverDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                {driverInfo.department}
              </Text>
            ) : null}
            {requested && contact?.whatsapp ? (
              <View style={styles.contactRow}>
                <Feather name="phone" size={13} color={C.textMuted} />
                <Text style={[styles.contactTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                  {contact.whatsapp}
                </Text>
              </View>
            ) : null}
          </View>

          {/* If requested and contact available, direct action */}
          {requested && contact?.whatsapp ? (
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: C.successBg }]}
              onPress={() => setContactTarget({ name: driverInfo?.full_name ?? (t.rides2.driverFallback ?? 'Driver'), phone: contact.whatsapp, id: ride.driver_id })}
              activeOpacity={0.8}
            >
              <Feather name="phone" size={15} color={C.success} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Pickup & Maps Button */}
        <View style={styles.mapsRow}>
          <TouchableOpacity
            style={[styles.mapsBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={openGoogleMaps}
            activeOpacity={0.75}
          >
            <Feather name="map-pin" size={14} color={C.brand} />
            <Text style={[styles.mapsBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              {t.rides2.openInMaps ?? 'Open in Maps'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notes (if present) */}
        {ride.notes ? (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.rides2.notes ?? 'NOTES'}
            </Text>
            <View style={[styles.notesCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.notesTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {ride.notes}
              </Text>
            </View>
          </>
        ) : null}

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

        {/* Driver Section: Seat Requesters */}
        {isOwnRide && (
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
        )}

        {/* Passenger Booking Actions */}
        {!isOwnRide && (
          requested ? (
            <View style={styles.bookedActionBlock}>
              <View style={[styles.confirmedBanner, { backgroundColor: C.successBg }]}>
                <Feather name="check-circle" size={18} color={C.success} />
                <Text style={[styles.confirmedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                  {t.rides2.seatBooked ?? 'Seat Reserved'}
                </Text>
              </View>

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

  mapsRow: {
    marginTop: 10,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  mapsBtnTxt: { fontSize: 13 } as TextStyle,

  notesCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  notesTxt: {
    fontSize: 13,
    lineHeight: 19,
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
    gap: 10,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  confirmedTxt: { fontSize: 14 } as TextStyle,
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  whatsappBtnTxt: { fontSize: 14 } as TextStyle,
  cancelSeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelSeatTxt: { fontSize: 13.5 } as TextStyle,

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 22,
  },
  actionTxt: { fontSize: 15 } as TextStyle,

  deleteRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    marginTop: 18,
  },
  deleteRideTxt: { fontSize: 14 } as TextStyle,
});
