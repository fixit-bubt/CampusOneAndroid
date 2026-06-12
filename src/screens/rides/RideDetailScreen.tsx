// RideDetailScreen — full ride details with request button
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
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
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { rideId } = route.params;
  const [ride, setRide] = useState<any>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [contact, setContact] = useState<{ whatsapp: string } | null>(null);
  const [requested, setRequested] = useState(false);
  const [takenCount, setTakenCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [rideRes, reqRes, takenRes] = await Promise.all([
        supabase
          .from('rides')
          .select('*, profiles:driver_id(full_name)')
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
        setDriverName((rideRes.data as any).profiles?.full_name ?? null);
      }
      if (reqRes.data && rideRes.data) {
        setRequested(true);
        const { data: c } = await supabase.rpc('ride_contact', {
          p_code:   rideRes.data.code,
          p_target: rideRes.data.driver_id,
        });
        const row = Array.isArray(c) ? c[0] : c;
        if (row) setContact(row);
      }
      setTakenCount(takenRes.data?.length ?? 0);
    })();
  }, [rideId, user?.id]);

  async function requestRide() {
    if (!user || requested || !ride) return;
    const { error } = await supabase
      .from('ride_requests')
      .insert({ ride_id: rideId, requester_id: user.id });
    if (!error) {
      setRequested(true);
      setTakenCount(c => c + 1);
      const { data: c } = await supabase.rpc('ride_contact', {
        p_code:   ride.code,
        p_target: ride.driver_id,
      });
      const row = Array.isArray(c) ? c[0] : c;
      if (row) setContact(row);
    }
  }

  function adminDelete() {
    Alert.alert('Delete ride', 'Remove this ride post permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('rides').delete().eq('id', rideId);
          if (error) { Alert.alert('Error', error.message); return; }
          navigation.goBack();
        },
      },
    ]);
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
  const seatsLeft = (ride.seats_total ?? 0) - takenCount;
  const isFull = seatsLeft <= 0 && !requested;
  const departureLabel = ride.date && ride.time ? `${ride.date} ${ride.time}` : ride.date ?? 'N/A';

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
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Seats left</Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {isFull ? 'Full' : `${Math.max(seatsLeft, 0)} / ${ride.seats_total}`}
            </Text>
          </View>
          <View style={[styles.infoCell, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Fare/seat</Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              ৳{ride.fare}
            </Text>
          </View>
        </View>

        {/* Driver card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>DRIVER</Text>
        <View style={[styles.driverCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar name={driverName ?? undefined} size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.driverName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {driverName ?? 'Unknown'}
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
                Request sent — driver will be notified
              </Text>
            )}
          </View>
        </View>

        {/* Action */}
        {!isOwnRide && (
          requested ? (
            <View style={[styles.requestedBanner, { backgroundColor: C.successBg }]}>
              <Feather name="check-circle" size={17} color={C.success} />
              <Text style={[styles.requestedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
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

        {/* Admin moderation */}
        {!isOwnRide && isAdmin && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.dangerBg, marginTop: 10 }]}
            onPress={adminDelete}
            activeOpacity={0.85}
          >
            <Icon name="trash" size={16} color={C.danger} />
            <Text style={[styles.actionTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>Delete ride (admin)</Text>
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
});
