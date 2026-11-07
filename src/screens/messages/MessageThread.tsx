// A single conversation - DM or club/section group chat. Realtime keeps it live
// via the store; this screen handles the composer, edit/delete, copy,
// block (DM), in-conversation search, day dividers, and older-message paging.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useMessages } from '../../store/messagesStore';
import { useToast } from '../../components/ui/Toast';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { Message, MsgKind } from '../../services/messagesService';
import { fetchPeople } from '../../services/peopleService';

function clock(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabelOf(iso: string, t: any): string {
  const k = dayKeyOf(iso);
  const now = new Date();
  const y = new Date(now.getTime() - 86400000);
  if (k === dayKeyOf(now.toISOString())) return t?.messages?.today ?? 'Today';
  if (k === dayKeyOf(y.toISOString())) return t?.messages?.yesterday ?? 'Yesterday';
  try {
    const d = new Date(iso);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return k;
  }
}

export function MessageThread({ route, navigation }: any) {
  // Safe parameter fallback for all entry points (DM from listings, jobs, rides, blood)
  const kind: MsgKind = route.params?.kind ?? 'dm';
  const id: string = route.params?.id ?? route.params?.peerId ?? route.params?.studentId ?? '';
  const initialTitle: string = route.params?.title ?? route.params?.name ?? 'Chat';

  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const {
    messages, threadMessages, send, edit, remove, block, unblock, isBlocked,
    markRead, loadConversation, fetchOlderMessages, search,
    dmPartners, myClubs, mySections, loading, reload,
  } = useMessages();

  const [text, setText] = useState(route.params?.initialText ?? '');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [nameMap, setNameMap] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});
  const [peerProfile, setPeerProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Message[] | null>(null);
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const searchSeq = useRef(0);

  const convKeyStr = `${kind}:${id}`;
  const isGroup = kind !== 'dm';
  const msgs = threadMessages(kind, id);
  const lastId = msgs.length ? msgs[msgs.length - 1].id : null;
  const lastAt = msgs.length ? msgs[msgs.length - 1].createdAt : null;

  // Access check: includes context grant DMs and existing message proof
  const hasExistingThread = useMemo(() => {
    return messages.some(m => m.kind === 'dm' && (m.peerLow === id || m.peerHigh === id));
  }, [messages, id]);

  const access = kind === 'dm'
    ? (dmPartners.includes(id) || hasExistingThread)
    : kind === 'club' ? myClubs.some(c => c.id === id)
    : mySections.some(s => s.id === id);

  const blocked = kind === 'dm' && isBlocked(id);

  // Load peer info for DMs to display avatar and full name in header
  useEffect(() => {
    if (kind === 'dm' && id) {
      fetchPeople([id]).then(map => {
        if (map[id]) setPeerProfile(map[id]);
      });
    }
  }, [kind, id]);

  // Self-heal access if arriving right after connection or context grant
  const triedReloadRef = useRef(false);
  useEffect(() => {
    if (!access && !loading && !triedReloadRef.current) {
      triedReloadRef.current = true;
      reload();
    }
  }, [access, loading, reload]);

  // Fetch this thread's newest page on open
  useEffect(() => {
    (async () => {
      const res = await loadConversation(kind, id);
      if (res.ok) setHasMore(res.count >= 50);
    })();
  }, [kind, id, loadConversation]);

  // Moderator check
  useEffect(() => {
    if (!myId) return;
    if (kind === 'club') {
      supabase.from('club_members').select('role').eq('club_id', id).eq('user_id', myId).maybeSingle()
        .then(({ data }) => setCanModerate(!!data && ['president', 'vp', 'editor'].includes((data as any).role)));
    } else if (kind === 'section') {
      supabase.from('study_section_members').select('role').eq('section_id', id).eq('user_id', myId).maybeSingle()
        .then(({ data }) => setCanModerate((data as any)?.role === 'cr'));
    }
  }, [kind, id, myId]);

  // Names/avatars for group-chat senders
  useEffect(() => {
    if (!isGroup) return;
    const ids = Array.from(new Set(msgs.map(m => m.senderId).filter(Boolean))) as string[];
    const missing = ids.filter(i => !nameMap[i]);
    if (missing.length === 0) return;
    fetchPeople(missing).then(map => {
      if (Object.keys(map).length) setNameMap(prev => ({ ...prev, ...map }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGroup, msgs.length]);

  // Mark conversation read
  useEffect(() => {
    if (lastAt) markRead(convKeyStr, lastAt);
  }, [lastId, lastAt, convKeyStr, markRead]);

  async function doSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await send(kind, id, body);
    setSending(false);
    if (res.ok) setText('');
    else toast({ type: 'error', title: t.common.error, message: res.error ?? t.messages.sendFailed });
  }

  async function loadOlder() {
    if (loadingOlder || msgs.length === 0) return;
    setLoadingOlder(true);
    const res = await fetchOlderMessages(kind, id, msgs[0].createdAt);
    setLoadingOlder(false);
    if (res.ok && res.count < 50) setHasMore(false);
  }

  const runSearch = useCallback(async (q: string) => {
    setTerm(q);
    if (!q.trim()) { setResults(null); return; }
    const seq = ++searchSeq.current;
    const r = await search(kind, id, q);
    if (seq === searchSeq.current) setResults(r);
  }, [kind, id, search]);

  const copyMessage = useCallback(async (content: string) => {
    await Clipboard.setStringAsync(content);
    toast({ type: 'success', title: t.messages.copied ?? 'Message copied to clipboard' });
  }, [t, toast]);

  const confirmDelete = useCallback((m: Message) => {
    Alert.alert(
      t.messages.deleteConfirmTitle ?? 'Remove message?',
      t.messages.deleteConfirmBody ?? 'This message will be removed for everyone. This cannot be undone.',
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.messages.remove, style: 'destructive', onPress: () => remove(m.id) },
      ]
    );
  }, [t, remove]);

  const onLongPress = useCallback((m: Message) => {
    if (m.deletedAt) return;
    const mine = m.senderId === myId;
    const actions: any[] = [];
    actions.push({ text: t.messages.copy ?? 'Copy text', onPress: () => copyMessage(m.body) });
    if (mine) actions.push({ text: t.messages.edit, onPress: () => { setEditTarget(m); setEditText(m.body); } });
    if (mine || canModerate) actions.push({ text: t.messages.remove, style: 'destructive', onPress: () => confirmDelete(m) });
    actions.push({ text: t.common.cancel, style: 'cancel' });
    Alert.alert(t.messages.messageAction, undefined, actions);
  }, [myId, canModerate, t, copyMessage, confirmDelete]);

  async function saveEdit() {
    if (!editTarget) return;
    const res = await edit(editTarget.id, editText);
    setEditTarget(null);
    if (!res.ok) toast({ type: 'error', title: t.common.error, message: res.error });
  }

  async function toggleBlock() {
    setMenuOpen(false);
    const res = blocked ? await unblock(id) : await block(id);
    if (!res.ok) toast({ type: 'error', title: t.common.error, message: res.error });
  }

  const handleHeaderPress = useCallback(() => {
    if (kind === 'dm' && id) {
      navigation.navigate('StudentProfile', { studentId: id, id });
    } else if (kind === 'club' && id) {
      navigation.navigate('ClubDetail', { clubId: id, id });
    }
  }, [kind, id, navigation]);

  // Ascending order for day bucketing, then reverse for inverted list
  const ascending = searching && results !== null
    ? [...results].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    : msgs;
  const rendered = useMemo(() => [...ascending].reverse(), [ascending]);

  const headerTitle = peerProfile?.full_name ?? initialTitle;

  const renderBubbleItem = useCallback(({ item: m, index: i }: { item: Message; index: number }) => {
    const mine = m.senderId === myId;
    const olderMsg = rendered[i + 1];
    const newerMsg = rendered[i - 1];

    // Day boundary logic
    const isOldest = i === rendered.length - 1;
    const showDay = isOldest || (olderMsg && dayKeyOf(olderMsg.createdAt) !== dayKeyOf(m.createdAt));

    // Group cluster logic (for group chats)
    const isFirstOfCluster = isOldest || olderMsg?.senderId !== m.senderId || (olderMsg && dayKeyOf(olderMsg.createdAt) !== dayKeyOf(m.createdAt));
    const isLastOfCluster = i === 0 || newerMsg?.senderId !== m.senderId || (newerMsg && dayKeyOf(newerMsg.createdAt) !== dayKeyOf(m.createdAt));

    if (m.deletedAt) {
      const modDel = !!m.deletedBy && m.deletedBy !== m.senderId;
      return (
        <View key={m.id}>
          {showDay && (
            <View style={styles.dayDivider}>
              <View style={[styles.dayPill, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Text style={[styles.dayTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {dayLabelOf(m.createdAt, t)}
                </Text>
              </View>
            </View>
          )}
          <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}>
            <View style={[styles.bubble, styles.deletedBubble, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Text style={[styles.deletedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {modDel ? t.messages.removedByMod : t.messages.removed}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    const prof = m.senderId ? nameMap[m.senderId] : null;

    return (
      <View key={m.id}>
        {showDay && (
          <View style={styles.dayDivider}>
            <View style={[styles.dayPill, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Text style={[styles.dayTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {dayLabelOf(m.createdAt, t)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => onLongPress(m)}
          style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}
        >
          {isGroup && !mine && (
            isLastOfCluster ? (
              <Avatar uri={prof?.avatar_url} name={prof?.full_name} size="xs" style={styles.bubbleAvatar} />
            ) : (
              <View style={styles.avatarSpacer} />
            )
          )}

          <View style={{ maxWidth: '80%' }}>
            {isGroup && !mine && isFirstOfCluster && (
              <Text style={[styles.sender, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {prof?.full_name ?? '…'}
              </Text>
            )}

            <View
              style={[
                styles.bubble,
                mine
                  ? [styles.mineBubble, { backgroundColor: C.brand }]
                  : [styles.theirBubble, { backgroundColor: C.surface, borderColor: C.border }],
              ]}
            >
              <Text style={[styles.body, { color: mine ? C.white : C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {m.body}
              </Text>

              <View style={styles.metaRow}>
                <Text
                  style={[
                    styles.metaTime,
                    {
                      color: mine ? 'rgba(255,255,255,0.75)' : C.textMuted,
                      fontFamily: FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {clock(m.createdAt)}
                  {m.editedAt ? ` · ${t.messages.edited}` : ''}
                </Text>
                {mine && (
                  m.pending ? (
                    <Feather name="clock" size={11} color="rgba(255,255,255,0.75)" style={{ marginLeft: 3 }} />
                  ) : (
                    <Feather name="check" size={12} color="rgba(255,255,255,0.85)" style={{ marginLeft: 3 }} />
                  )
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [myId, rendered, nameMap, isGroup, C, t, onLongPress]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.hIconBtn}
          hitSlop={8}
          activeOpacity={0.75}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} color={C.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfile}
          onPress={handleHeaderPress}
          activeOpacity={kind === 'section' ? 1 : 0.7}
        >
          {kind === 'dm' ? (
            <Avatar uri={peerProfile?.avatar_url} name={headerTitle} size="sm" />
          ) : (
            <View style={styles.headerGroupIcon}>
              <Feather name={kind === 'club' ? 'users' : 'book-open'} size={24} color={C.text} />
            </View>
          )}
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              {kind === 'dm' ? (t.messages.viewProfile ?? 'View profile') : isGroup ? 'Group chat' : ''}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.hIconBtn}
            onPress={() => { setSearching(s => !s); setTerm(''); setResults(null); }}
            activeOpacity={0.75}
            accessibilityLabel="Search"
          >
            <Feather name={searching ? 'x' : 'search'} size={22} color={C.text} />
          </TouchableOpacity>
          {kind === 'dm' && (
            <TouchableOpacity
              style={styles.hIconBtn}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.75}
              accessibilityLabel="More options"
            >
              <Feather name="more-vertical" size={22} color={C.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* In-Thread Search Input */}
      {searching && (
        <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border, marginHorizontal: Layout.screenPadding }]}>
          <Feather name="search" size={24} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder={t.messages.searchTitle}
            placeholderTextColor={C.textMuted}
            value={term}
            onChangeText={runSearch}
            autoFocus
          />
          {term.length > 0 && (
            <TouchableOpacity onPress={() => runSearch('')} hitSlop={8} activeOpacity={0.7}>
              <Feather name="x-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {!access ? (
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={C.brand} />
          ) : (
            <Text style={[styles.unavail, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.messages.unavailable}
            </Text>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {rendered.length === 0 ? (
            <View style={styles.center}>
              <Feather name="message-circle" size={32} color={C.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.unavail, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {searching ? t.messages.noMatches : t.messages.emptyThread}
              </Text>
            </View>
          ) : (
            <FlatList
              inverted
              data={rendered}
              keyExtractor={m => m.id}
              contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingVertical: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={renderBubbleItem}
              onEndReached={() => { if (!searching && hasMore) loadOlder(); }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                !searching && hasMore ? (
                  <TouchableOpacity onPress={loadOlder} style={styles.older} activeOpacity={0.7}>
                    {loadingOlder ? (
                      <ActivityIndicator color={C.brand} size="small" />
                    ) : (
                      <Text style={[styles.olderTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                        {t.messages.loadOlder}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null
              }
            />
          )}

          {/* Composer / blocked notice */}
          {blocked ? (
            <View style={[styles.blockedBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
              <Text style={[styles.blockedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.messages.blockedNotice}
              </Text>
              <TouchableOpacity onPress={toggleBlock} activeOpacity={0.8}>
                <Text style={[styles.unblockTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {t.messages.unblock}
                </Text>
              </TouchableOpacity>
            </View>
          ) : !searching ? (
            <View style={[styles.composer, { backgroundColor: C.surface, borderTopColor: C.border }]}>
              <TextInput
                style={[styles.composerInput, { backgroundColor: C.surface2, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
                placeholder={t.messages.typeMessage}
                placeholderTextColor={C.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={4000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: text.trim() ? C.brand : C.surface2 }]}
                onPress={doSend}
                disabled={!text.trim() || sending}
                activeOpacity={0.8}
              >
                <Feather name="send" size={18} color={text.trim() ? C.white : C.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}
          {text.length > 3600 && !blocked && (
            <Text style={[styles.counter, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {text.length}/4000
            </Text>
          )}
        </KeyboardAvoidingView>
      )}

      {/* DM overflow menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { backgroundColor: C.surface, borderColor: C.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={toggleBlock} activeOpacity={0.7}>
              <Feather name={blocked ? 'user-check' : 'slash'} size={16} color={blocked ? C.brand : C.danger} />
              <Text style={[styles.menuTxt, { color: blocked ? C.brand : C.danger, fontFamily: FontFamily.jakartaBold }]}>
                {blocked ? t.messages.unblock : t.messages.block}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.editOverlay}>
          <View style={[styles.editCard, { backgroundColor: C.surface }]}>
            <Text style={[styles.editTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.messages.editTitle}
            </Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: C.surface2, color: C.text, borderColor: C.border, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
              value={editText}
              onChangeText={setEditText}
              multiline
              maxLength={4000}
              autoFocus
            />
            <View style={styles.editBtns}>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: C.surface2 }]} onPress={() => setEditTarget(null)} activeOpacity={0.8}>
                <Text style={[styles.editBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: C.brand }]} onPress={saveEdit} activeOpacity={0.8}>
                <Text style={[styles.editBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{t.messages.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  } as ViewStyle,
  hIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  } as ViewStyle,
  headerGroupIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  headerTitle: {
    fontSize: 15,
  } as TextStyle,
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  } as TextStyle,
  headerBtns: {
    flexDirection: 'row',
    gap: 6,
  } as ViewStyle,

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 } as ViewStyle,
  unavail: { fontSize: 13.5, textAlign: 'center' } as TextStyle,

  searchBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 13.5, paddingVertical: 0 } as TextStyle,

  dayDivider: {
    alignItems: 'center',
    marginVertical: 12,
  } as ViewStyle,
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  dayTxt: {
    fontSize: 11,
    letterSpacing: 0.2,
  } as TextStyle,

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2.5, gap: 7 } as ViewStyle,
  mineRow: { justifyContent: 'flex-end' } as ViewStyle,
  theirRow: { justifyContent: 'flex-start' } as ViewStyle,
  bubbleAvatar: { marginBottom: 2 } as ViewStyle,
  avatarSpacer: { width: 24, height: 24 } as ViewStyle,
  sender: { fontSize: 11, marginBottom: 3, marginLeft: 4 } as TextStyle,

  bubble: { paddingHorizontal: 13, paddingVertical: 9 },
  mineBubble: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  } as ViewStyle,
  theirBubble: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  } as ViewStyle,

  deletedBubble: { borderWidth: 1, borderRadius: 16 } as ViewStyle,
  deletedTxt: { fontSize: 12.5, fontStyle: 'italic' } as TextStyle,
  body: { fontSize: 14.5, lineHeight: 20 } as TextStyle,

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 3,
  } as ViewStyle,
  metaTime: { fontSize: 10 } as TextStyle,

  older: { alignItems: 'center', paddingVertical: 12 } as ViewStyle,
  olderTxt: { fontSize: 12.5 } as TextStyle,

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  composerInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14.5,
  } as TextStyle,
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  counter: {
    fontSize: 11,
    textAlign: 'right',
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 4,
  } as TextStyle,

  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  blockedTxt: { fontSize: 13 } as TextStyle,
  unblockTxt: { fontSize: 13 } as TextStyle,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' } as ViewStyle,
  menu: {
    position: 'absolute',
    top: 65,
    right: Layout.screenPadding,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 4,
    minWidth: 150,
  } as ViewStyle,
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  } as ViewStyle,
  menuTxt: { fontSize: 13.5 } as TextStyle,

  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  } as ViewStyle,
  editCard: { borderRadius: 20, padding: 18 } as ViewStyle,
  editTitle: { fontSize: 16, marginBottom: 12 } as TextStyle,
  editInput: {
    minHeight: 90,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 14.5,
    textAlignVertical: 'top',
  } as TextStyle,
  editBtns: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' } as ViewStyle,
  editBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 } as ViewStyle,
  editBtnTxt: { fontSize: 13.5 } as TextStyle,
});
