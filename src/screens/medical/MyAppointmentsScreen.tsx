// My Appointments (web parity: MyAppointments view in Medical.jsx).
// Upcoming / Past tabs; upcoming Booked/Confirmed appointments can be
// cancelled (status -> 'Cancelled', releasing the slot).
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';

const MED_COLOR = SectorColors.medical;
const MED_BG = `${SectorColors.medical}1e`;

interface Appt {
  id: string;
  code: string;
  doctor_id: string;
  date: string;
  slot: string;
  token: string | null;
  status: 'Booked' | 'Confirmed' | 'Completed' | 'Cancelled';
  doctors?: { name: string; specialty: string; room: string | null } | null;
}

function apptTone(C: any, status: string): { fg: string; bg: string } {
  switch (status) {
    case 'Confirmed': return { fg: C.success, bg: C.successBg };
    case 'Completed': return { fg: C.textMuted, bg: C.surface2 };
    case 'Cancelled': return { fg: C.danger, bg: C.dangerBg };
    default:          return { fg: C.info, bg: C.infoBg };
  }
}

function fmtSlot(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MyAppointmentsScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    // RLS scopes students to their own appointment rows.
    const { data } = await supabase
      .from('appointments')
      .select('*, doctors(name, specialty, room)')
      .eq('student_id', user.id)
      .order('date', { ascending: false })
      .order('slot', { ascending: true });
    if (data) setAppts(data as Appt[]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function cancelAppt(a: Appt) {
    Alert.alert(t.medical.cancelTitle, t.medical.cancelBody, [
      { text: t.medical.keepBtn, style: 'cancel' },
      {
        text: t.medical.cancelBtn, style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('appointments')
            .update({ status: 'Cancelled' })
            .eq('id', a.id);
          if (error) { Alert.alert(t.common.error, error.message); return; }
          load();
        },
      },
    ]);
  }

  const today = localISO(new Date());
  const isUpcoming = (a: Appt) =>
    a.date >= today && (a.status === 'Booked' || a.status === 'Confirmed');
  const list = appts.filter(a => (tab === 'upcoming' ? isUpcoming(a) : !isUpcoming(a)));
  const upcomingSorted = tab === 'upcoming' ? [...list].reverse() : list;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.medical.myAppointments} onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View style={[styles.tabs, { paddingHorizontal: Layout.screenPadding }]}>
        {([['upcoming', t.medical.upcoming], ['past', t.medical.past]] as const).map(([id, label]) => {
          const on = tab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.tabBtn, on
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setTab(id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
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
        {upcomingSorted.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="medical" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.medical.noAppointments}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {upcomingSorted.map(a => {
              const tone = apptTone(C, a.status);
              const cancellable = isUpcoming(a);
              return (
                <View key={a.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.thumb, { backgroundColor: MED_BG }]}>
                      <Icon name="medical" size={20} color={MED_COLOR} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.docName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {a.doctors?.name ?? 'Doctor'}
                      </Text>
                      <Text style={[styles.docSpec, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {a.doctors?.specialty ?? ''} · {a.date} · {fmtSlot(a.slot)}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.statusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}>
                        {t.medical.apptStatus[a.status] ?? a.status}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cardFoot, { borderTopColor: C.border }]}>
                    {a.token ? (
                      <View style={[styles.tokenPill, { backgroundColor: MED_BG }]}>
                        <Text style={[styles.tokenLabel, { color: MED_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                          {t.medical.token} {a.token}
                        </Text>
                      </View>
                    ) : <View />}
                    {cancellable && (
                      <TouchableOpacity
                        style={[styles.cancelBtn, { backgroundColor: C.dangerBg }]}
                        onPress={() => cancelAppt(a)}
                        activeOpacity={0.75}
                      >
                        <Feather name="x" size={13} color={C.danger} />
                        <Text style={[styles.cancelTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                          {t.common.cancel}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,

  tabs: { flexDirection: 'row', gap: 8, paddingVertical: 10 } as ViewStyle,
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  tabTxt: { fontSize: 13.5 } as TextStyle,

  list: { gap: 10 } as ViewStyle,
  card: { borderRadius: 16, borderWidth: 1, padding: 13 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 } as ViewStyle,
  thumb: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  docName: { fontSize: 14 } as TextStyle,
  docSpec: { fontSize: 11.5, marginTop: 2 } as TextStyle,
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  statusTxt: { fontSize: 11 } as TextStyle,

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
  } as ViewStyle,
  tokenPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 } as ViewStyle,
  tokenLabel: { fontSize: 12 } as TextStyle,
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9 } as ViewStyle,
  cancelTxt: { fontSize: 12 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 8 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as TextStyle,
});
