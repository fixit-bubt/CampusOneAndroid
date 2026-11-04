import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  RefreshControl,
  Platform,
  type ViewStyle,
  type TextStyle,
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

interface StatusOption {
  id: StatusFilter;
  label: string;
  icon: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { id: 'all',         label: 'All Statuses', icon: 'layers' },
  { id: 'Open',        label: 'Open',         icon: 'alert' },
  { id: 'In Progress', label: 'In Progress',  icon: 'clock' },
  { id: 'Resolved',    label: 'Resolved',     icon: 'checkAll' },
  { id: 'Rejected',    label: 'Rejected',     icon: 'close' },
  { id: 'Closed',      label: 'Closed',       icon: 'inbox' },
];

interface CategoryOption {
  id: string;
  label: string;
  icon: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'All',               label: 'All Categories',   icon: 'layers' },
  { id: 'Electrical',        label: 'Electrical',        icon: 'bolt' },
  { id: 'Plumbing',          label: 'Plumbing',          icon: 'droplets' },
  { id: 'Cleanliness',       label: 'Cleanliness',       icon: 'sparkles' },
  { id: 'IT / Network',      label: 'IT / Network',      icon: 'wifi' },
  { id: 'Furniture',         label: 'Furniture',         icon: 'box' },
  { id: 'Safety / Security', label: 'Safety / Security', icon: 'shield' },
  { id: 'Other',             label: 'Other',             icon: 'sliders' },
];

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

function statusTone(C: any, status: string): { fg: string; bg: string; border: string } {
  switch (status) {
    case 'In Progress':
      return { fg: C.brand, bg: C.brand + '18', border: C.brand + '40' };
    case 'Resolved':
      return { fg: C.success, bg: C.successBg, border: C.success + '40' };
    case 'Closed':
      return { fg: C.textMuted, bg: C.surface2, border: C.border };
    case 'Rejected':
      return { fg: C.danger, bg: C.dangerBg, border: C.danger + '40' };
    case 'Open':
    default:
      return { fg: C.warn, bg: C.warnBg, border: C.warn + '40' };
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

interface ReportWithProfile extends Report {
  profiles: { full_name: string; avatar_url?: string | null } | null;
  assignee: { full_name: string; avatar_url?: string | null; expertise?: string | null } | null;
}

const ReportAdminCard = memo(function ReportAdminCard({
  r,
  voteCount,
  onPress,
  onAssign,
  isAdmin,
  C,
}: {
  r: ReportWithProfile;
  voteCount: number;
  onPress: (id: string) => void;
  onAssign: (r: ReportWithProfile) => void;
  isAdmin: boolean;
  C: any;
}) {
  const issueConf = ISSUE_MAP[issueKey(r.category)] ?? ISSUE_MAP.other;
  const statusConf = statusTone(C, r.status);
  const code = r.code ?? ('RPT-' + r.id.replace(/\D/g, '').padStart(4, '0').slice(-4));
  const reporterName = r.profiles?.full_name;
  const assigneeName = r.assignee?.full_name;
  const isResolvedOrClosed = r.status === 'Resolved' || r.status === 'Closed' || r.status === 'Rejected';

  return (
    <TouchableOpacity
      style={[styles.reportCard, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={() => onPress(r.id)}
      activeOpacity={0.78}
    >
      {/* Top Header: 32dp Category Icon, Code, Title, Location & Status Badge */}
      <View style={styles.cardTop}>
        <View style={styles.issueIconSlot}>
          <Icon name={issueConf.icon} size={32} color={C.text} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.codeRow}>
            <Text style={[styles.cardCode, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {code}
            </Text>
          </View>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
            {r.description.split('\n')[0]}
          </Text>
          <View style={styles.locRow}>
            <Icon name="pin" size={12} color={C.textMuted} />
            <Text style={[styles.loc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              {r.building}{r.room ? ` · Room ${r.room}` : ''}
              {r.created_at ? ` · ${timeAgo(r.created_at)}` : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusConf.bg, borderColor: statusConf.border, borderWidth: 1 }]}>
          {r.status === 'Resolved' || r.status === 'Closed' ? (
            <Icon name="check" size={11} color={statusConf.fg} />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: statusConf.fg }]} />
          )}
          <Text style={[styles.statusTxt, { color: statusConf.fg, fontFamily: FontFamily.jakartaBold }]}>
            {r.status}
          </Text>
        </View>
      </View>

      {/* Meta Row: Reporter info and upvotes */}
      <View style={[styles.metaRow, { borderTopColor: C.border }]}>
        <View style={styles.reporterInfo}>
          <Avatar name={reporterName} size="xs" uri={r.profiles?.avatar_url} />
          <Text style={[styles.reporterTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {reporterName || 'Student'}
          </Text>
        </View>

        {voteCount > 0 && (
          <View style={[styles.meTooPill, { backgroundColor: C.surface2 }]}>
            <Feather name="thumbs-up" size={11} color={C.textMuted} />
            <Text style={[styles.meTooTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {voteCount}
            </Text>
          </View>
        )}
      </View>

      {/* Technician / Assignment Row */}
      {!isResolvedOrClosed && (
        r.assigned_staff_id ? (
          <View style={[styles.staffRow, { borderTopColor: C.border }]}>
            <View style={styles.staffInfo}>
              <Avatar name={assigneeName || 'Staff'} size="xs" uri={r.assignee?.avatar_url} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.staffLabelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Assigned Technician
                </Text>
                <Text style={[styles.staffNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {assigneeName || 'Staff Member'}
                  {r.assignee?.expertise ? ` (${r.assignee.expertise})` : ''}
                </Text>
              </View>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.reassignCompactBtn, { borderColor: C.brand, backgroundColor: C.brand + '14' }]}
                onPress={() => onAssign(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.reassignCompactTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  Reassign
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.brand }]}
            onPress={() => onAssign(r)}
            activeOpacity={0.8}
          >
            <Icon name="userPlus" size={16} color="#ffffff" />
            <Text style={[styles.actionTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
              Assign Staff
            </Text>
          </TouchableOpacity>
        )
      )}
    </TouchableOpacity>
  );
});

export function AllReportsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [reports, setReports] = useState<ReportWithProfile[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [staff, setStaff] = useState<Profile[]>([]);
  const [assignTarget, setAssignTarget] = useState<ReportWithProfile | null>(null);
  const [assignTab, setAssignTab] = useState<'trade' | 'all'>('trade');
  const [refreshing, setRefreshing] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(handler);
  }, [query]);

  // 58dp Dropdown bottom sheet visibility states
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const load = useCallback(async () => {
    const [rRes, sRes, vRes] = await Promise.all([
      supabase
        .from('reports')
        .select('*, profiles!reporter_id(full_name, avatar_url), assignee:profiles!assigned_staff_id(full_name, avatar_url, expertise)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('profiles').select('*').eq('role', 'staff').limit(100),
      getReportVoteCounts(),
    ]);
    if (rRes.data) setReports(rRes.data as unknown as ReportWithProfile[]);
    if (sRes.data) setStaff(sRes.data as Profile[]);
    if (vRes.ok) setVoteCounts(vRes.data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const assignReport = useCallback(async (reportId: string, staffId: string) => {
    const chosenStaff = staff.find((s) => s.id === staffId);
    const { error } = await supabase.from('reports').update({
      assigned_staff_id: staffId,
    }).eq('id', reportId);

    if (error) {
      toast({ type: 'error', title: t.common.error, message: error.message });
      return;
    }

    setReports((prev) => prev.map((r) =>
      r.id === reportId
        ? {
            ...r,
            assigned_staff_id: staffId,
            assignee: chosenStaff
              ? {
                  full_name: chosenStaff.full_name,
                  avatar_url: chosenStaff.avatar_url,
                  expertise: chosenStaff.expertise,
                }
              : r.assignee,
          }
        : r
    ));
    toast({ type: 'success', title: 'Staff Assigned', message: `Assigned to ${chosenStaff?.full_name ?? 'staff'}` });
    setAssignTarget(null);
  }, [staff, t.common.error, toast]);

  const filteredReports = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return reports
      .filter((r) => filter === 'all' || r.status === filter)
      .filter((r) => category === 'All' || r.category === category)
      .filter((r) => {
        if (!q) return true;
        const code = r.code ?? '';
        return [r.category, r.description, r.building, code, r.profiles?.full_name, r.assignee?.full_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      });
  }, [reports, filter, category, debouncedQuery]);

  const currentStatusOption = useMemo(
    () => STATUS_OPTIONS.find((s) => s.id === filter) ?? STATUS_OPTIONS[0],
    [filter]
  );

  const currentCategoryOption = useMemo(
    () => CATEGORY_OPTIONS.find((c) => c.id === category) ?? CATEGORY_OPTIONS[0],
    [category]
  );

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

  const handleCardPress = useCallback((id: string) => {
    navigation.navigate('ReportDetail', { reportId: id });
  }, [navigation]);

  const handleAssignTrigger = useCallback((r: ReportWithProfile) => {
    setAssignTab('trade');
    setAssignTarget(r);
  }, []);

  const renderItem = useCallback(({ item: r }: { item: ReportWithProfile }) => (
    <ReportAdminCard
      r={r}
      voteCount={voteCounts[r.id] || 0}
      onPress={handleCardPress}
      onAssign={handleAssignTrigger}
      isAdmin={isAdmin}
      C={C}
    />
  ), [voteCounts, handleCardPress, handleAssignTrigger, isAdmin, C]);

  const reportKeyExtractor = useCallback((r: ReportWithProfile) => r.id, []);
  const itemSeparator = useCallback(() => <View style={{ height: 10 }} />, []);

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

      <FlatList
        data={filteredReports}
        keyExtractor={reportKeyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.brand}
            colors={[C.brand]}
          />
        }
        ItemSeparatorComponent={itemSeparator}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* 1. Strict 58dp Search Bar */}
            <View style={[styles.searchBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.iconSlot32}>
                <Icon name="search" size={22} color={C.text} />
              </View>
              <TextInput
                style={[styles.searchInputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.dash.searchReportsPlaceholder || 'Search reports, category, location, or code...'}
                placeholderTextColor={C.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} style={{ padding: 4 }}>
                  <Icon name="close" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* 2. Strict 58dp Status Dropdown Bar */}
            <TouchableOpacity
              style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setStatusModalOpen(true)}
              activeOpacity={0.75}
            >
              <View style={styles.iconSlot32}>
                <Icon name={currentStatusOption.icon} size={30} color={C.text} />
              </View>
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {currentStatusOption.label}
                </Text>
              </View>
              <Icon name="chevD" size={20} color={C.textMuted} />
            </TouchableOpacity>

            {/* 3. Strict 58dp Category Dropdown Bar */}
            <TouchableOpacity
              style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setCategoryModalOpen(true)}
              activeOpacity={0.75}
            >
              <View style={styles.iconSlot32}>
                <Icon name={currentCategoryOption.icon} size={30} color={C.text} />
              </View>
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {currentCategoryOption.label}
                </Text>
              </View>
              <Icon name="chevD" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.emptyIconSlot}>
              <Icon name="report" size={36} color={C.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.common.noResults || 'No Reports Found'}
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {query.trim() || filter !== 'all' || category !== 'All'
                ? 'No reports match your active search or filter criteria.'
                : 'There are currently no reported issues on campus.'}
            </Text>
            {(query.trim() || filter !== 'all' || category !== 'All') && (
              <TouchableOpacity
                style={[styles.resetBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => {
                  setQuery('');
                  setFilter('all');
                  setCategory('All');
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.resetBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Clear All Filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />

      {/* Status Bottom Sheet Modal */}
      <Modal
        visible={statusModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setStatusModalOpen(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.handleBar, { backgroundColor: C.border }]} />
            <View style={[styles.sheetHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.sheetTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Filter by Status
              </Text>
              <TouchableOpacity
                onPress={() => setStatusModalOpen(false)}
                style={[styles.sheetCloseBtn, { backgroundColor: C.surface2 }]}
                hitSlop={8}
              >
                <Icon name="close" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8, padding: 16 }} showsVerticalScrollIndicator={false}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = filter === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.bar58,
                      {
                        backgroundColor: isSelected ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : C.surface,
                        borderColor: isSelected ? C.text : C.border,
                        marginBottom: 0,
                      },
                    ]}
                    onPress={() => {
                      setFilter(opt.id);
                      setStatusModalOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconSlot32}>
                      <Icon name={opt.icon} size={30} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {opt.label}
                      </Text>
                    </View>
                    {isSelected && <Icon name="check" size={22} color={C.brand} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Bottom Sheet Modal */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setCategoryModalOpen(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.handleBar, { backgroundColor: C.border }]} />
            <View style={[styles.sheetHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.sheetTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Filter by Category
              </Text>
              <TouchableOpacity
                onPress={() => setCategoryModalOpen(false)}
                style={[styles.sheetCloseBtn, { backgroundColor: C.surface2 }]}
                hitSlop={8}
              >
                <Icon name="close" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8, padding: 16 }} showsVerticalScrollIndicator={false}>
              {CATEGORY_OPTIONS.map((opt) => {
                const isSelected = category === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.bar58,
                      {
                        backgroundColor: isSelected ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : C.surface,
                        borderColor: isSelected ? C.text : C.border,
                        marginBottom: 0,
                      },
                    ]}
                    onPress={() => {
                      setCategory(opt.id);
                      setCategoryModalOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconSlot32}>
                      <Icon name={opt.icon} size={30} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {opt.label}
                      </Text>
                    </View>
                    {isSelected && <Icon name="check" size={22} color={C.brand} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
              <Icon name="arrowL" size={20} color={C.text} />
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

          {/* 58dp Segmented Tab Bar with Spring Animation */}
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
                      <Text style={[styles.modalStaffNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
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
                <Icon name="user" size={28} color={C.textMuted} />
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

  scroll: {
    paddingTop: 8,
    paddingBottom: 24,
  } as ViewStyle,

  listHeader: {
    marginBottom: 6,
  } as ViewStyle,

  // Strict 58dp Search Bar & Dropdown Bars
  searchBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  } as ViewStyle,
  searchInputTxt: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  } as ViewStyle,
  iconSlot32: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  barTitleTxt: {
    fontSize: 14,
    letterSpacing: -0.1,
  } as TextStyle,

  // Home / Dashboard styled Report Card
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  } as ViewStyle,
  cardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  } as ViewStyle,
  issueIconSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cardInfo: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  codeRow: {
    marginBottom: 2,
  } as ViewStyle,
  cardCode: {
    fontSize: 11,
    letterSpacing: 0.3,
  } as TextStyle,
  cardTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  } as TextStyle,
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  } as ViewStyle,
  loc: {
    fontSize: 11.5,
  } as TextStyle,
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
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
  } as TextStyle,

  // Card Meta Row: Reporter & Upvotes
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 2,
  } as ViewStyle,
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  reporterTxt: {
    fontSize: 12,
  } as TextStyle,
  meTooPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
  } as ViewStyle,
  meTooTxt: {
    fontSize: 11,
  } as TextStyle,

  // Technician / Assignment Row
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  } as ViewStyle,
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  staffLabelTxt: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  } as TextStyle,
  staffNameTxt: {
    fontSize: 12.5,
  } as TextStyle,
  reassignCompactBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  reassignCompactTxt: {
    fontSize: 12,
  } as TextStyle,
  actionBtn: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  } as ViewStyle,
  actionTxt: {
    fontSize: 13,
  } as TextStyle,

  // Empty State Wrap
  emptyWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginTop: 16,
  } as ViewStyle,
  emptyIconSlot: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 15,
    marginBottom: 4,
  } as TextStyle,
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  } as TextStyle,
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  resetBtnTxt: {
    fontSize: 12.5,
  } as TextStyle,

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingBottom: 24,
    maxHeight: '75%',
    overflow: 'hidden',
  } as ViewStyle,
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  } as ViewStyle,
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  } as ViewStyle,
  sheetTitleTxt: {
    fontSize: 16,
  } as TextStyle,
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

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
  modalStaffNameTxt: {
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
