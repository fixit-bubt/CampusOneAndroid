import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Modal, Alert, KeyboardAvoidingView, Share,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { FontFamily, Layout, SectorColors, Accent, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchPeople, type Person } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { openUrl } from '../../utils/link';
import { formatFileSize } from '../../utils/format';
import { MAX_FILE_SIZE_MB, JOB_TYPES, COMPENSATION_TYPES } from '../../constants/app';
import {
  computeJobStatus,
  daysRemainingLabel,
  toggleJobBookmark,
  withdrawJobListing,
  adminRemoveJobListing,
  adminRestoreJobListing,
  reportJobListing,
  submitJobApplication,
  getStudentApplicationForJob,
  withdrawJobApplication,
  uploadJobResume,
  getApplicationsForJob,
  updateApplicationStatus,
  type JobStatus,
} from '../../services/jobsService';
import type { JobApplication } from '../../types/database';

const JOB_COLOR = SectorColors.jobs;
const JOB_BG    = `${SectorColors.jobs}1e`;

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
    default:            return { label: t.jobs2?.applicationSubmitted ?? 'Application Submitted', fg: C.brand, bg: `${SectorColors.jobs}1a` };
  }
}

function formatSemester(sem?: number | null, t?: any): string {
  if (!sem || sem <= 1) return t?.jobs2?.anySemester ?? 'Any Semester';
  const ord = sem === 1 ? '1st' : sem === 2 ? '2nd' : sem === 3 ? '3rd' : `${sem}th`;
  return `${ord} Sem+`;
}

const REPORT_REASONS = ['Spam', 'Scam', 'Expired', 'Inappropriate'];

export function JobDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { jobId } = route.params ?? {};

  const [job, setJob] = useState<any>(null);
  const [poster, setPoster] = useState<Person | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [contactTarget, setContactTarget] = useState<{ name: string; phone?: string; email?: string; id?: string } | null>(null);

  // Application Pipeline State
  const [myApplication, setMyApplication] = useState<JobApplication | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applicantCoverNote, setApplicantCoverNote] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantResume, setApplicantResume] = useState<{ uri: string; name: string; size?: number; url?: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [viewApplicantsOpen, setViewApplicantsOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const loadJob = useCallback(async () => {
    if (!jobId) { setFailed(true); return; }
    const [jobRes, saveRes, appRes] = await Promise.all([
      supabase.from('jobs').select('*, clubs:club_id(name)').eq('id', jobId).maybeSingle(),
      supabase.from('job_bookmarks').select('job_id').eq('job_id', jobId).eq('user_id', user?.id ?? '').maybeSingle(),
      user?.id ? getStudentApplicationForJob(jobId, user.id) : Promise.resolve({ applied: false } as { applied: boolean; application?: JobApplication }),
    ]);

    if (jobRes.error || !jobRes.data) { setFailed(true); return; }
    setJob(jobRes.data);
    setSaved(!!saveRes.data);
    setMyApplication(appRes.applied ? appRes.application ?? null : null);

    // If caller is the poster, load received applications
    if (jobRes.data.posted_by === user?.id) {
      const apps = await getApplicationsForJob(jobId);
      setJobApplications(apps.applications);
    }

    // Resolve poster profile safely
    if (jobRes.data.posted_by) {
      const people = await fetchPeople([jobRes.data.posted_by]);
      if (people[jobRes.data.posted_by]) {
        setPoster(people[jobRes.data.posted_by]);
      }
    }
  }, [jobId, user?.id]);

  useFocusEffect(useCallback(() => { loadJob(); }, [loadJob]));

  // When poster opens candidate list, automatically update submitted applications to viewed
  useEffect(() => {
    if (viewApplicantsOpen && jobApplications.length > 0) {
      const unviewed = jobApplications.filter(a => a.status === 'submitted');
      if (unviewed.length > 0) {
        unviewed.forEach(app => {
          updateApplicationStatus(app.id, 'viewed');
        });
        setJobApplications(prev =>
          prev.map(a => (a.status === 'submitted' ? { ...a, status: 'viewed' } : a))
        );
      }
    }
  }, [viewApplicantsOpen, jobApplications]);

  async function handleToggleSave() {
    if (!user || !job) return;
    const next = !saved;
    setSaved(next);

    const res = await toggleJobBookmark(jobId, user.id, saved);
    if (!res.success) {
      setSaved(!next);
      toast({ type: 'error', title: t.common.error, message: res.error });
    }
  }

  async function submitReport() {
    if (!reason || !user || !job) return;
    const res = await reportJobListing(job.code, reason);
    if (!res.success) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      return;
    }
    setReportOpen(false);
    setReason('');
    toast({ type: 'success', title: t.jobs2.reportSubmitted });
  }

  function confirmWithdraw() {
    Alert.alert('Withdraw listing', 'Remove your job post? You cannot undo this yourself.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          const res = await withdrawJobListing(job.code);
          if (!res.success) {
            toast({ type: 'error', title: t.common.error, message: res.error });
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  }

  async function adminRemove() {
    if (!removeReason.trim()) {
      toast({ type: 'info', title: 'Reason required', message: 'Tell the poster why this was removed.' });
      return;
    }
    const res = await adminRemoveJobListing(job.code, removeReason.trim());
    if (!res.success) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      return;
    }
    setRemoveOpen(false);
    setRemoveReason('');
    loadJob();
  }

  async function adminRestore() {
    const res = await adminRestoreJobListing(job.code);
    if (!res.success) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      return;
    }
    loadJob();
  }

  async function handleShare() {
    if (!job) return;
    try {
      await Share.share({
        title: job.title,
        message: `Opportunity on CampusOne: ${job.title} at ${job.company}\nDeadline: ${job.deadline}\nCheck it out on CampusOne!`,
      });
    } catch {
      // User cancelled or share dismissed
    }
  }

  async function handlePickResume() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];
      if ((asset.size ?? 0) > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ type: 'error', title: t.common.error, message: `Resume exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
        return;
      }
      setApplicantResume({ uri: asset.uri, name: asset.name, size: asset.size });
    } catch {
      toast({ type: 'error', title: t.common.error, message: 'Could not select document.' });
    }
  }

  async function handleApply() {
    if (!user || !job || applying) return;
    setApplying(true);
    try {
      let uploadedResumeUrl: string | null = null;
      if (applicantResume && applicantResume.uri) {
        const uploadRes = await uploadJobResume(user.id, applicantResume.uri, applicantResume.name);
        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || 'Failed to upload resume PDF.');
        }
        uploadedResumeUrl = uploadRes.url;
      }

      const res = await submitJobApplication({
        jobId: job.id,
        studentId: user.id,
        studentName: profile?.full_name || 'BUBT Student',
        studentDept: profile?.department || null,
        contactPhone: applicantPhone.trim() || (profile as any)?.whatsapp || null,
        resumeUrl: uploadedResumeUrl,
        coverNote: applicantCoverNote.trim() || null,
      });

      if (!res.success) {
        toast({ type: 'error', title: t.common.error, message: res.error });
        return;
      }

      setMyApplication(res.application ?? null);
      setApplyModalOpen(false);
      setApplicantCoverNote('');
      setApplicantResume(null);
      toast({ type: 'success', title: t.jobs2?.applicationSubmitted ?? 'Application Submitted!', message: 'The recruiter has been notified.' });
    } catch (e: any) {
      toast({ type: 'error', title: t.common.error, message: e?.message ?? 'Failed to apply' });
    } finally {
      setApplying(false);
    }
  }

  function handleWithdrawApp() {
    if (!myApplication) return;
    Alert.alert(
      t.jobs2?.withdrawApplication ?? 'Withdraw Application',
      t.jobs2?.withdrawApplicationConfirm ?? 'Are you sure you want to withdraw your application?',
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.jobs2?.withdrawBtn ?? 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            const res = await withdrawJobApplication(myApplication.id);
            if (!res.success) {
              toast({ type: 'error', title: t.common.error, message: res.error });
              return;
            }
            setMyApplication(null);
            toast({ type: 'info', title: 'Application Withdrawn' });
          },
        },
      ]
    );
  }

  async function handleUpdateCandidateStatus(appId: string, newStatus: 'shortlisted' | 'rejected') {
    const res = await updateApplicationStatus(appId, newStatus);
    if (!res.success) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      return;
    }
    setJobApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    toast({ type: 'success', title: newStatus === 'shortlisted' ? 'Candidate Shortlisted 🎉' : 'Candidate Status Updated' });
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Jobs" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {failed
            ? <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>{t.common.notFound}</Text>
            : <ActivityIndicator color={C.brand} />}
        </View>
      </SafeAreaView>
    );
  }

  const computedStatus = computeJobStatus(job);
  const s = jobStatusTone(C, t, computedStatus, isDark);
  const isOwn = job.posted_by === user?.id;
  const isRemoved = computedStatus === 'removed';
  const isExpired = computedStatus === 'expired';
  const daysLeft = daysRemainingLabel(job.deadline, {
    today: t.jobs2?.closesToday,
    tomorrow: t.jobs2?.closesTomorrow,
    inDays: t.jobs2?.closesInDays,
    closed: t.jobs2?.closedOn,
  });
  const myAppTone = myApplication ? appStatusTone(C, t, myApplication.status) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.jobs2?.jobsTitle ?? "Jobs"}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleShare} activeOpacity={0.75}>
              <Feather name="share-2" size={19} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleToggleSave} activeOpacity={0.75}>
              <Feather name="star" size={21} color={saved ? Accent.gold : C.text2} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Card */}
        <View style={styles.header}>
          <View style={[styles.thumb, { backgroundColor: JOB_BG }]}>
            <Icon name="jobs" size={26} color={JOB_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.role, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {job.title}
            </Text>
            <Text style={[styles.company, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              {job.company} · {job.area_name || job.location}
            </Text>
            {job.clubs?.name ? (
              <View style={[styles.clubTag, { backgroundColor: C.infoBg }]}>
                <Feather name="users" size={11} color={C.info} />
                <Text style={[styles.clubTagTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>
                  {t.jobs2.onBehalfOf(job.clubs.name)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Status & Category Pills */}
        <View style={styles.pills}>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.fg }]} />
            <Text style={[styles.statusTxt, { color: s.fg, fontFamily: FontFamily.jakartaBold }]}>
              {s.label}
            </Text>
          </View>

          <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.pillTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
              {JOB_TYPES[job.job_type] ?? job.job_type}
            </Text>
          </View>

          <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.pillTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
              {job.work_mode === 'onsite' ? 'On-site' : job.work_mode === 'remote' ? 'Remote' : 'Hybrid'}
            </Text>
          </View>

          {job.is_alumni_referral && (
            <View style={[styles.alumniBadge, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef9c3', borderColor: Accent.gold }]}>
              <Feather name="award" size={12} color={Accent.gold} />
              <Text style={[styles.alumniBadgeTxt, { color: Accent.gold, fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2?.bubtAlumni ?? 'BUBT Alumni Referral'}
              </Text>
            </View>
          )}
        </View>

        {/* 4-Cell Specs Grid */}
        <View style={[styles.specsGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.specsRow}>
            <View style={styles.specsCell}>
              <Text style={[styles.specsLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.jobs2.deadline}
              </Text>
              <View style={styles.specsVal}>
                <Icon name="clock" size={13} color={computedStatus === 'closing' ? C.warn : C.textMuted} />
                <Text style={[styles.specsValTxt, { color: computedStatus === 'closing' ? C.warn : C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {job.deadline}
                </Text>
              </View>
              {daysLeft ? (
                <Text style={[styles.daysCountdown, { color: computedStatus === 'closing' ? C.warn : C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                  {daysLeft}
                </Text>
              ) : null}
            </View>

            <View style={[styles.specsCell, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
              <Text style={[styles.specsLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.jobs2.salary}
              </Text>
              <View style={styles.specsVal}>
                <Feather name="dollar-sign" size={13} color={C.textMuted} />
                <Text style={[styles.specsValTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {job.stipend ?? t.jobs2?.negotiable ?? 'Negotiable'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.specsRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
            <View style={styles.specsCell}>
              <Text style={[styles.specsLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.jobs2?.targetDept ?? 'TARGET DEPT'}
              </Text>
              <View style={styles.specsVal}>
                <Feather name="book" size={13} color={C.textMuted} />
                <Text style={[styles.specsValTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {job.department_code === 'ALL' || !job.department_code ? (t.jobs2?.allDepts ?? 'All Departments') : `Dept: ${job.department_code}`}
                </Text>
              </View>
            </View>

            <View style={[styles.specsCell, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
              <Text style={[styles.specsLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.jobs2?.minSemester ?? 'MIN SEMESTER'}
              </Text>
              <View style={styles.specsVal}>
                <Feather name="layers" size={13} color={C.textMuted} />
                <Text style={[styles.specsValTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {formatSemester(job.min_semester, t)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Skills & Subjects Tag Row */}
        {job.skills && job.skills.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.jobs2?.requiredSkills ?? 'REQUIRED SKILLS / SUBJECTS'}
            </Text>
            <View style={styles.skillsRow}>
              {job.skills.map((skill: string, idx: number) => (
                <View key={idx} style={[styles.skillChip, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <Text style={[styles.skillChipTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Shared By / Recruiter Card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.jobs2?.sharedBy ?? 'SHARED BY'}
        </Text>
        <View style={[styles.posterCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar name={poster?.full_name || job.posted_by_name} size="md" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.posterName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {isOwn ? 'You (Poster)' : (poster?.full_name || job.posted_by_name || 'Campus Member')}
            </Text>
            {poster?.department ? (
              <Text style={[styles.posterDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                {poster.department}
              </Text>
            ) : null}
          </View>

          {!isOwn && (
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.2)' : '#e0f4f0' }]}
              onPress={() => {
                setContactTarget({
                  name: poster?.full_name || job.posted_by_name || 'Poster',
                  phone: (poster as any)?.whatsapp || undefined,
                  email: (poster as any)?.email || (job.apply_method === 'email' ? job.apply_value : undefined),
                  id: job.posted_by,
                });
              }}
              activeOpacity={0.8}
            >
              <Feather name="message-circle" size={16} color={JOB_COLOR} />
            </TouchableOpacity>
          )}
        </View>

        {/* Poster View: Candidates Applied Banner */}
        {isOwn && (
          <View style={[styles.candidatesBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.candidatesBannerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2?.candidatesApplied ?? 'Candidates Applied'}
              </Text>
              <Text style={[styles.candidatesBannerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {jobApplications.length} application{jobApplications.length === 1 ? '' : 's'} received
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.viewCandidatesBtn, { backgroundColor: C.brand }]}
              onPress={() => setViewApplicantsOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewCandidatesTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2?.viewCandidates ?? 'View Candidates'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Student View: Application Status Banner (If Already Applied) */}
        {!isOwn && myApplication && myAppTone && (
          <View style={[styles.appliedBanner, { backgroundColor: myAppTone.bg, borderColor: myAppTone.fg }]}>
            <View style={styles.appliedBannerHead}>
              <View style={[styles.statusDot, { backgroundColor: myAppTone.fg }]} />
              <Text style={[styles.appliedBannerTitle, { color: myAppTone.fg, fontFamily: FontFamily.jakartaBold }]}>
                {myAppTone.label}
              </Text>
            </View>
            <Text style={[styles.appliedBannerMsg, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
              {myApplication.status === 'shortlisted'
                ? '🎉 Congratulations! You have been shortlisted for this position. The recruiter may contact you via WhatsApp, Phone, or In-App Chat.'
                : myApplication.status === 'viewed'
                ? 'The recruiter has viewed your application.'
                : myApplication.status === 'rejected'
                ? 'Thank you for applying. You were not selected for this position.'
                : 'Your application has been submitted to the poster. You will be notified when they review it.'}
            </Text>
            <TouchableOpacity
              style={[styles.withdrawAppBtn, { borderColor: C.border }]}
              onPress={handleWithdrawApp}
              activeOpacity={0.8}
            >
              <Feather name="x-circle" size={14} color={C.textMuted} />
              <Text style={[styles.withdrawAppTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2?.withdrawApplication ?? 'Withdraw Application'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Description Section */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.jobs2.details}
        </Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
          {job.description}
        </Text>

        {/* Requirements Section */}
        {job.requirements ? (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.jobs2.requirements}
            </Text>
            <View style={[styles.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.reqText, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                {job.requirements}
              </Text>
            </View>
          </>
        ) : null}

        {/* Application & Moderate Actions */}
        {isRemoved ? (
          <>
            <View style={[styles.removedBanner, { backgroundColor: C.dangerBg }]}>
              <Text style={[styles.removedText, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                {job.removed_reason ? t.jobs2.listingRemovedReason(job.removed_reason) : t.jobs2.listingRemoved}
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={adminRestore}
                activeOpacity={0.85}
              >
                <Feather name="rotate-ccw" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.jobs2.restoreListingAdmin}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {!isExpired && !isOwn && !myApplication && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.brand }]}
                onPress={() => {
                  if (job.apply_method === 'file' && job.apply_file_url) {
                    openUrl(job.apply_file_url);
                  } else {
                    setApplicantPhone((profile as any)?.whatsapp || '');
                    setApplyModalOpen(true);
                  }
                }}
                activeOpacity={0.85}
              >
                <Icon name="jobs" size={17} color="#fff" />
                <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {job.apply_method === 'file' ? 'View Circular (PDF)' : t.jobs2.applyNow}
                </Text>
              </TouchableOpacity>
            )}

            {/* External / Circular Direct Link Buttons */}
            {job.apply_method === 'link' && job.apply_value && !isOwn && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => {
                  const href = /^https?:\/\//i.test(job.apply_value) ? job.apply_value : `https://${job.apply_value}`;
                  openUrl(href);
                }}
                activeOpacity={0.85}
              >
                <Feather name="external-link" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Apply on External Website
                </Text>
              </TouchableOpacity>
            )}

            {job.apply_method === 'email' && job.apply_value && !isOwn && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => {
                  const subject = encodeURIComponent(`Application for ${job.title}`);
                  openUrl(`mailto:${job.apply_value}?subject=${subject}`);
                }}
                activeOpacity={0.85}
              >
                <Feather name="mail" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Send Email to Poster
                </Text>
              </TouchableOpacity>
            )}

            {job.apply_file_url && job.apply_method !== 'file' && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => openUrl(job.apply_file_url)}
                activeOpacity={0.85}
              >
                <Feather name="file-text" size={16} color={SectorColors.jobs} />
                <Text style={[styles.secondaryTxt, { color: SectorColors.jobs, fontFamily: FontFamily.jakartaBold }]}>
                  View Attached Circular PDF
                </Text>
              </TouchableOpacity>
            )}

            {isOwn ? (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={confirmWithdraw}
                activeOpacity={0.85}
              >
                <Icon name="trash" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.jobs2.withdrawListing}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setReportOpen(true)}
                activeOpacity={0.85}
              >
                <Feather name="flag" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.jobs2.reportListing}
                </Text>
              </TouchableOpacity>
            )}

            {isAdmin && !isOwn && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.dangerBg, borderColor: C.dangerBg }]}
                onPress={() => setRemoveOpen(true)}
                activeOpacity={0.85}
              >
                <Feather name="slash" size={16} color={C.danger} />
                <Text style={[styles.secondaryTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                  {t.jobs2.removeListingAdmin}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Recruiter Contact Sheet */}
      <ContactSheet
        visible={!!contactTarget}
        onClose={() => setContactTarget(null)}
        name={contactTarget?.name || ''}
        phone={contactTarget?.phone}
        email={contactTarget?.email}
        inAppChatAction={
          contactTarget?.id && contactTarget.id !== user?.id
            ? () => {
                const targetId = contactTarget.id;
                setContactTarget(null);
                navigation.navigate('MessageThread', { peerId: targetId });
              }
            : undefined
        }
      />

      {/* Student 1-Tap Apply Modal */}
      <Modal visible={applyModalOpen} transparent animationType="slide" onRequestClose={() => setApplyModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setApplyModalOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '85%' }]}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.jobs2?.applyNow ? `${t.jobs2.applyNow} · ${job.title}` : `Apply for ${job.title}`}
              </Text>

              {/* Applicant Summary */}
              <View style={[styles.applicantSummaryCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Avatar name={profile?.full_name || 'BUBT'} size="sm" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.applicantName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {profile?.full_name || 'BUBT Student'}
                  </Text>
                  <Text style={[styles.applicantDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {profile?.department || 'BUBT'} · ID: {profile?.student_id || 'Student'}
                  </Text>
                </View>
              </View>

              {/* Contact Phone */}
              <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2?.contactPhone ?? 'CONTACT PHONE / WHATSAPP'}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={applicantPhone}
                onChangeText={setApplicantPhone}
                placeholder="e.g. 01700000000"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
              />

              {/* Resume Upload */}
              <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2?.resumePdf ?? 'RESUME / CV (PDF)'}
              </Text>
              {applicantResume ? (
                <View style={[styles.resumePickedCard, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <Feather name="file-text" size={18} color={SectorColors.jobs} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.resumeNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {applicantResume.name}
                    </Text>
                    {applicantResume.size ? (
                      <Text style={[styles.resumeSizeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {formatFileSize(applicantResume.size)}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => setApplicantResume(null)} hitSlop={8}>
                    <Feather name="x" size={17} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.resumePickBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                  onPress={handlePickResume}
                  activeOpacity={0.75}
                >
                  <Feather name="upload" size={16} color={C.brand} />
                  <Text style={[styles.resumePickTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    {t.jobs2?.uploadResume ?? 'Upload Resume PDF'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Short Pitch / Cover Note */}
              <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2?.coverNoteOptional ?? 'SHORT COVER NOTE (OPTIONAL)'}
              </Text>
              <TextInput
                style={[styles.modalTextarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={applicantCoverNote}
                onChangeText={setApplicantCoverNote}
                placeholder="Briefly describe your relevant skills or experience..."
                placeholderTextColor={C.textMuted}
                multiline
                textAlignVertical="top"
              />

              {/* Submit Application Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.brand, opacity: applying ? 0.6 : 1, marginTop: 16 }]}
                onPress={handleApply}
                disabled={applying}
                activeOpacity={0.85}
              >
                {applying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="check" size={18} color="#fff" />
                    <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      {t.jobs2?.submitApplication ?? 'Submit Application'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Poster Candidates Viewer Modal */}
      <Modal visible={viewApplicantsOpen} transparent animationType="slide" onRequestClose={() => setViewApplicantsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setViewApplicantsOpen(false)} />
          <View style={[styles.candidatesSheet, { backgroundColor: C.surface }]}>
            <View style={styles.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 0 }]}>
                {t.jobs2?.candidatesApplied ?? 'Candidates'} ({jobApplications.length})
              </Text>
              <TouchableOpacity onPress={() => setViewApplicantsOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
              {jobApplications.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>
                    {t.jobs2?.noCandidatesYet ?? 'No candidates have applied yet.'}
                  </Text>
                </View>
              ) : (
                jobApplications.map(app => {
                  const tone = appStatusTone(C, t, app.status);
                  return (
                    <View key={app.id} style={[styles.candidateCard, { backgroundColor: C.bg, borderColor: C.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Avatar name={app.student_name} size="sm" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.candidateName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {app.student_name}
                          </Text>
                          <Text style={[styles.candidateSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                            {app.student_dept || 'Student'}
                          </Text>
                        </View>
                        <View style={[styles.candidateStatusPill, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.candidateStatusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}>
                            {tone.label}
                          </Text>
                        </View>
                      </View>

                      {app.cover_note && (
                        <Text style={[styles.candidateCover, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                          "{app.cover_note}"
                        </Text>
                      )}

                      <View style={styles.candidateActionsRow}>
                        {app.resume_url && (
                          <TouchableOpacity
                            style={[styles.candidateActionBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                            onPress={() => openUrl(app.resume_url!)}
                            activeOpacity={0.8}
                          >
                            <Feather name="file-text" size={14} color={SectorColors.jobs} />
                            <Text style={[styles.candidateActionTxt, { color: SectorColors.jobs, fontFamily: FontFamily.jakartaBold }]}>
                              {t.jobs2?.viewResume ?? 'View Resume'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[styles.candidateActionBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                          onPress={() => {
                            setContactTarget({
                              name: app.student_name,
                              phone: app.contact_phone || undefined,
                              id: app.student_id,
                            });
                          }}
                          activeOpacity={0.8}
                        >
                          <Feather name="phone" size={14} color={C.brand} />
                          <Text style={[styles.candidateActionTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                            {t.jobs2?.contact ?? 'Contact'}
                          </Text>
                        </TouchableOpacity>

                        {app.status !== 'shortlisted' && (
                          <TouchableOpacity
                            style={[styles.candidateActionBtn, { backgroundColor: C.successBg, borderColor: C.success }]}
                            onPress={() => handleUpdateCandidateStatus(app.id, 'shortlisted')}
                            activeOpacity={0.8}
                          >
                            <Feather name="check" size={14} color={C.success} />
                            <Text style={[styles.candidateActionTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                              {t.jobs2?.shortlist ?? 'Shortlist'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {app.status !== 'rejected' && (
                          <TouchableOpacity
                            style={[styles.candidateActionBtn, { backgroundColor: C.dangerBg, borderColor: C.danger }]}
                            onPress={() => handleUpdateCandidateStatus(app.id, 'rejected')}
                            activeOpacity={0.8}
                          >
                            <Feather name="x" size={14} color={C.danger} />
                            <Text style={[styles.candidateActionTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                              {t.jobs2?.reject ?? 'Reject'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Admin Remove Sheet */}
      <Modal visible={removeOpen} transparent animationType="slide" onRequestClose={() => setRemoveOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setRemoveOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.jobs2.removeListing}
            </Text>
            <TextInput
              style={[
                styles.removeInput,
                { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
              ]}
              value={removeReason}
              onChangeText={setRemoveReason}
              placeholder={t.jobs2.removeReasonPlaceholder}
              placeholderTextColor={C.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.danger, opacity: removeReason.trim() ? 1 : 0.5, marginTop: 14 }]}
              onPress={adminRemove}
              disabled={!removeReason.trim()}
              activeOpacity={0.85}
            >
              <Feather name="slash" size={17} color="#fff" />
              <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                {t.jobs2.removeListing}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Sheet */}
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setReportOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.jobs2.reportListing}
          </Text>
          <View style={styles.reasonRow}>
            {REPORT_REASONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.reasonChip,
                  reason === r
                    ? { backgroundColor: C.brand, borderColor: C.brand }
                    : { backgroundColor: C.surface2, borderColor: C.border },
                ]}
                onPress={() => setReason(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.reasonTxt, { color: reason === r ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.brand, opacity: reason ? 1 : 0.5, marginTop: 16 }]}
            onPress={submitReport}
            disabled={!reason}
            activeOpacity={0.85}
          >
            <Feather name="flag" size={17} color="#fff" />
            <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {t.jobs2.submitReport}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  content: { paddingTop: 16, paddingBottom: 24 } as ViewStyle,
  iconBtn: { padding: 8 } as ViewStyle,

  header: { flexDirection: 'row', alignItems: 'center', gap: 13 } as ViewStyle,
  thumb: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  role: { fontSize: 18, letterSpacing: -0.01, lineHeight: 24 } as any,
  company: { fontSize: 13, marginTop: 2 } as any,
  clubTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 7 } as ViewStyle,
  clubTagTxt: { fontSize: 11 } as any,

  pills: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 12 } as ViewStyle,
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 12 } as any,
  pill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  pillTxt: { fontSize: 12 } as any,

  alumniBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  alumniBadgeTxt: { fontSize: 11.5 } as any,

  specsGrid: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginTop: 14 } as ViewStyle,
  specsRow: { flexDirection: 'row' } as ViewStyle,
  specsCell: { flex: 1, padding: 12 } as ViewStyle,
  specsLabel: { fontSize: 10.5, letterSpacing: 0.5, marginBottom: 4 } as any,
  specsVal: { flexDirection: 'row', alignItems: 'center', gap: 5 } as ViewStyle,
  specsValTxt: { fontSize: 13 } as any,
  daysCountdown: { fontSize: 11, marginTop: 3 } as any,

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 } as ViewStyle,
  skillChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 } as ViewStyle,
  skillChipTxt: { fontSize: 12 } as any,

  candidatesBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 14 } as ViewStyle,
  candidatesBannerTitle: { fontSize: 14 } as any,
  candidatesBannerSub: { fontSize: 12, marginTop: 2 } as any,
  viewCandidatesBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 } as ViewStyle,
  viewCandidatesTxt: { fontSize: 12.5 } as any,

  appliedBanner: { padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 14 } as ViewStyle,
  appliedBannerHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 } as ViewStyle,
  appliedBannerTitle: { fontSize: 13.5 } as any,
  appliedBannerMsg: { fontSize: 13, lineHeight: 19 } as any,
  withdrawAppBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginTop: 10 } as ViewStyle,
  withdrawAppTxt: { fontSize: 12 } as any,

  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)', alignSelf: 'center', marginBottom: 14 } as ViewStyle,
  applicantSummaryCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 } as ViewStyle,
  applicantName: { fontSize: 14 } as any,
  applicantDept: { fontSize: 12, marginTop: 1 } as any,

  inputLabel: { fontSize: 11, letterSpacing: 0.6, marginBottom: 6, marginTop: 12 } as any,
  modalInput: { height: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 } as any,
  modalTextarea: { minHeight: 70, borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14 } as any,

  resumePickedCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  resumeNameTxt: { fontSize: 13 } as any,
  resumeSizeTxt: { fontSize: 11, marginTop: 1 } as any,
  resumePickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed' } as ViewStyle,
  resumePickTxt: { fontSize: 13 } as any,

  candidatesSheet: { maxHeight: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 } as ViewStyle,
  candidateCard: { padding: 12, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  candidateName: { fontSize: 14 } as any,
  candidateSub: { fontSize: 11.5, marginTop: 1 } as any,
  candidateStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 } as ViewStyle,
  candidateStatusTxt: { fontSize: 11 } as any,
  candidateCover: { fontSize: 12.5, lineHeight: 18, marginTop: 8, fontStyle: 'italic' } as any,
  candidateActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 } as ViewStyle,
  candidateActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 } as ViewStyle,
  candidateActionTxt: { fontSize: 11.5 } as any,

  posterCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 4 } as ViewStyle,
  posterName: { fontSize: 14 } as any,
  posterDept: { fontSize: 12, marginTop: 2 } as any,
  contactBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 18, marginBottom: 8 } as any,
  body: { fontSize: 14.5, lineHeight: 22.5 } as any,

  reqCard: { padding: 14, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  removeInput: { minHeight: 70, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: 'top', marginTop: 12 } as any,
  reqText: { fontSize: 13.5, lineHeight: 22 } as any,

  removedBanner: { alignItems: 'center', padding: 14, borderRadius: 14, marginTop: 18 } as ViewStyle,
  removedText: { fontSize: 13.5 } as any,

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, marginTop: 18 } as ViewStyle,
  actionTxt: { fontSize: 15 } as any,

  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 14, marginTop: 10, borderWidth: 1 } as ViewStyle,
  secondaryTxt: { fontSize: 14 } as any,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' } as ViewStyle,
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 } as ViewStyle,
  sheetTitle: { fontSize: 16, marginBottom: 14 } as any,
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  reasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  reasonTxt: { fontSize: 13 } as any,
});
