import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, type ViewStyle,
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
import { FontFamily, Layout , SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../utils/format';
import { useAuth } from '../../store/authStore';
import type { Ride as RideRow } from '../../types/database';

const RIDE_COLOR = SectorColors.ride;
const RIDE_BG    = `${SectorColors.ride}1e`;

// Schema-derived row + the joined driver name the list query flattens in.
type Ride = RideRow & { driver_name?: string };

export function RidesScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [takenCounts, setTakenCounts] = useState<Record<string, number>>({});
  const [direction, setDirection] = useState<'all' | 'to' | 'from'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Prune expired rides server-side before listing.
    await supabase.rpc('delete_expired_rides').then(() => {}, () => {});
    const [ridesRes, reqRes, countRes] = await Promise.all([
      supabase
        .from('rides')
        .select('*, profiles:profiles!driver_id(full_name)')
        .gte('date', localToday())
        .order('date')
        .order('time')
        .limit(30),
      supabase.from('ride_requests').select('ride_id').eq('requester_id', user?.id ?? ''),
      // Row SELECT on ride_requests is restricted; aggregate seat counts come from this RPC.
      supabase.rpc('ride_request_counts'),
    ]);
    if (ridesRes.error) {
      toast({ type: 'error', title: t.common.error });
      setLoading(false);
      return;
    }
    const rows = (ridesRes.data ?? []).map((r: any) => ({
      ...r,
      driver_name: r.profiles?.full_name,
    })) as Ride[];
    setRides(rows);
    const map: Record<string, number> = {};
    (countRes.data ?? []).forEach((c: any) => { map[c.ride_id] = Number(c.taken); });
    setTakenCounts(map);
    if (reqRes.data) setRequestedIds(new Set(reqRes.data.map((r: any) => r.ride_id)));
    setLoading(false);
  }, [user?.id, toast, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function requestRide(rideId: string) {
    if (!user) return;
    if (requestedIds.has(rideId)) return;
    const { error } = await supabase.from('ride_requests').insert({ ride_id: rideId, requester_id: user.id });
    if (error && error.code !== '23505') {
      toast({ type: 'error', title: t.common.error });
      return;
    }
    setRequestedIds(prev => new Set([...prev, rideId]));
    // Mirror the detail screen: a brand-new request takes a seat (skip on duplicate).
    if (!error) setTakenCounts(prev => ({ ...prev, [rideId]: (prev[rideId] ?? 0) + 1 }));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.rides2.rideShareTitle}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('RidePost')}
            activeOpacity={0.75}
          >
            <Feather name="plus" size={22} color={C.text} />
          </TouchableOpacity>
        }
      />

      {/* Direction filter */}
      <View style={[styles.dirRow, { paddingHorizontal: Layout.screenPadding }]}>
        {([['all', t.common.all], ['to', t.rides2.toCampus], ['from', t.rides2.fromCampus]] as const).map(([id, label]) => {
          const on = direction === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.dirChip, on
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setDirection(id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dirTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {(() => {
          // chip id ('to'/'from') -> stored direction value ('To Campus'/'From Campus')
          const want = direction === 'to' ? 'To Campus' : 'From Campus';
          const filteredRides = direction === 'all' ? rides : rides.filter(r => r.direction === want);
          if (loading && rides.length === 0) {
            return <ActivityIndicator style={{ marginTop: 60 }} color={C.brand} />;
          }
          return filteredRides.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="ride" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.noRidesTitle}</Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.rides2.noRidesSub}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredRides.map(r => {
              const taken = takenCounts[r.id] ?? 0;
              const isRequested = requestedIds.has(r.id);
              const isOwnRide = r.driver_id === user?.id;
              const seatsLeft = r.seats_total - taken;
              const isFull = seatsLeft <= 0 && !isRequested;
              const departureLabel = r.date && r.time ? `${r.date} ${r.time}` : r.date ?? '';

              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('RideDetail', { rideId: r.id })}
                  activeOpacity={0.85}
                >
                  {/* Top */}
                  <View style={styles.cardTop}>
                    <View style={[styles.thumb, { backgroundColor: RIDE_BG }]}>
                      <Icon name="ride" size={22} color={RIDE_COLOR} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {r.origin} → {r.destination}
                      </Text>
                      <View style={styles.cardSub}>
                        <Feather name="clock" size={13} color={C.textMuted} />
                        <Text style={[styles.cardSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {departureLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.fare, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      ৳{r.fare}
                    </Text>
                  </View>

                  {/* Meta */}
                  <View style={styles.cardMeta}>
                    <View style={styles.driverRow}>
                      <Avatar name={r.driver_name} size="xs" />
                      <Text style={[styles.driverName, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {r.driver_name ?? t.rides2.driverFallback}
                      </Text>
                    </View>
                    <Text style={[styles.seatsLeft, { color: isFull ? C.textMuted : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {isFull ? t.rides2.full : `${Math.max(seatsLeft, 0)} ${t.rides2.seatsLeftCount(Math.max(seatsLeft, 0))}`}
                    </Text>
                  </View>

                  {/* Action — hide for own ride */}
                  {!isOwnRide && (
                    isRequested ? (
                      <View style={[styles.contactCard, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.contactLabel, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                          {t.rides2.requestSent}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.requestBtn, {
                          backgroundColor: isFull ? C.surface2 : RIDE_BG,
                          opacity: isFull ? 0.6 : 1,
                        }]}
                        onPress={(e) => { e.stopPropagation?.(); requestRide(r.id); }}
                        disabled={isFull}
                        activeOpacity={0.75}
                      >
                        <Icon name="ride" size={16} color={isFull ? C.textMuted : RIDE_COLOR} />
                        <Text style={[styles.requestTxt, { color: isFull ? C.textMuted : RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                          {isFull ? t.rides2.rideFull : t.rides2.requestRide}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
        })()}
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
  dirRow: { flexDirection: 'row', gap: 7, paddingVertical: 8 } as ViewStyle,
  dirChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  dirTxt: { fontSize: 12 } as any,
  list: { gap: 11 } as ViewStyle,
  card: { padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 13 } as ViewStyle,
  thumb: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14 } as any,
  cardSub: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 } as ViewStyle,
  cardSubTxt: { fontSize: 12 } as any,
  fare: { fontSize: 15, flexShrink: 0 } as any,
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 } as ViewStyle,
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  driverName: { fontSize: 12 } as any,
  seatsLeft: { fontSize: 12 } as any,
  contactCard: { padding: 11, borderRadius: 12, gap: 6, marginTop: 12 } as ViewStyle,
  contactLabel: { fontSize: 11 } as any,
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 7 } as ViewStyle,
  contactTxt: { fontSize: 13 } as any,
  requestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 12, marginTop: 12 } as ViewStyle,
  requestTxt: { fontSize: 13 } as any,
  iconBtn: { padding: 8 } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13 } as any,
});
