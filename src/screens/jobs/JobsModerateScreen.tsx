// Jobs moderation — admin-only.
// Reported tab: live jobs with reports, most-reported first, with the report
// reasons listed. Removed tab: withdrawn/removed jobs with restore.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

const JOBS_COLOR = SectorColors.jobs;

interface JobRow {
  id: string;
  code: string;
  title: string;
  company: string;
  deleted_at: string | null;
  removed_reason: string | null;
  reports: { reason: string; note: string | null }[];
}

export function JobsModerateScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const [tab, setTab] = useState<'reported' | 'removed'>('reported');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const { error } = await supabase.rpc('job_admin_restore', { p_code: j.code });
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    load();
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.jobs.moderation} onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View style={[styles.tabs, { paddingHorizontal: Layout.screenPadding }]}>
        {([['reported', t.jobs.reported, reported.length], ['removed', t.jobs.removed, removed.length]] as const).map(([id, label, count]) => {
          const on = tab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.tabBtn, on
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setTab(id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {label}
              </Text>
              <View style={[styles.countPill, { backgroundColor: on ? 'rgba(255,255,255,0.22)' : C.surface2 }]}>
                <Text style={[styles.countTxt, { color: on ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
                  <View style={[styles.thumb, { backgroundColor: `${JOBS_COLOR}1a` }]}>
                    <Icon name="jobs" size={19} color={JOBS_COLOR} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {j.title}
                    </Text>
                    <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {j.company}
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
                    <TouchableOpacity
                      style={[styles.restoreBtn, { backgroundColor: C.successBg }]}
                      onPress={() => restore(j)}
                      activeOpacity={0.75}
                    >
                      <Feather name="rotate-ccw" size={12} color={C.success} />
                      <Text style={[styles.flagTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                        {t.jobs.restore}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {tab === 'reported' && j.reports.length > 0 && (
                  <View style={[styles.reasons, { borderTopColor: C.border }]}>
                    {j.reports.slice(0, 4).map((r, i) => (
                      <Text key={i} style={[styles.reasonTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        • {r.reason}{r.note ? ` - ${r.note}` : ''}
                      </Text>
                    ))}
                  </View>
                )}
                {tab === 'removed' && j.removed_reason ? (
                  <View style={[styles.reasons, { borderTopColor: C.border }]}>
                    <Text style={[styles.reasonTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      • {j.removed_reason}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,

  tabs: { flexDirection: 'row', gap: 8, paddingVertical: 10 } as ViewStyle,
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  tabTxt: { fontSize: 13.5 } as TextStyle,
  countPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 } as ViewStyle,
  countTxt: { fontSize: 11.5 } as TextStyle,

  card: { borderRadius: 16, borderWidth: 1, padding: 13 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 } as ViewStyle,
  thumb: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  title: { fontSize: 14 } as TextStyle,
  meta: { fontSize: 11.5, marginTop: 2 } as TextStyle,
  flagPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  flagTxt: { fontSize: 11 } as TextStyle,
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 } as ViewStyle,

  reasons: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 9, gap: 3 } as ViewStyle,
  reasonTxt: { fontSize: 12 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 8 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as TextStyle,
});
