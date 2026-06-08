// RideDetailScreen — full ride details with request button
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, type ViewStyle,
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

export function RideDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const { rideId } = route.params;
  const [ride, setRide] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [requested, setRequested] = useState(false);
  const [takenCount, setTakenCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [rideRes, reqRes, takenRes] = await Promise.all([
        supabase
          .from('ride_shares')
          .select('*, profiles:driver_id(full_name, email, whatsapp)')
          .eq('id', rideId)
          .single(),
        supabase
          .from('ride_requests')
          .select('ride_id')
          .eq('ride_id', rideId)
          .eq('requester_id', user?.id ?? '')
          .maybeSingle(),
        supabase
          .from('ride_requests')
          .select('ride_id')
          .eq('ride_id', rideId),
      ]);
      if (rideRes.data) {
        setRide(rideRes.data);
        setDriver(rideRes.data.profiles);
      }
      setRequested(!!reqRes.data);
      setTakenCount(takenRes.data?.length ?? 0);
    })();
  }, [rideId, user?.id]);

  async function requestRide() {
    if (!user || requested) return;
    const { error } = await supabase
      .from('ride_requests')
      .insert({ ride_id: rideId, requester_id: user.id });
    if (!error) {
      setRequested(true);
      setTakenCount(c => c + 1);
    }
  }

  if (!ride) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Ride Detail" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  const isOwnRide = ride.driver_id === user?.id;
  const seatsLeft = (ride.seats_available ?? 0) - takenCount;
  const isFull = seatsLeft <= 0 && !requested;
  const departureLabel = ride.departure_time
    ? new Date(ride.departure_time).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'N/A';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Ride Detail" onBack={() => navigation.goBack()} />
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
              {ride.from_location} → {ride.to_location}
            </Text>
            <Text style={[styles.subTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {departureLabel}
            </Text>
          </View>
          <Text style={[styles.fare, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            ৳{ride.price_per_seat}
          </Text>
        </View>

        {/* Info grid */}
        <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.infoCell}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Seats left</Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {isFull ? 'Full' : `${Math.max(seatsLeft, 0)} / ${ride.seats_available}`}
            </Text>
          </View>
          <View style={[styles.infoCell, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Fare/seat</Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              ৳{ride.price_per_seat}
            </Text>
          </View>
        </View>

        {/* Driver card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>DRIVER</Text>
        <View style={[styles.driverCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar name={driver?.full_name} size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.driverName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {driver?.full_name ?? 'Unknown'}
            </Text>
            {requested && driver?.whatsapp && (
              <View style={styles.contactRow}>
                <Feather name="phone" size={13} color={C.textMuted} />
                <Text style={[styles.contactTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {driver.whatsapp}
                </Text>
              </View>
            )}
            {requested && driver?.email && (
              <View style={styles.contactRow}>
                <Feather name="mail" size={13} color={C.textMuted} />
                <Text style={[styles.contactTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {driver.email}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action */}
        {!isOwnRide && (
          requested ? (
            <View style={[styles.requestedBanner, { backgroundColor: '#e4f5f4' }]}>
              <Feather name="check-circle" size={17} color='#0e9c8a' />
              <Text style={[styles.requestedTxt, { color: '#0e9c8a', fontFamily: FontFamily.jakartaBold }]}>
                Ride requested — contact details shown above
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
              <Icon name="ride" size={17} color={isFull ? C.textMuted : '#fff'} />
              <Text style={[styles.actionTxt, { color: isFull ? C.textMuted : '#fff', fontFamily: FontFamily.jakartaBold }]}>
                {isFull ? 'Ride Full' : 'Request Ride'}
              </Text>
            </TouchableOpacity>
          )
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
});
