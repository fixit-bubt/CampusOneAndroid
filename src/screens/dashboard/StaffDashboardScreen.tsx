import React, { useState, useCallback, useMemo, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { TopBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout, Accent } from '../../theme';
import { useT } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { fetchPeople } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { getUnreadNotificationCount } from '../../services/notificationsService';
import { declineReport } from '../../services/reportsService';
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
  reporter_name?: string;
  assigned_staff_id?: string;
  title?: string;
  location?: string;
}

type FilterTab = 'all' | 'active' | 'resolved';

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
  onAdvance,
  onDecline,
  onPress,
}: {
  r: Report;
  C: any;
  statusLabel: string;
  onAdvance: (id: string, status: string) => void;
  onDecline: (id: string) => void;
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

      {r.status === 'Open' && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.brand }]}
          onPress={(e) => {
            e?.stopPropagation?.();
            onAdvance(r.id, 'In Progress');
          }}
          activeOpacity={0.8}
        >
          <Icon name="pulse" size={16} color="#ffffff" />
          <Text style={[styles.actionTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
            {t.dash.startWork}
          </Text>
        </TouchableOpacity>
      )}

      {r.status === 'In Progress' && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.success }]}
          onPress={(e) => {
            e?.stopPropagation?.();
            onAdvance(r.id, 'Resolved');
          }}
          activeOpacity={0.8}
        >
          <Icon name="check" size={16} color="#ffffff" />
          <Text style={[styles.actionTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
            {t.dash.markResolved}
          </Text>
        </TouchableOpacity>
      )}

      {r.status === 'Resolved' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border }}>
          <Icon name="check" size={12} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaBold, fontSize: 11.5 }}>
            {t.common.done}
          </Text>
        </View>
      )}

      {(r.status === 'Open' || r.status === 'In Progress') && (
        <TouchableOpacity
          style={[styles.declineBtn, { borderColor: C.border }]}
          onPress={(e) => {
            e?.stopPropagation?.();
            onDecline(r.id);
          }}
          activeOpacity={0.75}
        >
          <Icon name="x" size={14} color={C.textMuted} />
          <Text style={[styles.declineTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.dash.decline}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const Separator = memo(function Separator() {
  return <View style={{ height: 12 }} />;
});

export function StaffDashboardScreen({ navigation }: any) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();

  const cacheKey = CacheKeys.STAFF_REPORTS(user?.id ?? 'anon');
  const [reports, setReports] = useState<Report[]>(() => getCacheSync<Report[]>(cacheKey) ?? []);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(() => reports.length === 0);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || (profile && profile.role !== 'staff' && profile.role !== 'admin')) return;
    setError(false);
    try {
      // 1. Optimistic cached data check
      const cached = await getCache<Report[]>(cacheKey);
      if (cached && cached.length > 0) {
        setReports(cached);
        setLoading(false);
      }

      // 2. Fresh network fetch
      const { data, error: fetchErr } = await supabase
        .from('reports')
        .select('*')
        .eq('assigned_staff_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(40);

      if (fetchErr) {
        if (!cached || cached.length === 0) setError(true);
        return;
      }

      if (data) {
        const people = await fetchPeople((data as any[]).map(r => r.reporter_id));
        const mapped: Report[] = data.map((r: any) => ({
          ...r,
          reporter_name: people[r.reporter_id]?.full_name,
          title: r.description?.split('\n')[0] ?? '',
          location: [r.building, r.room].filter(Boolean).join(' · '),
        }));
        setReports(mapped);
        setCache(cacheKey, mapped);
      }

      const nRes = await getUnreadNotificationCount(user.id);
      if (nRes.ok) setUnread(nRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile, cacheKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const advanceStatus = useCallback(async (reportId: string, newStatus: string) => {
    setReports(prev => {
      const updated = prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r);
      setCache(cacheKey, updated);
      return updated;
    });

    const { error: err } = await supabase.from('reports').update({ status: newStatus }).eq('id', reportId);
    if (err) {
      // Revert on error
      load();
      toast({ type: 'error', title: t.common.error, message: err.message });
    }
  }, [cacheKey, load, toast, t.common.error]);

  const declineAssigned = useCallback((reportId: string) => {
    Alert.alert(t.dash.declineTitle, t.dash.declineBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.dash.decline, style: 'destructive',
        onPress: async () => {
          const res = await declineReport(reportId);
          if (!res.ok) { Alert.alert(t.common.error, res.error); return; }
          setReports(prev => {
            const filtered = prev.filter(r => r.id !== reportId);
            setCache(cacheKey, filtered);
            return filtered;
          });
        },
      },
    ]);
  }, [cacheKey, t.dash, t.common]);

  const handlePressCard = useCallback((id: string) => {
    navigation.navigate('ReportDetail', { reportId: id });
  }, [navigation]);

  const activeReports = useMemo(() => reports.filter(r => r.status === 'In Progress' || r.status === 'Open'), [reports]);
  const inProgressReports = useMemo(() => reports.filter(r => r.status === 'In Progress'), [reports]);
  const resolvedReports = useMemo(() => reports.filter(r => r.status === 'Resolved' || r.status === 'Closed'), [reports]);

  const displayedReports = useMemo(() => {
    if (filterTab === 'active') return activeReports;
    if (filterTab === 'resolved') return resolvedReports;
    return reports;
  }, [reports, filterTab, activeReports, resolvedReports]);

  const renderItem = useCallback(({ item: r }: { item: Report }) => {
    return (
      <ReportCard
        r={r}
        C={C}
        statusLabel={t.status[r.status] ?? r.status}
        onAdvance={advanceStatus}
        onDecline={declineAssigned}
        onPress={handlePressCard}
      />
    );
  }, [C, t.status, advanceStatus, declineAssigned, handlePressCard]);

  const keyExtractor = useCallback((r: Report) => r.id, []);

  if (profile && profile.role !== 'staff' && profile.role !== 'admin') {
    return (
      <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>Staff access required</Text>
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
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        ItemSeparatorComponent={Separator}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={
          <View>
            {/* Staff Hero Identity Card */}
            <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.heroRow}>
                <Avatar name={profile?.full_name || 'Staff'} uri={profile?.avatar_url} size="lg" />
                <View style={styles.heroCol}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.tradePill, { backgroundColor: C.brand + '18' }]}>
                      <Icon name="wrench" size={12} color={C.brand} />
                      <Text style={[styles.tradePillTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {profile?.expertise || profile?.department || 'Facilities & Maintenance'}
                      </Text>
                    </View>
                    {activeReports.length > 0 && (
                      <View style={[styles.activePill, { backgroundColor: C.warnBg }]}>
                        <View style={[styles.activeDot, { backgroundColor: C.warn }]} />
                        <Text style={[styles.activePillTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                          {activeReports.length} {t.dash.statOpen.toLowerCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.heroName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
                    {profile?.full_name || 'Campus Maintenance Staff'}
                  </Text>
                  <Text style={[styles.heroSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {profile?.department ? `${profile.department} · Campus Maintenance` : 'BUBT Physical Plant & Maintenance'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3 Interactive 58dp Metric Filter Cards */}
            <View style={styles.statRow}>
              <StatCard
                num={reports.length}
                label={t.dash.statAssigned}
                isSelected={filterTab === 'all'}
                onPress={() => setFilterTab('all')}
                C={C}
              />
              <StatCard
                num={inProgressReports.length}
                label={t.dash.statInProgress}
                isSelected={filterTab === 'active'}
                onPress={() => setFilterTab('active')}
                C={C}
              />
              <StatCard
                num={resolvedReports.length}
                label={t.dash.statResolved}
                isSelected={filterTab === 'resolved'}
                onPress={() => setFilterTab('resolved')}
                C={C}
              />
            </View>

            {/* Section Header */}
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.dash.assignedToMe}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('AssignedToMe')} activeOpacity={0.8}>
                <Text style={[styles.seeAll, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {t.common.seeAll}
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
          ) : error && reports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Icon name="alert" size={32} color={C.danger} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold, marginTop: 4 }]}>
                {t.common.error}
              </Text>
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Failed to load maintenance workorders. Please check your connection.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: C.brand, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 12 }}
                onPress={load}
                activeOpacity={0.85}
              >
                <Text style={{ color: C.white, fontFamily: FontFamily.jakartaBold, fontSize: 13 }}>{t.common.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Icon name="check" size={32} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.dash.allClear}
              </Text>
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {filterTab === 'resolved' ? 'No resolved tickets in this view.' : t.dash.noReportsAssigned}
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  // Hero Card
  heroCard: {
    padding: 16,
    borderRadius: 18,
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
  tradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  tradePillTxt: {
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
  heroName: {
    fontSize: 18,
    lineHeight: 24,
  } as any,
  heroSub: {
    fontSize: 12,
    marginTop: 2,
  } as any,

  // Stat Counters
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
    marginTop: 6,
    marginBottom: 12,
  } as ViewStyle,
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as any,
  seeAll: {
    fontSize: 13,
  } as any,

  // Workorder Cards
  reportCard: {
    padding: 16,
    borderRadius: 18,
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
    letterSpacing: 0.3,
  } as any,
  reportTitle: {
    fontSize: 15,
  } as any,
  reportLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  } as ViewStyle,
  reportLocTxt: {
    fontSize: 12.5,
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
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
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
    fontSize: 11.5,
    marginLeft: 'auto',
  } as any,
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 13,
    marginTop: 12,
  } as ViewStyle,
  actionTxt: {
    fontSize: 13.5,
  } as any,
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 8,
  } as ViewStyle,
  declineTxt: {
    fontSize: 12.5,
  } as any,

  // Empty state
  emptyCard: {
    padding: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 16,
  } as any,
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  } as any,
});
