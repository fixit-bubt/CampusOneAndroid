import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Modal, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { openUrl } from '../../utils/link';

const JOB_COLOR = SectorColors.jobs;
const JOB_BG    = `${SectorColors.jobs}1e`;

// Job status tones from theme tokens (dark-mode aware via C)
function jobStatusTone(C: any, t: any, k: string): { label: string; fg: string; bg: string } {
  switch (k) {
    case 'expired': return { label: 'Expired', fg: C.warn,       bg: C.warnBg };
    case 'removed': return { label: 'Removed', fg: C.danger,     bg: C.dangerBg };
    default:        return { label: 'Open',    fg: Accent.teal,  bg: Accent.tealBg };
  }
}

const REPORT_REASONS = ['Spam', 'Scam', 'Expired', 'Inappropriate'];

export function JobDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { jobId } = route.params ?? {};
  const [job, setJob] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const isAdmin = profile?.role === 'admin';

  const loadJob = useCallback(async () => {
    if (!jobId) { setFailed(true); return; }
    const [jobRes, saveRes] = await Promise.all([
      // maybeSingle: a removed job is invisible to non-admins (RLS), so .single()
      // would error and leave the screen spinning forever.
      supabase.from('jobs').select('*, clubs:club_id(name)').eq('id', jobId).maybeSingle(),
      supabase.from('job_bookmarks').select('job_id').eq('job_id', jobId).eq('user_id', user?.id ?? '').maybeSingle(),
    ]);
    if (jobRes.error || !jobRes.data) { setFailed(true); return; }
    setJob(jobRes.data);
    setSaved(!!saveRes.data);
  }, [jobId, user?.id]);

  useFocusEffect(useCallback(() => { loadJob(); }, [loadJob]));

  async function toggleSave() {
    if (!user || !job) return;
    const next = !saved;
    setSaved(next); // optimistic
    const { error } = next
      ? await supabase.from('job_bookmarks').insert({ job_id: jobId, user_id: user.id })
      : await supabase.from('job_bookmarks').delete().eq('job_id', jobId).eq('user_id', user.id);
    if (error && error.code !== '23505') {
      setSaved(!next); // rollback
      toast({ type: 'error', title: t.common.error });
    }
  }

  async function submitReport() {
    if (!reason || !user || !job) return;
    const { error } = await supabase.rpc('job_report', {
      p_code: job.code,
      p_reason: reason.toLowerCase(),
    });
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setReportOpen(false);
    setReason('');
  }

  function confirmWithdraw() {
    Alert.alert('Withdraw listing', 'Remove your job post? You cannot undo this yourself.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('job_withdraw', { p_code: job.code });
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
          navigation.goBack();
        },
      },
    ]);
  }

  async function adminRemove() {
    if (!removeReason.trim()) { toast({ type: 'info', title: 'Reason required', message: 'Tell the poster why this was removed.' }); return; }
    const { error } = await supabase.rpc('job_admin_remove', { p_code: job.code, p_reason: removeReason.trim() });
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setRemoveOpen(false);
    setRemoveReason('');
    loadJob();
  }

  async function adminRestore() {
    const { error } = await supabase.rpc('job_admin_restore', { p_code: job.code });
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    loadJob();
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

  const computedStatus = job.deleted_at ? 'removed' : (job.deadline && new Date(job.deadline) < new Date() ? 'expired' : 'open');
  const s = jobStatusTone(C, t, computedStatus);
  const isOwn = job.posted_by === user?.id;
  const isRemoved = !!job.deleted_at;
  const isExpired = computedStatus === 'expired';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Jobs"
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity style={styles.iconBtn} onPress={toggleSave} activeOpacity={0.75}>
            <Feather name="star" size={21} color={saved ? Accent.gold : C.text2} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.thumb, { backgroundColor: JOB_BG }]}>
            <Icon name="jobs" size={26} color={JOB_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.role, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {job.title}
            </Text>
            <Text style={[styles.company, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              {job.company}
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

        {/* Pills */}
        <View style={styles.pills}>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.fg }]} />
            <Text style={[styles.statusTxt, { color: s.fg, fontFamily: FontFamily.jakartaBold }]}>{s.label}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.pillTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{job.job_type}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.pillTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{job.work_mode}</Text>
          </View>
        </View>

        {/* Info grid */}
        <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.infoCell}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.jobs2.deadline}</Text>
            <View style={styles.infoCellVal}>
              <Icon name="clock" size={14} color={C.textMuted} />
              <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{job.deadline}</Text>
            </View>
          </View>
          <View style={[styles.infoCell, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Salary</Text>
            <Text style={[styles.infoCellTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{job.stipend ?? 'Negotiable'}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.jobs2.details}</Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{job.description}</Text>

        {/* Requirements */}
        {job.requirements ? (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.jobs2.requirements}</Text>
            <View style={[styles.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.reqText, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{job.requirements}</Text>
            </View>
          </>
        ) : null}

        {/* Actions */}
        {isRemoved ? (
          <>
            <View style={[styles.removedBanner, { backgroundColor: C.dangerBg }]}>
              <Text style={[styles.removedText, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                This listing has been removed{job.removed_reason ? ` - ${job.removed_reason}` : ''}
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={adminRestore}
                activeOpacity={0.85}
              >
                <Feather name="rotate-ccw" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.restoreListingAdmin}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {!isExpired && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.brand }]}
                onPress={() => {
                  if (job.apply_method === 'link' && job.apply_value) {
                    openUrl(job.apply_value);
                  } else if (job.apply_method === 'email' && job.apply_value) {
                    openUrl(`mailto:${job.apply_value}`);
                  } else if (job.apply_method === 'file' && job.apply_file_url) {
                    openUrl(job.apply_file_url);
                  } else {
                    toast({ type: 'info', title: t.jobs2.applyTitle, message: t.jobs2.applyBody });
                  }
                }}
                activeOpacity={0.85}
              >
                <Icon name="jobs" size={17} color="#fff" />
                <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.applyNow}</Text>
              </TouchableOpacity>
            )}
            {isOwn ? (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={confirmWithdraw}
                activeOpacity={0.85}
              >
                <Icon name="trash" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.withdrawListing}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setReportOpen(true)}
                activeOpacity={0.85}
              >
                <Feather name="flag" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.reportListing}</Text>
              </TouchableOpacity>
            )}
            {isAdmin && !isOwn && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.dangerBg, borderColor: C.dangerBg }]}
                onPress={() => setRemoveOpen(true)}
                activeOpacity={0.85}
              >
                <Feather name="slash" size={16} color={C.danger} />
                <Text style={[styles.secondaryTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.removeListingAdmin}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 26 }} />
      </ScrollView>

      {/* Admin remove sheet */}
      <Modal visible={removeOpen} transparent animationType="slide" onRequestClose={() => setRemoveOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setRemoveOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.jobs2.removeListing}</Text>
          <TextInput
            style={[styles.removeInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
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
            <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.removeListing}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Report bottom sheet */}
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setReportOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.jobs2.reportListing}</Text>
          <View style={styles.reasonRow}>
            {REPORT_REASONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonChip,
                  reason === r
                    ? { backgroundColor: C.brand, borderColor: C.brand }
                    : { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setReason(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.reasonTxt, { color: reason === r ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>{r}</Text>
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
            <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.submitReport}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  content: { paddingTop: 16, paddingBottom: 20 } as ViewStyle,
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

  infoGrid: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginTop: 14 } as ViewStyle,
  infoCell: { flex: 1, padding: 12 } as ViewStyle,
  infoCellLabel: { fontSize: 11, marginBottom: 4 } as any,
  infoCellVal: { flexDirection: 'row', alignItems: 'center', gap: 5 } as ViewStyle,
  infoCellTxt: { fontSize: 13.5 } as any,

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
