// Student Directory - university-wide peer discovery network.
// Features: segmented discovery (All Students / My Connections / Requests) with
// native spring animation, structured dual control bar (My Section + Department picker),
// CR badges, blood group indicators, and instant contact reveal via ContactSheet.

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Modal, Animated, RefreshControl, ActivityIndicator, ScrollView,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { FontFamily, Layout, Accent, SectorColors, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useMessages } from '../../store/messagesStore';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import {
  connectErrorKey,
  sendConnectionRequest,
  cancelConnectionRequest,
  respondConnection,
} from '../../services/connectionsService';

type ConnState = 'none' | 'requested' | 'incoming' | 'connected';
type TabKey = 'all' | 'connections' | 'requests';

export interface Student {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  department: string;
  program?: string | null;
  intake: string;
  section: string;
  blood_group?: string | null;
  student_id?: string | null;
  is_cr?: boolean;
  email?: string | null;
  whatsapp?: string | null;
  connState: ConnState;
}

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  faculty: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
}

const DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'All',
    code: 'All',
    name: 'All Departments',
    faculty: 'Campus-wide peer discovery',
    icon: 'globe',
    color: '#2563EB',
  },
  {
    id: 'CSE',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    faculty: 'Faculty of Engineering & Applied Sciences',
    icon: 'cpu',
    color: '#0891B2',
  },
  {
    id: 'EEE',
    code: 'EEE',
    name: 'Electrical & Electronic Engineering',
    faculty: 'Faculty of Engineering & Applied Sciences',
    icon: 'zap',
    color: '#D97706',
  },
  {
    id: 'BBA',
    code: 'BBA',
    name: 'Business Administration',
    faculty: 'Faculty of Business',
    icon: 'briefcase',
    color: '#059669',
  },
  {
    id: 'Law',
    code: 'Law',
    name: 'Department of Law',
    faculty: 'Faculty of Law',
    icon: 'shield',
    color: '#E11D48',
  },
  {
    id: 'English',
    code: 'English',
    name: 'Department of English',
    faculty: 'Faculty of Arts & Humanities',
    icon: 'book-open',
    color: '#7C3AED',
  },
  {
    id: 'Civil',
    code: 'Civil',
    name: 'Civil Engineering',
    faculty: 'Faculty of Engineering & Applied Sciences',
    icon: 'compass',
    color: '#EA580C',
  },
  {
    id: 'Textile',
    code: 'Textile',
    name: 'Textile Engineering',
    faculty: 'Faculty of Engineering & Applied Sciences',
    icon: 'layers',
    color: '#DB2777',
  },
  {
    id: 'Economics',
    code: 'Economics',
    name: 'Department of Economics',
    faculty: 'Faculty of Social Sciences',
    icon: 'trending-up',
    color: '#4F46E5',
  },
];

const STATUS_MAP: Record<string, ConnState> = {
  accepted: 'connected',
  pending_outgoing: 'requested',
  pending_incoming: 'incoming',
  none: 'none',
};

export function DirectoryScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { reload: reloadMessages } = useMessages();
  const t = useT();
  const toast = useToast();

  const paramTab = (route?.params?.tab ?? route?.params?.initialTab) as TabKey | undefined;
  const initialTab: TabKey = paramTab && (paramTab === 'all' || paramTab === 'connections' || paramTab === 'requests')
    ? paramTab
    : 'all';

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [query, setQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [classmatesOnly, setClassmatesOnly] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});
  const [contactStudent, setContactStudent] = useState<Student | null>(null);

  // Sync tab if route params change while mounted
  useEffect(() => {
    const target = (route?.params?.tab ?? route?.params?.initialTab) as TabKey | undefined;
    if (target && (target === 'all' || target === 'connections' || target === 'requests')) {
      setTab(target);
    }
  }, [route?.params?.tab, route?.params?.initialTab]);

  // Real-time student counts per department
  const deptCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: students.length };
    students.forEach(s => {
      const d = s.department?.toUpperCase();
      if (d) {
        map[d] = (map[d] ?? 0) + 1;
      }
    });
    return map;
  }, [students]);

  const currentDept = useMemo(
    () => DEPARTMENTS.find(d => d.id.toLowerCase() === selectedDept.toLowerCase()) ?? DEPARTMENTS[0],
    [selectedDept]
  );

  // Segmented track native spring animation & width tracking
  const animIndex = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  const tabIndexMap: Record<TabKey, number> = useMemo(
    () => ({ all: 0, connections: 1, requests: 2 }),
    []
  );

  useEffect(() => {
    const idx = tabIndexMap[tab] ?? 0;
    Animated.spring(animIndex, {
      toValue: idx,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [tab, animIndex, tabIndexMap]);

  const isHidden = profile?.directory_visible === false;

  const load = useCallback(async () => {
    if (!user?.id) return;
    const cacheKey = CacheKeys.DIRECTORY(user.id);

    // 1. Optimistic cache load
    const cached = await getCache<Student[]>(cacheKey);
    if (cached && cached.length) setStudents(cached);
    if (!cached || cached.length === 0) setLoading(true);

    // 2. Network sync
    try {
      const { data: profiles, error } = await supabase.rpc('student_directory');
      if (error) {
        if (cached && cached.length) setIsOffline(true);
        return;
      }
      setIsOffline(false);
      const rows: Student[] = (profiles ?? []).map((p: any) => ({
        ...p,
        connState: STATUS_MAP[p.status as string] ?? 'none',
      }));
      setStudents(rows);
      setCache(cacheKey, rows);
    } catch {
      if (cached && cached.length) setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function updateStudentState(studentId: string, newState: ConnState) {
    if (!user?.id) return;
    setStudents(prev => {
      const updated = prev.map(s => (s.id === studentId ? { ...s, connState: newState } : s));
      setCache(CacheKeys.DIRECTORY(user.id), updated);
      return updated;
    });
  }

  async function handleConnect(studentId: string) {
    if (!user || actionBusy[studentId]) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to send requests.' });
      return;
    }
    setActionBusy(prev => ({ ...prev, [studentId]: true }));
    const res = await sendConnectionRequest(studentId);
    setActionBusy(prev => ({ ...prev, [studentId]: false }));

    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: t.directory2[connectErrorKey(res.error)] });
      await load();
      return;
    }
    updateStudentState(studentId, 'requested');
    toast({ type: 'success', title: t.directory2.requestSent });
  }

  async function handleCancel(studentId: string) {
    if (!user || actionBusy[studentId]) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to cancel requests.' });
      return;
    }
    setActionBusy(prev => ({ ...prev, [studentId]: true }));
    const res = await cancelConnectionRequest(studentId);
    setActionBusy(prev => ({ ...prev, [studentId]: false }));

    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      await load();
      return;
    }
    updateStudentState(studentId, 'none');
    toast({ type: 'info', title: t.directory2.requestCancelled });
  }

  async function handleAccept(studentId: string) {
    if (!user || actionBusy[studentId]) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to manage requests.' });
      return;
    }
    setActionBusy(prev => ({ ...prev, [studentId]: true }));
    const res = await respondConnection(studentId, true);
    setActionBusy(prev => ({ ...prev, [studentId]: false }));

    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      await load();
      return;
    }
    updateStudentState(studentId, 'connected');
    reloadMessages();
    toast({ type: 'success', title: t.directory2.connected });
    await load();
  }

  async function handleDecline(studentId: string) {
    if (!user || actionBusy[studentId]) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to manage requests.' });
      return;
    }
    setActionBusy(prev => ({ ...prev, [studentId]: true }));
    const res = await respondConnection(studentId, false);
    setActionBusy(prev => ({ ...prev, [studentId]: false }));

    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      await load();
      return;
    }
    updateStudentState(studentId, 'none');
    toast({ type: 'info', title: t.directory2.declined });
  }

  // Count metrics for tabs
  const incomingCount = useMemo(() => students.filter(s => s.connState === 'incoming').length, [students]);
  const outgoingCount = useMemo(() => students.filter(s => s.connState === 'requested').length, [students]);
  const connectedCount = useMemo(() => students.filter(s => s.connState === 'connected').length, [students]);
  const requestsTotal = incomingCount + outgoingCount;

  // Segmented track dimensions
  const TRACK_PADDING = 3;
  const innerTrackWidth = Math.max(0, trackWidth - TRACK_PADDING * 2);
  const tabWidth = innerTrackWidth > 0 ? innerTrackWidth / 3 : 0;
  const translateX = animIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
  });

  const TAB_COLORS: Record<TabKey, { fg: string; bg: string }> = useMemo(
    () => ({
      all: { fg: SectorColors.directory, bg: `${SectorColors.directory}18` },
      connections: { fg: Accent.teal, bg: pillBg(Accent.teal, isDark) },
      requests: { fg: incomingCount > 0 ? C.danger : C.warn, bg: incomingCount > 0 ? C.dangerBg : C.warnBg },
    }),
    [C.danger, C.dangerBg, C.warn, C.warnBg, isDark, incomingCount]
  );

  const TABS: { id: TabKey; label: string; count: number }[] = useMemo(
    () => [
      { id: 'all', label: t.directory2.tabAll, count: students.length },
      { id: 'connections', label: t.directory2.tabConnections, count: connectedCount },
      { id: 'requests', label: t.directory2.tabRequests, count: requestsTotal },
    ],
    [t.directory2, students.length, connectedCount, requestsTotal]
  );

  // Filter pipeline
  const filteredStudents = useMemo(() => {
    let list = students;

    // Tab isolation
    if (tab === 'connections') {
      list = list.filter(s => s.connState === 'connected');
    } else if (tab === 'requests') {
      // Prioritize urgent incoming requests over outgoing requests, then alphabetical
      list = list
        .filter(s => s.connState === 'incoming' || s.connState === 'requested')
        .sort((a, b) => {
          if (a.connState === 'incoming' && b.connState !== 'incoming') return -1;
          if (a.connState !== 'incoming' && b.connState === 'incoming') return 1;
          return a.full_name.localeCompare(b.full_name);
        });
    }

    // Classmates shortcut
    if (classmatesOnly && profile?.intake && profile?.section) {
      list = list.filter(s => s.intake === profile.intake && s.section === profile.section);
    }

    // Department filter
    if (selectedDept !== 'All') {
      list = list.filter(s => s.department?.toLowerCase() === selectedDept.toLowerCase());
    }

    // Multi-token composite search query (e.g. "CSE 49", "49-5", "CR", "O+")
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      list = list.filter(s => {
        const haystack = [
          s.full_name,
          s.department,
          s.intake ? `intake ${s.intake} ${s.intake}` : '',
          s.section ? `section ${s.section} sec ${s.section}` : '',
          s.intake && s.section ? `${s.intake}-${s.section} ${s.intake}/${s.section}` : '',
          s.blood_group,
          s.student_id,
          s.program,
          s.is_cr ? 'cr class representative' : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return tokens.every(tok => haystack.includes(tok));
      });
    }

    return list;
  }, [students, tab, classmatesOnly, selectedDept, query, profile?.intake, profile?.section]);

  const hasCohort = !!(profile?.intake && profile?.section);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.sectors.directory} onBack={() => navigation.goBack()} />
      <OfflineBanner
        visible={isOffline}
        message="Showing cached student directory. Connect to internet to manage connection requests."
      />

      {/* Reciprocal Privacy Guard: Profile Hidden State */}
      {isHidden ? (
        <View style={styles.hiddenContainer}>
          <View style={[styles.hiddenIconBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Icon name="eyeOff" size={32} color={C.brand} />
          </View>
          <Text style={[styles.hiddenTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.directory2.hiddenTitle}
          </Text>
          <Text style={[styles.hiddenBody, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.directory2.hiddenBody}
          </Text>
          <TouchableOpacity
            style={[styles.hiddenBtn, { backgroundColor: C.brand }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.85}
          >
            <Text style={[styles.hiddenBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {t.directory2.goToProfile}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={s => s.id}
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              {/* Native Spring Animated Segmented Track Switcher */}
              <View
                style={[styles.tabContainer, { backgroundColor: C.surface2 }]}
                onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
              >
                {tabWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.activeIndicator,
                      {
                        width: tabWidth,
                        transform: [{ translateX }],
                        backgroundColor: C.surface,
                        borderColor: isDark ? `${TAB_COLORS[tab].fg}55` : `${TAB_COLORS[tab].fg}35`,
                      },
                    ]}
                  />
                )}
                {TABS.map(tItem => {
                  const active = tab === tItem.id;
                  const cfg = TAB_COLORS[tItem.id];

                  return (
                    <TouchableOpacity
                      key={tItem.id}
                      style={styles.tabBtn}
                      onPress={() => setTab(tItem.id)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.tabBtnTxt,
                          {
                            color: active ? cfg.fg : C.textMuted,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {tItem.label}
                      </Text>
                      {tItem.count > 0 && (
                        <View
                          style={[
                            styles.tabBadge,
                            {
                              backgroundColor: active
                                ? cfg.bg
                                : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.border),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tabBadgeTxt,
                              {
                                color: active ? cfg.fg : C.textMuted,
                                fontFamily: FontFamily.jakartaBold,
                              },
                            ]}
                          >
                            {tItem.count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Structured Dual Control Bar (Option A: Sub-filters directly under Tabs) */}
              {tab === 'all' && (
                <View style={styles.dualBarRow}>
                  {/* Left: My Section Cohort Button */}
                  {hasCohort ? (
                    <TouchableOpacity
                      style={[
                        styles.dualBarBtn,
                        classmatesOnly
                          ? [
                              styles.dualBarBtnActive,
                              {
                                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7',
                                borderColor: isDark ? 'rgba(245, 158, 11, 0.45)' : '#fde68a',
                              },
                            ]
                          : [styles.dualBarBtnInactive, { backgroundColor: C.surface, borderColor: C.border }],
                      ]}
                      onPress={() => setClassmatesOnly(!classmatesOnly)}
                      activeOpacity={0.75}
                    >
                      <Icon
                        name={classmatesOnly ? 'check' : 'sparkle'}
                        size={14}
                        color={classmatesOnly ? (isDark ? '#fbbf24' : '#b45309') : C.text2}
                      />
                      <Text
                        style={[
                          styles.dualBarTxt,
                          {
                            color: classmatesOnly ? (isDark ? '#fbbf24' : '#b45309') : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {classmatesOnly
                          ? `My Sec (${profile!.intake}-${profile!.section})`
                          : `✨ My Sec (${profile!.intake}-${profile!.section})`}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.dualBarBtn,
                        styles.dualBarBtnInactive,
                        { backgroundColor: C.surface, borderColor: C.border, opacity: 0.5 },
                      ]}
                    >
                      <Text style={[styles.dualBarTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        No Section Set
                      </Text>
                    </View>
                  )}

                  {/* Right: Department Picker Button with Dynamic Signature Emblem */}
                  <TouchableOpacity
                    style={[
                      styles.dualBarBtn,
                      selectedDept !== 'All'
                        ? [
                            styles.dualBarBtnActive,
                            {
                              backgroundColor: isDark ? `${currentDept.color}22` : `${currentDept.color}14`,
                              borderColor: isDark ? `${currentDept.color}66` : currentDept.color,
                            },
                          ]
                        : [styles.dualBarBtnInactive, { backgroundColor: C.surface, borderColor: C.border }],
                    ]}
                    onPress={() => setDeptModalVisible(true)}
                    activeOpacity={0.75}
                  >
                    <Feather
                      name={currentDept.icon}
                      size={14}
                      color={selectedDept !== 'All' ? (isDark ? '#fff' : currentDept.color) : C.text2}
                    />
                    <Text
                      style={[
                        styles.dualBarTxt,
                        {
                          color: selectedDept !== 'All' ? (isDark ? '#fff' : currentDept.color) : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedDept === 'All' ? 'All Depts' : selectedDept}
                    </Text>
                    <Icon
                      name="chevD"
                      size={14}
                      color={selectedDept !== 'All' ? (isDark ? '#fff' : currentDept.color) : C.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Search Bar (Directly Above Results Feed) */}
              <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Icon name="search" size={17} color={C.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
                  placeholder={t.directory2.searchPlaceholderFull}
                  placeholderTextColor={C.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                    <Icon name="x" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            loading && students.length === 0 ? (
              <View style={styles.emptyLoading}>
                <ActivityIndicator size="small" color={C.brand} />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="directory" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {tab === 'connections'
                    ? t.directory2.noConnections
                    : tab === 'requests'
                    ? t.directory2.noRequests
                    : t.common.noResults}
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {tab === 'connections'
                    ? t.directory2.noConnectionsSub
                    : tab === 'requests'
                    ? t.directory2.noRequestsSub
                    : 'Try a different search term or clear filters.'}
                </Text>
                {(query.length > 0 || selectedDept !== 'All' || classmatesOnly) && (
                  <TouchableOpacity
                    style={[styles.clearFilterBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                    onPress={() => {
                      setQuery('');
                      setSelectedDept('All');
                      setClassmatesOnly(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Icon name="x" size={13} color={C.brand} />
                    <Text style={[styles.clearFilterTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                      Clear filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
          renderItem={({ item: s }) => {
            const isBusy = !!actionBusy[s.id];
            const metaParts = [s.department, s.intake ? `Intake ${s.intake}` : null, s.section ? `Sec ${s.section}` : null]
              .filter(Boolean)
              .join(' · ');

            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    style={styles.identity}
                    onPress={() => navigation.navigate('StudentProfile', { student: s })}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={s.avatar_url} name={s.full_name} size="md" />
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {s.full_name}
                      </Text>

                      {metaParts.length > 0 && (
                        <Text style={[styles.cardMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                          {metaParts}
                        </Text>
                      )}

                      {/* Badges: CR + Blood */}
                      <View style={styles.cardBadges}>
                        {s.is_cr ? (
                          <View style={[styles.miniCrBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                            <Text style={[styles.miniCrTxt, { color: '#b45309', fontFamily: FontFamily.jakartaBold }]}>
                              CR
                            </Text>
                          </View>
                        ) : null}

                        {s.blood_group ? (
                          <View style={[styles.miniBloodBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                            <Text style={[styles.miniBloodTxt, { color: '#b91c1c', fontFamily: FontFamily.jakartaBold }]}>
                              {s.blood_group}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Right Action based on Tab and Status */}
                  {tab === 'connections' ? (
                    <View style={styles.connActionsRow}>
                      <TouchableOpacity
                        style={[styles.smallIconBtn, { backgroundColor: C.brand }]}
                        onPress={() => navigation.navigate('MessageThread', { kind: 'dm', id: s.id, title: s.full_name })}
                        activeOpacity={0.8}
                      >
                        <Icon name="chat" size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallIconBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                        onPress={() => setContactStudent(s)}
                        activeOpacity={0.8}
                      >
                        <Icon name="phone" size={14} color={C.text} />
                      </TouchableOpacity>
                    </View>
                  ) : s.connState === 'connected' ? (
                    <TouchableOpacity
                      style={[styles.connPillBtn, { backgroundColor: pillBg(Accent.teal, isDark) }]}
                      onPress={() => setContactStudent(s)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.connDot, { backgroundColor: Accent.teal }]} />
                      <Text style={[styles.connTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>
                        {t.directory2.connected}
                      </Text>
                    </TouchableOpacity>
                  ) : s.connState === 'requested' ? (
                    <View style={styles.requestedBox}>
                      <View style={[styles.connPill, { backgroundColor: C.warnBg }]}>
                        <View style={[styles.connDot, { backgroundColor: C.warn }]} />
                        <Text style={[styles.connTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                          {t.directory2.requested}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.cancelLink, { borderColor: C.border }]}
                        onPress={() => handleCancel(s.id)}
                        disabled={isBusy}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cancelLinkTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {t.directory2.cancelRequest}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : s.connState === 'none' ? (
                    <TouchableOpacity
                      style={[styles.connectBtn, { backgroundColor: C.brand, opacity: isBusy ? 0.6 : 1 }]}
                      onPress={() => handleConnect(s.id)}
                      disabled={isBusy}
                      activeOpacity={0.85}
                    >
                      <Icon name="userPlus" size={14} color="#fff" />
                      <Text style={[styles.connectTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                        {t.directory2.connect}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Incoming Request Notification Row */}
                {s.connState === 'incoming' && (
                  <View style={[styles.incomingArea, { borderTopColor: C.border }]}>
                    <Text style={[styles.wantsToConnect, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.wantsToConnect}
                    </Text>
                    <View style={styles.incomingActions}>
                      <TouchableOpacity
                        style={[styles.halfActionBtn, { backgroundColor: C.brand, opacity: isBusy ? 0.6 : 1 }]}
                        onPress={() => handleAccept(s.id)}
                        disabled={isBusy}
                        activeOpacity={0.85}
                      >
                        <Icon name="check" size={14} color="#fff" />
                        <Text style={[styles.halfBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                          {t.directory2.accept}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.halfActionBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                        onPress={() => handleDecline(s.id)}
                        disabled={isBusy}
                        activeOpacity={0.85}
                      >
                        <Icon name="x" size={14} color={C.text} />
                        <Text style={[styles.halfBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {t.directory2.decline}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Department Picker Bottom Sheet Modal */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDeptModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIcon,
                    { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)' },
                  ]}
                >
                  <Feather name="grid" size={17} color={SectorColors.directory} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Select Department
                  </Text>
                  <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {students.length} students enrolled · 9 faculties
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setDeptModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 440 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {DEPARTMENTS.map(d => {
                const active = selectedDept.toLowerCase() === d.id.toLowerCase();
                const count = deptCounts[d.id.toUpperCase()] ?? (d.id === 'All' ? students.length : 0);
                const fg = d.color;
                const iconBg = isDark ? `${fg}24` : `${fg}15`;

                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.deptCard,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(255, 255, 255, 0.04)' : `${fg}08`)
                          : C.surface,
                        borderColor: active ? fg : C.border,
                        borderWidth: active ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      setSelectedDept(d.id);
                      setDeptModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.deptIconBox, { backgroundColor: iconBg }]}>
                      <Feather name={d.icon} size={19} color={fg} />
                    </View>

                    <View style={styles.deptInfo}>
                      <View style={styles.deptTitleRow}>
                        <Text style={[styles.deptCodeTxt, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
                          {d.code}
                        </Text>
                        <Text style={[styles.deptDot, { color: C.textMuted }]}>·</Text>
                        <Text
                          style={[
                            styles.deptNameTxt,
                            {
                              color: active ? C.text : C.text,
                              fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaSemiBold,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {d.name}
                        </Text>
                      </View>
                      <Text
                        style={[styles.deptFacultyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}
                        numberOfLines={1}
                      >
                        {d.faculty}
                      </Text>
                    </View>

                    <View style={styles.deptRight}>
                      <View
                        style={[
                          styles.deptCountBadge,
                          {
                            backgroundColor: active
                              ? (isDark ? `${fg}30` : `${fg}18`)
                              : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.deptCountTxt,
                            {
                              color: active ? fg : C.textMuted,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>

                      {active && (
                        <View style={[styles.deptCheckPill, { backgroundColor: fg }]}>
                          <Feather name="check" size={11} color="#fff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Standardized ContactSheet for One-Tap Call, WhatsApp, Mail, DM */}
      {contactStudent ? (
        <ContactSheet
          visible={!!contactStudent}
          name={contactStudent.full_name}
          roleSubtitle={`${contactStudent.department} · Intake ${contactStudent.intake} · Sec ${contactStudent.section}`}
          avatarUri={contactStudent.avatar_url}
          phone={contactStudent.whatsapp}
          email={contactStudent.email}
          inAppChatAction={() => {
            const tgt = contactStudent;
            setContactStudent(null);
            navigation.navigate('MessageThread', { kind: 'dm', id: tgt.id, title: tgt.full_name });
          }}
          onClose={() => setContactStudent(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 24 } as ViewStyle,

  headerBlock: { marginBottom: 12 } as ViewStyle,

  /* Animated Segmented Track */
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 10,
    position: 'relative',
  } as ViewStyle,
  activeIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    minHeight: 42,
    borderRadius: 11,
    zIndex: 1,
  } as ViewStyle,
  tabBtnTxt: { fontSize: 12.5 } as any,
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  } as ViewStyle,
  tabBadgeTxt: { fontSize: 10.5 } as any,

  /* Option A: Dual Control Bar Directly Below Tabs */
  dualBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  } as ViewStyle,
  dualBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
  } as ViewStyle,
  dualBarBtnActive: {
    elevation: 1,
  } as ViewStyle,
  dualBarBtnInactive: {} as ViewStyle,
  dualBarTxt: {
    fontSize: 12.5,
  } as TextStyle,

  /* Search Bar Directly Above Feed */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 11 } as TextStyle,

  emptyLoading: { paddingVertical: 40, alignItems: 'center' } as ViewStyle,
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 } as ViewStyle,
  emptyTitle: { fontSize: 16, marginTop: 12, textAlign: 'center' } as TextStyle,
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 } as TextStyle,
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  clearFilterTxt: { fontSize: 13 } as TextStyle,

  card: { padding: 13, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardName: { fontSize: 14.5, letterSpacing: -0.01 } as TextStyle,
  cardMeta: { fontSize: 12, marginTop: 2 } as TextStyle,
  cardBadges: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 } as ViewStyle,

  miniCrBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  } as ViewStyle,
  miniCrTxt: { fontSize: 9.5 } as TextStyle,
  miniBloodBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  } as ViewStyle,
  miniBloodTxt: { fontSize: 9.5 } as TextStyle,

  connPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  } as ViewStyle,
  connPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  } as ViewStyle,
  connDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  connTxt: { fontSize: 11.5 } as TextStyle,

  requestedBox: { alignItems: 'flex-end', gap: 3 } as ViewStyle,
  cancelLink: { paddingHorizontal: 4, paddingVertical: 1 } as ViewStyle,
  cancelLinkTxt: { fontSize: 11 } as TextStyle,

  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  } as ViewStyle,
  connectTxt: { fontSize: 12.5 } as TextStyle,

  connActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  incomingArea: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 } as ViewStyle,
  wantsToConnect: { fontSize: 12, marginBottom: 7 } as TextStyle,
  incomingActions: { flexDirection: 'row', gap: 8 } as ViewStyle,
  halfActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 35,
    borderRadius: 9,
  } as ViewStyle,
  halfBtnTxt: { fontSize: 13 } as TextStyle,

  hiddenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  } as ViewStyle,
  hiddenIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  } as ViewStyle,
  hiddenTitle: { fontSize: 18, marginBottom: 8, textAlign: 'center' } as TextStyle,
  hiddenBody: { fontSize: 13.5, textAlign: 'center', lineHeight: 20, marginBottom: 20 } as TextStyle,
  hiddenBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  } as ViewStyle,
  hiddenBtnTxt: { fontSize: 14 } as TextStyle,

  /* Department Bottom Sheet Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  } as ViewStyle,
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: Layout.screenPadding,
    maxHeight: '85%',
  } as ViewStyle,
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  } as ViewStyle,
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,
  modalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalTitle: {
    fontSize: 16,
  } as TextStyle,
  modalSub: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  deptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: 14,
    marginBottom: 8,
  } as ViewStyle,
  deptIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  deptInfo: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  deptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  deptCodeTxt: {
    fontSize: 13.5,
  } as TextStyle,
  deptDot: {
    fontSize: 12,
  } as TextStyle,
  deptNameTxt: {
    fontSize: 13,
    flex: 1,
  } as TextStyle,
  deptFacultyTxt: {
    fontSize: 11,
    marginTop: 2,
  } as TextStyle,

  deptRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  } as ViewStyle,
  deptCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  deptCountTxt: {
    fontSize: 11,
  } as TextStyle,
  deptCheckPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});
