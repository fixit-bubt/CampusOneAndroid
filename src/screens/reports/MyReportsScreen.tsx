// Student's full report list with search, status filters + counts, and per-row
// actions: View always; Edit/Delete only while a report is still Open.
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet,
  RefreshControl, Alert, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { getCampusReports, type CampusReport } from '../../services/reportsService';
import { setReportBoardVisibility } from '../../services/campusIssuesService';

const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Rejected', 'Closed'] as const;
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
    case 'Rejected':    return { fg: C.danger,    bg: C.dangerBg };
    default:            return { fg: C.warn,      bg: C.warnBg };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function MyReportsScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();
  const [reports, setReports] = useState<CampusReport[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [scope, setScope] = useState<'everyone' | 'mine'>('everyone');
  const [refreshing, setRefreshing] = useState(false);
  const [boardMap, setBoardMap] = useState<Record<string, boolean>>({});
  const [boardLoaded, setBoardLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await getCampusReports();
    if (res.ok) setReports(res.data);
    // campus_reports() doesn't project show_on_board, so pull the board state of
    // the caller's own reports directly for the per-report visibility toggle.
    // show_on_board is NOT NULL DEFAULT false, so an unknown id means OFF — the
    // toggle stays hidden until this resolves rather than guessing.
    const { data: mine, error: mineErr } = await supabase
      .from('reports').select('id, show_on_board').eq('reporter_id', user.id).is('deleted_at', null);
    if (!mineErr && mine) {
      setBoardMap(Object.fromEntries(mine.map(m => [m.id, m.show_on_board === true])));
      setBoardLoaded(true);
    }
  }, [user]);

  async function toggleBoard(r: CampusReport) {
    const current = boardMap[r.id] === true;
    const next = !current;
    setBoardMap(prev => ({ ...prev, [r.id]: next }));
    const res = await setReportBoardVisibility(r.id, next);
    if (!res.ok) {
      setBoardMap(prev => ({ ...prev, [r.id]: current }));
      toast({ type: 'error', title: t.common.error, message: res.error });
      return;
    }
    toast({
      type: 'success',
      title: t.campusIssues.visibilityUpdated,
      message: next ? t.campusIssues.onBoard : t.campusIssues.hiddenFromBoard,
    });
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDelete(r: CampusReport) {
    Alert.alert(t.reports.deleteTitle, t.reports.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('reports')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', r.id);
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
          setReports(prev => prev.filter(x => x.id !== r.id));
        },
      },
    ]);
  }

  const scoped = useMemo(
    () => (scope === 'mine' ? reports.filter(r => r.reporter_id === user?.id) : reports),
    [reports, scope, user?.id],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: scoped.length };
    scoped.forEach(r => { m[r.status] = (m[r.status] || 0) + 1; });
    return m;
  }, [scoped]);

  const q = query.trim().toLowerCase();
  const filtered = scoped
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r => {
      if (!q) return true;
      return [r.category, r.description, r.building, r.code]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.reports.allReportsTitle}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: C.brand }]}
            onPress={() => navigation.navigate('ReportForm', {})}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={13} color={C.white} />
            <Text style={[styles.newBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {t.reports.newReport}
            </Text>
          </TouchableOpacity>
        }
      />

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
            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
              <Icon name="search" size={17} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
                placeholder={t.reports.searchPlaceholder}
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

            {/* Scope: everyone vs mine */}
            <View style={styles.scopeRow}>
              {(['everyone', 'mine'] as const).map(s => {
                const on = scope === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.scopeChip, on
                      ? { backgroundColor: C.brand, borderColor: C.brand }
                      : { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setScope(s)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {s === 'everyone' ? t.reports.scopeEveryone : t.reports.scopeMine}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status chips with counts */}
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
            <Feather name="inbox" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.reports.noReportsTitle}
            </Text>
            <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.reports.noReportsBody}
            </Text>
          </View>
        }
        renderItem={({ item: r }) => {
          const cat = CATEGORY_ICON[r.category] ?? CATEGORY_ICON.Other;
          const tone = statusTone(C, r.status);
          const title = (r.description ?? '').split('\n')[0];
          const isOwn = r.reporter_id === user?.id;
          const editable = isOwn && r.status === 'Open';
          const onBoard = boardMap[r.id] === true;
          // Rejected reports are excluded by the board feed, so don't offer a
          // toggle that would report success but never surface anything.
          const canBoard = isOwn && boardLoaded
            && r.category !== 'Safety / Security' && r.status !== 'Rejected';
          return (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <TouchableOpacity
                style={styles.cardTop}
                onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })}
                activeOpacity={0.75}
              >
                <View style={[styles.catIcon, { backgroundColor: `${cat.fg}1e` }]}>
                  <Icon name={cat.icon} size={19} color={cat.fg} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Icon name="pin" size={12} color={C.textMuted} />
                    <Text style={[styles.cardMetaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {r.building}{r.room ? ` · ${r.room}` : ''}  ·  {timeAgo(r.created_at)}
                    </Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <Icon name="user" size={12} color={C.textMuted} />
                    <Text style={[styles.cardMetaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {isOwn ? t.reports.scopeMine : `${t.reports.byLabel} ${r.reporter_name ?? '-'}`}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
                  <Text style={[styles.statusTxt, { color: tone.fg, fontFamily: FontFamily.jakartaBold }]}>
                    {t.status[r.status] ?? r.status}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.cardFoot, { borderTopColor: C.border }]}>
                <Text style={[styles.code, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {r.code}
                </Text>
                <View style={styles.actions}>
                  {editable && (
                    <>
                      <TouchableOpacity
                        style={[styles.actBtn, { backgroundColor: C.surface2 }]}
                        onPress={() => navigation.navigate('ReportForm', { editReportId: r.id })}
                        activeOpacity={0.75}
                      >
                        <Feather name="edit-2" size={13} color={C.text2} />
                        <Text style={[styles.actTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                          {t.common.edit}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actBtn, { backgroundColor: C.dangerBg }]}
                        onPress={() => confirmDelete(r)}
                        activeOpacity={0.75}
                      >
                        <Feather name="trash-2" size={13} color={C.danger} />
                        <Text style={[styles.actTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                          {t.common.delete}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {canBoard && (
                    <TouchableOpacity
                      style={[styles.actBtn, { backgroundColor: onBoard ? `${C.brand}1e` : C.surface2, paddingHorizontal: 8 }]}
                      onPress={() => toggleBoard(r)}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name={onBoard ? 'eye' : 'eye-off'}
                        size={14}
                        color={onBoard ? C.brand : C.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actBtn, { backgroundColor: C.surface2 }]}
                    onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.actTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {t.reports.view}
                    </Text>
                    <Feather name="arrow-right" size={13} color={C.text} />
                  </TouchableOpacity>
                </View>
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

  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 } as ViewStyle,
  newBtnTxt: { fontSize: 12 } as TextStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14, marginBottom: 10 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 } as TextStyle,

  scopeRow: { flexDirection: 'row', gap: 7, marginBottom: 10 } as ViewStyle,
  scopeChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 11, borderWidth: 1 } as ViewStyle,

  chips: { flexDirection: 'row', gap: 7, paddingBottom: 12 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12 } as TextStyle,
  chipCount: { fontSize: 10.5 } as TextStyle,

  list: { gap: 10 } as ViewStyle,
  card: { borderRadius: 16, borderWidth: 1, padding: 13 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 } as ViewStyle,
  catIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardTitle: { fontSize: 14 } as TextStyle,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 } as ViewStyle,
  cardMetaTxt: { fontSize: 11.5, flexShrink: 1 } as TextStyle,

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as TextStyle,

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
  } as ViewStyle,
  code: { fontSize: 11 } as TextStyle,
  actions: { flexDirection: 'row', gap: 7 } as ViewStyle,
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 } as ViewStyle,
  actTxt: { fontSize: 12 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 6, paddingHorizontal: 24 } as ViewStyle,
  emptyTitle: { fontSize: 15.5 } as TextStyle,
  emptyBody: { fontSize: 12.5, textAlign: 'center' } as TextStyle,
});
