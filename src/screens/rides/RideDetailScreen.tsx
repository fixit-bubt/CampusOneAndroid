import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

const RIDE_COLOR = SectorColors.ride;
const RIDE_BG    = `${SectorColors.ride}1e`;

export function RideDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { rideId } = route.params ?? {};
  const [ride, setRide] = useState<any>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [contact, setContact] = useState<{ whatsapp: string } | null>(null);
  const [requested, setRequested] = useState(false);
  const [takenCount, setTakenCount] = useState(0);
  const [requesters, setRequesters] = useState<{ requester_id: string; full_name: string; whatsapp?: string | null }[]>([]);

  const load = useCallback(async () => {
    if (!rideId) { setLoadFailed(true); return; }
    const [rideRes, reqRes, takenRes, countRes] = await Promise.all([
      supabase
        .from('rides')
        .select('*, profiles:profiles!driver_id(full_name)')
        .eq('id', rideId)
        .maybeSingle(),
      supabase
        .from('ride_requests')
        .select('ride_id')
        .eq('ride_id', rideId)
        .eq('requester_id', user?.id ?? '')
        .maybeSingle(),
      // RLS only returns the driver's own ride rows here; used for requester names.
      supabase
        .from('ride_requests')
        .select('requester_id, profiles:profiles!requester_id(full_name)')
        .eq('ride_id', rideId),
      // Authoritative seat count (row SELECT is restricted, so count via RPC).
      supabase.rpc('ride_request_counts'),
    ]);
    if (rideRes.error) { toast({ type: 'error', title: t.common.error }); setLoadFailed(true); return; }
    if (!rideRes.data) { setLoadFailed(true); return; }
    setRide(rideRes.data);
    setDriverName((rideRes.data as any).profiles?.full_name ?? null);
    if (rideRes.data.driver_id === user?.id && takenRes.data) {
      setRequesters((takenRes.data as any[]).map(r => ({
        requester_id: r.requester_id,
        full_name: r.profiles?.full_name ?? t.rides2.unknown,
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
    }
    const cnt = (countRes.data ?? []).find((c: any) => c.ride_id === rideId);
    setTakenCount(cnt ? Number(cnt.taken) : 0);
  }, [rideId, user?.id, toast, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function revealRequester(requesterId: string) {
    const { data } = await supabase.rpc('ride_contact', {
      p_code:   ride.code,
      p_target: requesterId,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.whatsapp) {
      setRequesters(prev => prev.map(r => (r.requester_id === requesterId ? { ...r, whatsapp: row.whatsapp } : r)));
    } else {
      toast({ type: 'info', title: t.rides2.noContactTitle, message: t.rides2.noContactBody });
    }
  }

  function deleteOwnRide() {
    Alert.alert('Delete this ride?', 'Your seat requests will be discarded.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('rides').delete().eq('id', rideId);
          if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
          navigation.goBack();
        },
      },
    ]);
  }

  async function requestRide() {
    if (!user || requested || !ride) return;
    const { error } = await supabase
      .from('ride_requests')
      .insert({ ride_id: rideId, requester_id: user.id });
    if (!error || error.code === '23505') {
      const isDup = !!error && error.code === '23505';
      setRequested(true);
      // Only count a brand-new request; a duplicate (23505) was already counted.
      if (!isDup) setTakenCount(c => c + 1);
      const { data: c } = await supabase.rpc('ride_contact', {
        p_code:   ride.code,
        p_target: ride.driver_id,
      });
      const row = Array.isArray(c) ? c[0] : c;
      if (row) setContact(row);
    } else {
      toast({ type: 'error', title: 'Error', message: error.message });
    }
  }

  function adminDelete() {
    Alert.alert('Delete ride', 'Remove this ride post permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('rides').delete().eq('id', rideId);
          if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
          navigation.goBack();
        },
      },
    ]);
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
  const departureLabel = ride.date && ride.time ? `${ride.date} ${ride.time}` : ride.date ?? 'N/A';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.rides2.rideDetailTitle} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.thumb, { backgroundColor: RIDE_BG }]}>
            <Icon name="ride" size={28} color={RIDE_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.route, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={2}>
              {ride.origin} → {ride.destination}
            </Text>
            <Text style={[styles.subTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {departureLabel}
            </Text>
          </View>
          <Text style={[styles.fare, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            ৳{ride.fare}
          </Text>
        </View>

        {/* Info grid */}
        <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.infoCell}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.rides2.seatsLeftLabel}</Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {isFull ? t.rides2.full : `${Math.max(seatsLeft, 0)} / ${ride.seats_total}`}
            </Text>
          </View>
          <View style={[styles.infoCell, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.rides2.farePerSeat}</Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              ৳{ride.fare}
            </Text>
          </View>
        </View>

        {/* Driver card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.rides2.driver}</Text>
        <View style={[styles.driverCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar name={driverName ?? undefined} size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.driverName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {driverName ?? t.rides2.unknown}
            </Text>
            {requested && contact?.whatsapp && (
              <View style={styles.contactRow}>
                <Feather name="phone" size={13} color={C.textMuted} />
                <Text style={[styles.contactTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {contact.whatsapp}
                </Text>
              </View>
            )}
            {requested && !contact?.whatsapp && (
              <Text style={[styles.contactTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, marginTop: 4 }]}>
                {t.rides2.requestSentNotified}
              </Text>
            )}
          </View>
        </View>

        {/* Notes + recurring */}
        {ride.notes ? (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.rides2.notes}</Text>
            <View style={[styles.driverCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.contactTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium, fontSize: 13, lineHeight: 19 }]}>
                {ride.notes}
              </Text>
            </View>
          </>
        ) : null}
        {Array.isArray(ride.recurring) && ride.recurring.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.rides2.repeats}</Text>
            <View style={styles.dayRow}>
              {ride.recurring.map((d: string) => (
                <View key={d} style={[styles.dayPill, { backgroundColor: RIDE_BG }]}>
                  <Text style={[styles.dayTxt, { color: RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>{d}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Driver-only: seat requests with contact reveal */}
        {isOwnRide && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.rides2.seatRequests(requesters.length)} ({requesters.length})
            </Text>
            {requesters.length === 0 ? (
              <Text style={[styles.contactTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.rides2.noRequestsYet}
              </Text>
            ) : (
              <View style={[styles.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                {requesters.map((r, i) => (
                  <View key={r.requester_id}>
                    {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }} />}
                    <View style={styles.reqRow}>
                      <Avatar name={r.full_name} size="sm" />
                      <Text style={[styles.driverName, { color: C.text, fontFamily: FontFamily.jakartaBold, flex: 1 }]} numberOfLines={1}>
                        {r.full_name}
                      </Text>
                      {r.whatsapp ? (
                        <Text style={[styles.contactTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                          {r.whatsapp}
                        </Text>
                      ) : (
                        <TouchableOpacity
                          style={[styles.revealBtn, { backgroundColor: C.surface2 }]}
                          onPress={() => revealRequester(r.requester_id)}
                          activeOpacity={0.75}
                        >
                          <Feather name="phone" size={12} color={C.text2} />
                          <Text style={[styles.revealTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.contact}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.dangerBg, marginTop: 16 }]}
              onPress={deleteOwnRide}
              activeOpacity={0.85}
            >
              <Icon name="trash" size={16} color={C.danger} />
              <Text style={[styles.actionTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.deleteMyRide}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Action */}
        {!isOwnRide && (
          requested ? (
            <View style={[styles.requestedBanner, { backgroundColor: C.successBg }]}>
              <Feather name="check-circle" size={17} color={C.success} />
              <Text style={[styles.requestedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                {t.rides2.rideRequestedShown}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, {
                backgroundColor: isFull ? C.surface2 : RIDE_COLOR,
                opacity: isFull ? 0.6 : 1,
              }]}
              onPress={requestRide}
              disabled={isFull}
              activeOpacity={0.85}
            >
              <Icon name="ride" size={17} color={isFull ? C.textMuted : C.white} />
              <Text style={[styles.actionTxt, { color: isFull ? C.textMuted : C.white, fontFamily: FontFamily.jakartaBold }]}>
                {isFull ? t.rides2.rideFull : t.rides2.requestRide}
              </Text>
            </TouchableOpacity>
          )
        )}

        {/* Admin moderation */}
        {!isOwnRide && isAdmin && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.dangerBg, marginTop: 10 }]}
            onPress={adminDelete}
            activeOpacity={0.85}
          >
            <Icon name="trash" size={16} color={C.danger} />
            <Text style={[styles.actionTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.deleteRideAdmin}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  content: { paddingTop: 16, paddingBottom: 20 } as ViewStyle,

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 } as ViewStyle,
  thumb: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  route: { fontSize: 17, lineHeight: 24 } as any,
  subTime: { fontSize: 12, marginTop: 3 } as any,
  fare: { fontSize: 18, flexShrink: 0 } as any,

  infoGrid: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginTop: 16 } as ViewStyle,
  infoCell: { flex: 1, padding: 12 } as ViewStyle,
  infoCellLabel: { fontSize: 11, marginBottom: 4 } as any,
  infoCellTxt: { fontSize: 14 } as any,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 18, marginBottom: 8 } as any,

  driverCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 14, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  driverName: { fontSize: 14 } as any,
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 } as ViewStyle,
  contactTxt: { fontSize: 12 } as any,

  requestedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, marginTop: 18 } as ViewStyle,
  requestedTxt: { fontSize: 13, flex: 1 } as any,

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginTop: 20 } as ViewStyle,
  actionTxt: { fontSize: 15 } as any,

  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 } as ViewStyle,
  dayPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 } as ViewStyle,
  dayTxt: { fontSize: 11.5 } as any,
  reqCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 } as ViewStyle,
  revealBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 } as ViewStyle,
  revealTxt: { fontSize: 11.5 } as any,
});
