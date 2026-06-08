// Matches design screens-b.jsx — JobDetail
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Alert, Linking, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

const JOB_COLOR = '#0e9c8a';
const JOB_BG    = '#0e9c8a1e';

const STATUS_CONFIG: Record<string, { label: string; fg: string; bg: string }> = {
  open:    { label: 'Open',    fg: '#0e9c8a', bg: '#e4f5f4' },
  closed:  { label: 'Closed', fg: '#5b6b86', bg: '#f0f2f6' },
  expired: { label: 'Expired',fg: '#b9760a', bg: '#fbefdb' },
  removed: { label: 'Removed',fg: '#e2483d', bg: '#fbe7e5' },
};

const REPORT_REASONS = ['Spam', 'Scam', 'Expired', 'Inappropriate'];

export function JobDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const { jobId } = route.params;
  const [job, setJob] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    (async () => {
      const [jobRes, saveRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', jobId).single(),
        supabase.from('job_bookmarks').select('job_id').eq('job_id', jobId).eq('user_id', user?.id ?? '').maybeSingle(),
      ]);
      if (jobRes.data) setJob(jobRes.data);
      setSaved(!!saveRes.data);
    })();
  }, [jobId, user?.id]);

  async function toggleSave() {
    if (!user || !job) return;
    if (saved) {
      await supabase.from('job_bookmarks').delete().eq('job_id', jobId).eq('user_id', user.id);
    } else {
      await supabase.from('job_bookmarks').insert({ job_id: jobId, user_id: user.id });
    }
    setSaved(!saved);
  }

  async function submitReport() {
    if (!reason || !user || !job) return;
    await supabase.from('job_reports').insert({ job_id: jobId, user_id: user.id, reason });
    setReportOpen(false);
    setReason('');
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Jobs" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  const computedStatus = job.deleted_at ? 'removed' : (job.deadline && new Date(job.deadline) < new Date() ? 'expired' : 'open');
  const s = STATUS_CONFIG[computedStatus] ?? STATUS_CONFIG.open;
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
            <Feather name="star" size={21} color={saved ? '#d9870b' : C.text2} />
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
            <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Deadline</Text>
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
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>DETAILS</Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{job.description}</Text>

        {/* Requirements */}
        {job.requirements ? (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>REQUIREMENTS</Text>
            <View style={[styles.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.reqText, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{job.requirements}</Text>
            </View>
          </>
        ) : null}

        {/* Actions */}
        {isRemoved ? (
          <View style={[styles.removedBanner, { backgroundColor: '#fbe7e5' }]}>
            <Text style={[styles.removedText, { color: '#e2483d', fontFamily: FontFamily.jakartaBold }]}>
              This listing has been removed
            </Text>
          </View>
        ) : (
          <>
            {!isExpired && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.brand }]}
                onPress={() => {
                  if (job.apply_method === 'link' && job.apply_value) {
                    Linking.openURL(job.apply_value);
                  } else if (job.apply_method === 'email' && job.apply_value) {
                    Linking.openURL(`mailto:${job.apply_value}`);
                  } else if (job.apply_method === 'file' && job.apply_file_url) {
                    Linking.openURL(job.apply_file_url);
                  } else {
                    Alert.alert('Apply', 'Contact the poster directly to apply.');
                  }
                }}
                activeOpacity={0.85}
              >
                <Icon name="jobs" size={17} color="#fff" />
                <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>Apply Now</Text>
              </TouchableOpacity>
            )}
            {isOwn ? (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={async () => {
                  await supabase.from('jobs').update({ deleted_at: new Date().toISOString() }).eq('id', jobId);
                  navigation.goBack();
                }}
                activeOpacity={0.85}
              >
                <Icon name="trash" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Withdraw listing</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setReportOpen(true)}
                activeOpacity={0.85}
              >
                <Feather name="flag" size={16} color={C.text} />
                <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Report listing</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 26 }} />
      </ScrollView>

      {/* Report bottom sheet */}
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setReportOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Report listing</Text>
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
            <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>Submit report</Text>
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
