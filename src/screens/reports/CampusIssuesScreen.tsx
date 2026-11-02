// Unified Report Issues screen - hosts both public Campus Board and personal
// My Reports feeds in a single ultra-responsive view with 0ms in-memory tab
// switching, 58dp controls, 4.5dp category stripes, 32dp monochrome static icons,
// and premium squircle badges.
import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Alert,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { LiquidToggle } from '../../components/ui/LiquidToggle';
import { FontFamily, Layout } from '../../theme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import {
  getCampusIssues,
  toggleReportVote,
  setReportBoardVisibility,
  type CampusIssue,
} from '../../services/campusIssuesService';
import { getMyReports } from '../../services/reportsService';
import type { Report } from '../../types/database';

const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const;
type StatusFilter = (typeof STATUSES)[number];
type TabKey = 'Campus' | 'Mine';

const CATEGORY_MAP: Record<string, { icon: string; fg: string }> = {
  'Electrical':        { icon: 'bolt',     fg: '#f59e0b' },
  'Plumbing':          { icon: 'droplets', fg: '#0284c7' },
  'Cleanliness':       { icon: 'sparkles', fg: '#10b981' },
  'IT / Network':      { icon: 'wifi',     fg: '#8b5cf6' },
  'Furniture':         { icon: 'box',      fg: '#f97316' },
  'Safety / Security': { icon: 'shield',   fg: '#ef4444' },
  'Other':             { icon: 'sliders',  fg: '#64748b' },
};

function statusTone(C: any, status: string): { fg: string; bg: string; border: string } {
  switch (status) {
    case 'In Progress':
      return {
        fg: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.12)',
        border: 'rgba(56, 189, 248, 0.32)',
      };
    case 'Resolved':
      return {
        fg: '#34d399',
        bg: 'rgba(52, 211, 153, 0.12)',
        border: 'rgba(52, 211, 153, 0.32)',
      };
    case 'Closed':
      return {
        fg: C.text3,
        bg: C.surface2,
        border: C.border,
      };
    default:
      return {
        fg: '#fbbf24',
        bg: 'rgba(251, 191, 36, 0.12)',
        border: 'rgba(251, 191, 36, 0.32)',
      };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function CampusIssuesScreen({ navigation, route }: any) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();

  const initialTab: TabKey = route?.params?.initialTab === 'Mine' ? 'Mine' : 'Campus';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab === 'Mine' ? 'Mine' : 'Campus');
    }
  }, [route?.params?.initialTab]);

  const tabs: TabItem<TabKey>[] = useMemo(() => [
    { id: 'Campus', label: t.reports?.tabCampus ?? 'Campus' },
    { id: 'Mine', label: t.reports?.tabMine ?? 'Mine' },
  ], [t]);

  // Feed states
  const [campusIssues, setCampusIssues] = useState<CampusIssue[]>([]);
  const [campusLoading, setCampusLoading] = useState(true);
  const [busyVoteIds, setBusyVoteIds] = useState<Set<string>>(new Set());

  const [myReports, setMyReports] = useState<Report[]>([]);
  const [myReportsLoading, setMyReportsLoading] = useState(true);
  const [boardMap, setBoardMap] = useState<Record<string, boolean>>({});

  // Filter & modal states
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Data fetching
  const loadCampus = useCallback(async () => {
    try {
      const res = await getCampusIssues();
      if (res.ok) {
        setCampusIssues(res.data);
      } else {
        setLoadError(res.error);
      }
    } finally {
      setCampusLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    if (!user) {
      setMyReportsLoading(false);
      return;
    }
    try {
      const res = await getMyReports(user.id);
      if (res.ok) {
        setMyReports(res.data);
        setBoardMap(Object.fromEntries(res.data.map(m => [m.id, m.show_on_board === true])));
      } else {
        setLoadError(res.error);
      }
    } finally {
      setMyReportsLoading(false);
    }
  }, [user]);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    await Promise.allSettled([loadCampus(), loadMine()]);
  }, [loadCampus, loadMine]);

  useFocusEffect(useCallback(() => {
    loadAll();
  }, [loadAll]));

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  // "Me Too" voting handler (Campus tab)
  async function meToo(issue: CampusIssue) {
    if (busyVoteIds.has(issue.id)) return;
    setBusyVoteIds(prev => new Set(prev).add(issue.id));
    const res = await toggleReportVote(issue.id);
    setBusyVoteIds(prev => {
      const next = new Set(prev);
      next.delete(issue.id);
      return next;
    });
    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      return;
    }
    setCampusIssues(prev =>
      prev.map(x =>
        x.id === issue.id ? { ...x, vote_count: res.data.vote_count, voted: res.data.voted } : x,
      ),
    );
  }

  // Toggle "Show on Board" handler (Mine tab)
  async function toggleBoard(r: Report) {
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
    loadCampus();
  }

  // Delete personal report (Mine tab)
  function confirmDelete(r: Report) {
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
          } else {
            setMyReports(prev => prev.filter(x => x.id !== r.id));
            setCampusIssues(prev => prev.filter(x => x.id !== r.id));
            toast({ type: 'success', title: t.common.done, message: 'Report removed' });
          }
        },
      },
    ]);
  }

  // Compute counts for active tab
  const counts = useMemo(() => {
    const list = activeTab === 'Campus' ? campusIssues : myReports;
    const m: Record<string, number> = { All: list.length };
    list.forEach(r => {
      m[r.status] = (m[r.status] || 0) + 1;
    });
    return m;
  }, [activeTab, campusIssues, myReports]);

  // Filtered datasets
  const filteredCampus = useMemo(() => {
    return campusIssues.filter(r => filter === 'All' || r.status === filter);
  }, [campusIssues, filter]);

  const filteredMine = useMemo(() => {
    return myReports.filter(r => filter === 'All' || r.status === filter);
  }, [myReports, filter]);

  const isLoading = activeTab === 'Campus' ? campusLoading : myReportsLoading;
  const currentCount = counts[filter] ?? 0;
  const filterLabel = filter === 'All' ? t.common.all ?? 'All Statuses' : (t.status[filter] ?? filter);

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      {/* Permanent Header - Title never changes on tab switch */}
      <SubBar
        title={t.reports?.reportIssuesTitle ?? 'Report Issues'}
        onBack={() => navigation.goBack()}
      />

      {/* 58dp Dual Tab Switcher - 0ms Instant Toggle */}
      <View style={styles.tabContainer}>
        <SegmentedTabs<TabKey>
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={tab => setActiveTab(tab)}
        />
      </View>

      {/* 58dp Full-Width Action Bar */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionBar58, { backgroundColor: C.brand }]}
          onPress={() => navigation.navigate('ReportForm')}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={20} color="#ffffff" />
          <Text style={[styles.actionBarTxt, { fontFamily: FontFamily.jakartaBold }]}>
            {t.reports.newReport ?? 'Report an Issue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 58dp Full-Width Status Dropdown Bar */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBar58, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => setStatusModalOpen(true)}
          activeOpacity={0.75}
        >
          <View style={styles.filterBarLeft}>
            <Feather name="filter" size={17} color={C.brand} />
            <Text style={[styles.filterBarTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {`${t.reports.filterStatus ?? 'Status'}: ${filterLabel} (${currentCount})`}
            </Text>
          </View>
          <Feather name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Feed Container */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonList rows={4} />
        </View>
      ) : loadError ? (
        <View style={styles.errorContainer}>
          <LoadError onRetry={loadAll} />
        </View>
      ) : activeTab === 'Campus' ? (
        /* CAMPUS BOARD FEED */
        <FlatList
          data={filteredCampus}
          keyExtractor={r => r.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.brand}
              colors={[C.brand]}
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.emptyIconSlot}>
                <Feather name="check-circle" size={32} color={C.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.campusIssues.emptyTitle ?? 'No issues on the board'}
              </Text>
              <Text style={[styles.emptyBody, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.campusIssues.emptyBody ?? 'When students share issues publicly, they show up here.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyCtaBtn, { backgroundColor: C.brand }]}
                onPress={() => navigation.navigate('ReportForm')}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={16} color="#ffffff" />
                <Text style={[styles.emptyCtaTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.reports.newReport ?? 'Report an Issue'}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: r }) => {
            const cat = CATEGORY_MAP[r.category] ?? CATEGORY_MAP['Other'];
            const tone = statusTone(C, r.status);
            const isBusy = busyVoteIds.has(r.id);

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    borderLeftColor: cat.fg,
                  },
                ]}
              >
                {/* Card Top: Category Icon + Title + Premium Squircle Status Badge */}
                <View style={styles.cardTop}>
                  <View style={styles.catIconWrap}>
                    <Icon name={cat.icon} size={32} color={C.text} />
                  </View>
                  <View style={styles.cardMetaCol}>
                    <Text
                      style={[styles.categoryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                      numberOfLines={1}
                    >
                      {r.category}
                    </Text>
                    <View style={styles.locationRow}>
                      <Icon name="pin" size={12} color={C.textMuted} />
                      <Text
                        style={[styles.locationTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
                        numberOfLines={1}
                      >
                        {r.building}
                        {r.room ? ` · ${r.room}` : ''} · {timeAgo(r.created_at)}
                      </Text>
                    </View>
                  </View>
                  {/* Premium Squircle Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: tone.bg,
                        borderColor: tone.border,
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
                    <Text
                      style={[styles.statusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}
                    >
                      {t.status[r.status] ?? r.status}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text
                  style={[styles.descriptionTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  numberOfLines={3}
                >
                  {r.description}
                </Text>

                {/* Card Footer: Affected Count + Premium Squircle Me Too Button */}
                <View style={[styles.cardFooterRow, { borderTopColor: C.border }]}>
                  <Text
                    style={[styles.affectedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
                    numberOfLines={1}
                  >
                    {r.vote_count > 0 ? t.campusIssues.affected(r.vote_count) : t.campusIssues.beFirst}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.voteBtn,
                      r.voted
                        ? { backgroundColor: C.brand, borderColor: C.brand }
                        : { backgroundColor: C.surface2, borderColor: C.border },
                    ]}
                    onPress={() => meToo(r)}
                    disabled={isBusy}
                    activeOpacity={0.8}
                  >
                    <Feather name="thumbs-up" size={13} color={r.voted ? '#ffffff' : C.text2} />
                    <Text
                      style={[
                        styles.voteBtnTxt,
                        { color: r.voted ? '#ffffff' : C.text2, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {t.campusIssues.meToo}
                    </Text>
                    {r.vote_count > 0 && (
                      <Text
                        style={[
                          styles.voteBtnCount,
                          {
                            color: r.voted ? 'rgba(255,255,255,0.9)' : C.textMuted,
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
      ) : (
        /* MY REPORTS FEED */
        <FlatList
          data={filteredMine}
          keyExtractor={r => r.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.brand}
              colors={[C.brand]}
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.emptyIconSlot}>
                <Feather name="file-text" size={32} color={C.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.reports.noReportsTitle ?? 'No reports submitted'}
              </Text>
              <Text style={[styles.emptyBody, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.reports.noReportsBody ?? 'Track campus issues and maintenance requests you reported.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyCtaBtn, { backgroundColor: C.brand }]}
                onPress={() => navigation.navigate('ReportForm')}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={16} color="#ffffff" />
                <Text style={[styles.emptyCtaTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.reports.newReport ?? 'Report an Issue'}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: r }) => {
            const cat = CATEGORY_MAP[r.category] ?? CATEGORY_MAP['Other'];
            const tone = statusTone(C, r.status);
            const isOnBoard = boardMap[r.id] === true;

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    borderLeftColor: cat.fg,
                  },
                ]}
              >
                {/* Card Top: Category Icon + Title + Premium Squircle Status Badge */}
                <View style={styles.cardTop}>
                  <View style={styles.catIconWrap}>
                    <Icon name={cat.icon} size={32} color={C.text} />
                  </View>
                  <View style={styles.cardMetaCol}>
                    <Text
                      style={[styles.categoryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                      numberOfLines={1}
                    >
                      {r.category}
                    </Text>
                    <View style={styles.locationRow}>
                      <Icon name="pin" size={12} color={C.textMuted} />
                      <Text
                        style={[styles.locationTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
                        numberOfLines={1}
                      >
                        {r.building}
                        {r.room ? ` · ${r.room}` : ''} · {timeAgo(r.created_at)}
                      </Text>
                    </View>
                  </View>
                  {/* Premium Squircle Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: tone.bg,
                        borderColor: tone.border,
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
                    <Text
                      style={[styles.statusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}
                    >
                      {t.status[r.status] ?? r.status}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text
                  style={[styles.descriptionTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  numberOfLines={3}
                >
                  {r.description}
                </Text>

                {/* Card Footer: Show on Board Toggle + View Details Action */}
                <View style={[styles.cardFooterRow, { borderTopColor: C.border }]}>
                  <View style={styles.boardToggleRow}>
                    <Text
                      style={[styles.boardToggleTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}
                    >
                      {t.campusIssues.onBoard ?? 'On Board'}
                    </Text>
                    <LiquidToggle
                      checked={isOnBoard}
                      onCheckedChange={() => toggleBoard(r)}
                      size="sm"
                    />
                  </View>

                  <View style={styles.actionsRightRow}>
                    {r.status === 'Open' && (
                      <TouchableOpacity
                        style={[styles.deleteIconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                        onPress={() => confirmDelete(r)}
                        hitSlop={6}
                      >
                        <Feather name="trash-2" size={14} color={C.danger} />
                      </TouchableOpacity>
                    )}
                    {/* Premium Squircle View Details Button */}
                    <TouchableOpacity
                      style={[styles.viewDetailsBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                      onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[styles.viewDetailsTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}
                      >
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
      )}

      {/* 58dp Status Dropdown Bottom Sheet Modal */}
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
              const tone = s === 'All' ? { fg: C.brand } : statusTone(C, s);

              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.modalRow58,
                    {
                      backgroundColor: active ? C.surface2 : 'transparent',
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
                    {s !== 'All' && (
                      <View style={[styles.statusDotLg, { backgroundColor: tone.fg }]} />
                    )}
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
                    <Text
                      style={[
                        styles.modalRowCount,
                        {
                          color: active ? C.brand : C.textMuted,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
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

  tabContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 10,
    paddingBottom: 6,
  } as ViewStyle,

  actionContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 5,
  } as ViewStyle,

  actionBar58: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,

  actionBarTxt: {
    color: '#ffffff',
    fontSize: 15.5,
  } as TextStyle,

  filterContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 5,
    paddingBottom: 10,
  } as ViewStyle,

  filterBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  filterBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,

  filterBarTxt: {
    fontSize: 14.5,
  } as TextStyle,

  loadingContainer: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 10,
  } as ViewStyle,

  errorContainer: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
  } as ViewStyle,

  listContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 24,
  } as ViewStyle,

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    padding: 14,
    marginBottom: 12,
  } as ViewStyle,

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,

  catIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  cardMetaCol: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  categoryTxt: {
    fontSize: 14.5,
  } as TextStyle,

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2.5,
  } as ViewStyle,

  locationTxt: {
    fontSize: 11.5,
    flexShrink: 1,
  } as TextStyle,

  // Premium Squircle Status Badge (borderRadius: 8)
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5.5,
    paddingHorizontal: 8.5,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,

  statusTxt: {
    fontSize: 11,
    letterSpacing: 0.2,
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

  // Premium Squircle "Me Too" Button (borderRadius: 8)
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,

  voteBtnTxt: {
    fontSize: 12.5,
  } as TextStyle,

  voteBtnCount: {
    fontSize: 12.5,
  } as TextStyle,

  boardToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,

  boardToggleTxt: {
    fontSize: 12.5,
  } as TextStyle,

  actionsRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Premium Squircle "View Details" Button (borderRadius: 8)
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
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
