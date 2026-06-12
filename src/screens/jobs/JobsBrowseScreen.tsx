// Matches design screens-b.jsx — Jobs browse (All / Saved tabs)
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

function computeJobStatus(job: Job): string {
  if ((job as any).deleted_at) return 'removed';
  if (job.deadline && new Date(job.deadline) < new Date()) return 'expired';
  return 'open';
}

const JOB_COLOR = SectorColors.jobs;
const JOB_BG    = `${SectorColors.jobs}1e`;

// Job status tones from theme tokens (dark-mode aware via C)
function jobStatusTone(C: any, k: string): { label: string; fg: string; bg: string } {
  switch (k) {
    case 'closed':  return { label: 'Closed',  fg: Accent.slate, bg: Accent.grayBg };
    case 'expired': return { label: 'Expired', fg: C.warn,       bg: C.warnBg };
    case 'removed': return { label: 'Removed', fg: C.danger,     bg: C.dangerBg };
    default:        return { label: 'Open',    fg: Accent.teal,  bg: Accent.tealBg };
  }
}

type Tab = 'all' | 'saved';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  work_mode: string;
  status: string;
  deadline: string;
  stipend: string | null;
  description: string;
  requirements: string | null;
  posted_by: string;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function JobsBrowseScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const canPost = profile?.role === 'admin' || profile?.role === 'staff';
  const [tab, setTab] = useState<Tab>('all');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [jobsRes, savedRes] = await Promise.all([
      supabase.from('jobs').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
      supabase.from('job_bookmarks').select('job_id').eq('user_id', user?.id ?? ''),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data as Job[]);
    if (savedRes.data) setSavedIds(new Set(savedRes.data.map((s: any) => s.job_id)));
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleSave(jobId: string) {
    if (!user) return;
    const isSaved = savedIds.has(jobId);
    const next = new Set(savedIds);
    if (isSaved) {
      next.delete(jobId);
      await supabase.from('job_bookmarks').delete().eq('job_id', jobId).eq('user_id', user.id);
    } else {
      next.add(jobId);
      await supabase.from('job_bookmarks').insert({ job_id: jobId, user_id: user.id });
    }
    setSavedIds(next);
  }

  const list = tab === 'saved' ? jobs.filter(j => savedIds.has(j.id)) : jobs;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Jobs"
        onBack={() => navigation.goBack()}
        rightSlot={
          canPost ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('JobPost')}
              activeOpacity={0.75}
            >
              <Feather name="plus" size={22} color={C.text} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Tabs */}
      <View style={[styles.tabs, { paddingHorizontal: Layout.screenPadding }]}>
        {(['all', 'saved'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, tab === t
              ? { backgroundColor: C.brand, borderColor: C.brand }
              : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setTab(t)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipTxt, { color: tab === t ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {t === 'all' ? 'All' : 'Saved'}
            </Text>
            <Text style={[styles.chipCount, { color: tab === t ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t === 'all' ? jobs.length : [...savedIds].length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="jobs" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {tab === 'saved' ? 'No saved jobs' : 'No jobs available'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map(j => {
              const s = jobStatusTone(C, computeJobStatus(j));
              const isSaved = savedIds.has(j.id);
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
                        {j.company} · {j.location}
                      </Text>
                      <View style={styles.cardMeta}>
                        <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                          <View style={[styles.statusDot, { backgroundColor: s.fg }]} />
                          <Text style={[styles.statusTxt, { color: s.fg, fontFamily: FontFamily.jakartaBold }]}>{s.label}</Text>
                        </View>
                        <Text style={[styles.cardType, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {j.job_type} · {j.work_mode}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => toggleSave(j.id)}
                    activeOpacity={0.75}
                  >
                    <Feather
                      name="star"
                      size={20}
                      color={isSaved ? Accent.gold : C.textMuted}
                      style={{ opacity: 1 } as any}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  tabs: { flexDirection: 'row', gap: 8, paddingVertical: 8 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,
  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 13, flex: 1, minWidth: 0 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14 } as any,
  cardSub: { fontSize: 12, marginTop: 3 } as any,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 } as ViewStyle,
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as any,
  cardType: { fontSize: 11 } as any,
  saveBtn: { padding: 8, marginLeft: 4 } as ViewStyle,
  iconBtn: { padding: 8 } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
});
