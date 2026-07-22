// Campus Issues board — anonymous student-facing feed of reports whose owners
// opted them onto the board, with a "me too" vote. No reporter identity is ever
// shown (the feed RPC never projects it) and cards don't deep-link to the
// owner-only report detail.
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { getCampusIssues, toggleReportVote, type CampusIssue } from '../../services/campusIssuesService';

const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const;
type StatusFilter = (typeof STATUSES)[number];

const CATEGORY_ICON: Record<string, { icon: string; fg: string }> = {
  'Electrical':        { icon: 'bolt',     fg: Accent.gold },
  'Plumbing':          { icon: 'droplets', fg: Accent.sky },
  'Cleanliness':       { icon: 'sparkles', fg: Accent.teal },
  'IT / Network':      { icon: 'wifi',     fg: Accent.purple },
  'Furniture':         { icon: 'box',      fg: Accent.amber },
  'Safety / Security': { icon: 'shield',   fg: Accent.red },
  'Other':             { icon: 'sliders',  fg: Accent.slate },
};

function statusTone(C: any, status: string): { fg: string; bg: string } {
  switch (status) {
    case 'In Progress': return { fg: C.info,      bg: C.infoBg };
    case 'Resolved':    return { fg: C.success,   bg: C.successBg };
    case 'Closed':      return { fg: C.textMuted, bg: C.surface2 };
    default:            return { fg: C.warn,      bg: C.warnBg };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function CampusIssuesScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const [issues, setIssues] = useState<CampusIssue[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getCampusIssues();
    if (res.ok) { setIssues(res.data); setLoadError(null); }
    else setLoadError(res.error);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function meToo(issue: CampusIssue) {
    // Track in-flight votes per card so a slow request on one issue doesn't
    // silently swallow taps on another.
    if (busyIds.has(issue.id)) return;
    setBusyIds(prev => new Set(prev).add(issue.id));
    const res = await toggleReportVote(issue.id);
    setBusyIds(prev => { const next = new Set(prev); next.delete(issue.id); return next; });
    if (!res.ok) { toast({ type: 'error', title: t.common.error, message: res.error }); return; }
    setIssues(prev => prev.map(x =>
      x.id === issue.id ? { ...x, vote_count: res.data.vote_count, voted: res.data.voted } : x,
    ));
  }

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: issues.length };
    issues.forEach(r => { m[r.status] = (m[r.status] || 0) + 1; });
    return m;
  }, [issues]);

  const q = query.trim().toLowerCase();
  // Server already orders by vote count then newest — keep that order.
  const filtered = issues
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r => {
      if (!q) return true;
      return [r.category, r.description, r.building, r.code]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.campusIssues.title} onBack={() => navigation.goBack()} />

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        ItemSeparatorComponent={() => <View style={{ height: 11 }} />}
        ListHeaderComponent={
          <View>
            <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
              <Icon name="search" size={17} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
                placeholder={t.campusIssues.searchPlaceholder}
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {STATUSES.map(s => {
                const on = filter === s;
                const count = counts[s] ?? 0;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, on
                      ? { backgroundColor: C.brand, borderColor: C.brand }
                      : { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setFilter(s)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {s === 'All' ? t.common.all : (t.status[s] ?? s)}
                    </Text>
                    <Text style={[styles.chipCount, { color: on ? 'rgba(255,255,255,0.75)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ height: 12 }} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name={loadError ? 'alert-circle' : 'users'} size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {loadError ? t.common.error : t.campusIssues.emptyTitle}
            </Text>
            <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {loadError ?? t.campusIssues.emptyBody}
            </Text>
            {loadError && (
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: C.brand }]}
                onPress={load}
                activeOpacity={0.85}
              >
                <Text style={[styles.retryTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.common.retry}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item: r }) => {
          const cat = CATEGORY_ICON[r.category] ?? CATEGORY_ICON.Other;
          const tone = statusTone(C, r.status);
          return (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.catIcon, { backgroundColor: `${cat.fg}1e` }]}>
                  <Icon name={cat.icon} size={19} color={cat.fg} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardCat, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {r.category}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Icon name="pin" size={12} color={C.textMuted} />
                    <Text style={[styles.cardMetaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {r.building}{r.room ? ` · ${r.room}` : ''}  ·  {timeAgo(r.created_at)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
                  <Text style={[styles.statusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}>
                    {t.status[r.status] ?? r.status}
                  </Text>
                </View>
              </View>

              <Text style={[styles.desc, { color: C.text, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={3}>
                {r.description}
              </Text>

              <View style={[styles.cardFoot, { borderTopColor: C.border }]}>
                <Text style={[styles.affected, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {r.vote_count > 0 ? t.campusIssues.affected(r.vote_count) : t.campusIssues.beFirst}
                </Text>
                <TouchableOpacity
                  style={[styles.voteBtn, r.voted
                    ? { backgroundColor: C.brand, borderColor: C.brand }
                    : { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => meToo(r)}
                  disabled={busyIds.has(r.id)}
                  activeOpacity={0.75}
                >
                  <Feather name="thumbs-up" size={13} color={r.voted ? C.white : C.text2} />
                  <Text style={[styles.voteTxt, { color: r.voted ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {t.campusIssues.meToo}
                  </Text>
                  {r.vote_count > 0 && (
                    <Text style={[styles.voteCount, { color: r.voted ? 'rgba(255,255,255,0.8)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      {r.vote_count}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: 16 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14, marginBottom: 10 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 } as TextStyle,

  chips: { flexDirection: 'row', gap: 7, paddingBottom: 4 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12 } as TextStyle,
  chipCount: { fontSize: 10.5 } as TextStyle,

  card: { borderRadius: 16, borderWidth: 1, padding: 13 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 } as ViewStyle,
  catIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardCat: { fontSize: 13 } as TextStyle,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 } as ViewStyle,
  cardMetaTxt: { fontSize: 11.5, flexShrink: 1 } as TextStyle,

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as TextStyle,

  desc: { fontSize: 13.5, lineHeight: 19, marginTop: 11 } as TextStyle,

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
    gap: 10,
  } as ViewStyle,
  affected: { fontSize: 11.5, flexShrink: 1 } as TextStyle,
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  voteTxt: { fontSize: 12.5 } as TextStyle,
  voteCount: { fontSize: 12.5 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 6, paddingHorizontal: 24 } as ViewStyle,
  emptyTitle: { fontSize: 15.5 } as TextStyle,
  emptyBody: { fontSize: 12.5, textAlign: 'center' } as TextStyle,
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 6 } as ViewStyle,
  retryTxt: { fontSize: 13 } as TextStyle,
});
