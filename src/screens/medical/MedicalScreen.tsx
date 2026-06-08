// Matches design screens-c.jsx — Medical (doctor list)
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

const MED_COLOR = '#e2483d';
const MED_BG    = '#e2483d1e';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  days: string[];
  start_time: string;
  end_time: string;
  room_no: string | null;
  active: boolean;
}

function isOnDuty(doc: Doctor): boolean {
  if (!doc.active) return false;
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  if (!doc.days?.includes(DAY_NAMES[now.getDay()])) return false;
  const [sh = 0, sm = 0] = (doc.start_time ?? '').split(':').map(Number);
  const [eh = 23, em = 59] = (doc.end_time ?? '').split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
}

export function MedicalScreen({ navigation }: any) {
  const { C } = useTheme();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('doctors').select('*').order('name');
    if (data) setDoctors(data as Doctor[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Medical" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {doctors.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="medical" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>No doctors listed</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {doctors.map(d => (
              <TouchableOpacity
                key={d.id}
                style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => navigation.navigate('DoctorDetail', { doctorId: d.id })}
                activeOpacity={0.75}
              >
                <View style={[styles.thumb, { backgroundColor: MED_BG }]}>
                  <Icon name="medical" size={22} color={MED_COLOR} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={[styles.cardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {d.specialty} · {Array.isArray(d.days) ? d.days.join(', ') : ''}
                  </Text>
                  <View style={styles.cardMeta}>
                    {isOnDuty(d) ? (
                      <View style={[styles.dutyPill, { backgroundColor: '#e4f5f4' }]}>
                        <View style={[styles.dutyDot, { backgroundColor: '#0e9c8a' }]} />
                        <Text style={[styles.dutyTxt, { color: '#0e9c8a', fontFamily: FontFamily.jakartaBold }]}>On Duty</Text>
                      </View>
                    ) : (
                      <View style={[styles.dutyPill, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.dutyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {d.start_time} – {d.end_time}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Icon name="chevR" size={18} color={C.textMuted} />
              </TouchableOpacity>
            ))}
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14 } as any,
  cardSub: { fontSize: 12, marginTop: 3 } as any,
  cardMeta: { flexDirection: 'row', marginTop: 6 } as ViewStyle,
  dutyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  dutyDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  dutyTxt: { fontSize: 11 } as any,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
});
