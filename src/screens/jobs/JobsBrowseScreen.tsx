import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout , SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';

function computeJobStatus(job: Job): string {
  if ((job as any).deleted_at) return 'removed';
  if (job.deadline) {
    const days = (new Date(job.deadline).getTime() - Date.now()) / 86400000;
    if (days < 0) return 'expired';
    if (days <= 3) return 'closing';
  }
  return 'open';
}

const JOB_COLOR = SectorColors.jobs;
const JOB_BG    = `${SectorColors.jobs}1e`;

// Job status tones from theme tokens (dark-mode aware via C)
function jobStatusTone(C: any, t: any, k: string): { label: string; fg: string; bg: string } {
  switch (k) {
    case 'closing': return { label: 'Closing soon', fg: C.warn,   bg: C.warnBg };
    case 'expired': return { label: 'Expired', fg: Accent.slate, bg: Accent.grayBg };
    case 'removed': return { label: 'Removed', fg: C.danger,     bg: C.dangerBg };
    default:        return { label: 'Open',    fg: Accent.teal,  bg: Accent.tealBg };
  }
}

type Tab = 'open' | 'closing' | 'expired' | 'saved';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  work_mode: string;
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
  const t = useT();
  const toast = useToast();
  const isAdmin = profile?.role === 'admin';
  // Matches can_post_jobs(): admin OR event organizer OR club president/vp.
  // Staff are excluded, so the button isn't shown only to have RLS reject it.
  const [canPost, setCanPost] = useState(isAdmin);
  const [tab, setTab] = useState<Tab>('open');
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [jobsRes, savedRes] = await Promise.all([
      supabase.from('jobs').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
      supabase.from('job_bookmarks').select('job_id').eq('user_id', user?.id ?? '').limit(200),
    ]);
    if (jobsRes.error) { toast({ type: 'error', title: t.common.error }); setLoading(false); return; }
    if (jobsRes.data) setJobs(jobsRes.data as Job[]);
    if (savedRes.data) setSavedIds(new Set(savedRes.data.map((s: any) => s.job_id)));
    setLoading(false);
  }, [user?.id, toast, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Resolve job-posting permission to match RLS, so the + button only shows
  // to users whose insert will actually succeed.
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

  async function toggleSave(jobId: string) {
    if (!user) return;
    const isSaved = savedIds.has(jobId);
    const next = new Set(savedIds);
    isSaved ? next.delete(jobId) : next.add(jobId);
    setSavedIds(next); // optimistic
    const { error } = isSaved
      ? await supabase.from('job_bookmarks').delete().eq('job_id', jobId).eq('user_id', user.id)
      : await supabase.from('job_bookmarks').insert({ job_id: jobId, user_id: user.id });
    if (error && error.code !== '23505') {
      setSavedIds(savedIds); // rollback
      toast({ type: 'error', title: t.common.error });
    }
  }

  const q = query.trim().toLowerCase();
  const searched = q
    ? jobs.filter(j => [j.title, j.company, j.location, j.job_type].filter(Boolean).join(' ').toLowerCase().includes(q))
    : jobs;
  const counts: Record<Tab, number> = {
    open: searched.filter(j => computeJobStatus(j) === 'open').length,
    closing: searched.filter(j => computeJobStatus(j) === 'closing').length,
    expired: searched.filter(j => computeJobStatus(j) === 'expired').length,
    saved: searched.filter(j => savedIds.has(j.id)).length,
  };
  const list = tab === 'saved'
    // Saved sorts by soonest deadline first
    ? searched.filter(j => savedIds.has(j.id)).sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
    : searched.filter(j => computeJobStatus(j) === tab);

  const TAB_LABEL: Record<Tab, string> = {
    open: t.jobs.open, closing: t.jobs.closingSoon, expired: t.jobs.expired, saved: t.jobs.saved,
  };

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

      {/* Search */}
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

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.tabs, { paddingHorizontal: Layout.screenPadding }]}
      >
        {(['open', 'closing', 'expired', 'saved'] as Tab[]).map(tb => (
          <TouchableOpacity
            key={tb}
            style={[styles.chip, tab === tb
              ? { backgroundColor: C.brand, borderColor: C.brand }
              : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setTab(tb)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipTxt, { color: tab === tb ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {TAB_LABEL[tb]}
            </Text>
            <Text style={[styles.chipCount, { color: tab === tb ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {counts[tb]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {loading && jobs.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={C.brand} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="jobs" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.common.noResults}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map(j => {
              const s = jobStatusTone(C, t, computeJobStatus(j));
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
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 } as TextStyle,
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
