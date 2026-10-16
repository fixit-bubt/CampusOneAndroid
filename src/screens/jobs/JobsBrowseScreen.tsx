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
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { LiquidToggle } from '../../components/ui/LiquidToggle';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout, SectorColors, Accent, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { formatDate } from '../../utils/format';
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

export type MainTab = 'browse' | 'saved' | 'my_applications';
export type TypeFilter = 'all' | 'internship' | 'tuition' | 'on_campus' | 'part_time' | 'full_time' | 'freelance' | 'expired';

export interface JobTypeConfig {
  id: TypeFilter;
  label: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
}

export const JOB_TYPE_CONFIGS: JobTypeConfig[] = [
  {
    id: 'all',
    label: 'All Categories',
    subtitle: 'View all active campus opportunities',
    icon: 'grid',
  },
  {
    id: 'internship',
    label: 'Internships',
    subtitle: 'Industry internships & trainee programs',
    icon: 'briefcase',
  },
  {
    id: 'tuition',
    label: 'Private Tuition',
    subtitle: 'Home & online tutoring for school/college',
    icon: 'edit-3',
  },
  {
    id: 'on_campus',
    label: 'On-Campus Jobs',
    subtitle: 'TA, lab assistant, library & campus roles',
    icon: 'home',
  },
  {
    id: 'part_time',
    label: 'Part-Time',
    subtitle: 'Flexible work hours alongside classes',
    icon: 'clock',
  },
  {
    id: 'full_time',
    label: 'Full-Time',
    subtitle: 'Graduate & entry-level career openings',
    icon: 'award',
  },
  {
    id: 'freelance',
    label: 'Freelance & Projects',
    subtitle: 'Project-based gigs & contract work',
    icon: 'code',
  },
  {
    id: 'expired',
    label: 'Past & Expired Archive',
    subtitle: 'View closed and past circulars',
    icon: 'archive',
  },
];

export interface DeptConfig {
  code: string;
  name: string;
  faculty: string;
  icon: keyof typeof Feather.glyphMap;
}

export const DEPT_CONFIGS: DeptConfig[] = [
  {
    code: 'ALL',
    name: 'All Departments',
    faculty: 'Open to students of all faculties',
    icon: 'layers',
  },
  {
    code: 'CSE',
    name: 'Computer Science & Engineering',
    faculty: 'Faculty of Engineering & Applied Sciences',
    icon: 'cpu',
  },
  {
    code: 'EEE',
    name: 'Electrical & Electronic Engineering',
    faculty: 'Faculty of Engineering & Applied Sciences',
    icon: 'zap',
  },
  {
    code: 'BBA',
    name: 'Business Administration',
    faculty: 'Faculty of Business',
    icon: 'trending-up',
  },
  {
    code: 'LAW',
    name: 'Department of Law',
    faculty: 'Faculty of Law',
    icon: 'shield',
  },
  {
    code: 'ENG',
    name: 'Department of English',
    faculty: 'Faculty of Arts & Humanities',
    icon: 'book',
  },
  {
    code: 'ECO',
    name: 'Department of Economics',
    faculty: 'Faculty of Business',
    icon: 'bar-chart-2',
  },
  {
    code: 'MATH',
    name: 'Department of Mathematics',
    faculty: 'Faculty of Science & Information Technology',
    icon: 'percent',
  },
  {
    code: 'TEX',
    name: 'Textile Engineering',
    faculty: 'Faculty of Engineering & Applied Sciences',
    icon: 'scissors',
  },
  {
    code: 'CIVIL',
    name: 'Civil Engineering',
    faculty: 'Faculty of Engineering & Applied Sciences',
    icon: 'compass',
  },
];

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
    case 'shortlisted': return { label: t.jobs2?.candidateShortlisted ?? 'Shortlisted', fg: C.success, bg: C.successBg };
    case 'viewed':      return { label: t.jobs2?.candidateViewed ?? 'Viewed by Recruiter', fg: C.info, bg: C.infoBg };
    case 'rejected':    return { label: t.jobs2?.candidateRejected ?? 'Not Selected', fg: Accent.slate, bg: 'rgba(100, 116, 139, 0.12)' };
    default:            return { label: t.jobs2?.applicationSubmitted ?? 'Submitted', fg: C.brand, bg: `${SectorColors.jobs}1a` };
  }
}

function formatSalary(stipend?: string | null): string {
  if (!stipend) return '';
  const trimmed = stipend.trim();
  if (/^\d+$/.test(trimmed)) {
    return `৳${Number(trimmed).toLocaleString('en-US')}`;
  }
  if (!trimmed.startsWith('৳') && !trimmed.toLowerCase().startsWith('bdt')) {
    const numMatch = trimmed.match(/^(\d+)(.*)$/);
    if (numMatch) {
      return `৳${Number(numMatch[1]).toLocaleString('en-US')}${numMatch[2]}`;
    }
  }
  return trimmed;
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

export function JobsBrowseScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const isAdmin = profile?.role === 'admin';

  const [canPost, setCanPost] = useState(isAdmin);
  const [mainTab, setMainTab] = useState<MainTab>('browse');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [includeExpired, setIncludeExpired] = useState(false);
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [applications, setApplications] = useState<(JobApplication & { job?: Job })[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Bottom sheet dropdown modals
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [deptModalVisible, setDeptModalVisible] = useState(false);

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
    setSavedIds(next);

    const res = await toggleJobBookmark(jobId, user.id, isSaved);
    if (!res.success) {
      setSavedIds(savedIds);
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
    if (typeFilter === 'expired') {
      return searched.filter(j => computeJobStatus(j) === 'expired');
    }
    return searched.filter(j => j.job_type === typeFilter);
  }, [searched, typeFilter]);

  const deptFiltered = useMemo(() => {
    if (deptFilter === 'ALL') return typeFiltered;
    return typeFiltered.filter(
      j => j.department_code === deptFilter || j.department_code === 'ALL' || !j.department_code
    );
  }, [typeFiltered, deptFilter]);

  // Active vs Expired separation
  const activeJobs = useMemo(() => {
    return deptFiltered.filter(j => {
      const s = computeJobStatus(j);
      return s !== 'expired' && s !== 'removed';
    });
  }, [deptFiltered]);

  const expiredCount = useMemo(() => {
    const base = deptFilter === 'ALL'
      ? searched
      : searched.filter(j => j.department_code === deptFilter || j.department_code === 'ALL' || !j.department_code);
    return base.filter(j => computeJobStatus(j) === 'expired').length;
  }, [searched, deptFilter]);

  const browseList = useMemo(() => {
    if (mainTab === 'saved') {
      return deptFiltered
        .filter(j => savedIds.has(j.id))
        .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
    }
    if (typeFilter === 'expired') {
      return deptFiltered.filter(j => computeJobStatus(j) === 'expired');
    }
    if (includeExpired) {
      return deptFiltered.filter(j => computeJobStatus(j) !== 'removed');
    }
    return activeJobs;
  }, [deptFiltered, savedIds, mainTab, includeExpired, typeFilter, activeJobs]);

  const currentTypeConfig = useMemo(() => {
    return JOB_TYPE_CONFIGS.find(o => o.id === typeFilter) ?? JOB_TYPE_CONFIGS[0];
  }, [typeFilter]);

  const currentDeptConfig = useMemo(() => {
    return DEPT_CONFIGS.find(d => d.code === deptFilter) ?? DEPT_CONFIGS[0];
  }, [deptFilter]);

  const mainTabs: TabItem<MainTab>[] = useMemo(() => [
    {
      id: 'browse',
      label: t.jobs2?.browseTab ?? 'Browse',
      icon: 'briefcase',
      count: typeFilter === 'expired'
        ? browseList.length
        : includeExpired
        ? deptFiltered.filter(j => computeJobStatus(j) !== 'removed').length
        : activeJobs.length,
      accentColor: SectorColors.jobs,
      color: SectorColors.jobs,
    },
    {
      id: 'saved',
      label: t.jobs2?.savedTab ?? 'Saved',
      icon: 'star',
      count: savedIds.size,
      accentColor: Accent.gold,
      color: Accent.gold,
    },
    {
      id: 'my_applications',
      label: 'Applied',
      icon: 'file-text',
      count: applications.length,
      accentColor: Accent.purple,
      color: Accent.purple,
    },
  ], [t.jobs2, typeFilter, browseList.length, includeExpired, deptFiltered, activeJobs.length, savedIds.size, applications.length]);

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
          ) : <View style={{ width: 28 }} />
        }
      />

      {/* 1. Primary Segmented Tabs (Browse | Saved | Applied) - Height 58dp */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6 }}>
        <SegmentedTabs
          tabs={mainTabs}
          activeTab={mainTab}
          onTabChange={setMainTab}
        />
      </View>

      {/* 2. Structured 50/50 Dual Control Bar (Job Type & Department) - Height 58dp */}
      {mainTab !== 'my_applications' && (
        <View style={[styles.dualBarRow, { paddingHorizontal: Layout.screenPadding, paddingTop: 8 }]}>
          {/* Job Type Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dualBarBtn,
              typeFilter !== 'all'
                ? [
                    styles.dualBarBtnActive,
                    {
                      backgroundColor: isDark ? 'rgba(14, 156, 138, 0.18)' : '#e0f4f0',
                      borderColor: SectorColors.jobs,
                    },
                  ]
                : [styles.dualBarBtnInactive, { backgroundColor: C.surface, borderColor: C.border }],
            ]}
            onPress={() => setTypeModalVisible(true)}
            activeOpacity={0.75}
          >
            <AnimatedIcon
              family="feather"
              name={typeFilter === 'all' ? 'briefcase' : currentTypeConfig.icon}
              size={16}
              color={typeFilter !== 'all' ? (isDark ? '#fff' : SectorColors.jobs) : C.text2}
              animation={typeFilter !== 'all' ? 'spring' : 'none'}
            />
            <Text
              style={[
                styles.dualBarTxt,
                {
                  color: typeFilter !== 'all' ? (isDark ? '#fff' : SectorColors.jobs) : C.text,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
              numberOfLines={1}
            >
              {typeFilter === 'all'
                ? (includeExpired ? 'All (+ Expired)' : 'All Types')
                : currentTypeConfig.label}
            </Text>
            <Feather
              name="chevron-down"
              size={15}
              color={typeFilter !== 'all' ? (isDark ? '#fff' : SectorColors.jobs) : C.textMuted}
            />
          </TouchableOpacity>

          {/* Department Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dualBarBtn,
              deptFilter !== 'ALL'
                ? [
                    styles.dualBarBtnActive,
                    {
                      backgroundColor: isDark ? 'rgba(14, 156, 138, 0.18)' : '#e0f4f0',
                      borderColor: SectorColors.jobs,
                    },
                  ]
                : [styles.dualBarBtnInactive, { backgroundColor: C.surface, borderColor: C.border }],
            ]}
            onPress={() => setDeptModalVisible(true)}
            activeOpacity={0.75}
          >
            <AnimatedIcon
              family="feather"
              name={deptFilter === 'ALL' ? 'book-open' : currentDeptConfig.icon}
              size={16}
              color={deptFilter !== 'ALL' ? (isDark ? '#fff' : SectorColors.jobs) : C.text2}
              animation={deptFilter !== 'ALL' ? 'spring' : 'none'}
            />
            <Text
              style={[
                styles.dualBarTxt,
                {
                  color: deptFilter !== 'ALL' ? (isDark ? '#fff' : SectorColors.jobs) : C.text,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
              numberOfLines={1}
            >
              {deptFilter === 'ALL' ? 'All Depts' : deptFilter}
            </Text>
            <Feather
              name="chevron-down"
              size={15}
              color={deptFilter !== 'ALL' ? (isDark ? '#fff' : SectorColors.jobs) : C.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Search Bar (Directly Above Results Feed) - Height 58dp */}
      {mainTab !== 'my_applications' && (
        <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 8, paddingBottom: 4 }}>
          <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="search" size={18} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
              placeholder={t.jobs?.searchPlaceholder ?? 'Search title, company, skills, area...'}
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
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
              {mainTab === 'saved'
                ? (t.jobs2?.noSavedJobs ?? 'No Saved Jobs')
                : typeFilter === 'expired'
                ? 'No Expired Circulars'
                : activeJobs.length === 0 && expiredCount > 0
                ? 'No Active Openings'
                : t.common.noResults}
            </Text>
            {mainTab === 'saved' ? (
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.jobs2?.noSavedJobsSub ?? 'Star any job listing to quickly access it here.'}
              </Text>
            ) : typeFilter === 'expired' ? (
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                No past circulars found matching your current search or department filter.
              </Text>
            ) : activeJobs.length === 0 && expiredCount > 0 ? (
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                There are {expiredCount} past opportunities in the archive.
              </Text>
            ) : (
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Try adjusting your search keywords, job type, or department filter.
              </Text>
            )}

            {mainTab === 'browse' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {expiredCount > 0 && typeFilter !== 'expired' && (
                  <TouchableOpacity
                    style={[styles.resetFilterBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setTypeFilter('expired')}
                    activeOpacity={0.8}
                  >
                    <Feather name="archive" size={13} color={C.warn} style={{ marginRight: 6 }} />
                    <Text style={[styles.resetFilterBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      View {expiredCount} Expired Archive
                    </Text>
                  </TouchableOpacity>
                )}

                {(query.length > 0 || typeFilter !== 'all' || deptFilter !== 'ALL') && (
                  <TouchableOpacity
                    style={[styles.resetFilterBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                    onPress={() => {
                      setQuery('');
                      setTypeFilter('all');
                      setDeptFilter('ALL');
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="rotate-ccw" size={13} color={C.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.resetFilterBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Reset Filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          /* Browse & Saved List View */
          <View style={styles.list}>
            {browseList.map(j => {
              const status = computeJobStatus(j);
              const s = jobStatusTone(C, t, status, isDark);
              const isSaved = savedIds.has(j.id);
              const typeConfig = JOB_TYPE_CONFIGS.find(o => o.id === j.job_type) ?? JOB_TYPE_CONFIGS[1];
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
                    <View style={[styles.thumb, { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.16)' : '#e0f4f0' }]}>
                      <Feather name={typeConfig.icon} size={20} color={isDark ? '#5eead4' : SectorColors.jobs} />
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

                        <View style={[styles.catBadge, { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.14)' : '#e0f4f0' }]}>
                          <Text style={[styles.catBadgeTxt, { color: isDark ? '#5eead4' : SectorColors.jobs, fontFamily: FontFamily.jakartaBold }]}>
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
                            <Text style={[styles.stipendTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                              {formatSalary(j.stipend)}
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
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="clock" size={11} color={status === 'closing' ? C.warn : C.textMuted} style={{ marginRight: 3 }} />
                            <Text
                              style={[
                                styles.deadlineTxt,
                                {
                                  color: status === 'closing' ? C.warn : C.textMuted,
                                  fontFamily: FontFamily.jakartaSemiBold,
                                },
                              ]}
                            >
                              {daysLeft}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => handleToggleSave(j.id)}
                    activeOpacity={0.75}
                  >
                    <AnimatedIcon
                      family="feather"
                      name="star"
                      size={20}
                      color={isSaved ? Accent.gold : C.textMuted}
                      animation={isSaved ? 'spring' : 'none'}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal 1: Filter by Job Type (72dp Cards Bottom Sheet) */}
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
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIcon,
                    { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.2)' : 'rgba(14, 156, 138, 0.1)' },
                  ]}
                >
                  <Feather name="briefcase" size={17} color={SectorColors.jobs} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Filter by Job Type
                  </Text>
                  <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Select category to narrow opportunities
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setTypeModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 6 }}>
              {JOB_TYPE_CONFIGS.map(opt => {
                const selected = typeFilter === opt.id;
                const count = opt.id === 'all'
                  ? deptFiltered.filter(j => computeJobStatus(j) !== 'expired' && computeJobStatus(j) !== 'removed').length
                  : opt.id === 'expired'
                  ? expiredCount
                  : deptFiltered.filter(j => j.job_type === opt.id && computeJobStatus(j) !== 'expired' && computeJobStatus(j) !== 'removed').length;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.card72,
                      {
                        backgroundColor: selected
                          ? (isDark ? 'rgba(14, 156, 138, 0.16)' : '#e0f4f0')
                          : C.surface,
                        borderColor: selected ? SectorColors.jobs : C.border,
                        borderWidth: selected ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      setTypeFilter(opt.id);
                      setTypeModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.card72IconBox,
                        {
                          backgroundColor: selected
                            ? (isDark ? 'rgba(14, 156, 138, 0.28)' : 'rgba(14, 156, 138, 0.18)')
                            : C.surface2,
                        },
                      ]}
                    >
                      <AnimatedIcon
                        family="feather"
                        name={opt.icon}
                        size={20}
                        color={selected ? (isDark ? '#5eead4' : SectorColors.jobs) : C.text2}
                        animation={selected ? 'spring' : 'none'}
                      />
                    </View>
                    <View style={styles.card72Info}>
                      <Text
                        style={[
                          styles.card72Title,
                          {
                            color: selected ? (isDark ? '#fff' : SectorColors.jobs) : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.card72Sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {opt.subtitle}
                      </Text>
                    </View>
                    <View style={styles.card72Right}>
                      <View
                        style={[
                          styles.card72CountBadge,
                          {
                            backgroundColor: selected
                              ? (isDark ? 'rgba(14, 156, 138, 0.35)' : 'rgba(14, 156, 138, 0.2)')
                              : C.surface2,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.card72CountTxt,
                            {
                              color: selected ? (isDark ? '#fff' : SectorColors.jobs) : C.text2,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                      {selected && (
                        <View style={[styles.card72Check, { backgroundColor: SectorColors.jobs }]}>
                          <Feather name="check" size={13} color="#fff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quick Toggle: Include Expired in Main Feed */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 14,
                marginTop: 6,
                borderRadius: 14,
                backgroundColor: C.surface2,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 13, color: C.text, fontFamily: FontFamily.jakartaBold }}>
                  Include Expired in Active Feed
                </Text>
                <Text style={{ fontSize: 11, color: C.textMuted, fontFamily: FontFamily.jakartaMedium, marginTop: 1 }}>
                  Show past circulars alongside active openings
                </Text>
              </View>
              <LiquidToggle
                size="sm"
                checked={includeExpired}
                onCheckedChange={setIncludeExpired}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Target Department (72dp Cards Bottom Sheet) */}
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
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIcon,
                    { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.2)' : 'rgba(14, 156, 138, 0.1)' },
                  ]}
                >
                  <Feather name="book-open" size={17} color={SectorColors.jobs} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Target Department
                  </Text>
                  <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Find opportunities for your field of study
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setDeptModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 10 }}>
              {DEPT_CONFIGS.map(dept => {
                const selected = deptFilter === dept.code;
                const isUserDept = profile?.department && (
                  dept.code.toLowerCase() === profile.department.toLowerCase() ||
                  dept.name.toLowerCase().includes(profile.department.toLowerCase())
                );
                const count = dept.code === 'ALL'
                  ? typeFiltered.length
                  : typeFiltered.filter(j => j.department_code === dept.code).length;
                return (
                  <TouchableOpacity
                    key={dept.code}
                    style={[
                      styles.card72,
                      {
                        backgroundColor: selected
                          ? (isDark ? 'rgba(14, 156, 138, 0.16)' : '#e0f4f0')
                          : C.surface,
                        borderColor: selected ? SectorColors.jobs : C.border,
                        borderWidth: selected ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      setDeptFilter(dept.code);
                      setDeptModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.card72IconBox,
                        {
                          backgroundColor: selected
                            ? (isDark ? 'rgba(14, 156, 138, 0.28)' : 'rgba(14, 156, 138, 0.18)')
                            : C.surface2,
                        },
                      ]}
                    >
                      <AnimatedIcon
                        family="feather"
                        name={dept.icon}
                        size={20}
                        color={selected ? (isDark ? '#5eead4' : SectorColors.jobs) : C.text2}
                        animation={selected ? 'spring' : 'none'}
                      />
                    </View>
                    <View style={styles.card72Info}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.card72Title,
                            {
                              color: selected ? (isDark ? '#fff' : SectorColors.jobs) : C.text,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {dept.code === 'ALL' ? dept.name : `${dept.code} · ${dept.name}`}
                        </Text>
                        {isUserDept && (
                          <View style={[styles.myDeptBadge, { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.25)' : '#e0f4f0' }]}>
                            <Text style={[styles.myDeptBadgeTxt, { color: SectorColors.jobs, fontFamily: FontFamily.jakartaBold }]}>
                              Your Dept
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.card72Sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {dept.faculty}
                      </Text>
                    </View>
                    <View style={styles.card72Right}>
                      <View
                        style={[
                          styles.card72CountBadge,
                          {
                            backgroundColor: selected
                              ? (isDark ? 'rgba(14, 156, 138, 0.35)' : 'rgba(14, 156, 138, 0.2)')
                              : C.surface2,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.card72CountTxt,
                            {
                              color: selected ? (isDark ? '#fff' : SectorColors.jobs) : C.text2,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                      {selected && (
                        <View style={[styles.card72Check, { backgroundColor: SectorColors.jobs }]}>
                          <Feather name="check" size={13} color="#fff" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  // Search Bar (Height 58dp)
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  // Dual Dropdown Buttons Row (Height 58dp)
  dualBarRow: {
    flexDirection: 'row',
    gap: 9,
  } as ViewStyle,
  dualBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
  } as ViewStyle,
  dualBarBtnActive: {
    borderWidth: 1.5,
  } as ViewStyle,
  dualBarBtnInactive: {} as ViewStyle,
  dualBarTxt: {
    flex: 1,
    fontSize: 13.5,
  } as TextStyle,

  // Dropdown Modal Sheets
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
    borderTopWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 10,
    maxHeight: '85%',
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
    letterSpacing: -0.2,
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

  // 72dp Bottom Sheet Option Cards
  card72: {
    height: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  } as ViewStyle,
  card72IconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  card72Info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,
  card72Title: {
    fontSize: 14.5,
    letterSpacing: -0.1,
  } as TextStyle,
  card72Sub: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  card72Right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  } as ViewStyle,
  card72CountBadge: {
    paddingHorizontal: 8.5,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  card72CountTxt: {
    fontSize: 11.5,
  } as TextStyle,
  card72Check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  myDeptBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  } as ViewStyle,
  myDeptBadgeTxt: {
    fontSize: 10,
  } as TextStyle,

  // List & Cards
  scroll: { paddingTop: 6, paddingBottom: 28 } as ViewStyle,
  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 13, flex: 1, minWidth: 0 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14.5 } as TextStyle,
  cardSub: { fontSize: 12, marginTop: 2 } as TextStyle,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' } as ViewStyle,
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as TextStyle,
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  catBadgeTxt: { fontSize: 11 } as TextStyle,
  stipendBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 } as ViewStyle,
  stipendTxt: { fontSize: 10.5 } as TextStyle,
  alumniBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 } as ViewStyle,
  alumniBadgeSmallTxt: { fontSize: 10.5 } as TextStyle,
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 } as ViewStyle,
  deadlineTxt: { fontSize: 11 } as TextStyle,
  saveBtn: { padding: 8, marginLeft: 4 } as ViewStyle,
  withdrawBtn: { padding: 8, marginLeft: 4 } as ViewStyle,
  iconBtn: { padding: 8 } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as TextStyle,
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 } as TextStyle,
  exploreBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 } as ViewStyle,
  exploreBtnTxt: { fontSize: 13.5 } as TextStyle,
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  resetFilterBtnTxt: { fontSize: 13 } as TextStyle,
});
