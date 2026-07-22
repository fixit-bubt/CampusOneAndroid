// Messages home — the student's conversation list: accepted-connection DMs plus
// one auto-provisioned chat per club and per approved study section. Tapping a
// row opens the thread; the tab badge shows total unread (from the store).
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useMessages } from '../../store/messagesStore';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { convKeyOf, type Message, type MsgKind } from '../../services/messagesService';

interface Row {
  key: string;
  kind: MsgKind;
  id: string;
  title: string;
  subtitle: string;
  avatarUri?: string | null;
  avatarName?: string;
  isGroup: boolean;
  lastAt: number;
  unread: number;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export function MessagesHome({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const { messages, dmPartners, myClubs, mySections, unreadByConv, reload } = useMessages();
  const [profileMap, setProfileMap] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});

  // Refresh the roster on focus so a just-accepted connection shows up.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // Pull DM-partner display info whenever the partner set changes.
  useEffect(() => {
    if (dmPartners.length === 0) { setProfileMap({}); return; }
    supabase.from('profiles').select('id, full_name, avatar_url').in('id', dmPartners)
      .then(({ data }) => {
        if (data) setProfileMap(Object.fromEntries((data as any[]).map(p => [p.id, p])));
      });
  }, [dmPartners]);

  const lastByConv: Record<string, Message> = {};
  if (myId) {
    for (const m of messages) {
      const k = convKeyOf(m, myId);
      const cur = lastByConv[k];
      if (!cur || m.createdAt > cur.createdAt) lastByConv[k] = m;
    }
  }

  const preview = (m?: Message): string => {
    if (!m) return '';
    if (m.deletedAt) return t.messages.removed;
    const who = m.senderId === myId ? `${t.messages.you}: ` : '';
    return who + m.body;
  };

  const rows: Row[] = [];
  for (const pid of dmPartners) {
    const prof = profileMap[pid];
    const key = `dm:${pid}`;
    const last = lastByConv[key];
    rows.push({
      key, kind: 'dm', id: pid, title: prof?.full_name ?? 'Student', subtitle: preview(last),
      avatarUri: prof?.avatar_url, avatarName: prof?.full_name, isGroup: false,
      lastAt: last ? new Date(last.createdAt).getTime() : 0, unread: unreadByConv[key] ?? 0,
    });
  }
  for (const c of myClubs) {
    const key = `club:${c.id}`;
    const last = lastByConv[key];
    rows.push({
      key, kind: 'club', id: c.id, title: c.name, subtitle: preview(last), isGroup: true,
      lastAt: last ? new Date(last.createdAt).getTime() : 0, unread: unreadByConv[key] ?? 0,
    });
  }
  for (const s of mySections) {
    const key = `section:${s.id}`;
    const last = lastByConv[key];
    rows.push({
      key, kind: 'section', id: s.id, title: s.label, subtitle: preview(last), isGroup: true,
      lastAt: last ? new Date(last.createdAt).getTime() : 0, unread: unreadByConv[key] ?? 0,
    });
  }
  rows.sort((a, b) => (b.lastAt - a.lastAt) || a.title.localeCompare(b.title));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { paddingHorizontal: Layout.screenPadding }]}>
        <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>CampusOne</Text>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.messages.title}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={r => r.key}
        contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: C.border }]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={30} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.messages.emptyTitle}</Text>
            <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.messages.emptyBody}</Text>
            <View style={styles.emptyBtns}>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: C.brand }]} onPress={() => navigation.navigate('Directory')} activeOpacity={0.85}>
                <Text style={[styles.emptyBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{t.messages.findStudents}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: C.surface2 }]} onPress={() => navigation.navigate('Clubs')} activeOpacity={0.85}>
                <Text style={[styles.emptyBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.messages.browseClubs}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item: r }) => {
          const last = lastByConv[r.key];
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('MessageThread', { kind: r.kind, id: r.id, title: r.title })}
              activeOpacity={0.7}
            >
              {r.isGroup ? (
                <View style={[styles.groupIcon, { backgroundColor: C.surface2 }]}>
                  <Feather name={r.kind === 'club' ? 'users' : 'book-open'} size={19} color={C.brand} />
                </View>
              ) : (
                <Avatar uri={r.avatarUri} name={r.avatarName} size="md" />
              )}
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={[styles.rowTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {r.title}
                  </Text>
                  {last && (
                    <Text style={[styles.rowTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {timeAgo(last.createdAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.rowBottom}>
                  <Text style={[styles.rowSub, { color: r.unread > 0 ? C.text2 : C.textMuted, fontFamily: r.unread > 0 ? FontFamily.jakartaBold : FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {r.subtitle || ' '}
                  </Text>
                  {r.unread > 0 && (
                    <View style={[styles.badge, { backgroundColor: C.brand }]}>
                      <Text style={[styles.badgeTxt, { color: C.white, fontFamily: FontFamily.jakartaExtraBold }]}>
                        {r.unread > 9 ? '9+' : r.unread}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  header: { paddingTop: 8, paddingBottom: 6 } as ViewStyle,
  headerSub: { fontSize: 12 } as TextStyle,
  headerTitle: { fontSize: 26, marginTop: 2 } as TextStyle,

  divider: { height: StyleSheet.hairlineWidth, marginLeft: 68 } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 } as ViewStyle,
  groupIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  rowBody: { flex: 1, minWidth: 0 } as ViewStyle,
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 } as ViewStyle,
  rowTitle: { fontSize: 14.5, flex: 1 } as TextStyle,
  rowTime: { fontSize: 11, flexShrink: 0 } as TextStyle,
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 } as ViewStyle,
  rowSub: { fontSize: 12.5, flex: 1 } as TextStyle,
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  badgeTxt: { fontSize: 11 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 80, gap: 9, paddingHorizontal: 32 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as TextStyle,
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 } as TextStyle,
  emptyBtns: { flexDirection: 'row', gap: 10, marginTop: 10 } as ViewStyle,
  emptyBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 } as ViewStyle,
  emptyBtnTxt: { fontSize: 13 } as TextStyle,
});
