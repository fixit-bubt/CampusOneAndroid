// Matches design screens-b.jsx — Ride Share
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

const RIDE_COLOR = '#6e8b1f';
const RIDE_BG    = '#6e8b1f1e';

interface Ride {
  id: string;
  from_location: string;
  to_location: string;
  ride_date: string;
  ride_time: string;
  vehicle: string;
  fare: number;
  total_seats: number;
  driver_id: string;
  driver_name?: string;
  driver_phone?: string;
  created_at: string;
}

export function RidesScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [takenCounts, setTakenCounts] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [ridesRes, reqRes] = await Promise.all([
      supabase
        .from('rides')
        .select('*, profiles:driver_id(full_name, phone)')
        .gte('ride_date', new Date().toISOString().slice(0, 10))
        .order('ride_date')
        .order('ride_time')
        .limit(30),
      supabase.from('ride_requests').select('ride_id').eq('user_id', user?.id ?? ''),
    ]);
    if (ridesRes.data) {
      const rows = ridesRes.data.map((r: any) => ({
        ...r,
        driver_name: r.profiles?.full_name,
        driver_phone: r.profiles?.phone,
      })) as Ride[];
      setRides(rows);
      // fetch taken counts
      const ids = rows.map(r => r.id);
      if (ids.length > 0) {
        const { data: counts } = await supabase
          .from('ride_requests')
          .select('ride_id')
          .in('ride_id', ids)
          .eq('status', 'accepted');
        const map: Record<string, number> = {};
        (counts ?? []).forEach((c: any) => { map[c.ride_id] = (map[c.ride_id] ?? 0) + 1; });
        setTakenCounts(map);
      }
    }
    if (reqRes.data) setRequestedIds(new Set(reqRes.data.map((r: any) => r.ride_id)));
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function requestRide(rideId: string) {
    if (!user) return;
    await supabase.from('ride_requests').insert({ ride_id: rideId, user_id: user.id });
    setRequestedIds(prev => new Set([...prev, rideId]));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Ride Share"
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

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {rides.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="ride" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>No rides available</Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Tap + to offer a ride
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rides.map(r => {
              const taken = takenCounts[r.id] ?? 0;
              const isRequested = requestedIds.has(r.id);
              const seatsLeft = r.total_seats - taken - (isRequested ? 1 : 0);
              const isFull = seatsLeft <= 0 && !isRequested;

              return (
                <View key={r.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {/* Top */}
                  <View style={styles.cardTop}>
                    <View style={[styles.thumb, { backgroundColor: RIDE_BG }]}>
                      <Icon name="ride" size={22} color={RIDE_COLOR} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {r.from_location} → {r.to_location}
                      </Text>
                      <View style={styles.cardSub}>
                        <Feather name="clock" size={13} color={C.textMuted} />
                        <Text style={[styles.cardSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {r.ride_date} · {r.ride_time} · {r.vehicle}
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
                        {r.driver_name ?? 'Driver'}
                      </Text>
                    </View>
                    <Text style={[styles.seatsLeft, { color: isFull ? C.textMuted : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {isFull ? 'Full' : `${Math.max(seatsLeft, 0)} seats left`}
                    </Text>
                  </View>

                  {/* Action */}
                  {isRequested ? (
                    <View style={[styles.contactCard, { backgroundColor: C.surface2 }]}>
                      <Text style={[styles.contactLabel, { color: '#0e9c8a', fontFamily: FontFamily.jakartaBold }]}>
                        Driver · Contact
                      </Text>
                      <View style={styles.contactRow}>
                        <Feather name="phone" size={15} color={C.textMuted} />
                        <Text style={[styles.contactTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                          {r.driver_phone ?? 'Contact via profile'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.requestBtn, {
                        backgroundColor: isFull ? C.surface2 : RIDE_BG,
                        opacity: isFull ? 0.6 : 1,
                      }]}
                      onPress={() => requestRide(r.id)}
                      disabled={isFull}
                      activeOpacity={0.75}
                    >
                      <Icon name="ride" size={16} color={isFull ? C.textMuted : RIDE_COLOR} />
                      <Text style={[styles.requestTxt, { color: isFull ? C.textMuted : RIDE_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                        {isFull ? 'Ride Full' : 'Request Ride'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
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
