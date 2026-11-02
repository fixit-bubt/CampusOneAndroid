// Messages home - the student's conversation list: accepted-connection DMs plus
// auto-provisioned chats per club and per approved study section.
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useMessages } from '../../store/messagesStore';
import { Avatar } from '../../components/ui/Avatar';
import { TopBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import { convKeyOf, type Message, type MsgKind } from '../../services/messagesService';
import { fetchPeople } from '../../services/peopleService';

type TabKey = 'all' | 'dm' | 'club' | 'section';

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

function formatMessageTime(iso?: string, t?: any): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7DaysAgo = startOfToday - 6 * 86400000;
  const time = d.getTime();

  if (time >= startOfToday) {
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  }
  if (time >= startOfYesterday) {
    return t?.messages?.yesterday ?? 'Yesterday';
  }
  if (time >= startOf7DaysAgo) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${monthNames[d.getMonth()]}`;
}

export function MessagesHome({ navigation }: any) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const { messages, dmPartners, myClubs, mySections, unreadByConv, loading, error, reload } = useMessages();
  const [profileMap, setProfileMap] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Refresh the roster on focus so a just-accepted connection shows up.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  // Pull DM-partner display info whenever the partner set changes.
  useEffect(() => {
    if (dmPartners.length === 0) { setProfileMap({}); return; }
    let active = true;
    fetchPeople(dmPartners).then(map => { if (active) setProfileMap(map); });
    return () => { active = false; };
  }, [dmPartners]);

  const lastByConv = useMemo(() => {
    const map: Record<string, Message> = {};
    if (myId) {
      for (const m of messages) {
        const k = convKeyOf(m, myId);
        const cur = map[k];
        if (!cur || m.createdAt > cur.createdAt) map[k] = m;
      }
    }
    return map;
  }, [messages, myId]);

  const preview = useCallback((m?: Message): string => {
    if (!m) return '';
    if (m.deletedAt) return t.messages.removed;
    const who = m.senderId === myId ? `${t.messages.you}: ` : '';
    return who + m.body;
  }, [myId, t]);

  const allRows = useMemo(() => {
    const list: Row[] = [];
    for (const pid of dmPartners) {
      const prof = profileMap[pid];
      const key = `dm:${pid}`;
      const last = lastByConv[key];
      list.push({
        key, kind: 'dm', id: pid, title: prof?.full_name ?? 'Student', subtitle: preview(last),
        avatarUri: prof?.avatar_url, avatarName: prof?.full_name, isGroup: false,
        lastAt: last ? new Date(last.createdAt).getTime() : 0, unread: unreadByConv[key] ?? 0,
      });
    }
    for (const c of myClubs) {
      const key = `club:${c.id}`;
      const last = lastByConv[key];
      list.push({
        key, kind: 'club', id: c.id, title: c.name, subtitle: preview(last), isGroup: true,
        lastAt: last ? new Date(last.createdAt).getTime() : 0, unread: unreadByConv[key] ?? 0,
      });
    }
    for (const s of mySections) {
      const key = `section:${s.id}`;
      const last = lastByConv[key];
      list.push({
        key, kind: 'section', id: s.id, title: s.label, subtitle: preview(last), isGroup: true,
        lastAt: last ? new Date(last.createdAt).getTime() : 0, unread: unreadByConv[key] ?? 0,
      });
    }
    list.sort((a, b) => (b.lastAt - a.lastAt) || a.title.localeCompare(b.title));
    return list;
  }, [dmPartners, myClubs, mySections, profileMap, lastByConv, unreadByConv, preview]);

  // Tab unread counts
  const tabUnreads = useMemo(() => {
    let dm = 0;
    let club = 0;
    let sec = 0;
    for (const r of allRows) {
      if (r.unread > 0) {
        if (r.kind === 'dm') dm += r.unread;
        else if (r.kind === 'club') club += r.unread;
        else if (r.kind === 'section') sec += r.unread;
      }
    }
    return { dm, club, section: sec, all: dm + club + sec };
  }, [allRows]);

  // Filtered rows by tab and search
  const filteredRows = useMemo(() => {
    let list = allRows;
    if (activeTab !== 'all') {
      list = list.filter(r => r.kind === activeTab);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
    }
    return list;
  }, [allRows, activeTab, searchQuery]);

  const tabs: { key: TabKey; label: string; unread: number }[] = useMemo(() => [
    { key: 'all', label: t.messages.all ?? 'All', unread: tabUnreads.all },
    { key: 'dm', label: t.messages.direct ?? 'Direct', unread: tabUnreads.dm },
    { key: 'club', label: t.messages.clubs ?? 'Clubs', unread: tabUnreads.club },
    { key: 'section', label: t.messages.sections ?? 'Sections', unread: tabUnreads.section },
  ], [t, tabUnreads]);

  const renderRow = useCallback(({ item: r }: { item: Row }) => {
    const last = lastByConv[r.key];
    const hasUnread = r.unread > 0;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('MessageThread', { kind: r.kind, id: r.id, title: r.title })}
        activeOpacity={0.7}
      >
        {r.isGroup ? (
          <View style={styles.groupIcon}>
            <Feather name={r.kind === 'club' ? 'users' : 'book-open'} size={32} color={C.text} />
          </View>
        ) : (
          <Avatar uri={r.avatarUri} name={r.avatarName} size="md" />
        )}
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text
              style={[
                styles.rowTitle,
                { color: C.text, fontFamily: hasUnread ? FontFamily.jakartaExtraBold : FontFamily.jakartaBold },
              ]}
              numberOfLines={1}
            >
              {r.title}
            </Text>
            {last && (
              <Text
                style={[
                  styles.rowTime,
                  { color: hasUnread ? C.brand : C.textMuted, fontFamily: hasUnread ? FontFamily.jakartaBold : FontFamily.jakartaMedium },
                ]}
              >
                {formatMessageTime(last.createdAt, t)}
              </Text>
            )}
          </View>
          <View style={styles.rowBottom}>
            <Text
              style={[
                styles.rowSub,
                {
                  color: hasUnread ? C.text : C.textMuted,
                  fontFamily: hasUnread ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
              numberOfLines={1}
            >
              {r.subtitle || ' '}
            </Text>
            {hasUnread && (
              <View style={[styles.badge, { backgroundColor: C.brand }]}>
                <Text style={[styles.badgeTxt, { color: C.white, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {r.unread > 99 ? '99+' : r.unread}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [lastByConv, navigation, C, t]);

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <TopBar
        title={t.messages.title}
        right={
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Directory')}
            activeOpacity={0.75}
            accessibilityLabel={t.messages.findStudents}
            accessibilityRole="button"
            hitSlop={4}
          >
            <Feather name="user-plus" size={22} color={C.text} />
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={[styles.searchBoxWrap, { paddingHorizontal: Layout.screenPadding }]}>
        <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Feather name="search" size={24} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder={t.messages.searchInbox ?? 'Search conversations…'}
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} activeOpacity={0.7}>
              <Feather name="x-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.pillRow}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: C.brand, borderColor: C.brand }
                  : { backgroundColor: C.surface, borderColor: C.border },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isActive ? C.white : C.text2,
                    fontFamily: isActive ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                {tab.label}
              </Text>
              {tab.unread > 0 && (
                <View
                  style={[
                    styles.pillBadge,
                    { backgroundColor: isActive ? C.white : C.brand },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillBadgeText,
                      { color: isActive ? C.brand : C.white, fontFamily: FontFamily.jakartaExtraBold },
                    ]}
                  >
                    {tab.unread > 9 ? '9+' : tab.unread}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredRows}
        keyExtractor={r => r.key}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.brand]}
            tintColor={C.brand}
          />
        }
        ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: C.border }]} />}
        ListEmptyComponent={
          loading && !refreshing ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={C.brand} />
            </View>
          ) : error && allRows.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="alert-circle" size={30} color={C.danger} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold, marginTop: 8 }]}>
                {t.common.error}
              </Text>
              <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Could not load conversations. Please check your connection.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: C.brand, marginTop: 14 }]}
                onPress={() => reload()}
                activeOpacity={0.85}
              >
                <Text style={[styles.emptyBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.common.retry}
                </Text>
              </TouchableOpacity>
            </View>
          ) : allRows.length > 0 && filteredRows.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="search" size={30} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.messages.noMatches}
              </Text>
              <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {searchQuery.trim()
                  ? `No conversations match "${searchQuery.trim()}".`
                  : t.messages.noFilteredMatches ?? 'No conversations found in this category.'}
              </Text>
              {(searchQuery.length > 0 || activeTab !== 'all') && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: C.surface2, marginTop: 10 }]}
                  onPress={() => { setSearchQuery(''); setActiveTab('all'); }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.emptyBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Reset filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="message-circle" size={32} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.messages.emptyTitle}
              </Text>
              <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.messages.emptyBody}
              </Text>
              <View style={styles.emptyBtns}>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: C.brand }]}
                  onPress={() => navigation.navigate('Directory')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.emptyBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                    {t.messages.findStudents}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: C.surface2 }]}
                  onPress={() => navigation.navigate('Clubs')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.emptyBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {t.messages.browseClubs}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }
        renderItem={renderRow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  searchBoxWrap: {
    paddingTop: 8,
    paddingBottom: 8,
  } as ViewStyle,
  searchBar: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  } as TextStyle,

  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 10,
    paddingTop: 2,
  } as ViewStyle,
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,
  pillText: {
    fontSize: 12.5,
  } as TextStyle,
  pillBadge: {
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pillBadgeText: {
    fontSize: 10,
  } as TextStyle,

  divider: { height: StyleSheet.hairlineWidth, marginLeft: 68 } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 } as ViewStyle,
  groupIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  rowBody: { flex: 1, minWidth: 0 } as ViewStyle,
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 } as ViewStyle,
  rowTitle: { fontSize: 14.5, flex: 1 } as TextStyle,
  rowTime: { fontSize: 11, flexShrink: 0 } as TextStyle,
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 } as ViewStyle,
  rowSub: { fontSize: 12.5, flex: 1 } as TextStyle,
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  badgeTxt: { fontSize: 11 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 64, gap: 9, paddingHorizontal: 32 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as TextStyle,
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 } as TextStyle,
  emptyBtns: { flexDirection: 'row', gap: 10, marginTop: 12 } as ViewStyle,
  emptyBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 } as ViewStyle,
  emptyBtnTxt: { fontSize: 13 } as TextStyle,
});
