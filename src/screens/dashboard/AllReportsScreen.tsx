import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Modal, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout } from '../../theme';
import { useT } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import type { Report, Profile } from '../../types/database';

type StatusFilter = 'all' | Report['status'];

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'Open',        label: 'Open' },
  { id: 'In Progress', label: 'In Progress' },
  { id: 'Resolved',    label: 'Resolved' },
  { id: 'Rejected',    label: 'Rejected' },
  { id: 'Closed',      label: 'Closed' },
];

const CATEGORIES = ['All', 'Electrical', 'Plumbing', 'Cleanliness', 'IT / Network', 'Furniture', 'Safety / Security', 'Other'];

// Status colors, light + dark aware via C.
function statusTone(C: any, status: string): { text: string; bg: string } {
  switch (status) {
    case 'In Progress': return { text: C.info,      bg: C.infoBg };
    case 'Resolved':    return { text: C.success,   bg: C.successBg };
    case 'Closed':      return { text: C.textMuted, bg: C.surface2 };
    case 'Rejected':    return { text: C.danger,    bg: C.dangerBg };
    case 'Open':
    default:            return { text: C.warn,      bg: C.warnBg };
  }
}

interface ReportWithProfile extends Report {
  profiles: { full_name: string } | null;
}

export function AllReportsScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportWithProfile[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [staff, setStaff] = useState<Profile[]>([]);
  const [assignTarget, setAssignTarget] = useState<ReportWithProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [rRes, sRes] = await Promise.all([
      supabase
        .from('reports')
        .select('*, profiles!reporter_id(full_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('profiles').select('*').eq('role', 'staff').limit(100),
    ]);
    if (rRes.data) setReports(rRes.data as ReportWithProfile[]);
    if (sRes.data) setStaff(sRes.data as Profile[]);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function assignReport(reportId: string, staffId: string) {
    const { error } = await supabase.from('reports').update({
      assigned_staff_id: staffId,
      status: 'In Progress',
    }).eq('id', reportId);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    // Only apply the optimistic mutation after a confirmed write.
    setReports(prev => prev.map(r =>
      r.id === reportId ? { ...r, assigned_staff_id: staffId, status: 'In Progress' } : r
    ));
    setAssignTarget(null);
  }

  const q = query.trim().toLowerCase();
  const list = reports
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => category === 'All' || r.category === category)
    .filter(r => {
      if (!q) return true;
      const code = (r as any).code ?? '';
      return [r.category, r.description, r.building, code]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });

  // Assign sheet: staff whose trade matches the report category come first.
  const assignCat = assignTarget?.category;
  const staffRanked = assignCat
    ? [...staff].sort((a, b) => Number(b.expertise === assignCat) - Number(a.expertise === assignCat))
    : staff;

  if (profile && profile.role !== 'admin' && profile.role !== 'staff') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="All Reports" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18, marginBottom: 8 }}>Access Denied</Text>
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 14, textAlign: 'center' }}>
            Only admins and staff can view all reports.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="All Reports" onBack={() => navigation.goBack()} />

      {/* Search */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 8 }}>
        <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
          <Icon name="search" size={17} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder={t.dash.searchReportsPlaceholder}
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="x" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}
      >
        {STATUS_TABS.map(tab => {
          const count = tab.id === 'all' ? reports.length : reports.filter(r => r.status === tab.id).length;
          const on = filter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.chip, on
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setFilter(tab.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {tab.label}
              </Text>
              <Text style={[styles.chipCount, { color: on ? 'rgba(255,255,255,0.75)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.catChips, { paddingHorizontal: Layout.screenPadding }]}
      >
        {CATEGORIES.map(c => {
          const on = category === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, on
                ? { backgroundColor: C.surface2, borderColor: C.text2 }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setCategory(c)}
              activeOpacity={0.75}
            >
              <Text style={[styles.catChipTxt, { color: on ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={list}
        keyExtractor={r => r.id}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, textAlign: 'center', marginTop: 24 }}>
            {t.common.noResults}
          </Text>
        }
        ListFooterComponent={<View style={{ height: 20 }} />}
        renderItem={({ item: r }) => {
          const tone = statusTone(C, r.status);
          const code = (r as any).code ?? ('RPT-' + r.id.replace(/\D/g, '').padStart(4, '0').slice(-4));
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardCode, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {code}
                  </Text>
                  <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
                    {r.description.split('\n')[0]}
                  </Text>
                  <View style={styles.locRow}>
                    <Icon name="pin" size={11} color={C.textMuted} />
                    <Text style={[styles.loc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {r.building}{r.room ? ` · ${t.dash.roomLabel(r.room)}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusTxt, { color: tone.text, fontFamily: FontFamily.jakartaBold }]}>
                    {r.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.byRow}>
                  <Avatar name={r.profiles?.full_name} size="xs" />
                  <Text style={[styles.byName, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    {r.profiles?.full_name ?? t.dash.unknown}
                  </Text>
                </View>
                {r.status !== 'Rejected' && r.status !== 'Closed' && r.status !== 'Resolved' && (
                  r.assigned_staff_id ? (
                    <TouchableOpacity
                      style={[styles.assignBtn, { backgroundColor: C.surface2 }]}
                      onPress={() => setAssignTarget(r)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.assignTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.dash.reassign}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.assignBtn, { backgroundColor: C.brand }]}
                      onPress={() => setAssignTarget(r)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.assignTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{t.dash.assignBtn}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Assign Modal */}
      <Modal visible={!!assignTarget} transparent animationType="slide" onRequestClose={() => setAssignTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAssignTarget(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            Assign Staff
          </Text>
          <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {assignTarget?.description.split('\n')[0]}{assignTarget?.category ? ` · ${t.dash.needsOnly(assignTarget.category)}` : ''}
          </Text>
          {staffRanked.map((s, i) => {
            const match = !!assignCat && s.expertise === assignCat;
            return (
              <View key={s.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <TouchableOpacity
                  style={styles.staffRow}
                  onPress={() => assignReport(assignTarget!.id, s.id)}
                  activeOpacity={0.75}
                >
                  <Avatar uri={s.avatar_url} name={s.full_name} size="sm" />
                  <View style={styles.staffBody}>
                    <View style={styles.staffNameRow}>
                      <Text style={[styles.staffName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{s.full_name}</Text>
                      {match && (
                        <View style={[styles.matchPill, { backgroundColor: C.successBg }]}>
                          <Text style={[styles.matchTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>{t.dash.match}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.staffDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {s.expertise ?? s.department ?? t.dash.noTradeSet}
                    </Text>
                  </View>
                  <Icon name="chevR" size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
          {staff.length === 0 && (
            <Text style={[{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, textAlign: 'center', paddingVertical: 20 }]}>
              No staff members found
            </Text>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  } as ViewStyle,

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,

  chipTxt: { fontSize: 13 } as any,
  chipCount: { fontSize: 12 } as any,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 } as TextStyle,
  catChips: { flexDirection: 'row', gap: 7, paddingBottom: 10 } as ViewStyle,
  catChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  catChipTxt: { fontSize: 11.5 } as any,

  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,

  cardList: {
    gap: 10,
  } as ViewStyle,

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  } as ViewStyle,

  cardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  } as ViewStyle,

  cardInfo: { flex: 1 } as ViewStyle,

  cardCode: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 2,
  } as any,

  cardTitle: {
    fontSize: 14,
    lineHeight: 20,
  } as any,

  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  } as ViewStyle,

  loc: { fontSize: 11.5 } as any,

  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  } as ViewStyle,

  statusTxt: { fontSize: 11 } as any,

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  byRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  } as ViewStyle,

  byName: { fontSize: 12 } as any,

  assignBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  } as ViewStyle,

  assignTxt: {
    fontSize: 13,
  } as any,

  // Sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  } as ViewStyle,

  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  } as ViewStyle,

  sheetTitle: {
    fontSize: 18,
    marginBottom: 4,
  } as any,

  sheetSub: {
    fontSize: 13,
    marginBottom: 16,
  } as any,

  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  } as ViewStyle,

  staffBody: { flex: 1 } as ViewStyle,

  staffName: { fontSize: 14 } as any,
  staffNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  matchPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 } as ViewStyle,
  matchTxt: { fontSize: 10 } as any,
  staffDept: { fontSize: 12, marginTop: 1 } as any,
});
