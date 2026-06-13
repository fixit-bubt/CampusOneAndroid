// Matches design screens-a.jsx — Announcements browse
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import type { Announcement } from '../../types/database';

const PRIORITIES = ['All', 'Urgent', 'Important', 'General'];

// Priority tones from theme tokens (dark-mode aware via C)
function priTone(C: any, priority: string): { fg: string; bg: string } {
  switch (priority) {
    case 'Urgent':    return { fg: C.danger, bg: C.dangerBg };
    case 'Important': return { fg: C.warn,   bg: C.warnBg };
    default:          return { fg: Accent.slate, bg: Accent.grayBg };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

function AnnouncementCard({ a, C, isDark, unread, canDelete, onDelete, onPress }: {
  a: Announcement; C: any; isDark: boolean; unread: boolean;
  canDelete: boolean; onDelete: () => void; onPress: () => void;
}) {
  const { fg, bg: priBg } = priTone(C, a.priority);
  const bg = `${fg}1e`;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      activeOpacity={0.75}
    >
      <View style={[styles.thumb, { backgroundColor: bg }]}>
        <Icon name="announce" size={22} color={fg} />
        {unread && <View style={[styles.unreadDot, { backgroundColor: C.brand, borderColor: C.surface }]} />}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardEyebrow, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {a.department} · {timeAgo(a.created_at)}
        </Text>
        <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
          {a.title}
        </Text>
        <View style={styles.cardMeta}>
          <View style={[styles.priPill, { backgroundColor: priBg }]}>
            <View style={[styles.priDot, { backgroundColor: fg }]} />
            <Text style={[styles.priText, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
              {a.priority}
            </Text>
          </View>
          {a.pinned && (
            <View style={styles.pinnedRow}>
              <Icon name="pin" size={12} color={C.brand} />
              <Text style={[styles.pinnedTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>Pinned</Text>
            </View>
          )}
          {a.attachment_url && <Icon name="mail" size={13} color={C.textMuted} />}
        </View>
      </View>
      {canDelete && (
        <TouchableOpacity onPress={onDelete} hitSlop={8} activeOpacity={0.7} style={{ padding: 2 }}>
          <Feather name="trash-2" size={15} color={C.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export function AnnouncementsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const isAdmin = profile?.role === 'admin';
  const canPost = isAdmin;
  const [items, setItems] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState('All');
  const [dept, setDept] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [aRes, rRes] = await Promise.all([
      supabase
        .from('announcements')
        .select('*')
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50),
      // RLS returns only my own read rows.
      supabase.from('announcement_reads').select('announcement_id').limit(500),
    ]);
    if (aRes.error) { console.error('announcements fetch:', aRes.error.message); return; }
    if (aRes.data) setItems(aRes.data as Announcement[]);
    if (rRes.data) setReadIds(new Set(rRes.data.map((r: any) => r.announcement_id)));
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [load, navigation]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function deleteAnnouncement(a: Announcement) {
    Alert.alert(t.common.delete, a.title, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('announcements')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', a.id);
          if (error) { Alert.alert(t.common.error, error.message); return; }
          setItems(prev => prev.filter(x => x.id !== a.id));
        },
      },
    ]);
  }

  const depts = ['All', ...Array.from(new Set(items.map(i => i.department).filter(Boolean)))];
  const filtered = items
    .filter(a => priority === 'All' || a.priority === priority)
    .filter(a => dept === 'All' || a.department === dept);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Announcements"
        onBack={() => navigation.goBack()}
        rightSlot={canPost ? (
          <TouchableOpacity style={{ padding: 4 }} onPress={() => navigation.navigate('AnnouncePost')} activeOpacity={0.75}>
            <Feather name="plus" size={22} color={C.text} />
          </TouchableOpacity>
        ) : undefined}
      />
      {/* Priority tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}
      >
        {PRIORITIES.map(p => {
          const on = priority === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.chip, on
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setPriority(p)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {p === 'All' ? t.common.all : (t.announce2.priorityLabels[p] ?? p)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Department chips */}
      {depts.length > 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={[styles.deptChips, { paddingHorizontal: Layout.screenPadding }]}
        >
          {depts.map(d => {
            const on = dept === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.deptChip, on
                  ? { backgroundColor: C.surface2, borderColor: C.text2 }
                  : { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setDept(d)}
                activeOpacity={0.75}
              >
                <Text style={[styles.deptChipTxt, { color: on ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {d === 'All' ? t.common.all : d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="announce" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.common.noResults}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(a => (
              <AnnouncementCard
                key={a.id}
                a={a}
                C={C}
                isDark={isDark}
                unread={!readIds.has(a.id)}
                canDelete={isAdmin}
                onDelete={() => deleteAnnouncement(a)}
                onPress={() => navigation.navigate('AnnouncementDetail', { announcementId: a.id })}
              />
            ))}
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  unreadDot: { position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6, borderWidth: 2 } as ViewStyle,
  chips: { flexDirection: 'row', gap: 7, paddingVertical: 8 } as ViewStyle,
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12 } as any,
  deptChips: { flexDirection: 'row', gap: 7, paddingBottom: 8 } as ViewStyle,
  deptChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  deptChipTxt: { fontSize: 11.5 } as any,
  cardBody: { flex: 1 } as ViewStyle,
  cardEyebrow: { fontSize: 11, marginBottom: 3 } as any,
  cardTitle: { fontSize: 14, lineHeight: 20 } as any,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 } as ViewStyle,
  priPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  priDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  priText: { fontSize: 11 } as any,
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 } as ViewStyle,
  pinnedTxt: { fontSize: 11 } as any,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
});
