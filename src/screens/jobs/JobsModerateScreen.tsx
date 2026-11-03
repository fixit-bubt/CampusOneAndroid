// Jobs moderation - admin-only.
// Reported tab: live jobs with reports, most-reported first, with direct
// dismiss and remove actions. Removed tab: withdrawn/removed jobs with restore.
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
  Alert, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import {
  adminRestoreJobListing,
  adminRemoveJobListing,
  adminDismissJobReports,
} from '../../services/jobsService';

interface JobRow {
  id: string;
  code: string;
  title: string;
  company: string;
  deleted_at: string | null;
  removed_reason: string | null;
  reports: { reason: string; note: string | null }[];
}

const REMOVE_PRESETS = [
  'Spam / Misleading',
  'Fraud / Scam',
  'Expired Listing',
  'Inappropriate Content',
  'Policy Violation',
];

export function JobsModerateScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const [tab, setTab] = useState<'reported' | 'removed'>('reported');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Remove sheet modal state
  const [removeTarget, setRemoveTarget] = useState<JobRow | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    // job_reports is admin-readable per RLS; join report rows onto each job.
    const [jobsRes, reportsRes] = await Promise.all([
      supabase.from('jobs').select('id, code, title, company, deleted_at, removed_reason').order('created_at', { ascending: false }),
      supabase.from('job_reports').select('job_id, reason, note'),
    ]);
    if (jobsRes.data) {
      const reports = (reportsRes.data ?? []) as any[];
      setJobs((jobsRes.data as any[]).map(j => ({
        ...j,
        reports: reports.filter(r => r.job_id === j.id),
      })));
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function restore(j: JobRow) {
    const res = await adminRestoreJobListing(j.code);
    if (!res.success) { toast({ type: 'error', title: t.common.error, message: res.error }); return; }
    toast({ type: 'success', title: 'Listing Restored' });
    load();
  }

  function confirmDismissReports(j: JobRow) {
    Alert.alert(
      'Dismiss Reports',
      `Clear all ${j.reports.length} report${j.reports.length === 1 ? '' : 's'} for "${j.title}"? This listing will remain active on the campus board.`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'default',
          onPress: async () => {
            const res = await adminDismissJobReports(j.id);
            if (!res.success) {
              toast({ type: 'error', title: t.common.error, message: res.error });
              return;
            }
            toast({ type: 'success', title: 'Reports Dismissed' });
            load();
          },
        },
      ]
    );
  }

  async function handleConfirmRemove() {
    if (!removeTarget || !removeReason.trim() || busy) return;
    setBusy(true);
    try {
      const res = await adminRemoveJobListing(removeTarget.code, removeReason.trim());
      if (!res.success) {
        toast({ type: 'error', title: t.common.error, message: res.error });
        return;
      }
      toast({ type: 'success', title: 'Listing Removed' });
      setRemoveTarget(null);
      setRemoveReason('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.jobs.moderation} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>{t.jobs2.accessDenied}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const reported = jobs
    .filter(j => !j.deleted_at && j.reports.length > 0)
    .sort((a, b) => b.reports.length - a.reports.length);
  const removed = jobs.filter(j => !!j.deleted_at);
  const list = tab === 'reported' ? reported : removed;

  const moderateTabs: TabItem<'reported' | 'removed'>[] = useMemo(() => [
    { id: 'reported', label: t.jobs.reported, count: reported.length, color: C.danger },
    { id: 'removed', label: t.jobs.removed, count: removed.length, color: Accent.slate },
  ], [t.jobs, reported.length, removed.length, C.danger]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.jobs.moderation} onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 4 }}>
        <SegmentedTabs
          tabs={moderateTabs}
          activeTab={tab}
          onTabChange={setTab}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {loading && jobs.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 50 }} color={C.brand} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="jobs" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {tab === 'reported' ? t.jobs.noReported : t.jobs.noRemoved}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {list.map(j => (
              <View key={j.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TouchableOpacity
                  style={styles.cardTop}
                  onPress={() => navigation.navigate('JobDetail', { jobId: j.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.thumb}>
                    <Icon name="jobs" size={32} color={C.text} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {j.title}
                    </Text>
                    <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {j.company} · {j.code}
                    </Text>
                  </View>
                  {tab === 'reported' ? (
                    <View style={[styles.flagPill, { backgroundColor: C.dangerBg }]}>
                      <Feather name="flag" size={11} color={C.danger} />
                      <Text style={[styles.flagTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                        {t.jobs.reportsCount(j.reports.length)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.removedPill, { backgroundColor: C.surface2 }]}>
                      <Text style={[styles.removedPillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                        Removed
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {tab === 'reported' && j.reports.length > 0 && (
                  <View style={[styles.reasons, { borderTopColor: C.border }]}>
                    {j.reports.slice(0, 4).map((r, i) => (
                      <Text key={i} style={[styles.reasonTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        • {r.reason}{r.note ? ` - "${r.note}"` : ''}
                      </Text>
                    ))}
                  </View>
                )}

                {tab === 'removed' && j.removed_reason ? (
                  <View style={[styles.reasons, { borderTopColor: C.border }]}>
                    <Text style={[styles.reasonTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      • Reason: {j.removed_reason}
                    </Text>
                  </View>
                ) : null}

                {/* Direct Action Controls */}
                <View style={[styles.cardActions, { borderTopColor: C.border }]}>
                  {tab === 'reported' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.dismissBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                        onPress={() => confirmDismissReports(j)}
                        activeOpacity={0.75}
                      >
                        <Feather name="check" size={13} color={C.text} />
                        <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          Dismiss
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.removeBtn, { backgroundColor: C.dangerBg, borderColor: C.dangerBg }]}
                        onPress={() => {
                          setRemoveTarget(j);
                          setRemoveReason('');
                        }}
                        activeOpacity={0.75}
                      >
                        <Feather name="slash" size={13} color={C.danger} />
                        <Text style={[styles.actionBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.restoreFullBtn, { backgroundColor: C.successBg, borderColor: C.successBg }]}
                      onPress={() => restore(j)}
                      activeOpacity={0.75}
                    >
                      <Feather name="rotate-ccw" size={13} color={C.success} />
                      <Text style={[styles.actionBtnTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                        Restore Listing
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Remove Listing Bottom Sheet Modal */}
      <Modal
        visible={!!removeTarget}
        transparent
        animationType="slide"
        onRequestClose={() => { setRemoveTarget(null); setRemoveReason(''); }}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => { setRemoveTarget(null); setRemoveReason(''); }}
          />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Remove Listing
            </Text>
            <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {removeTarget ? `"${removeTarget.title}" will be hidden from the campus job board.` : ''}
            </Text>

            {/* Quick preset chips */}
            <View style={styles.presetWrap}>
              {REMOVE_PRESETS.map((p) => {
                const isSel = removeReason === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSel ? (C.brand + '18') : C.surface2,
                        borderColor: isSel ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => setRemoveReason(p)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.presetChipTxt,
                        {
                          color: isSel ? C.brand : C.text,
                          fontFamily: isSel ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.reasonInput,
                {
                  backgroundColor: C.bg,
                  borderColor: C.border,
                  color: C.text,
                  fontFamily: FontFamily.jakartaMedium,
                },
              ]}
              value={removeReason}
              onChangeText={setRemoveReason}
              placeholder=""
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => { setRemoveTarget(null); setRemoveReason(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.common.cancel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor: C.danger,
                    opacity: !removeReason.trim() || busy ? 0.5 : 1,
                  },
                ]}
                onPress={handleConfirmRemove}
                disabled={!removeReason.trim() || busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Feather name="slash" size={14} color="#ffffff" />
                    <Text style={[styles.modalBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                      Remove
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,

  card: { borderRadius: 16, borderWidth: 1, padding: 14 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 } as ViewStyle,
  thumb: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  title: { fontSize: 14.5 } as TextStyle,
  meta: { fontSize: 11.5, marginTop: 2 } as TextStyle,
  flagPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  flagTxt: { fontSize: 11 } as TextStyle,
  removedPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  removedPillTxt: { fontSize: 11 } as TextStyle,

  reasons: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 9, gap: 4 } as ViewStyle,
  reasonTxt: { fontSize: 12 } as TextStyle,

  cardActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  dismissBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  removeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  restoreFullBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  actionBtnTxt: { fontSize: 12.5 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 8 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as TextStyle,

  // Modal Styles
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' } as ViewStyle,
  modalOverlay: { flex: 1 } as ViewStyle,
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 } as ViewStyle,
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(150,150,150,0.4)', alignSelf: 'center', marginBottom: 4 } as ViewStyle,
  sheetTitle: { fontSize: 17 } as TextStyle,
  sheetSub: { fontSize: 12.5, marginTop: -4 } as TextStyle,

  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 } as ViewStyle,
  presetChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 } as ViewStyle,
  presetChipTxt: { fontSize: 11.5 } as TextStyle,

  reasonInput: { height: 72, borderRadius: 12, borderWidth: 1, padding: 10, fontSize: 13 } as TextStyle,

  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 } as ViewStyle,
  modalCancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  modalConfirmBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 } as ViewStyle,
  modalBtnTxt: { fontSize: 13 } as TextStyle,
});
