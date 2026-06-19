// Today's queue — admin-only.
// All of today's appointments sorted by slot; admin advances each one
// Booked -> Confirmed -> Completed as patients arrive and are seen.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

const MED_COLOR = SectorColors.medical;
const MED_BG = `${SectorColors.medical}1e`;

interface QueueAppt {
  id: string;
  date: string;
  slot: string;
  token: string | null;
  status: 'Booked' | 'Confirmed' | 'Completed' | 'Cancelled';
  doctors?: { name: string; specialty: string } | null;
  profiles?: { full_name: string; avatar_url: string | null } | null;
}

function apptTone(C: any, status: string): { fg: string; bg: string } {
  switch (status) {
    case 'Confirmed': return { fg: C.success, bg: C.successBg };
    case 'Completed': return { fg: C.textMuted, bg: C.surface2 };
    case 'Cancelled': return { fg: C.danger, bg: C.dangerBg };
    default:          return { fg: C.info, bg: C.infoBg };
  }
}

function fmtSlot(hhmm: string | null | undefined): string {
  if (!hhmm) return '';
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MedicalQueueScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const [appts, setAppts] = useState<QueueAppt[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Don't fetch every patient's data until the admin role is confirmed.
    if (profile?.role !== 'admin') return;
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctors(name, specialty), profiles:student_id(full_name, avatar_url)')
      .eq('date', localISO(new Date()))
      .neq('status', 'Cancelled')
      .order('slot', { ascending: true });
    if (error) { toast({ type: 'error', title: t.common.error }); return; }
    if (data) setAppts(data as QueueAppt[]);
  }, [profile?.role, toast, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function advance(a: QueueAppt) {
    const next = a.status === 'Booked' ? 'Confirmed' : 'Completed';
    setAdvancing(a.id);
    const { error } = await supabase.from('appointments').update({ status: next }).eq('id', a.id);
    setAdvancing(null);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setAppts(prev => prev.map(x => (x.id === a.id ? { ...x, status: next } : x)));
  }

  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.medical.queueTitle} onBack={() => navigation.goBack()} />
        <View style={styles.empty}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>{t.medical2.accessDenied}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.medical.queueTitle} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {appts.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="medical" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.medical.noQueue}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {appts.map(a => {
              const tone = apptTone(C, a.status);
              return (
                <View key={a.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.tokenBox, { backgroundColor: MED_BG }]}>
                      <Text style={[styles.tokenTxt, { color: MED_COLOR, fontFamily: FontFamily.jakartaExtraBold }]}>
                        {a.token ?? '—'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.nameRow}>
                        <Avatar uri={a.profiles?.avatar_url} name={a.profiles?.full_name} size="xs" />
                        <Text style={[styles.patient, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {a.profiles?.full_name ?? t.medical2.student}
                        </Text>
                      </View>
                      <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {a.doctors?.name ?? ''} · {fmtSlot(a.slot)}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.statusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}>
                        {t.medical.apptStatus[a.status] ?? a.status}
                      </Text>
                    </View>
                  </View>

                  {(a.status === 'Booked' || a.status === 'Confirmed') && (
                    <TouchableOpacity
                      style={[styles.advanceBtn, {
                        backgroundColor: a.status === 'Booked' ? C.infoBg : C.successBg,
                        opacity: advancing === a.id ? 0.6 : 1,
                      }]}
                      onPress={() => advance(a)}
                      disabled={advancing === a.id}
                      activeOpacity={0.75}
                    >
                      <Icon
                        name={a.status === 'Booked' ? 'check' : 'checkAll'}
                        size={15}
                        color={a.status === 'Booked' ? C.info : C.success}
                      />
                      <Text style={[styles.advanceTxt, {
                        color: a.status === 'Booked' ? C.info : C.success,
                        fontFamily: FontFamily.jakartaBold,
                      }]}>
                        {a.status === 'Booked' ? t.medical.confirm : t.medical.complete}
                      </Text>
                    </TouchableOpacity>
                  )}
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
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  list: { gap: 10 } as ViewStyle,
  card: { borderRadius: 16, borderWidth: 1, padding: 13 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 } as ViewStyle,
  tokenBox: { minWidth: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 } as ViewStyle,
  tokenTxt: { fontSize: 15 } as TextStyle,
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 } as ViewStyle,
  patient: { fontSize: 14, flexShrink: 1 } as TextStyle,
  meta: { fontSize: 11.5, marginTop: 3 } as TextStyle,
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  statusTxt: { fontSize: 11 } as TextStyle,

  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 38,
    borderRadius: 11,
    marginTop: 11,
  } as ViewStyle,
  advanceTxt: { fontSize: 13 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 8, flexGrow: 1 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as TextStyle,
});
