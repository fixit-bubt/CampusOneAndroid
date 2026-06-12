// Matches design screens-a.jsx — Announcements browse
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { Announcement } from '../../types/database';

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

function AnnouncementCard({ a, C, isDark, onPress }: { a: Announcement; C: any; isDark: boolean; onPress: () => void }) {
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
    </TouchableOpacity>
  );
}

export function AnnouncementsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const canPost = profile?.role === 'admin';
  const [items, setItems] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error('announcements fetch:', error.message); return; }
    if (data) setItems(data as Announcement[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

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
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="announce" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>No announcements</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map(a => (
              <AnnouncementCard
                key={a.id}
                a={a}
                C={C}
                isDark={isDark}
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
