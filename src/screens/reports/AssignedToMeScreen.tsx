// Staff's full assigned-report list with search and status filters. Status
// changes happen on the detail screen; this is the searchable overview the
// dashboard links into.
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import type { Report } from '../../types/database';

const STATUSES = ['All', 'Open', 'In Progress', 'Resolved'] as const;
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

interface AssignedReport extends Report {
  reporter_name?: string;
}

export function AssignedToMeScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const [reports, setReports] = useState<AssignedReport[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('reports')
      .select('*, profiles:reporter_id(full_name)')
      .eq('assigned_staff_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) {
      setReports(data.map((r: any) => ({ ...r, reporter_name: r.profiles?.full_name })));
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: reports.length };
    reports.forEach(r => { m[r.status] = (m[r.status] || 0) + 1; });
    return m;
  }, [reports]);

  const q = query.trim().toLowerCase();
  const filtered = reports
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
      <SubBar title={t.reports.assignedTitle} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
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

        {/* Status chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUSES.map(s => {
            const on = filter === s;
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
                  {counts[s] ?? 0}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="clipboard" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.reports.noReportsTitle}
            </Text>
            <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.reports.noReportsBody}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(r => {
              const cat = CATEGORY_ICON[r.category] ?? CATEGORY_ICON.Other;
              const tone = statusTone(C, r.status);
              const title = (r.description ?? '').split('\n')[0];
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
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
                        {r.building}{r.room ? ` · ${r.room}` : ''}
                        {r.reporter_name ? `  ·  ${r.reporter_name}` : ''}  ·  {timeAgo(r.created_at)}
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
              );
            })}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14, marginBottom: 10 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 } as TextStyle,

  chips: { flexDirection: 'row', gap: 7, paddingBottom: 12 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12 } as TextStyle,
  chipCount: { fontSize: 10.5 } as TextStyle,

  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, borderWidth: 1, padding: 13 } as ViewStyle,
  catIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardTitle: { fontSize: 14 } as TextStyle,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 } as ViewStyle,
  cardMetaTxt: { fontSize: 11.5, flexShrink: 1 } as TextStyle,

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 6, paddingHorizontal: 24 } as ViewStyle,
  emptyTitle: { fontSize: 15.5 } as TextStyle,
  emptyBody: { fontSize: 12.5, textAlign: 'center' } as TextStyle,
});
