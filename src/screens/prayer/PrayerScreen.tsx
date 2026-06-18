import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert,
  StyleSheet, RefreshControl, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout , SectorColors, darken } from '../../theme';
import { supabase } from '../../lib/supabase';

const PRAYER_GREEN = SectorColors.prayer;

// Sehri/Iftar strip shown during Ramadan. Sehri ends at Fajr azan; Iftar at Maghrib.
const SHOW_RAMADAN_STRIP = true;

interface PrayerTime {
  key: string;
  en: string;
  ar: string;
  azan: string;
  jamaat: string;
  sort: number;
}

interface Musallah {
  id: string;
  name: string;
  floor_desc: string | null;
  sort: number | null;
}

function computeNext(prayers: PrayerTime[]): PrayerTime | undefined {
  const now = new Date();
  const isToday = (p: PrayerTime) => p.key !== 'jummah' || now.getDay() === 5;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return prayers.find(p => {
    if (!isToday(p)) return false;
    const [h = 0, m = 0] = p.azan.split(':').map(Number);
    return h * 60 + m > nowMins;
  });
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
  const toast = useToast();
  const t = useT();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [musallah, setMusallah] = useState<Musallah[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'today' | 'month'>('today');
  const [editPrayer, setEditPrayer] = useState<PrayerTime | null>(null);
  const [jamaatInput, setJamaatInput] = useState('');
  const [musEdit, setMusEdit] = useState<{ id: string | null; name: string; floor_desc: string } | null>(null);

  const load = useCallback(async () => {
    const [{ data }, { data: mus }] = await Promise.all([
      supabase.from('prayer_times').select('*').order('sort'),
      supabase.from('musallah_locations').select('*').order('sort'),
    ]);
    if (data) setPrayers(data as PrayerTime[]);
    if (mus) setMusallah(mus as Musallah[]);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function saveJamaat() {
    if (!editPrayer) return;
    if (!/^\d{1,2}:\d{2}$/.test(jamaatInput.trim())) { toast({ type: 'error', title: t.prayer2.invalid, message: t.prayer2.invalidTime }); return; }
    const { error } = await supabase
      .from('prayer_times')
      .update({ jamaat: jamaatInput.trim() })
      .eq('key', editPrayer.key);
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setEditPrayer(null);
    load();
  }

  async function saveMusallah() {
    if (!musEdit || !musEdit.name.trim()) return;
    if (musEdit.id) {
      const { error } = await supabase
        .from('musallah_locations')
        .update({ name: musEdit.name.trim(), floor_desc: musEdit.floor_desc.trim() })
        .eq('id', musEdit.id);
      if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    } else {
      const { error } = await supabase
        .from('musallah_locations')
        .insert({ name: musEdit.name.trim(), floor_desc: musEdit.floor_desc.trim(), sort: musallah.length + 1 });
      if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    }
    setMusEdit(null);
    load();
  }

  function deleteMusallah(m: Musallah) {
    Alert.alert('Delete location', `Remove "${m.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('musallah_locations').delete().eq('id', m.id);
          if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
          load();
        },
      },
    ]);
  }

  const next = computeNext(prayers);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.prayer2.prayerTimes} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Empty state */}
        {prayers.length === 0 && !refreshing && (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              No prayer times available
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Pull down to refresh
            </Text>
          </View>
        )}

        {/* Next prayer card */}
        {next && (
          <LinearGradient
            colors={[SectorColors.prayer, darken(SectorColors.prayer)]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.nextCard}
          >
            <Text style={[styles.nextLabel, { fontFamily: FontFamily.jakartaSemiBold }]}>{t.prayer2.nextPrayer}</Text>
            <View style={styles.nextRow}>
              <Text style={[styles.nextName, { fontFamily: FontFamily.jakartaExtraBold }]}>{next.en}</Text>
              <Text style={[styles.nextIn, { fontFamily: FontFamily.jakartaBold }]}>
                in {timeUntil(next.azan)}
              </Text>
            </View>
            <Text style={[styles.nextTimes, { fontFamily: FontFamily.jakartaSemiBold }]}>
              Azan {next.azan} · Jamaat {next.jamaat}
            </Text>
          </LinearGradient>
        )}

        {/* Ramadan strip */}
        {SHOW_RAMADAN_STRIP && prayers.length > 0 && (
          <View style={[styles.ramadanStrip, { backgroundColor: isDark ? `${PRAYER_GREEN}24` : `${PRAYER_GREEN}14` }]}>
            <View style={styles.ramadanCell}>
              <Text style={[styles.ramadanLbl, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.prayer2.sehriEnds}</Text>
              <Text style={[styles.ramadanVal, { color: PRAYER_GREEN, fontFamily: FontFamily.jakartaExtraBold }]}>
                {prayers.find(p => p.key === 'fajr')?.azan ?? '—'}
              </Text>
            </View>
            <View style={[styles.ramadanDiv, { backgroundColor: `${PRAYER_GREEN}44` }]} />
            <View style={styles.ramadanCell}>
              <Text style={[styles.ramadanLbl, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.prayer2.iftar}</Text>
              <Text style={[styles.ramadanVal, { color: PRAYER_GREEN, fontFamily: FontFamily.jakartaExtraBold }]}>
                {prayers.find(p => p.key === 'maghrib')?.azan ?? '—'}
              </Text>
            </View>
          </View>
        )}

        {/* Today / Month toggle */}
        <View style={styles.viewToggle}>
          {([['today', t.prayer2.today], ['month', t.prayer2.month]] as const).map(([id, label]) => {
            const on = view === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.viewChip, on
                  ? { backgroundColor: PRAYER_GREEN, borderColor: PRAYER_GREEN }
                  : { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setView(id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.viewChipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Month table — campus runs a fixed timetable, so every day shares
            the same times; today's row is highlighted. */}
        {view === 'month' && (
          <View style={[styles.tableCard, { backgroundColor: C.surface, borderColor: C.border, marginTop: 0 }]}>
            <View style={[styles.monthRow, { paddingVertical: 10 }]}>
              <Text style={[styles.monthDayCol, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, fontSize: 10.5 }]}>{t.prayer2.dayCol}</Text>
              {prayers.filter(p => p.key !== 'jummah').map(p => (
                <Text key={p.key} style={[styles.monthCol, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, fontSize: 10.5 }]}>
                  {p.en.slice(0, 3).toUpperCase()}
                </Text>
              ))}
            </View>
            {(() => {
              const now = new Date();
              const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const rows = [];
              for (let d = 1; d <= daysInMonth; d++) {
                const isToday = d === now.getDate();
                rows.push(
                  <View key={d}>
                    <View style={[styles.divider, { backgroundColor: C.border }]} />
                    <View style={[styles.monthRow, isToday && { backgroundColor: isDark ? `${PRAYER_GREEN}24` : `${PRAYER_GREEN}12` }]}>
                      <Text style={[styles.monthDayCol, {
                        color: isToday ? PRAYER_GREEN : C.text,
                        fontFamily: isToday ? FontFamily.jakartaExtraBold : FontFamily.jakartaBold,
                      }]}>
                        {d}
                      </Text>
                      {prayers.filter(p => p.key !== 'jummah').map(p => (
                        <Text key={p.key} style={[styles.monthCol, {
                          color: isToday ? C.text : C.text2,
                          fontFamily: FontFamily.jakartaMedium,
                        }]}>
                          {p.azan}
                        </Text>
                      ))}
                    </View>
                  </View>
                );
              }
              return rows;
            })()}
          </View>
        )}

        {/* Timetable */}
        {view === 'today' && (
        <View style={[styles.tableCard, { backgroundColor: C.surface, borderColor: C.border, marginTop: 0 }]}>
          {/* Header row */}
          <View style={styles.tableHeader}>
            <View style={{ flex: 1 }} />
            <Text style={[styles.colLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.prayer2.azan}</Text>
            <Text style={[styles.colLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.prayer2.jamaat}</Text>
          </View>

          {prayers.map((p, i) => {
            const isNext = p === next;
            const rowBg = isNext
              ? (isDark ? `${PRAYER_GREEN}24` : `${PRAYER_GREEN}12`)
              : 'transparent';
            return (
              <View key={p.key}>
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
                    {p.en}
                  </Text>
                  <Text style={[styles.timeVal, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{p.azan}</Text>
                  {isAdmin ? (
                    <TouchableOpacity
                      style={{ width: 70, alignItems: 'flex-end' }}
                      onPress={() => { setJamaatInput(p.jamaat); setEditPrayer(p); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeVal, { width: undefined, color: PRAYER_GREEN, fontFamily: FontFamily.jakartaBold, textDecorationLine: 'underline' }]}>
                        {p.jamaat}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.timeVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{p.jamaat}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        )}

        {/* Musallah locations */}
        <View style={styles.musHeader}>
          <Text style={[styles.musTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.prayer2.musallahLocations}</Text>
          {isAdmin && (
            <TouchableOpacity onPress={() => setMusEdit({ id: null, name: '', floor_desc: '' })} hitSlop={8} activeOpacity={0.7}>
              <Feather name="plus-circle" size={18} color={PRAYER_GREEN} />
            </TouchableOpacity>
          )}
        </View>
        {musallah.length === 0 ? (
          <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.prayer2.noLocations}</Text>
        ) : (
          <View style={[styles.tableCard, { backgroundColor: C.surface, borderColor: C.border, marginTop: 0 }]}>
            {musallah.map((m, i) => (
              <View key={m.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={styles.musRow}>
                  <Feather name="map-pin" size={16} color={PRAYER_GREEN} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.musName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{m.name}</Text>
                    {m.floor_desc ? (
                      <Text style={[styles.musFloor, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{m.floor_desc}</Text>
                    ) : null}
                  </View>
                  {isAdmin && (
                    <>
                      <TouchableOpacity onPress={() => setMusEdit({ id: m.id, name: m.name, floor_desc: m.floor_desc ?? '' })} hitSlop={8} activeOpacity={0.7}>
                        <Feather name="edit-2" size={15} color={C.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteMusallah(m)} hitSlop={8} activeOpacity={0.7}>
                        <Feather name="trash-2" size={15} color={C.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Admin: edit jamaat */}
      <Modal visible={!!editPrayer} transparent animationType="slide" onRequestClose={() => setEditPrayer(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditPrayer(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {editPrayer?.en} jamaat time
            </Text>
            <TextInput
              style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={jamaatInput} onChangeText={setJamaatInput} placeholder="13:30" placeholderTextColor={C.textMuted}
              keyboardType="numbers-and-punctuation" autoFocus
            />
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: PRAYER_GREEN }]} onPress={saveJamaat} activeOpacity={0.8}>
              <Text style={[styles.sheetBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin: add/edit musallah */}
      <Modal visible={!!musEdit} transparent animationType="slide" onRequestClose={() => setMusEdit(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setMusEdit(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {musEdit?.id ? 'Edit location' : 'Add location'}
            </Text>
            <TextInput
              style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={musEdit?.name ?? ''} onChangeText={t => setMusEdit(m => m ? { ...m, name: t } : m)}
              placeholder={t.prayer2.namePlaceholder} placeholderTextColor={C.textMuted}
            />
            <TextInput
              style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={musEdit?.floor_desc ?? ''} onChangeText={t => setMusEdit(m => m ? { ...m, floor_desc: t } : m)}
              placeholder={t.prayer2.floorPlaceholder} placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity
              style={[styles.sheetBtn, { backgroundColor: PRAYER_GREEN, opacity: musEdit?.name.trim() ? 1 : 0.5 }]}
              onPress={saveMusallah} disabled={!musEdit?.name.trim()} activeOpacity={0.8}
            >
              <Text style={[styles.sheetBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  ramadanStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  } as ViewStyle,
  ramadanCell: { flex: 1, alignItems: 'center', gap: 2 } as ViewStyle,
  ramadanDiv: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' } as ViewStyle,
  ramadanLbl: { fontSize: 10, letterSpacing: 0.7 } as any,
  ramadanVal: { fontSize: 17 } as any,

  viewToggle: { flexDirection: 'row', gap: 7, marginTop: 14, marginBottom: 10 } as ViewStyle,
  viewChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 11, borderWidth: 1 } as ViewStyle,
  viewChipTxt: { fontSize: 12.5 } as any,

  monthRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 } as ViewStyle,
  monthDayCol: { width: 36, fontSize: 12 } as any,
  monthCol: { flex: 1, textAlign: 'right', fontSize: 11 } as any,

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

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  } as ViewStyle,

  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13, textAlign: 'center' } as any,

  musHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 2,
  } as ViewStyle,
  musTitle: { fontSize: 11, letterSpacing: 0.7 } as any,
  musRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 12,
  } as ViewStyle,
  musName: { fontSize: 14 } as any,
  musFloor: { fontSize: 12, marginTop: 1 } as any,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  } as ViewStyle,
  sheetTitle: { fontSize: 17, marginBottom: 12 } as any,
  sheetInput: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14, marginBottom: 10 } as any,
  sheetBtn: { height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 6 } as ViewStyle,
  sheetBtnTxt: { color: '#fff', fontSize: 15 } as any,
});
