import React, { useState, useCallback, useMemo, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet,
  RefreshControl, Modal, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { getTradeLabel, isTradeMatch } from '../../utils/tradeMatcher';
import { useTheme } from '../../hooks/useTheme';
import { TopBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout, Accent } from '../../theme';
import { useT } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { getUnreadNotificationCount } from '../../services/notificationsService';
import { getCacheSync, getCache, setCache, CacheKeys } from '../../services/cacheService';

const ISSUE_MAP: Record<string, { icon: string; fg: string }> = {
  electrical: { icon: 'bolt',     fg: Accent.gold },
  plumbing:   { icon: 'droplets', fg: Accent.sky },
  cleanliness:{ icon: 'sparkles', fg: Accent.teal },
  it_network: { icon: 'wifi',     fg: Accent.purple },
  furniture:  { icon: 'box',      fg: Accent.amber },
  safety:     { icon: 'shield',   fg: Accent.red },
  other:      { icon: 'sliders',  fg: Accent.slate },
};

function issueKey(cat?: string): string {
  const c = (cat ?? '').toLowerCase();
  if (c.includes('it') || c.includes('network')) return 'it_network';
  if (c.includes('safety') || c.includes('security')) return 'safety';
  if (c.includes('clean')) return 'cleanliness';
  if (c.includes('plumb')) return 'plumbing';
  if (c.includes('electric')) return 'electrical';
  if (c.includes('furnitur')) return 'furniture';
  return 'other';
}

function statusTone(C: any, status: string): { fg: string; bg: string; border?: string } {
  switch (status) {
    case 'In Progress': return { fg: C.brand,     bg: C.brand + '14', border: C.brand + '30' };
    case 'Resolved':    return { fg: C.textMuted, bg: C.surface2,     border: C.border };
    case 'Closed':      return { fg: C.textMuted, bg: C.surface2,     border: C.border };
    case 'Rejected':    return { fg: C.danger,    bg: C.dangerBg,     border: C.danger + '30' };
    case 'Open':
    default:            return { fg: C.text,      bg: C.surface2,     border: C.border };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

interface Report {
  id: string;
  code?: string;
  description: string;
  building: string;
  room: string;
  category: string;
  status: string;
  created_at: string;
  reporter_id?: string;
  reporter_name?: string;
  assigned_staff_id?: string;
  assignee_name?: string;
  title?: string;
  location?: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  department: string;
  expertise?: string | null;
}

interface AdminStats {
  unassigned: number;
  active: number;
  resolved: number;
}

type FilterTab = 'unassigned' | 'active' | 'done';

const StatCard = memo(function StatCard({
  num,
  label,
  isSelected,
  onPress,
  C,
}: {
  num: number;
  label: string;
  isSelected?: boolean;
  onPress?: () => void;
  C: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.statCard,
        {
          backgroundColor: isSelected ? (C.brand + '14') : C.surface,
          borderColor: isSelected ? C.brand : C.border,
          borderWidth: isSelected ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.statNum, { color: isSelected ? C.brand : C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{num}</Text>
      <Text
        style={[styles.statLabel, { color: isSelected ? C.brand : C.textMuted, fontFamily: FontFamily.jakartaBold }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const ReportCard = memo(function ReportCard({
  r,
  C,
  statusLabel,
  onAssign,
  onPress,
}: {
  r: Report;
  C: any;
  statusLabel: string;
  onAssign: (r: Report) => void;
  onPress: (id: string) => void;
}) {
  const t = useT();
  const issueConf = ISSUE_MAP[issueKey(r.category)] ?? ISSUE_MAP.other;
  const statusConf = statusTone(C, r.status);
  const code = r.code ?? ('RPT-' + r.id.replace(/\D/g, '').padStart(4, '0').slice(-4));

  return (
    <TouchableOpacity
      style={[styles.reportCard, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={() => onPress(r.id)}
      activeOpacity={0.78}
    >
      <View style={styles.reportTop}>
        <View style={styles.issueIcon}>
          <Icon name={issueConf.icon} size={32} color={C.text} />
        </View>
        <View style={styles.reportBody}>
          <View style={styles.codeRow}>
            <Text style={[styles.codeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {code}
            </Text>
          </View>
          <Text style={[styles.reportTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {r.title}
          </Text>
          <View style={styles.reportLoc}>
            <Icon name="pin" size={13} color={C.textMuted} />
            <Text style={[styles.reportLocTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              {r.location || 'BUBT Campus'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusConf.bg, borderColor: statusConf.border ?? C.border, borderWidth: 1 }]}>
          {r.status === 'Resolved' || r.status === 'Closed' ? (
            <Icon name="check" size={11} color={statusConf.fg} />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: statusConf.fg }]} />
          )}
          <Text style={[styles.statusTxt, { color: statusConf.fg, fontFamily: FontFamily.jakartaBold }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.reportMeta}>
        {r.reporter_name ? (
          <View style={styles.byRow}>
            <Avatar name={r.reporter_name} size="xs" />
            <Text style={[styles.byName, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {r.reporter_name}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.reportTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {timeAgo(r.created_at)}
        </Text>
      </View>

      {/* Action Strip: Only Open/Unassigned reports require full-width action button */}
      {(!r.assigned_staff_id || r.status === 'Open') && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.brand }]}
          onPress={(e) => {
            e?.stopPropagation?.();
            onAssign(r);
          }}
          activeOpacity={0.8}
        >
          <Icon name="userPlus" size={16} color="#ffffff" />
          <Text style={[styles.actionTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
            {t.dash.assignBtn || 'Assign Staff'}
          </Text>
        </TouchableOpacity>
      )}

      {/* In Progress: Clean technician row with compact reassign action */}
      {r.status === 'In Progress' && (
        <View style={[styles.staffRow, { borderTopColor: C.border }]}>
          <View style={styles.staffInfo}>
            <Avatar name={r.assignee_name || 'Staff'} size="xs" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.staffLabelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Assigned
              </Text>
              <Text style={[styles.staffNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {r.assignee_name || 'Staff Member'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.reassignCompactBtn, { borderColor: C.brand }]}
            onPress={(e) => {
              e?.stopPropagation?.();
              onAssign(r);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.reassignCompactTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              {t.dash.reassign ?? 'Reassign'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Resolved: Quiet metadata row with check, zero fake buttons */}
      {(r.status === 'Resolved' || r.status === 'Closed') && r.assignee_name && (
        <View style={[styles.staffRow, { borderTopColor: C.border }]}>
          <View style={styles.staffInfo}>
            <Avatar name={r.assignee_name} size="xs" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.staffLabelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Resolved by
              </Text>
              <Text style={[styles.staffNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {r.assignee_name}
              </Text>
            </View>
          </View>
          <View style={[styles.resolvedBadgeCompact, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Icon name="check" size={11} color={C.textMuted} />
            <Text style={[styles.resolvedBadgeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.common.done}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

const Separator = memo(function Separator() {
  return <View style={{ height: 12 }} />;
});

export function AdminDashboardScreen({ navigation }: any) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();

  const cacheReportsKey = CacheKeys.ADMIN_REPORTS;
  const cacheStatsKey = CacheKeys.ADMIN_STATS;

  const [reports, setReports] = useState<Report[]>(() => getCacheSync<Report[]>(cacheReportsKey) ?? []);
  const [stats, setStats] = useState<AdminStats>(() => getCacheSync<AdminStats>(cacheStatsKey) ?? { unassigned: 0, active: 0, resolved: 0 });
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('unassigned');
  const [assignTarget, setAssignTarget] = useState<Report | null>(null);
  const [assignTab, setAssignTab] = useState<'trade' | 'all'>('trade');
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(() => reports.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (profile && profile.role !== 'admin') return;
    try {
      // 1. Optimistic cached data check
      const [cachedReports, cachedStats] = await Promise.all([
        getCache<Report[]>(cacheReportsKey),
        getCache<AdminStats>(cacheStatsKey),
      ]);
      if (cachedReports && cachedReports.length > 0) {
        setReports(cachedReports);
        setLoading(false);
      }
      if (cachedStats) {
        setStats(cachedStats);
      }

      // 2. Parallel network fetch: live reports, staff directory, and exact SQL counts
      const [reportsRes, staffRes, unassignedCountRes, activeCountRes, resolvedCountRes, unreadRes] = await Promise.all([
        supabase
          .from('reports')
          .select('*, profiles!reporter_id(full_name), assignee:profiles!assigned_staff_id(full_name)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('profiles')
          .select('id, full_name, department, expertise')
          .eq('role', 'staff')
          .limit(100),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Open')
          .is('assigned_staff_id', null)
          .is('deleted_at', null),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .not('assigned_staff_id', 'is', null)
          .in('status', ['Open', 'In Progress'])
          .is('deleted_at', null),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Resolved', 'Closed'])
          .is('deleted_at', null),
        getUnreadNotificationCount(user?.id),
      ]);

      if (reportsRes.data) {
        const mapped: Report[] = reportsRes.data.map((r: any) => ({
          ...r,
          reporter_name: r.profiles?.full_name,
          assignee_name: r.assignee?.full_name,
          title: r.description?.split('\n')[0] ?? '',
          location: [r.building, r.room].filter(Boolean).join(' · '),
        }));
        setReports(mapped);
        setCache(cacheReportsKey, mapped);
      }

      if (staffRes.data) {
        setStaffList(staffRes.data as StaffMember[]);
      }

      const newStats: AdminStats = {
        unassigned: unassignedCountRes.count ?? 0,
        active: activeCountRes.count ?? 0,
        resolved: resolvedCountRes.count ?? 0,
      };
      setStats(newStats);
      setCache(cacheStatsKey, newStats);

      if (unreadRes.ok) setUnread(unreadRes.data);
    } finally {
      setLoading(false);
    }
  }, [profile, user?.id, cacheReportsKey, cacheStatsKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handlePressCard = useCallback((id: string) => {
    navigation.navigate('ReportDetail', { reportId: id });
  }, [navigation]);

  // Active assignment counts per staff member from the current loaded pool
  const activeByStaff = useMemo(() => {
    const map: Record<string, number> = {};
    reports.forEach((r) => {
      if (r.assigned_staff_id && (r.status === 'Open' || r.status === 'In Progress')) {
        map[r.assigned_staff_id] = (map[r.assigned_staff_id] ?? 0) + 1;
      }
    });
    return map;
  }, [reports]);

  // Staff ranked by trade expertise match with the target report category
  const assignCat = assignTarget?.category;
  const tradeLabel = useMemo(() => getTradeLabel(assignCat), [assignCat]);

  const matchingStaff = useMemo(() => {
    if (!assignCat) return staffList;
    return staffList.filter((s) => isTradeMatch(s.expertise, assignCat));
  }, [staffList, assignCat]);

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
        label: `All Staff (${staffList.length})`,
        icon: 'users',
        color: C.brand,
      },
    ];
  }, [tradeLabel, matchingStaff.length, staffList.length, C.brand]);

  const displayedAssignStaff = useMemo(() => {
    if (assignTab === 'trade' && matchingStaff.length > 0) {
      return matchingStaff;
    }
    return staffList;
  }, [assignTab, matchingStaff, staffList]);

  const handleOpenAssign = useCallback((r: Report) => {
    setAssignTab('trade');
    setAssignTarget(r);
  }, []);

  // 1-tap assign with instant optimistic local mutation.
  // Note: Admin ONLY assigns the staff member; status remains 'Open' so the assigned
  // technician taps 'Start Work' in their Staff Dashboard to advance progress to 'In Progress'.
  const assignReport = useCallback(async (reportId: string, staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    const staffName = staff?.full_name ?? 'Staff';

    // 1. Optimistic state updates
    setReports((prev) => {
      const updated = prev.map((r) =>
        r.id === reportId
          ? { ...r, assigned_staff_id: staffId, assignee_name: staffName }
          : r
      );
      setCache(cacheReportsKey, updated);
      return updated;
    });

    setStats((prev) => {
      const updated = {
        ...prev,
        unassigned: Math.max(0, prev.unassigned - 1),
        active: prev.active + 1,
      };
      setCache(cacheStatsKey, updated);
      return updated;
    });

    setAssignTarget(null);

    // 2. Network write: only update assigned_staff_id; never mutate status directly
    const { error } = await supabase
      .from('reports')
      .update({ assigned_staff_id: staffId })
      .eq('id', reportId);

    if (error) {
      toast({ type: 'error', title: t.common.error, message: error.message });
      load(); // Revert on failure
    }
  }, [staffList, cacheReportsKey, cacheStatsKey, toast, t.common.error, load]);

  // Filtered reports strictly by the active filter tab
  const displayedReports = useMemo(() => {
    if (filterTab === 'unassigned') {
      return reports.filter((r) => !r.assigned_staff_id && r.status !== 'Resolved' && r.status !== 'Closed');
    }
    if (filterTab === 'active') {
      return reports.filter((r) => !!r.assigned_staff_id && r.status !== 'Resolved' && r.status !== 'Closed');
    }
    if (filterTab === 'done') {
      return reports.filter((r) => r.status === 'Resolved' || r.status === 'Closed');
    }
    return reports;
  }, [reports, filterTab]);


  const renderItem = useCallback(({ item: r }: { item: Report }) => {
    return (
      <ReportCard
        r={r}
        C={C}
        statusLabel={t.status[r.status] ?? r.status}
        onAssign={handleOpenAssign}
        onPress={handlePressCard}
      />
    );
  }, [C, t.status, handlePressCard, handleOpenAssign]);

  const keyExtractor = useCallback((r: Report) => r.id, []);

  if (profile && profile.role !== 'admin') {
    return (
      <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>Admin access required</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <TopBar
        profile={profile}
        unread={unread}
        onBell={() => navigation.navigate('Notifications')}
      />

      <FlatList
        data={displayedReports}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.brand}
            colors={[C.brand]}
          />
        }
        ItemSeparatorComponent={Separator}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={
          <View>
            {/* Executive Admin Hero Identity Card */}
            <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.heroRow}>
                <Avatar name={profile?.full_name || 'Admin'} uri={profile?.avatar_url} size="lg" />
                <View style={styles.heroCol}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.adminPill, { backgroundColor: C.brand + '18' }]}>
                      <Icon name="shield" size={12} color={C.brand} />
                      <Text style={[styles.adminPillTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        System Administrator
                      </Text>
                    </View>
                    {stats.unassigned > 0 ? (
                      <View style={[styles.activePill, { backgroundColor: C.brand + '15', borderColor: C.brand + '30', borderWidth: 1 }]}>
                        <View style={[styles.activeDot, { backgroundColor: C.brand }]} />
                        <Text style={[styles.activePillTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                          {stats.unassigned} {t.dash.statUnassigned.toLowerCase()}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.allClearPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                        <Icon name="check" size={11} color={C.textMuted} />
                        <Text style={[styles.allClearPillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          {t.dash.allClear}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.heroName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
                    {profile?.full_name || 'Administrator'}
                  </Text>
                  <Text style={[styles.heroSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Campus Infrastructure & Operations
                  </Text>
                </View>
              </View>
            </View>

            {/* Interactive 3-Stat Counters: Tap to filter */}
            <View style={styles.statRow}>
              <StatCard
                num={stats.unassigned}
                label={t.dash.statUnassigned}
                isSelected={filterTab === 'unassigned'}
                onPress={() => setFilterTab('unassigned')}
                C={C}
              />
              <StatCard
                num={stats.active}
                label={t.dash.statInProgress}
                isSelected={filterTab === 'active'}
                onPress={() => setFilterTab('active')}
                C={C}
              />
              <StatCard
                num={stats.resolved}
                label={t.dash.statResolved}
                isSelected={filterTab === 'done'}
                onPress={() => setFilterTab('done')}
                C={C}
              />
            </View>

            {/* Section Header with Direct All Reports Route */}
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
                {filterTab === 'unassigned'
                  ? t.dash.needsAssignment
                  : filterTab === 'active'
                    ? t.dash.statInProgress.toUpperCase()
                    : t.dash.statResolved.toUpperCase()} ({displayedReports.length})
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllReports')} activeOpacity={0.8}>
                <Text style={[styles.seeAll, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {t.dash.manageAllReports ?? t.common.seeAll}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading && reports.length === 0 ? (
            <View style={{ paddingVertical: 36, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={C.brand} />
            </View>
          ) : (
            <View style={[styles.allClearCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Icon name="check" size={28} color={C.success} />
              <Text style={[styles.allClearTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {filterTab === 'unassigned' ? t.dash.allReportsAssigned : t.dash.allClear}
              </Text>
              <Text style={[styles.allClearSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {filterTab === 'unassigned'
                  ? 'No open reports currently need maintenance assignment.'
                  : 'No records found under this filter.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
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
                {assignTarget?.code ?? 'RPT'} · {assignTarget?.category} · {assignTarget?.location || 'Campus'}
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
              const activeCount = activeByStaff[s.id] ?? 0;
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
                  onPress={() => assignTarget && assignReport(assignTarget.id, s.id)}
                  activeOpacity={0.72}
                >
                  <Avatar name={s.full_name} size="sm" />
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
                      {s.expertise ?? s.department ?? t.dash.noTradeSet} · {activeCount === 1 ? '1 active job' : `${activeCount} active jobs`}
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
                    View All Campus Staff ({staffList.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  // Executive Hero Card
  heroCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  } as ViewStyle,
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  } as ViewStyle,
  heroCol: {
    flex: 1,
  } as ViewStyle,
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  } as ViewStyle,
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  adminPillTxt: {
    fontSize: 11,
    letterSpacing: 0.2,
  } as any,
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  activePillTxt: {
    fontSize: 10.5,
  } as any,
  allClearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  allClearPillTxt: {
    fontSize: 10.5,
  } as any,
  heroName: {
    fontSize: 18,
    lineHeight: 24,
  } as any,
  heroSub: {
    fontSize: 12,
    marginTop: 2,
  } as any,

  // Balanced 3-Stat Counters Row - Standard 58dp Metric Cards
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  } as ViewStyle,
  statCard: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 2,
  } as ViewStyle,
  statNum: {
    fontSize: 18,
    lineHeight: 22,
  } as any,
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  } as any,


  // Section Header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 10,
  } as ViewStyle,
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as any,
  seeAll: {
    fontSize: 13,
  } as any,

  // Report Card (72dp Touch Target Standard)
  reportCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  reportTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  issueIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  reportBody: {
    flex: 1,
  } as ViewStyle,
  codeRow: {
    marginBottom: 2,
  } as ViewStyle,
  codeTxt: {
    fontSize: 11,
    letterSpacing: 0.4,
  } as any,
  reportTitle: {
    fontSize: 14,
    lineHeight: 19,
  } as any,
  reportLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  } as ViewStyle,
  reportLocTxt: {
    fontSize: 12,
  } as any,
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  } as ViewStyle,
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  statusTxt: {
    fontSize: 11,
  } as any,
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  } as ViewStyle,
  byRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  byName: {
    fontSize: 12,
  } as any,
  reportTime: {
    fontSize: 11,
    marginLeft: 'auto',
  } as any,

  // Action Buttons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    borderRadius: 12,
    marginTop: 12,
  } as ViewStyle,
  actionTxt: {
    fontSize: 13,
  } as any,
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  } as ViewStyle,
  reassignTxt: {
    fontSize: 13,
  } as any,
  resolvedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 38,
    borderRadius: 12,
    marginTop: 12,
  } as ViewStyle,
  resolvedTxt: {
    fontSize: 12.5,
  } as any,

  // Empty State Card
  allClearCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginVertical: 12,
  } as ViewStyle,
  allClearTitle: {
    fontSize: 15,
    marginTop: 4,
  } as any,
  allClearSub: {
    fontSize: 12.5,
    textAlign: 'center',
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
