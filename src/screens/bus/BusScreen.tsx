// Matches design screens-a.jsx — Bus routes list
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { BusRoute } from '../../types/database';

const BUS_COLOR = '#e08a2b';
const BUS_BG    = '#e08a2b1e';

export function BusScreen({ navigation }: any) {
  const { C } = useTheme();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('bus_routes')
      .select('*')
      .eq('active', true)
      .order('name');
    if (data) setRoutes(data as BusRoute[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function nextDeparture(route: BusRoute): string {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcoming = route.to_departures.find(d => d > hhmm);
    return upcoming ?? route.to_departures[0] ?? '--:--';
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Bus Schedule" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {routes.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bus" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>No routes available</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {routes.map(r => {
              const next = nextDeparture(r);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('BusDetail', { id: r.id })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.thumb, { backgroundColor: BUS_BG }]}>
                    <Icon name="bus" size={22} color={BUS_COLOR} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={[styles.cardStops, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                      {r.stops.length} stops
                    </Text>
                    <View style={styles.cardMeta}>
                      <View style={[styles.timePill, { backgroundColor: '#fbefdb' }]}>
                        <View style={[styles.timeDot, { backgroundColor: BUS_COLOR }]} />
                        <Text style={[styles.timeTxt, { color: BUS_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                          Next: {next}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Icon name="chevR" size={18} color={C.textMuted} />
                </TouchableOpacity>
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
  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14 } as any,
  cardStops: { fontSize: 12, marginTop: 3 } as any,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 } as ViewStyle,
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  timeDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  timeTxt: { fontSize: 11 } as any,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
});
