// Matches design screens-c.jsx — Prayer times
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';

const PRAYER_GREEN = '#1f8a5b';

interface PrayerTime {
  id: string;
  name: string;
  azan: string;
  jamaat: string;
  is_next: boolean;
  sort_order: number;
}

function timeUntil(timeStr: string): string {
  const [hh, mm] = timeStr.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return '';
  const now = new Date();
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const diff = Math.floor((target.getTime() - now.getTime()) / 60000);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function PrayerScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('prayer_times')
      .select('*')
      .order('sort_order');
    if (data) setPrayers(data as PrayerTime[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const next = prayers.find(p => p.is_next);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Prayer Times" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Next prayer card */}
        {next && (
          <LinearGradient
            colors={['#1f8a5b', '#14613f']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.nextCard}
          >
            <Text style={[styles.nextLabel, { fontFamily: FontFamily.jakartaSemiBold }]}>Next Prayer</Text>
            <View style={styles.nextRow}>
              <Text style={[styles.nextName, { fontFamily: FontFamily.jakartaExtraBold }]}>{next.name}</Text>
              <Text style={[styles.nextIn, { fontFamily: FontFamily.jakartaBold }]}>
                in {timeUntil(next.azan)}
              </Text>
            </View>
            <Text style={[styles.nextTimes, { fontFamily: FontFamily.jakartaSemiBold }]}>
              Azan {next.azan} · Jamaat {next.jamaat}
            </Text>
          </LinearGradient>
        )}

        {/* Timetable */}
        <View style={[styles.tableCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {/* Header row */}
          <View style={styles.tableHeader}>
            <View style={{ flex: 1 }} />
            <Text style={[styles.colLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>Azan</Text>
            <Text style={[styles.colLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>Jamaat</Text>
          </View>

          {prayers.map((p, i) => {
            const isNext = p.is_next;
            const rowBg = isNext
              ? (isDark ? `${PRAYER_GREEN}24` : `${PRAYER_GREEN}12`)
              : 'transparent';
            return (
              <View key={p.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={[styles.tableRow, { backgroundColor: rowBg }]}>
                  <Text style={[
                    styles.prayerName,
                    {
                      color: isNext ? PRAYER_GREEN : C.text,
                      fontFamily: isNext ? FontFamily.jakartaExtraBold : FontFamily.jakartaBold,
                      flex: 1,
                    },
                  ]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.timeVal, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{p.azan}</Text>
                  <Text style={[styles.timeVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{p.jamaat}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,

  nextCard: {
    padding: 16,
    borderRadius: 18,
  } as ViewStyle,

  nextLabel: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.9)',
  } as any,

  nextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 4,
  } as ViewStyle,

  nextName: {
    fontSize: 26,
    color: '#fff',
  } as any,

  nextIn: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
  } as any,

  nextTimes: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  } as any,

  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 14,
  } as ViewStyle,

  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  } as ViewStyle,

  colLabel: {
    width: 70,
    textAlign: 'right',
    fontSize: 11,
    letterSpacing: 0.6,
  } as any,

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  } as ViewStyle,

  prayerName: { fontSize: 15 } as any,

  timeVal: {
    width: 70,
    textAlign: 'right',
    fontSize: 14,
  } as any,

  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
});
