// Student's full report list with status filter dropdown and per-row
// actions: View always; Edit/Delete only while a report is still Open.
import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { LiquidToggle } from '../../components/ui/LiquidToggle';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { getCampusReports, type CampusReport } from '../../services/reportsService';
import { setReportBoardVisibility } from '../../services/campusIssuesService';

const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Rejected', 'Closed'] as const;
type StatusFilter = (typeof STATUSES)[number];

const CATEGORY_MAP: Record<string, { icon: string; fg: string }> = {
  'Electrical':        { icon: 'bolt',     fg: '#f59e0b' },
  'Plumbing':          { icon: 'droplets', fg: '#0284c7' },
  'Cleanliness':       { icon: 'sparkles', fg: '#10b981' },
  'IT / Network':      { icon: 'wifi',     fg: '#8b5cf6' },
  'Furniture':         { icon: 'box',      fg: '#f97316' },
  'Safety / Security': { icon: 'shield',   fg: '#ef4444' },
  'Other':             { icon: 'sliders',  fg: '#64748b' },
};

function statusTone(C: any, status: string): { fg: string; bg: string } {
  switch (status) {
    case 'In Progress': return { fg: C.info,      bg: C.infoBg };
    case 'Resolved':    return { fg: C.success,   bg: C.successBg };
    case 'Closed':      return { fg: C.textMuted, bg: C.surface2 };
    case 'Rejected':    return { fg: C.danger,    bg: C.dangerBg };
    default:            return { fg: C.warn,      bg: C.warnBg };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function MyReportsScreen({ navigation }: any) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();

  const [reports, setReports] = useState<CampusReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [boardMap, setBoardMap] = useState<Record<string, boolean>>({});
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getCampusReports();
      if (res.ok) {
        setReports(res.data);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
      const { data: mine, error: mineErr } = await supabase
        .from('reports')
        .select('id, show_on_board')
        .eq('reporter_id', user.id)
        .is('deleted_at', null);
      if (!mineErr && mine) {
        setBoardMap(Object.fromEntries(mine.map(m => [m.id, m.show_on_board === true])));
        setBoardLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  async function toggleBoard(r: CampusReport) {
    const current = boardMap[r.id] === true;
    const next = !current;
    setBoardMap(prev => ({ ...prev, [r.id]: next }));
    const res = await setReportBoardVisibility(r.id, next);
    if (!res.ok) {
      setBoardMap(prev => ({ ...prev, [r.id]: current }));
      toast({ type: 'error', title: t.common.error, message: res.error });
      return;
    }
    toast({
      type: 'success',
      title: t.campusIssues.visibilityUpdated,
      message: next ? t.campusIssues.onBoard : t.campusIssues.hiddenFromBoard,
    });
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDelete(r: CampusReport) {
    Alert.alert(t.reports.deleteTitle, t.reports.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('reports')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', r.id);
          if (error) {
            toast({ type: 'error', title: t.common.error, message: error.message });
            return;
          }
          setReports(prev => prev.filter(x => x.id !== r.id));
        },
      },
    ]);
  }

  // Filter student's own reports
  const myReports = useMemo(
    () => reports.filter(r => r.reporter_id === user?.id),
    [reports, user?.id],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: myReports.length };
    myReports.forEach(r => {
      m[r.status] = (m[r.status] || 0) + 1;
    });
    return m;
  }, [myReports]);

  const filtered = useMemo(() => {
    if (filter === 'All') return myReports;
    return myReports.filter(r => r.status === filter);
  }, [myReports, filter]);

  const scopeTabs: TabItem<'board' | 'mine'>[] = useMemo(() => [
    {
      id: 'board',
      label: t.campusIssues.title ?? 'Campus Board',
      color: C.brand,
    },
    {
      id: 'mine',
      label: t.reports.scopeMine ?? 'My Reports',
      count: myReports.length > 0 ? myReports.length : undefined,
      color: SectorColors.reports,
    },
  ], [t, myReports.length, C.brand]);

  function handleTabChange(tabId: 'board' | 'mine') {
    if (tabId === 'board') {
      navigation.replace('CampusIssues');
    }
  }

  const activeStatusLabel = filter === 'All' ? t.common.all ?? 'All Reports' : (t.status[filter] ?? filter);

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <SubBar
        title={t.reports.allReportsTitle}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            {/* 1. 58dp Dual Tab Switcher: Campus Board ↔ My Reports */}
            <View style={{ marginBottom: 12 }}>
              <SegmentedTabs
                tabs={scopeTabs}
                activeTab="mine"
                onTabChange={handleTabChange}
              />
            </View>

            {/* 2. Full-Width 58dp Primary Action Button */}
            <TouchableOpacity
              style={[styles.fullActionBtn, { backgroundColor: C.brand }]}
              onPress={() => navigation.navigate('ReportForm', {})}
              activeOpacity={0.85}
            >
              <Feather name="plus-circle" size={19} color="#ffffff" />
              <Text style={[styles.fullActionBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                {t.reports2.reportAnIssue ?? 'Report an Issue'}
              </Text>
            </TouchableOpacity>

            {/* 3. Full-Width 58dp Status Dropdown Bar */}
            <TouchableOpacity
              style={[
                styles.dropdownBar58,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => setStatusModalOpen(true)}
              activeOpacity={0.75}
            >
              <View style={styles.dropdownLeft}>
                <Feather name="sliders" size={17} color={C.textMuted} />
                <Text style={[styles.dropdownLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {activeStatusLabel}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: C.surface2 }]}>
                  <Text style={[styles.countBadgeTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {counts[filter] ?? 0}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-down" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList rows={4} />
          ) : loadError ? (
            <LoadError onRetry={load} />
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.emptyIconSlot}>
                <Icon name="tool" size={32} color={C.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.reports.noReportsTitle ?? 'No reports found'}
              </Text>
              <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.reports.noReportsBody ?? 'Track maintenance issues you reported around campus.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyCtaBtn, { backgroundColor: C.brand }]}
                onPress={() => navigation.navigate('ReportForm', {})}
                activeOpacity={0.85}
              >
                <Feather name="plus-circle" size={16} color="#ffffff" />
                <Text style={[styles.emptyCtaTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.reports2.reportAnIssue ?? 'Report an Issue'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item: r }) => {
          const cat = CATEGORY_MAP[r.category] ?? CATEGORY_MAP.Other;
          const tone = statusTone(C, r.status);
          const title = (r.description ?? '').split('\n')[0];
          const isOwn = r.reporter_id === user?.id;
          const editable = isOwn && r.status === 'Open';
          const onBoard = boardMap[r.id] === true;
          const canBoard = isOwn && boardLoaded
            && r.category !== 'Safety / Security' && r.status !== 'Rejected';

          return (
            <View
              style={[
                styles.reportCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderLeftColor: cat.fg,
                },
              ]}
            >
              {/* Top Row: Category Icon + Title/Location + Status Pill */}
              <TouchableOpacity
                style={styles.cardHeaderRow}
                onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })}
                activeOpacity={0.75}
              >
                <View style={styles.iconSlot32}>
                  <Icon name={cat.icon} size={32} color={C.text} />
                </View>
                <View style={styles.cardHeaderBody}>
                  <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={11} color={C.textMuted} />
                    <Text style={[styles.locationTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {r.building}{r.room ? ` · ${r.room}` : ''} · {timeAgo(r.created_at)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
                  <Text style={[styles.statusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}>
                    {t.status[r.status] ?? r.status}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Action and Board Toggle Row */}
              <View style={[styles.cardFooterRow, { borderTopColor: C.border }]}>
                {canBoard ? (
                  <View style={styles.boardToggleGroup}>
                    <Text style={[styles.boardToggleLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      {t.campusIssues.optInLabel ?? 'Campus Board'}
                    </Text>
                    <LiquidToggle
                      checked={onBoard}
                      onCheckedChange={() => toggleBoard(r)}
                      size="sm"
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

                <View style={styles.cardBtnRow}>
                  {editable && (
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                      onPress={() => navigation.navigate('ReportForm', { editReportId: r.id })}
                      activeOpacity={0.75}
                    >
                      <Feather name="edit-2" size={13} color={C.text2} />
                    </TouchableOpacity>
                  )}
                  {editable && (
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                      onPress={() => confirmDelete(r)}
                      activeOpacity={0.75}
                    >
                      <Feather name="trash-2" size={13} color={C.danger} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.viewDetailsBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                    onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.viewDetailsTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                      {t.reports.view ?? 'View'}
                    </Text>
                    <Feather name="chevron-right" size={14} color={C.brand} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: 28 }} />}
      />

      {/* Full-Screen Status Dropdown Bottom Sheet Modal */}
      <Modal
        visible={statusModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStatusModalOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.reports.filterStatus ?? 'Filter by Status'}
              </Text>
              <TouchableOpacity
                onPress={() => setStatusModalOpen(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {STATUSES.map(s => {
              const active = filter === s;
              const count = counts[s] ?? 0;
              const label = s === 'All' ? t.common.all ?? 'All Reports' : (t.status[s] ?? s);

              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.modalRow58,
                    {
                      backgroundColor: active ? (C.brand + '15') : C.surface2,
                      borderColor: active ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => {
                    setFilter(s);
                    setStatusModalOpen(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.modalRowLeft}>
                    <View
                      style={[
                        styles.statusDotLg,
                        { backgroundColor: s === 'All' ? C.brand : statusTone(C, s).fg },
                      ]}
                    />
                    <Text
                      style={[
                        styles.modalRowLabel,
                        {
                          color: active ? C.text : C.text2,
                          fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                  <View style={styles.modalRowRight}>
                    <Text style={[styles.modalRowCount, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      {count}
                    </Text>
                    {active && <Feather name="check" size={17} color={C.brand} style={{ marginLeft: 6 }} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  } as ViewStyle,

  scroll: {
    paddingTop: 8,
    paddingBottom: 24,
  } as ViewStyle,

  headerArea: {
    marginBottom: 12,
  } as ViewStyle,

  fullActionBtn: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 12,
  } as ViewStyle,

  fullActionBtnTxt: {
    fontSize: 15,
    letterSpacing: 0.2,
  } as TextStyle,

  dropdownBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  } as ViewStyle,

  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,

  dropdownLabel: {
    fontSize: 14.5,
  } as TextStyle,

  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  } as ViewStyle,

  countBadgeTxt: {
    fontSize: 11.5,
  } as TextStyle,

  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    padding: 15,
  } as ViewStyle,

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,

  iconSlot32: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  cardHeaderBody: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  cardTitle: {
    fontSize: 14.5,
    lineHeight: 19,
  } as TextStyle,

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  } as ViewStyle,

  locationTxt: {
    fontSize: 11.5,
    flexShrink: 1,
  } as TextStyle,

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  } as ViewStyle,

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,

  statusTxt: {
    fontSize: 11,
  } as TextStyle,

  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 11,
    gap: 10,
  } as ViewStyle,

  boardToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  boardToggleLabel: {
    fontSize: 12,
  } as TextStyle,

  cardBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,

  viewDetailsTxt: {
    fontSize: 12.5,
  } as TextStyle,

  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  } as ViewStyle,

  emptyIconSlot: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  } as ViewStyle,

  emptyTitle: {
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
  } as TextStyle,

  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
  } as TextStyle,

  emptyCtaBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,

  emptyCtaTxt: {
    fontSize: 14,
  } as TextStyle,

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  } as ViewStyle,

  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  } as ViewStyle,

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  } as ViewStyle,

  modalTitle: {
    fontSize: 16.5,
  } as TextStyle,

  modalCloseBtn: {
    padding: 6,
  } as ViewStyle,

  modalRow58: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  } as ViewStyle,

  modalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,

  statusDotLg: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,

  modalRowLabel: {
    fontSize: 14.5,
  } as TextStyle,

  modalRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,

  modalRowCount: {
    fontSize: 13,
  } as TextStyle,
});
