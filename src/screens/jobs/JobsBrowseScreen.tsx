import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

function appStatusTone(C: any, status: JobApplication['status']) {
  switch (status) {
    case 'shortlisted': return { label: 'Shortlisted 🎉', fg: C.success, bg: C.successBg };
    case 'viewed':      return { label: 'Viewed by Recruiter', fg: C.info, bg: C.infoBg };
    case 'rejected':    return { label: 'Not Selected', fg: Accent.slate, bg: 'rgba(100, 116, 139, 0.12)' };
    default:            return { label: 'Submitted', fg: C.brand, bg: `${SectorColors.jobs}1a` };
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

const TYPE_LABELS: Record<string, string> = {
  internship: 'Internship',
  tuition:    'Tuition',
  on_campus:  'On-Campus',
  part_time:  'Part-time',
  full_time:  'Full-time',
  freelance:  'Freelance',
};

type MainTab = 'browse' | 'saved' | 'my_applications';
type StatusFilter = 'open' | 'closing' | 'expired';
type TypeFilter = 'all' | 'internship' | 'tuition' | 'on_campus' | 'part_time' | 'full_time' | 'freelance';

export function JobsBrowseScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
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
    if (isAdmin) { setCanPost(true); return; }
    (async () => {
      const [org, lead] = await Promise.all([
        supabase.from('event_organizers').select('user_id').eq('user_id', user.id).limit(1),
        supabase.from('club_members').select('role').eq('user_id', user.id).in('role', ['president', 'vp']).limit(1),
      ]);
      setCanPost(!!(org.data?.length || lead.data?.length));
    })();
  }, [user?.id, isAdmin]);

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

  const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = [
    { id: 'all',        label: 'All Types' },
    { id: 'internship', label: 'Internships' },
    { id: 'tuition',    label: 'Tuition' },
    { id: 'on_campus',  label: 'On-Campus' },
    { id: 'part_time',  label: 'Part-time' },
    { id: 'full_time',  label: 'Full-time' },
    { id: 'freelance',  label: 'Freelance' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Jobs"
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

      {/* Top Segmented Navigation: Browse | Saved | My Applications */}
      <View style={[styles.segContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
        <TouchableOpacity
          style={[styles.segTab, mainTab === 'browse' && { backgroundColor: C.brand }]}
          onPress={() => setMainTab('browse')}
          activeOpacity={0.75}
        >
          <Text style={[styles.segTabTxt, { color: mainTab === 'browse' ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
            Browse
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segTab, mainTab === 'saved' && { backgroundColor: C.brand }]}
          onPress={() => setMainTab('saved')}
          activeOpacity={0.75}
        >
          <Text style={[styles.segTabTxt, { color: mainTab === 'saved' ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
            Saved ({savedIds.size})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segTab, mainTab === 'my_applications' && { backgroundColor: C.brand }]}
          onPress={() => setMainTab('my_applications')}
          activeOpacity={0.75}
        >
          <Text style={[styles.segTabTxt, { color: mainTab === 'my_applications' ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
            My Applications ({applications.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar (Visible on Browse & Saved) */}
      {mainTab !== 'my_applications' && (
        <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6 }}>
          <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
            <Icon name="search" size={17} color={C.textMuted} />
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

      {/* Status Filter Chips (For Browse Mode) */}
      {mainTab === 'browse' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={[styles.tabs, { paddingHorizontal: Layout.screenPadding }]}
        >
          {[
            { id: 'open' as StatusFilter, label: t.jobs.open, count: browseCounts.open },
            { id: 'closing' as StatusFilter, label: t.jobs.closingSoon, count: browseCounts.closing },
            { id: 'expired' as StatusFilter, label: t.jobs.expired, count: browseCounts.expired },
          ].map(tb => {
            const on = statusFilter === tb.id;
            return (
              <TouchableOpacity
                key={tb.id}
                style={[
                  styles.chip,
                  on
                    ? { backgroundColor: C.brand, borderColor: C.brand }
                    : { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => setStatusFilter(tb.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {tb.label}
                </Text>
                <Text
                  style={[
                    styles.chipCount,
                    { color: on ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {tb.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Job Type Sub-filter Row (Browse & Saved) */}
      {mainTab !== 'my_applications' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={[styles.subFilterRow, { paddingHorizontal: Layout.screenPadding }]}
        >
          {TYPE_OPTIONS.map(opt => {
            const on = typeFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.typePill,
                  on
                    ? { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.25)' : '#e0f4f0', borderColor: JOB_COLOR }
                    : { backgroundColor: C.surface2, borderColor: 'transparent' },
                ]}
                onPress={() => setTypeFilter(opt.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.typePillTxt,
                    { color: on ? JOB_COLOR : C.textMuted, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Department Sub-filter Row (Browse & Saved) */}
      {mainTab !== 'my_applications' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={[styles.subFilterRow, { paddingHorizontal: Layout.screenPadding, paddingTop: 0, paddingBottom: 8 }]}
        >
          {JOB_DEPARTMENTS.map(dept => {
            const on = deptFilter === dept.code;
            const isUserDept = profile?.department && dept.label.toLowerCase().includes(profile.department.toLowerCase());
            return (
              <TouchableOpacity
                key={dept.code}
                style={[
                  styles.deptPill,
                  on
                    ? { backgroundColor: C.brand, borderColor: C.brand }
                    : { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => setDeptFilter(dept.code)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.deptPillTxt,
                    { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {dept.code === 'ALL' ? 'All Depts' : dept.label}
                  {isUserDept && !on ? ' •' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
                No Applications Yet
              </Text>
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Find internships, campus rides, or tuition jobs and apply with 1 tap!
              </Text>
              <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: C.brand }]}
                onPress={() => setMainTab('browse')}
                activeOpacity={0.8}
              >
                <Text style={[styles.exploreBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  Browse Opportunities
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {applications.map(app => {
                const tone = appStatusTone(C, app.status);
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
              {mainTab === 'saved' ? 'No Saved Jobs' : t.common.noResults}
            </Text>
            {mainTab === 'saved' && (
              <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Star any job listing to quickly access it here.
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
              const daysLeft = daysRemainingLabel(j.deadline);

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
                            {TYPE_LABELS[j.job_type] ?? j.job_type}
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
                              Alumni
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  segContainer: {
    flexDirection: 'row',
    marginHorizontal: Layout.screenPadding,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  } as ViewStyle,
  segTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  } as ViewStyle,
  segTabTxt: {
    fontSize: 12.5,
  } as any,

  tabs: { flexDirection: 'row', gap: 8, paddingTop: 10, paddingBottom: 6 } as ViewStyle,
  subFilterRow: { flexDirection: 'row', gap: 6, paddingTop: 6, paddingBottom: 6 } as ViewStyle,
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 } as TextStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 } as ViewStyle,
  typePillTxt: { fontSize: 11.5 } as any,
  deptPill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  deptPillTxt: { fontSize: 11.5 } as any,
  scroll: { paddingTop: 4, paddingBottom: 24 } as ViewStyle,
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
