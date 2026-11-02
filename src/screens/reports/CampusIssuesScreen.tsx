// Campus Issues board - anonymous student-facing feed of reports whose owners
// opted them onto the board, with a "me too" vote. No reporter identity is ever
// shown (the feed RPC never projects it) and cards don't deep-link to the
// owner-only report detail.
import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
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
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { getCampusIssues, toggleReportVote, type CampusIssue } from '../../services/campusIssuesService';

const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const;
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
    default:            return { fg: C.warn,      bg: C.warnBg };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function CampusIssuesScreen({ navigation }: any) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();

  const [issues, setIssues] = useState<CampusIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getCampusIssues();
      if (res.ok) {
        setIssues(res.data);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function meToo(issue: CampusIssue) {
    if (busyIds.has(issue.id)) return;
    setBusyIds(prev => new Set(prev).add(issue.id));
    const res = await toggleReportVote(issue.id);
    setBusyIds(prev => {
      const next = new Set(prev);
      next.delete(issue.id);
      return next;
    });
    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      return;
    }
    setIssues(prev =>
      prev.map(x =>
        x.id === issue.id ? { ...x, vote_count: res.data.vote_count, voted: res.data.voted } : x,
      ),
    );
  }

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: issues.length };
    issues.forEach(r => {
      m[r.status] = (m[r.status] || 0) + 1;
    });
    return m;
  }, [issues]);

  const filtered = useMemo(() => {
    if (filter === 'All') return issues;
    return issues.filter(r => r.status === filter);
  }, [issues, filter]);

  const scopeTabs: TabItem<'board' | 'mine'>[] = useMemo(() => [
    {
      id: 'board',
      label: t.campusIssues.title ?? 'Campus Board',
      count: issues.length > 0 ? issues.length : undefined,
      color: C.brand,
    },
    {
      id: 'mine',
      label: t.reports.scopeMine ?? 'My Reports',
      color: SectorColors.reports,
    },
  ], [t, issues.length, C.brand]);

  function handleTabChange(tabId: 'board' | 'mine') {
    if (tabId === 'mine') {
      navigation.replace('MyReports');
    }
  }

  const activeStatusLabel = filter === 'All' ? t.common.all ?? 'All Statuses' : (t.status[filter] ?? filter);

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <SubBar
        title={t.campusIssues.title}
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
                activeTab="board"
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
                {t.campusIssues.emptyTitle ?? 'No issues on the board'}
              </Text>
              <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.campusIssues.emptyBody ?? 'When students share issues publicly, they show up here.'}
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
          const hasVoted = Boolean(r.voted);

          return (
            <View
              style={[
                styles.issueCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderLeftColor: cat.fg,
                },
              ]}
            >
              {/* Top Row: 32dp Category Icon + Meta + Status Pill */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconSlot32}>
                  <Icon name={cat.icon} size={32} color={C.text} />
                </View>
                <View style={styles.cardHeaderBody}>
                  <Text style={[styles.categoryTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {r.category}
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
              </View>

              {/* Description */}
              <Text style={[styles.descriptionTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={3}>
                {r.description}
              </Text>

              {/* Footer: Affected count + Tactile Me Too button */}
              <View style={[styles.cardFooterRow, { borderTopColor: C.border }]}>
                <Text style={[styles.affectedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {r.vote_count > 0 ? t.campusIssues.affected(r.vote_count) : t.campusIssues.beFirst}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.voteBtn,
                    hasVoted
                      ? { backgroundColor: C.brand, borderColor: C.brand }
                      : { backgroundColor: C.surface2, borderColor: C.border },
                  ]}
                  onPress={() => meToo(r)}
                  disabled={busyIds.has(r.id)}
                  activeOpacity={0.75}
                >
                  <Feather
                    name="thumbs-up"
                    size={14}
                    color={hasVoted ? '#ffffff' : C.text2}
                  />
                  <Text
                    style={[
                      styles.voteBtnTxt,
                      {
                        color: hasVoted ? '#ffffff' : C.text2,
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                  >
                    {t.campusIssues.meToo}
                  </Text>
                  {r.vote_count > 0 && (
                    <Text
                      style={[
                        styles.voteBtnCount,
                        {
                          color: hasVoted ? 'rgba(255,255,255,0.9)' : C.textMuted,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {r.vote_count}
                    </Text>
                  )}
                </TouchableOpacity>
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
              const label = s === 'All' ? t.common.all ?? 'All Statuses' : (t.status[s] ?? s);

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

  issueCard: {
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

  categoryTitle: {
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

  descriptionTxt: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
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

  affectedTxt: {
    fontSize: 11.5,
    flexShrink: 1,
  } as TextStyle,

  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,

  voteBtnTxt: {
    fontSize: 12.5,
  } as TextStyle,

  voteBtnCount: {
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
