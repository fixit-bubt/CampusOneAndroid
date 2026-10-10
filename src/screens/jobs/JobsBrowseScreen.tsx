import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, Animated, Modal, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout, SectorColors, Accent, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { formatDate } from '../../utils/format';
import { JOB_DEPARTMENTS } from '../../constants/app';
import {
  computeJobStatus,
  daysRemainingLabel,
  getJobsWithCache,
  toggleJobBookmark,
  getStudentApplications,
  withdrawJobApplication,
  type JobStatus,
} from '../../services/jobsService';
import type { Job, JobApplication } from '../../types/database';

const JOB_COLOR = SectorColors.jobs;
const JOB_BG    = `${SectorColors.jobs}1e`;

// Status styling with dark-mode aware tokens
function jobStatusTone(C: any, t: any, k: JobStatus, isDark?: boolean): { label: string; fg: string; bg: string } {
  switch (k) {
    case 'closing': return { label: t.jobs.closingSoon, fg: C.warn,   bg: C.warnBg };
    case 'expired': return { label: t.jobs.expired,     fg: Accent.slate, bg: pillBg(Accent.slate, isDark) };
    case 'removed': return { label: t.jobs.removed,     fg: C.danger, bg: C.dangerBg };
    default:        return { label: t.jobs.open,        fg: Accent.teal,  bg: pillBg(Accent.teal, isDark) };
  }
}

function appStatusTone(C: any, t: any, status: JobApplication['status']) {
  switch (status) {
    case 'shortlisted': return { label: t.jobs2?.candidateShortlisted ?? 'Shortlisted 🎉', fg: C.success, bg: C.successBg };
    case 'viewed':      return { label: t.jobs2?.candidateViewed ?? 'Viewed by Recruiter', fg: C.info, bg: C.infoBg };
    case 'rejected':    return { label: t.jobs2?.candidateRejected ?? 'Not Selected', fg: Accent.slate, bg: 'rgba(100, 116, 139, 0.12)' };
    default:            return { label: t.jobs2?.applicationSubmitted ?? 'Submitted', fg: C.brand, bg: `${SectorColors.jobs}1a` };
  }
}

const TYPE_COLORS: Record<string, string> = {
  internship: Accent.purple,
  tuition:    Accent.teal,
  on_campus:  '#f59e0b',
  part_time:  Accent.teal,
  full_time:  Accent.blue,
  freelance:  '#ec4899',
};

function getTypeLabel(t: any, type: string): string {
  switch (type) {
    case 'internship': return t.jobs2?.internship ?? 'Internship';
    case 'tuition':    return t.jobs2?.tuition ?? 'Tuition';
    case 'on_campus':  return t.jobs2?.onCampus ?? 'On-Campus';
    case 'part_time':  return t.jobs2?.partTime ?? 'Part-time';
    case 'full_time':  return t.jobs2?.fullTime ?? 'Full-time';
    case 'freelance':  return t.jobs2?.freelance ?? 'Freelance';
    default:           return type;
  }
}

type MainTab = 'browse' | 'saved' | 'my_applications';
type StatusFilter = 'open' | 'closing' | 'expired';
type TypeFilter = 'all' | 'internship' | 'tuition' | 'on_campus' | 'part_time' | 'full_time' | 'freelance';

export function JobsBrowseScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const isAdmin = profile?.role === 'admin';

  const [canPost, setCanPost] = useState(isAdmin);
  const [mainTab, setMainTab] = useState<MainTab>('browse');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [applications, setApplications] = useState<(JobApplication & { job?: Job })[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Dropdown bottom sheet modals
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [deptModalVisible, setDeptModalVisible] = useState(false);

  // Animated sliding tab indicator for Main Tabs (Browse | Saved | Applications)
  const [mainTrackWidth, setMainTrackWidth] = useState(0);
  const mainAnimIndex = useRef(new Animated.Value(0)).current;
  const mainIndexMap: Record<MainTab, number> = useMemo(() => ({ browse: 0, saved: 1, my_applications: 2 }), []);

  useEffect(() => {
    const idx = mainIndexMap[mainTab] ?? 0;
    Animated.spring(mainAnimIndex, {
      toValue: idx,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [mainTab, mainAnimIndex, mainIndexMap]);

  // Animated sliding indicator for Status Tabs (Open | Closing Soon | Expired)
  const [statusTrackWidth, setStatusTrackWidth] = useState(0);
  const statusAnimIndex = useRef(new Animated.Value(0)).current;
  const statusIndexMap: Record<StatusFilter, number> = useMemo(() => ({ open: 0, closing: 1, expired: 2 }), []);

  useEffect(() => {
    const idx = statusIndexMap[statusFilter] ?? 0;
    Animated.spring(statusAnimIndex, {
      toValue: idx,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [statusFilter, statusAnimIndex, statusIndexMap]);

  const load = useCallback(async () => {
    const [jobsRes, appsRes] = await Promise.all([
      getJobsWithCache(user?.id),
      user?.id ? getStudentApplications(user.id) : Promise.resolve({ applications: [] }),
    ]);

    if (jobsRes.error && jobsRes.jobs.length === 0) {
      setLoadFailed(true);
      setLoading(false);
      return;
    }

    setLoadFailed(false);
    setIsOffline(jobsRes.isOffline);
    setJobs(jobsRes.jobs);
    setSavedIds(jobsRes.savedIds);
    setApplications(appsRes.applications);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Check job posting permissions to match RLS
  useEffect(() => {
    if (!user) { setCanPost(false); return; }
    if (isAdmin || profile?.role === 'staff') { setCanPost(true); return; }
    (async () => {
      try {
        const { data, error } = await supabase.rpc('can_post_jobs');
        if (!error && typeof data === 'boolean') {
          setCanPost(data);
          return;
        }
      } catch {}
      const [org, lead] = await Promise.all([
        supabase.from('event_organizers').select('user_id').eq('user_id', user.id).limit(1),
        supabase.from('club_members').select('role').eq('user_id', user.id).in('role', ['president', 'vp']).limit(1),
      ]);
      setCanPost(!!(org.data?.length || lead.data?.length));
    })();
  }, [user?.id, isAdmin, profile?.role]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleToggleSave(jobId: string) {
    if (!user) return;
    const isSaved = savedIds.has(jobId);
    const next = new Set(savedIds);
    isSaved ? next.delete(jobId) : next.add(jobId);
    setSavedIds(next); // optimistic update

    const res = await toggleJobBookmark(jobId, user.id, isSaved);
    if (!res.success) {
      setSavedIds(savedIds); // rollback
      toast({ type: 'error', title: t.common.error, message: res.error });
    }
  }

  function handleWithdrawApplication(appId: string) {
    Alert.alert('Withdraw Application', 'Are you sure you want to withdraw this application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          const res = await withdrawJobApplication(appId);
          if (!res.success) {
            toast({ type: 'error', title: t.common.error, message: res.error });
            return;
          }
          setApplications(prev => prev.filter(a => a.id !== appId));
          toast({ type: 'info', title: 'Application Withdrawn' });
        },
      },
    ]);
  }

  // Filter pipeline: Search -> Type -> Dept -> Status/Saved
  const q = query.trim().toLowerCase();
  const searched = useMemo(() => {
    return q
      ? jobs.filter(j =>
          [
            j.title,
            j.company,
            j.location,
            j.area_name,
            j.department_code,
            j.job_type,
            j.requirements,
            (j.skills || []).join(' '),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : jobs;
  }, [jobs, q]);

  const typeFiltered = useMemo(() => {
    if (typeFilter === 'all') return searched;
    return searched.filter(j => j.job_type === typeFilter);
  }, [searched, typeFilter]);

  const deptFiltered = useMemo(() => {
    if (deptFilter === 'ALL') return typeFiltered;
    return typeFiltered.filter(
      j => j.department_code === deptFilter || j.department_code === 'ALL' || !j.department_code
    );
  }, [typeFiltered, deptFilter]);

  const browseCounts: Record<StatusFilter, number> = useMemo(() => ({
    open: deptFiltered.filter(j => computeJobStatus(j) === 'open').length,
    closing: deptFiltered.filter(j => computeJobStatus(j) === 'closing').length,
    expired: deptFiltered.filter(j => computeJobStatus(j) === 'expired').length,
  }), [deptFiltered]);

  const browseList = useMemo(() => {
    if (mainTab === 'saved') {
      return deptFiltered
        .filter(j => savedIds.has(j.id))
        .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
    }
    return deptFiltered.filter(j => computeJobStatus(j) === statusFilter);
  }, [deptFiltered, savedIds, mainTab, statusFilter]);

  const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = useMemo(() => [
    { id: 'all',        label: t.jobs2?.allTypes ?? 'All Types' },
    { id: 'internship', label: t.jobs2?.internship ?? 'Internships' },
    { id: 'tuition',    label: t.jobs2?.tuition ?? 'Tuition' },
    { id: 'on_campus',  label: t.jobs2?.onCampus ?? 'On-Campus' },
    { id: 'part_time',  label: t.jobs2?.partTime ?? 'Part-time' },
    { id: 'full_time',  label: t.jobs2?.fullTime ?? 'Full-time' },
    { id: 'freelance',  label: t.jobs2?.freelance ?? 'Freelance' },
  ], [t]);

  const currentTypeLabel = useMemo(() => {
    const found = TYPE_OPTIONS.find(o => o.id === typeFilter);
    return found ? found.label : (t.jobs2?.allTypes ?? 'All Types');
  }, [TYPE_OPTIONS, typeFilter, t]);

  const currentDeptLabel = useMemo(() => {
    if (deptFilter === 'ALL') return t.jobs2?.allDepts ?? 'All Departments';
    const found = JOB_DEPARTMENTS.find(d => d.code === deptFilter);
    return found ? found.label : deptFilter;
  }, [deptFilter, t]);

  // Main track interpolation
  const TRACK_PADDING = 3;
  const innerMainTrackWidth = Math.max(0, mainTrackWidth - TRACK_PADDING * 2);
  const mainTabWidth = innerMainTrackWidth > 0 ? innerMainTrackWidth / 3 : 0;
  const mainTranslateX = mainAnimIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, mainTabWidth, mainTabWidth * 2],
  });

  // Status track interpolation
  const innerStatusTrackWidth = Math.max(0, statusTrackWidth - TRACK_PADDING * 2);
  const statusTabWidth = innerStatusTrackWidth > 0 ? innerStatusTrackWidth / 3 : 0;
  const statusTranslateX = statusAnimIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, statusTabWidth, statusTabWidth * 2],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.jobs2?.jobsTitle ?? "Jobs"}
        onBack={() => navigation.goBack()}
        rightSlot={
          (canPost || isAdmin) ? (
            <View style={{ flexDirection: 'row' }}>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate('JobsModerate')}
                  activeOpacity={0.75}
                >
                  <Feather name="shield" size={19} color={C.text} />
                </TouchableOpacity>
              )}
              {canPost && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate('JobPost')}
                  activeOpacity={0.75}
                >
                  <Feather name="plus" size={22} color={C.text} />
                </TouchableOpacity>
              )}
            </View>
          ) : undefined
        }
      />

      {/* 1. Animated Main Tab Switcher (Browse | Saved | Applications) */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6 }}>
        <View
          style={[styles.tabTrack, { backgroundColor: C.surface2 }]}
          onLayout={e => setMainTrackWidth(e.nativeEvent.layout.width)}
        >
          {mainTabWidth > 0 && (
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  width: mainTabWidth,
                  backgroundColor: C.surface,
                  borderColor: isDark ? `${JOB_COLOR}55` : `${JOB_COLOR}35`,
                  transform: [{ translateX: mainTranslateX }],
                },
              ]}
            />
          )}

          {[
            { id: 'browse' as MainTab, label: t.jobs2?.browseTab ?? 'Browse', count: deptFiltered.length },
            { id: 'saved' as MainTab, label: t.jobs2?.savedTab ?? 'Saved', count: savedIds.size },
            { id: 'my_applications' as MainTab, label: t.jobs2?.applicationsTab ?? 'Applications', count: applications.length },
          ].map(tb => {
            const active = mainTab === tb.id;
            return (
              <TouchableOpacity
                key={tb.id}
                style={styles.tabBtn}
                onPress={() => setMainTab(tb.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabBtnTxt,
                    {
                      color: active ? JOB_COLOR : C.textMuted,
                      fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tb.label}
                </Text>
                {tb.count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor: active
                          ? `${JOB_COLOR}22`
                          : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.border),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeTxt,
                        {
                          color: active ? JOB_COLOR : C.textMuted,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {tb.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. Animated Status Switcher (Open | Closing Soon | Expired) */}
      {mainTab === 'browse' && (
        <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 8 }}>
          <View
            style={[styles.statusTrack, { backgroundColor: C.surface2 }]}
            onLayout={e => setStatusTrackWidth(e.nativeEvent.layout.width)}
          >
            {statusTabWidth > 0 && (
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    width: statusTabWidth,
                    backgroundColor: C.surface,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : C.border,
                    transform: [{ translateX: statusTranslateX }],
                  },
                ]}
              />
            )}

            {[
              { id: 'open' as StatusFilter, label: 'Open', count: browseCounts.open, fg: Accent.teal },
              { id: 'closing' as StatusFilter, label: 'Closing Soon', count: browseCounts.closing, fg: C.warn },
              { id: 'expired' as StatusFilter, label: 'Expired', count: browseCounts.expired, fg: Accent.slate },
            ].map(st => {
              const active = statusFilter === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={styles.tabBtn}
                  onPress={() => setStatusFilter(st.id)}
                  activeOpacity={0.75}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={[styles.statusDotSmall, { backgroundColor: st.fg }]} />
                    <Text
                      style={[
                        styles.statusBtnTxt,
                        {
                          color: active ? C.text : C.textMuted,
                          fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {st.label}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.statusCountTxt,
                      {
                        color: active ? st.fg : C.textMuted,
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                  >
                    ({st.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* 3. Search Bar (Browse & Saved) */}
      {mainTab !== 'my_applications' && (
        <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 8 }}>
          <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="search" size={16} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
              placeholder={t.jobs.searchPlaceholder}
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 4. Dropdowns Row: Job Type & Department (Replacing Horizontal Scrolling Pills) */}
      {mainTab !== 'my_applications' && (
        <View style={[styles.dualBarRow, { paddingHorizontal: Layout.screenPadding, paddingTop: 8, paddingBottom: 4 }]}>
          {/* Job Type Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dualBarBtn,
              typeFilter !== 'all'
                ? {
                    backgroundColor: isDark ? 'rgba(14, 156, 138, 0.18)' : '#e0f4f0',
                    borderColor: SectorColors.jobs,
                  }
                : { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => setTypeModalVisible(true)}
            activeOpacity={0.75}
          >
            <Feather
              name="briefcase"
              size={13}
              color={typeFilter !== 'all' ? SectorColors.jobs : C.textMuted}
            />
            <Text
              style={[
                styles.dualBarTxt,
                {
                  color: typeFilter !== 'all' ? SectorColors.jobs : C.text,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
              numberOfLines={1}
            >
              {currentTypeLabel}
            </Text>
            <Feather
              name="chevron-down"
              size={13}
              color={typeFilter !== 'all' ? SectorColors.jobs : C.textMuted}
            />
          </TouchableOpacity>

          {/* Department Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dualBarBtn,
              deptFilter !== 'ALL'
                ? {
                    backgroundColor: isDark ? 'rgba(14, 156, 138, 0.18)' : '#e0f4f0',
                    borderColor: SectorColors.jobs,
                  }
                : { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => setDeptModalVisible(true)}
            activeOpacity={0.75}
          >
            <Feather
              name="book-open"
              size={13}
              color={deptFilter !== 'ALL' ? SectorColors.jobs : C.textMuted}
            />
            <Text
              style={[
                styles.dualBarTxt,
                {
                  color: deptFilter !== 'ALL' ? SectorColors.jobs : C.text,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
              numberOfLines={1}
            >
              {currentDeptLabel}
            </Text>
            <Feather
              name="chevron-down"
              size={13}
              color={deptFilter !== 'ALL' ? SectorColors.jobs : C.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Scroll View */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {loading && jobs.length === 0 ? (
          <SkeletonList />
        ) : loadFailed && jobs.length === 0 ? (
          <LoadError onRetry={load} />
        ) : mainTab === 'my_applications' ? (
          /* My Applications View */
          applications.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="jobs" size={28} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2?.noApplicationsYet ?? 'No Applications Yet'}
              </Text>
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.jobs2?.noApplicationsSub ?? 'Find internships, campus jobs, or tuition opportunities and apply with 1 tap!'}
              </Text>
              <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: C.brand }]}
                onPress={() => setMainTab('browse')}
                activeOpacity={0.8}
              >
                <Text style={[styles.exploreBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.jobs2?.browseOpportunities ?? 'Browse Opportunities'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {applications.map(app => {
                const tone = appStatusTone(C, t, app.status);
                const jobTitle = app.job?.title || 'Job Listing';
                const companyName = app.job?.company || 'Company';
                return (
                  <View key={app.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <TouchableOpacity
                      style={styles.cardMain}
                      onPress={() => navigation.navigate('JobDetail', { jobId: app.job_id })}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.thumb, { backgroundColor: JOB_BG }]}>
                        <Icon name="jobs" size={22} color={JOB_COLOR} />
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {jobTitle}
                        </Text>
                        <Text style={[styles.cardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                          {companyName} · Applied {formatDate(app.created_at)}
                        </Text>

                        {/* Status Row */}
                        <View style={styles.cardMeta}>
                          <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
                            <Text style={[styles.statusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}>
                              {tone.label}
                            </Text>
                          </View>

                          {app.job?.stipend && (
                            <View style={[styles.stipendBadge, { backgroundColor: C.surface2 }]}>
                              <Text style={[styles.stipendTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                                {app.job.stipend}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.withdrawBtn}
                      onPress={() => handleWithdrawApplication(app.id)}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={17} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )
        ) : browseList.length === 0 ? (
          /* Browse & Saved Empty View */
          <View style={styles.empty}>
            <Icon name="jobs" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {mainTab === 'saved' ? (t.jobs2?.noSavedJobs ?? 'No Saved Jobs') : t.common.noResults}
            </Text>
            {mainTab === 'saved' && (
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.jobs2?.noSavedJobsSub ?? 'Star any job listing to quickly access it here.'}
              </Text>
            )}
          </View>
        ) : (
          /* Browse & Saved List View */
          <View style={styles.list}>
            {browseList.map(j => {
              const status = computeJobStatus(j);
              const s = jobStatusTone(C, t, status, isDark);
              const isSaved = savedIds.has(j.id);
              const typeColor = TYPE_COLORS[j.job_type] ?? Accent.teal;
              const typeBg = pillBg(typeColor, isDark);
              const daysLeft = daysRemainingLabel(j.deadline, {
                today: t.jobs2?.closesToday,
                tomorrow: t.jobs2?.closesTomorrow,
                inDays: t.jobs2?.closesInDays,
                closed: t.jobs2?.closedOn,
              });

              return (
                <View key={j.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() => navigation.navigate('JobDetail', { jobId: j.id })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.thumb, { backgroundColor: JOB_BG }]}>
                      <Icon name="jobs" size={22} color={JOB_COLOR} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {j.title}
                      </Text>
                      <Text style={[styles.cardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {j.company} · {j.area_name || j.location}
                      </Text>

                      {/* Metadata Row */}
                      <View style={styles.cardMeta}>
                        <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                          <View style={[styles.statusDot, { backgroundColor: s.fg }]} />
                          <Text style={[styles.statusTxt, { color: s.fg, fontFamily: FontFamily.jakartaBold }]}>
                            {s.label}
                          </Text>
                        </View>

                        <View style={[styles.catBadge, { backgroundColor: typeBg }]}>
                          <Text style={[styles.catBadgeTxt, { color: typeColor, fontFamily: FontFamily.jakartaBold }]}>
                            {getTypeLabel(t, j.job_type)}
                          </Text>
                        </View>

                        {j.department_code && j.department_code !== 'ALL' && (
                          <View style={[styles.stipendBadge, { backgroundColor: C.surface2 }]}>
                            <Text style={[styles.stipendTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                              {j.department_code}
                            </Text>
                          </View>
                        )}

                        {j.stipend ? (
                          <View style={[styles.stipendBadge, { backgroundColor: C.surface2 }]}>
                            <Text style={[styles.stipendTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                              {j.stipend}
                            </Text>
                          </View>
                        ) : null}

                        {j.is_alumni_referral && (
                          <View style={[styles.alumniBadgeSmall, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef9c3' }]}>
                            <Feather name="award" size={11} color={Accent.gold} />
                            <Text style={[styles.alumniBadgeSmallTxt, { color: Accent.gold, fontFamily: FontFamily.jakartaBold }]}>
                              {t.jobs2?.alumniReferral ?? 'Alumni'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Footer Info Row */}
                      <View style={styles.cardFooter}>
                        {daysLeft ? (
                          <Text
                            style={[
                              styles.deadlineTxt,
                              {
                                color: status === 'closing' ? C.warn : C.textMuted,
                                fontFamily: FontFamily.jakartaSemiBold,
                              },
                            ]}
                          >
                            🕒 {daysLeft}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => handleToggleSave(j.id)}
                    activeOpacity={0.75}
                  >
                    <Feather
                      name="star"
                      size={20}
                      color={isSaved ? Accent.gold : C.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal 1: Filter by Job Type (Bottom Sheet Dropdown) */}
      <Modal
        visible={typeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setTypeModalVisible(false)}
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
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                Filter by Job Type
              </Text>
              <TouchableOpacity
                onPress={() => setTypeModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {TYPE_OPTIONS.map(opt => {
                const selected = typeFilter === opt.id;
                const count = opt.id === 'all'
                  ? deptFiltered.length
                  : deptFiltered.filter(j => j.job_type === opt.id).length;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.modalOptionItem,
                      { borderColor: C.border },
                      selected && {
                        backgroundColor: isDark ? 'rgba(14, 156, 138, 0.15)' : '#e0f4f0',
                        borderColor: SectorColors.jobs,
                      },
                    ]}
                    onPress={() => {
                      setTypeFilter(opt.id);
                      setTypeModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modalOptionTxt,
                          {
                            color: selected ? SectorColors.jobs : C.text,
                            fontFamily: selected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.modalOptionCount,
                        {
                          color: selected ? SectorColors.jobs : C.textMuted,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                    {selected && <Feather name="check" size={16} color={SectorColors.jobs} style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Target Department (Bottom Sheet Dropdown) */}
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
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                Target Department
              </Text>
              <TouchableOpacity
                onPress={() => setDeptModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {JOB_DEPARTMENTS.map(dept => {
                const selected = deptFilter === dept.code;
                const isUserDept = profile?.department && dept.label.toLowerCase().includes(profile.department.toLowerCase());
                const count = dept.code === 'ALL'
                  ? typeFiltered.length
                  : typeFiltered.filter(
                      j => j.department_code === dept.code || j.department_code === 'ALL' || !j.department_code
                    ).length;
                return (
                  <TouchableOpacity
                    key={dept.code}
                    style={[
                      styles.modalOptionItem,
                      { borderColor: C.border },
                      selected && {
                        backgroundColor: isDark ? 'rgba(14, 156, 138, 0.15)' : '#e0f4f0',
                        borderColor: SectorColors.jobs,
                      },
                    ]}
                    onPress={() => {
                      setDeptFilter(dept.code);
                      setDeptModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.modalOptionTxt,
                            {
                              color: selected ? SectorColors.jobs : C.text,
                              fontFamily: selected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            },
                          ]}
                        >
                          {dept.code === 'ALL' ? 'All Departments' : dept.label}
                        </Text>
                        {isUserDept && (
                          <View style={[styles.myDeptBadge, { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.25)' : '#e0f4f0' }]}>
                            <Text style={[styles.myDeptBadgeTxt, { color: SectorColors.jobs, fontFamily: FontFamily.jakartaBold }]}>
                              Your Dept
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.modalOptionCount,
                        {
                          color: selected ? SectorColors.jobs : C.textMuted,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                    {selected && <Feather name="check" size={16} color={SectorColors.jobs} style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  // Animated Tab Track (Browse | Saved | Applications)
  tabTrack: {
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    position: 'relative',
  } as ViewStyle,
  tabIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 11,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 1,
  } as ViewStyle,
  tabBtnTxt: {
    fontSize: 12.5,
  } as any,
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  } as ViewStyle,
  tabBadgeTxt: {
    fontSize: 10.5,
  } as any,

  // Animated Status Track (Open | Closing Soon | Expired)
  statusTrack: {
    height: 38,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    position: 'relative',
  } as ViewStyle,
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  statusBtnTxt: {
    fontSize: 12,
  } as any,
  statusCountTxt: {
    fontSize: 11,
  } as any,

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  } as TextStyle,

  // Dual Dropdown Buttons Row
  dualBarRow: {
    flexDirection: 'row',
    gap: 9,
  } as ViewStyle,
  dualBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    gap: 6,
  } as ViewStyle,
  dualBarTxt: {
    flex: 1,
    fontSize: 12,
  } as any,

  // Dropdown Modal Sheets
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  } as ViewStyle,
  modalBackdrop: {
    flex: 1,
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  } as ViewStyle,
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  } as ViewStyle,
  modalTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  } as any,
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,
  modalOptionTxt: {
    fontSize: 13.5,
  } as any,
  modalOptionCount: {
    fontSize: 12,
  } as any,
  myDeptBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  } as ViewStyle,
  myDeptBadgeTxt: {
    fontSize: 10,
  } as any,

  // List & Cards
  scroll: { paddingTop: 6, paddingBottom: 28 } as ViewStyle,
  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 13, flex: 1, minWidth: 0 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14.5 } as any,
  cardSub: { fontSize: 12, marginTop: 2 } as any,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' } as ViewStyle,
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as any,
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  catBadgeTxt: { fontSize: 11 } as any,
  stipendBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 } as ViewStyle,
  stipendTxt: { fontSize: 10.5 } as any,
  alumniBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 } as ViewStyle,
  alumniBadgeSmallTxt: { fontSize: 10.5 } as any,
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 } as ViewStyle,
  deadlineTxt: { fontSize: 11 } as any,
  saveBtn: { padding: 8, marginLeft: 4 } as ViewStyle,
  withdrawBtn: { padding: 8, marginLeft: 4 } as ViewStyle,
  iconBtn: { padding: 8 } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 } as any,
  exploreBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 } as ViewStyle,
  exploreBtnTxt: { fontSize: 13.5 } as any,
});
