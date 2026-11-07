// Jobs moderation - admin-only.
// Reported tab: live jobs with reports, most-reported first, with direct
// dismiss and remove actions. Removed tab: withdrawn/removed jobs with restore.
import { useAfterInteractions } from '../../hooks/useAfterInteractions';
import { SkeletonList } from '../../components/ui/LoadState';
import { indexKey, listGap } from '../../components/ui/listHelpers';
import { useState, useCallback, useMemo, memo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
  Alert, Platform, type ViewStyle, type TextStyle,
} from 'react-native';

import { SafeAreaView } from '../../components/layout/SafeAreaView';
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
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

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

const JobModerateCard = memo(function JobModerateCard({
  j,
  tab,
  onNavigate,
  onRestore,
  onDismiss,
  onRemove,
  C,
  t,
}: {
  j: JobRow;
  tab: 'reported' | 'removed';
  onNavigate: (id: string) => void;
  onRestore: (j: JobRow) => void;
  onDismiss: (j: JobRow) => void;
  onRemove: (j: JobRow) => void;
  C: any;
  t: any;
}) {
  const handleNavigate = useCallback(() => onNavigate(j.id), [onNavigate, j.id]);
  const handleRestore = useCallback(() => onRestore(j), [onRestore, j]);
  const handleDismiss = useCallback(() => onDismiss(j), [onDismiss, j]);
  const handleRemove = useCallback(() => onRemove(j), [onRemove, j]);

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <TouchableOpacity
        style={styles.cardTop}
        onPress={handleNavigate}
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

      <View style={[styles.cardActions, { borderTopColor: C.border }]}>
        {tab === 'reported' ? (
          <>
            <TouchableOpacity
              style={[styles.dismissBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
              onPress={handleDismiss}
              activeOpacity={0.75}
            >
              <Feather name="check" size={13} color={C.text} />
              <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Dismiss
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: C.dangerBg, borderColor: C.dangerBg }]}
              onPress={handleRemove}
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
            onPress={handleRestore}
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
  );
});

export function JobsModerateScreen({ navigation }: any) {
  const ready = useAfterInteractions();
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
    try {
      const [jobsRes, reportsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, code, title, company, deleted_at, removed_reason')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('job_reports')
          .select('job_id, reason, note')
          .limit(300),
      ]);
      if (jobsRes.data) {
        const reports = (reportsRes.data ?? []) as any[];
        setJobs((jobsRes.data as any[]).map(j => ({
          ...j,
          reports: reports.filter(r => r.job_id === j.id),
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusRefresh(load);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const restore = useCallback(async (j: JobRow) => {
    const res = await adminRestoreJobListing(j.code);
    if (!res.success) { toast({ type: 'error', title: t.common.error, message: res.error }); return; }
    toast({ type: 'success', title: 'Listing Restored' });
    load();
  }, [toast, t.common.error, load]);

  const confirmDismissReports = useCallback((j: JobRow) => {
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
  }, [t.common.cancel, t.common.error, toast, load]);

  const handleOpenRemoveModal = useCallback((j: JobRow) => {
    setRemoveTarget(j);
    setRemoveReason('');
  }, []);

  const handleNavigateDetail = useCallback((id: string) => {
    navigation.navigate('JobDetail', { jobId: id });
  }, [navigation]);

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

  const reported = useMemo(() => {
    return jobs
      .filter(j => !j.deleted_at && j.reports.length > 0)
      .sort((a, b) => b.reports.length - a.reports.length);
  }, [jobs]);

  const removed = useMemo(() => {
    return jobs.filter(j => !!j.deleted_at);
  }, [jobs]);

  const list = useMemo(() => (tab === 'reported' ? reported : removed), [tab, reported, removed]);

  const moderateTabs: TabItem<'reported' | 'removed'>[] = useMemo(() => [
    { id: 'reported', label: t.jobs.reported, count: reported.length, color: C.danger },
    { id: 'removed', label: t.jobs.removed, count: removed.length, color: Accent.slate },
  ], [t.jobs, reported.length, removed.length, C.danger]);

  const renderJobItem = useCallback(({ item: j }: { item: JobRow }) => (
    <JobModerateCard
      j={j}
      tab={tab}
      onNavigate={handleNavigateDetail}
      onRestore={restore}
      onDismiss={confirmDismissReports}
      onRemove={handleOpenRemoveModal}
      C={C}
      t={t}
    />
  ), [tab, handleNavigateDetail, restore, confirmDismissReports, handleOpenRemoveModal, C, t]);

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.jobs.moderation} onBack={() => navigation.goBack()} />

      <FlatList
        data={ready ? list : []}
        keyExtractor={indexKey}
        ItemSeparatorComponent={listGap(10)}
        renderItem={renderJobItem}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        ListHeaderComponent={
          <View style={{ paddingTop: 4, marginBottom: 10 }}>
            <SegmentedTabs
              tabs={moderateTabs}
              activeTab={tab}
              onTabChange={setTab}
            />
          </View>
        }
        ListEmptyComponent={ready ? (loading && jobs.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 50 }} color={C.brand} />
          ) : (
            <View style={styles.empty}>
              <Icon name="jobs" size={28} color={C.textMuted} />
              <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {tab === 'reported' ? t.jobs.noReported : t.jobs.noRemoved}
              </Text>
            </View>
          )) : <SkeletonList rows={5} />}
        ListFooterComponent={<View style={{ height: 16 }} />}
      />

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
              placeholder={t.jobs2?.removeReasonPlaceholder ?? 'Reason for removal (optional)'}
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.border }]}
                onPress={() => { setRemoveTarget(null); setRemoveReason(''); }}
              >
                <Text style={[styles.modalCancelTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.common.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: C.dangerBg, borderColor: C.danger + '35' }]}
                onPress={handleConfirmRemove}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={C.danger} size="small" />
                ) : (
                  <Text style={[styles.modalConfirmTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                    Confirm Removal
                  </Text>
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
  scroll: { paddingTop: 4, paddingBottom: 24 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  } as ViewStyle,
  emptyTxt: { fontSize: 13 } as TextStyle,

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  } as ViewStyle,
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  thumb: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  title: { fontSize: 14, lineHeight: 18 } as TextStyle,
  meta: { fontSize: 11.5, marginTop: 2 } as TextStyle,

  flagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  flagTxt: { fontSize: 10.5 } as TextStyle,

  removedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  removedPillTxt: { fontSize: 10.5 } as TextStyle,

  reasons: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 4,
  } as ViewStyle,
  reasonTxt: { fontSize: 11.5 } as TextStyle,

  cardActions: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  dismissBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  removeBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  restoreFullBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  actionBtnTxt: { fontSize: 12.5 } as TextStyle,

  // Modal styles
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  modalOverlay: {
    ...StyleSheet.absoluteFill,
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 12,
  } as ViewStyle,
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    alignSelf: 'center',
  } as ViewStyle,
  sheetTitle: { fontSize: 16 } as TextStyle,
  sheetSub: { fontSize: 12 } as TextStyle,

  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  } as ViewStyle,
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  presetChipTxt: { fontSize: 11.5 } as TextStyle,

  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    height: 80,
    fontSize: 13,
  } as TextStyle,

  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalCancelTxt: { fontSize: 13 } as TextStyle,
  modalConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalConfirmTxt: { fontSize: 13 } as TextStyle,
});
