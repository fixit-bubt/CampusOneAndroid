// Matches design screens-a.jsx — BusDetail
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors, darken } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { BusRoute } from '../../types/database';

export function BusDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { id } = route.params;
  const [busRoute, setBusRoute] = useState<BusRoute | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('bus_routes').select('*').eq('id', id).single();
      if (data) setBusRoute(data as BusRoute);
    })();
  }, [id]);

  if (!busRoute) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Bus Schedule" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  function nextDeparture(): string {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcoming = (busRoute?.to_departures ?? []).find(d => d > hhmm);
    return upcoming ?? (busRoute?.to_departures ?? [])[0] ?? '--:--';
  }

  const next = nextDeparture();
  const stops = busRoute.stops;
  const legs = (busRoute?.leg_mins ?? []);

  let cumulative = 0;
  const rows = stops.map((s, i) => {
    if (i > 0) cumulative += (legs[i - 1] ?? 0);
    return { stop: s, mins: cumulative };
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={busRoute.name} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Next departure card */}
        <LinearGradient
          colors={[SectorColors.bus, darken(SectorColors.bus)]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.nextCard}
        >
          <View style={styles.nextIcon}>
            <Icon name="clock" size={24} color="#fff" />
          </View>
          <View>
            <Text style={[styles.nextLabel, { fontFamily: FontFamily.jakartaMedium }]}>Next departure</Text>
            <Text style={[styles.nextTime, { fontFamily: FontFamily.jakartaExtraBold }]}>{next}</Text>
          </View>
        </LinearGradient>

        {/* Timetable section */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          TIMETABLE
        </Text>
        <View style={[styles.timetable, { backgroundColor: C.surface, borderColor: C.border }]}>
          {rows.map((row, i) => (
            <View key={i} style={styles.stopRow}>
              {/* Track dot */}
              <View style={styles.trackCol}>
                <View style={[
                  styles.trackDot,
                  (i === 0 || i === rows.length - 1)
                    ? { backgroundColor: SectorColors.bus, borderColor: SectorColors.bus }
                    : { backgroundColor: C.surface, borderColor: SectorColors.bus },
                ]} />
                {i < rows.length - 1 && <View style={[styles.trackLine, { backgroundColor: C.border }]} />}
              </View>
              <View style={styles.stopInfo}>
                <Text style={[styles.stopName, { color: C.text, fontFamily: i === rows.length - 1 ? FontFamily.jakartaExtraBold : FontFamily.jakartaSemiBold }]}>
                  {row.stop}
                </Text>
              </View>
              <Text style={[styles.stopMins, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                +{row.mins} min
              </Text>
            </View>
          ))}
        </View>

        {/* Departures */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          TO CAMPUS
        </Text>
        <View style={[styles.depsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.depsGrid}>
            {busRoute.to_departures.map((dep, i) => (
              <View key={i} style={[styles.depChip, { backgroundColor: C.surface2 }]}>
                <Text style={[styles.depTime, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{dep}</Text>
              </View>
            ))}
          </View>
        </View>

        {busRoute.from_departures.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              FROM CAMPUS
            </Text>
            <View style={[styles.depsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.depsGrid}>
                {busRoute.from_departures.map((dep, i) => (
                  <View key={i} style={[styles.depChip, { backgroundColor: C.surface2 }]}>
                    <Text style={[styles.depTime, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{dep}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
  } as ViewStyle,

  nextIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  nextLabel: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.9)',
  } as any,

  nextTime: {
    fontSize: 17,
    color: '#fff',
  } as any,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 9,
  } as any,

  timetable: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
  } as ViewStyle,

  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
    paddingHorizontal: 16,
    paddingVertical: 11,
  } as ViewStyle,

  trackCol: {
    width: 26,
    alignItems: 'center',
  } as ViewStyle,

  trackDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2.5,
    marginTop: 2,
  } as ViewStyle,

  trackLine: {
    width: 2,
    height: 24,
    marginTop: 2,
  } as ViewStyle,

  stopInfo: { flex: 1 } as ViewStyle,

  stopName: { fontSize: 14.5 } as any,

  stopMins: {
    fontSize: 13,
    flexShrink: 0,
  } as any,

  depsCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,

  depsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,

  depChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  } as ViewStyle,

  depTime: { fontSize: 13 } as any,
});
