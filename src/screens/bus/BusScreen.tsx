import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, ScrollView,
  StyleSheet, RefreshControl, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../components/ui/Toast';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { BusRoute } from '../../types/database';

const BUS_COLOR = SectorColors.bus;
const BUS_BG    = `${SectorColors.bus}1e`;

interface RouteForm {
  id: string | null;       // null = new route
  name: string;
  area: string;
  bus_no: string;
  helper_name: string;
  helper_phone: string;
  stops: string;           // comma-separated in the form
  to_departures: string;
  from_departures: string;
}

const csv = (a: string[] | null | undefined) => (a ?? []).join(', ');
const uncsv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

export function BusScreen({ navigation }: any) {
  const { C } = useTheme();
  const toast = useToast();
  const t = useT();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<RouteForm | null>(null);

  const load = useCallback(async () => {
    const [{ data }, { data: saved }] = await Promise.all([
      supabase.from('bus_routes').select('*').eq('active', true).order('name').limit(50),
      supabase.from('saved_bus_routes').select('route_id').eq('user_id', user?.id ?? '').limit(50),
    ]);
    if (data) setRoutes(data as BusRoute[]);
    if (saved) setSavedIds(new Set(saved.map((r: any) => r.route_id)));
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleSave(routeId: string) {
    if (!user) return;
    const isSaved = savedIds.has(routeId);
    setSavedIds(prev => { const n = new Set(prev); isSaved ? n.delete(routeId) : n.add(routeId); return n; });
    const { error } = isSaved
      ? await supabase.from('saved_bus_routes').delete().eq('route_id', routeId).eq('user_id', user.id)
      : await supabase.from('saved_bus_routes').upsert({ route_id: routeId, user_id: user.id }, { onConflict: 'user_id,route_id' });
    if (error && error.code !== '23505') {
      // revert the optimistic toggle on failure
      setSavedIds(prev => { const n = new Set(prev); isSaved ? n.add(routeId) : n.delete(routeId); return n; });
      toast({ type: 'error', title: t.common.error });
    }
  }

  function openEditor(r?: BusRoute) {
    setForm(r ? {
      id: r.id,
      name: r.name ?? '',
      area: r.area ?? '',
      bus_no: r.bus_no ?? '',
      helper_name: r.helper_name ?? '',
      helper_phone: r.helper_phone ?? '',
      stops: csv(r.stops),
      to_departures: csv(r.to_departures),
      from_departures: csv(r.from_departures),
    } : {
      id: null, name: '', area: '', bus_no: '', helper_name: '', helper_phone: '',
      stops: '', to_departures: '', from_departures: '',
    });
  }

  async function saveRoute() {
    if (!form || !form.name.trim()) return;
    const row = {
      name: form.name.trim(),
      area: form.area.trim() || '',
      bus_no: form.bus_no.trim() || null,
      helper_name: form.helper_name.trim() || null,
      helper_phone: form.helper_phone.trim() || null,
      stops: uncsv(form.stops),
      to_departures: uncsv(form.to_departures),
      from_departures: uncsv(form.from_departures),
      active: true,
    };
    if (form.id) {
      const { error } = await supabase.from('bus_routes').update(row).eq('id', form.id);
      if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    } else {
      const id = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const { error } = await supabase.from('bus_routes').insert({ id, ...row });
      if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    }
    setForm(null);
    load();
  }

  function nextDeparture(route: BusRoute): string {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcoming = (route.to_departures ?? []).find(d => d > hhmm);
    return upcoming ?? (route.to_departures ?? [])[0] ?? '--:--';
  }

  const sorted = [...routes].sort((a, b) =>
    Number(savedIds.has(b.id)) - Number(savedIds.has(a.id)) || a.name.localeCompare(b.name));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Bus Schedule"
        onBack={() => navigation.goBack()}
        rightSlot={isAdmin ? (
          <TouchableOpacity onPress={() => openEditor()} hitSlop={8} activeOpacity={0.7}>
            <Feather name="plus-circle" size={20} color={BUS_COLOR} />
          </TouchableOpacity>
        ) : undefined}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {routes.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bus" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.bus2.noRoutes}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sorted.map(r => {
              const next = nextDeparture(r);
              const isSaved = savedIds.has(r.id);
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
                      <View style={[styles.timePill, { backgroundColor: `${BUS_COLOR}1e` }]}>
                        <View style={[styles.timeDot, { backgroundColor: BUS_COLOR }]} />
                        <Text style={[styles.timeTxt, { color: BUS_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                          Next: {next}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity onPress={() => openEditor(r)} hitSlop={8} activeOpacity={0.7}>
                      <Feather name="edit-2" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => toggleSave(r.id)} hitSlop={8} activeOpacity={0.7}>
                    <Feather name="star" size={18} color={isSaved ? BUS_COLOR : C.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Admin: add/edit route */}
      <Modal visible={!!form} transparent animationType="slide" onRequestClose={() => setForm(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setForm(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {form?.id ? 'Edit route' : 'Add route'}
            </Text>
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              {([
                ['name', 'Route name *'],
                ['area', 'Area'],
                ['bus_no', 'Bus number'],
                ['helper_name', 'Helper name'],
                ['helper_phone', 'Helper phone'],
                ['stops', 'Stops (comma-separated)'],
                ['to_departures', 'To campus times (07:00, 08:00)'],
                ['from_departures', 'From campus times (13:00, 17:00)'],
              ] as [keyof RouteForm, string][]).map(([key, label]) => (
                <TextInput
                  key={key}
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={(form?.[key] as string) ?? ''}
                  onChangeText={t => setForm(f => f ? { ...f, [key]: t } : f)}
                  placeholder={label}
                  placeholderTextColor={C.textMuted}
                />
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.sheetBtn, { backgroundColor: BUS_COLOR, opacity: form?.name.trim() ? 1 : 0.5 }]}
              onPress={saveRoute} disabled={!form?.name.trim()} activeOpacity={0.8}
            >
              <Text style={[styles.sheetBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>{t.bus2.saveRoute}</Text>
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
