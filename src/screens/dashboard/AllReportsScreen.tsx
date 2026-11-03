import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Modal, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout, Accent } from '../../theme';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { getTradeLabel, isTradeMatch } from '../../utils/tradeMatcher';
import { useT } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { getReportVoteCounts } from '../../services/campusIssuesService';
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
  const isAdmin = profile?.role === 'admin';
  const [reports, setReports] = useState<ReportWithProfile[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [staff, setStaff] = useState<Profile[]>([]);
  const [assignTarget, setAssignTarget] = useState<ReportWithProfile | null>(null);
  const [assignTab, setAssignTab] = useState<'trade' | 'all'>('trade');
  const [refreshing, setRefreshing] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [rRes, sRes, vRes] = await Promise.all([
      supabase
        .from('reports')
        .select('*, profiles!reporter_id(full_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('profiles').select('*').eq('role', 'staff').limit(100),
      getReportVoteCounts(),
    ]);
    if (rRes.data) setReports(rRes.data as ReportWithProfile[]);
    if (sRes.data) setStaff(sRes.data as Profile[]);
    if (vRes.ok) setVoteCounts(vRes.data);
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
    }).eq('id', reportId);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    // Only apply the optimistic mutation after a confirmed write.
    setReports(prev => prev.map(r =>
      r.id === reportId ? { ...r, assigned_staff_id: staffId } : r
    ));
    setAssignTarget(null);
  }

  const q = query.trim().toLowerCase();
  const list = reports
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => category === 'All' || r.category === category)
    .filter(r => {
      if (!q) return true;
      const code = r.code ?? '';
      return [r.category, r.description, r.building, code]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });

  const assignCat = assignTarget?.category;
  const tradeLabel = useMemo(() => getTradeLabel(assignCat), [assignCat]);

  const matchingStaff = useMemo(() => {
    if (!assignCat) return staff;
    return staff.filter((s) => isTradeMatch(s.expertise, assignCat));
  }, [staff, assignCat]);

  const assignTabs = useMemo<TabItem<'trade' | 'all'>[]>(() => {
    return [
      {
        id: 'trade',
        label: `${tradeLabel} (${matchingStaff.length})`,
        icon: 'zap',
        color: Accent.amber,
      },
      {
        id: 'all',
        label: `All Staff (${staff.length})`,
        icon: 'users',
        color: C.brand,
      },
    ];
  }, [tradeLabel, matchingStaff.length, staff.length, C.brand]);

  const displayedAssignStaff = useMemo(() => {
    if (assignTab === 'trade' && matchingStaff.length > 0) {
      return matchingStaff;
    }
    return staff;
  }, [assignTab, matchingStaff, staff]);

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="All Reports" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18, marginBottom: 8 }}>Access Denied</Text>
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 14, textAlign: 'center' }}>
            Only administrators can view and manage all campus reports.
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
        <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Icon name="search" size={18} color={C.textMuted} />
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
        keyboardShouldPersistTaps="handled"
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
        keyboardShouldPersistTaps="handled"
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
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
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
          const code = r.code ?? ('RPT-' + r.id.replace(/\D/g, '').padStart(4, '0').slice(-4));
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
                  {voteCounts[r.id] > 0 && (
                    <View style={[styles.meTooPill, { backgroundColor: C.surface2 }]}>
                      <Feather name="thumbs-up" size={11} color={C.textMuted} />
                      <Text style={[styles.meTooTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                        {voteCounts[r.id]}
                      </Text>
                    </View>
                  )}
                </View>
                {r.status !== 'Rejected' && r.status !== 'Closed' && r.status !== 'Resolved' && (
                  r.assigned_staff_id ? (
                    // Reassigning to a THIRD staff member is admin-only server-side
                    // (a non-admin's update is only permitted when the new
                    // assigned_staff_id is their own uid) -- hide it for staff so
                    // the picker isn't a dead end once a report is already assigned
                    // to someone else.
                    isAdmin && (
                      <TouchableOpacity
                        style={[styles.assignBtn, { backgroundColor: C.surface2 }]}
                        onPress={() => {
                          setAssignTab('trade');
                          setAssignTarget(r);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.assignTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.dash.reassign}</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    <TouchableOpacity
                      style={[styles.assignBtn, { backgroundColor: C.brand }]}
                      onPress={() => {
                        setAssignTab('trade');
                        setAssignTarget(r);
                      }}
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

      {/* Full-Screen Staff Assignment Modal */}
      <Modal
        visible={!!assignTarget}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAssignTarget(null)}
      >
        <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
          {/* Top Navigation Bar */}
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <TouchableOpacity
              onPress={() => setAssignTarget(null)}
              style={styles.modalBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={20} color={C.text} />
            </TouchableOpacity>
            <View style={styles.modalHeaderTitleBlock}>
              <Text style={[styles.modalHeaderTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
                {assignTarget?.assigned_staff_id ? t.dash.reassign : t.dash.assignReport}
              </Text>
              <Text style={[styles.modalHeaderSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                {assignTarget?.code ?? 'RPT'} · {assignTarget?.category} · {assignTarget?.building || 'Campus'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setAssignTarget(null)} style={styles.modalCancelBtn}>
              <Text style={[styles.modalCancelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.common.cancel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ticket Context Strip */}
          {assignTarget && (
            <View style={[styles.contextStrip, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
              <View style={styles.contextStripLeft}>
                <View style={[styles.contextDot, { backgroundColor: C.brand }]} />
                <Text style={[styles.contextTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  Requires {tradeLabel}
                </Text>
              </View>
              <View style={[styles.categoryBadgeTiny, { backgroundColor: C.brand + '15', borderColor: C.brand + '40' }]}>
                <Text style={[styles.categoryBadgeTinyTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {assignTarget.category}
                </Text>
              </View>
            </View>
          )}

          {/* 58dp Segmented Tab Bar with Native Spring Animation */}
          <View style={styles.tabContainer58}>
            <SegmentedTabs<'trade' | 'all'>
              tabs={assignTabs}
              activeTab={assignTab}
              onTabChange={(id) => setAssignTab(id)}
              size="md"
            />
          </View>

          {/* Staff List Container */}
          <ScrollView
            contentContainerStyle={styles.staffScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {displayedAssignStaff.map((s) => {
              const isMatch = !!assignCat && isTradeMatch(s.expertise, assignCat);
              const isCurrent = assignTarget?.assigned_staff_id === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.staffCard58,
                    {
                      backgroundColor: isCurrent ? (C.brand + '14') : C.surface,
                      borderColor: isCurrent ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => assignReport(assignTarget!.id, s.id)}
                  activeOpacity={0.72}
                >
                  <Avatar uri={s.avatar_url} name={s.full_name} size="sm" />
                  <View style={styles.staffCardBody}>
                    <View style={styles.staffCardTopRow}>
                      <Text style={[styles.staffNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {s.full_name}
                      </Text>
                      {isMatch && (
                        <View style={[styles.matchBadge, { backgroundColor: C.successBg, borderColor: C.success + '40' }]}>
                          <Text style={[styles.matchBadgeTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                            Trade Match
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.staffMetaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {s.expertise ?? s.department ?? t.dash.noTradeSet}
                    </Text>
                  </View>
                  {isCurrent ? (
                    <View style={[styles.selectedCheckWrap, { backgroundColor: C.brand }]}>
                      <Icon name="check" size={14} color="#ffffff" />
                    </View>
                  ) : (
                    <Icon name="chevR" size={18} color={C.textMuted} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Empty State when no specialists found */}
            {assignTab === 'trade' && matchingStaff.length === 0 && (
              <View style={[styles.emptySpecialistCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Icon name="userX" size={28} color={C.textMuted} />
                <Text style={[styles.emptySpecialistTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  No Registered {tradeLabel}
                </Text>
                <Text style={[styles.emptySpecialistSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  No staff members currently have their trade set to {assignCat}.
                </Text>
                <TouchableOpacity
                  style={[styles.emptySpecialistBtn, { backgroundColor: C.brand }]}
                  onPress={() => setAssignTab('all')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.emptySpecialistBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                    View All Campus Staff ({staff.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
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

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, height: 58, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 } as TextStyle,
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
  meTooPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 } as ViewStyle,
  meTooTxt: { fontSize: 11 } as any,

  assignBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  } as ViewStyle,

  assignTxt: {
    fontSize: 13,
  } as any,

  // Full-Screen Staff Assignment Modal & 58dp Cards
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    borderBottomWidth: 1,
    gap: 12,
  } as ViewStyle,
  modalBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalHeaderTitleBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  } as ViewStyle,
  modalHeaderTitle: {
    fontSize: 16,
  } as TextStyle,
  modalHeaderSub: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,
  modalCancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  } as ViewStyle,
  modalCancelTxt: {
    fontSize: 13,
  } as TextStyle,
  contextStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 10,
    borderBottomWidth: 1,
  } as ViewStyle,
  contextStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  } as ViewStyle,
  contextDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  } as ViewStyle,
  contextTxt: {
    fontSize: 12.5,
  } as TextStyle,
  categoryBadgeTiny: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  categoryBadgeTinyTxt: {
    fontSize: 11,
  } as TextStyle,
  tabContainer58: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 8,
  } as ViewStyle,
  staffScrollContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 6,
    paddingBottom: 28,
  } as ViewStyle,
  staffCard58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  } as ViewStyle,
  staffCardBody: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  } as ViewStyle,
  staffCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  } as ViewStyle,
  staffNameTxt: {
    fontSize: 14,
    letterSpacing: -0.1,
    flexShrink: 1,
  } as TextStyle,
  matchBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  } as ViewStyle,
  matchBadgeTxt: {
    fontSize: 9.5,
  } as TextStyle,
  staffMetaTxt: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,
  selectedCheckWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptySpecialistCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  } as ViewStyle,
  emptySpecialistTitle: {
    fontSize: 15,
    marginTop: 4,
  } as TextStyle,
  emptySpecialistSub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  } as TextStyle,
  emptySpecialistBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  } as ViewStyle,
  emptySpecialistBtnTxt: {
    fontSize: 13,
  } as TextStyle,
});
