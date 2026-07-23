// A single conversation — DM or club/section group chat. Realtime keeps it live
// via the store; this screen handles the composer, edit/delete (long-press),
// block (DM), in-conversation search and older-message paging.
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useMessages } from '../../store/messagesStore';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchChatProfiles, type Message } from '../../services/messagesService';

function clock(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function MessageThread({ route, navigation }: any) {
  const { kind, id, title } = route.params;
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const {
    threadMessages, send, edit, remove, block, unblock, isBlocked,
    markRead, loadConversation, fetchOlderMessages, search,
    dmPartners, myClubs, mySections, loading, reload,
  } = useMessages();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [nameMap, setNameMap] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});
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

  const access = kind === 'dm' ? dmPartners.includes(id)
    : kind === 'club' ? myClubs.some(c => c.id === id)
    : mySections.some(s => s.id === id);
  const blocked = kind === 'dm' && isBlocked(id);

  // If we arrived with a stale roster (e.g. right after accepting a connection,
  // or a DM push for a brand-new conversation), the access gate can be falsely
  // false. Refresh the store once to self-heal rather than showing "unavailable".
  const triedReloadRef = useRef(false);
  useEffect(() => {
    if (!access && !loading && !triedReloadRef.current) {
      triedReloadRef.current = true;
      reload();
    }
  }, [access, loading, reload]);

  // Fetch this thread's newest page on open (the global 300-cap may not include
  // a quiet conversation).
  useEffect(() => {
    (async () => {
      const res = await loadConversation(kind, id);
      if (res.ok) setHasMore(res.count >= 50);
    })();
  }, [kind, id, loadConversation]);

  // Am I a moderator here? (club officer / section CR — can delete any message.)
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

  // Names/avatars for group-chat senders.
  useEffect(() => {
    if (!isGroup) return;
    const ids = Array.from(new Set(msgs.map(m => m.senderId).filter(Boolean))) as string[];
    const missing = ids.filter(i => !nameMap[i]);
    if (missing.length === 0) return;
    fetchChatProfiles(missing).then(map => {
      if (Object.keys(map).length) setNameMap(prev => ({ ...prev, ...map }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGroup, msgs.length]);

  // Mark the conversation read as its newest message changes while open.
  useEffect(() => {
    if (lastAt) markRead(convKeyStr, lastAt);
  }, [lastId, lastAt, convKeyStr, markRead]);

  async function doSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await send(kind, id, body);
    setSending(false);
    if (res.ok) setText(''); // the markRead effect (server time) covers read state
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

  function onLongPress(m: Message) {
    if (m.deletedAt) return;
    const mine = m.senderId === myId;
    const actions: any[] = [];
    if (mine) actions.push({ text: t.messages.edit, onPress: () => { setEditTarget(m); setEditText(m.body); } });
    if (mine || canModerate) actions.push({ text: t.messages.remove, style: 'destructive', onPress: () => remove(m.id) });
    if (actions.length === 0) return;
    actions.push({ text: t.common.cancel, style: 'cancel' });
    Alert.alert(t.messages.messageAction, undefined, actions);
  }

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

  // Both sources feed the same inverted list, so normalize to ascending first:
  // msgs is already ascending; search results come back descending.
  const ascending = searching && results !== null
    ? [...results].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    : msgs;
  const rendered = [...ascending].reverse(); // newest-first for the inverted list

  function renderBubble(m: Message) {
    const mine = m.senderId === myId;
    if (m.deletedAt) {
      const modDel = !!m.deletedBy && m.deletedBy !== m.senderId;
      return (
        <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}>
          <View style={[styles.bubble, styles.deletedBubble, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Text style={[styles.deletedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {modDel ? t.messages.removedByMod : t.messages.removed}
            </Text>
          </View>
        </View>
      );
    }
    const prof = m.senderId ? nameMap[m.senderId] : null;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => onLongPress(m)}
        style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}
      >
        {isGroup && !mine && <Avatar uri={prof?.avatar_url} name={prof?.full_name} size="xs" style={styles.bubbleAvatar} />}
        <View style={{ maxWidth: '78%' }}>
          {isGroup && !mine && (
            <Text style={[styles.sender, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {prof?.full_name ?? '…'}
            </Text>
          )}
          <View style={[styles.bubble, mine ? { backgroundColor: C.brand } : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
            <Text style={[styles.body, { color: mine ? C.white : C.text, fontFamily: FontFamily.jakartaMedium }]}>
              {m.body}
            </Text>
            <Text style={[styles.meta, { color: mine ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {clock(m.createdAt)}
              {m.editedAt ? ` · ${t.messages.edited}` : ''}
              {m.pending ? ` · ${t.messages.sending}` : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={title}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={[styles.hBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
              onPress={() => { setSearching(s => !s); setTerm(''); setResults(null); }}
            >
              <Feather name={searching ? 'x' : 'search'} size={18} color={C.text2} />
            </TouchableOpacity>
            {kind === 'dm' && (
              <TouchableOpacity
                style={[styles.hBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setMenuOpen(true)}
              >
                <Feather name="more-vertical" size={18} color={C.text2} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {searching && (
        <View style={[styles.searchBar, { backgroundColor: C.surface2, marginHorizontal: Layout.screenPadding }]}>
          <Feather name="search" size={16} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder={t.messages.searchTitle}
            placeholderTextColor={C.textMuted}
            value={term}
            onChangeText={runSearch}
            autoFocus
          />
        </View>
      )}

      {!access ? (
        <View style={styles.center}>
          {loading
            ? <ActivityIndicator color={C.brand} />
            : (
              <Text style={[styles.unavail, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.messages.unavailable}
              </Text>
            )}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            inverted
            data={rendered}
            keyExtractor={m => m.id}
            contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => renderBubble(item)}
            onEndReached={() => { if (!searching && hasMore) loadOlder(); }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View style={[styles.center, { transform: [{ scaleY: -1 }] }]}>
                <Text style={[styles.unavail, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {searching ? t.messages.noMatches : t.messages.emptyThread}
                </Text>
              </View>
            }
            ListFooterComponent={
              !searching && hasMore ? (
                <TouchableOpacity onPress={loadOlder} style={styles.older} activeOpacity={0.7}>
                  {loadingOlder
                    ? <ActivityIndicator color={C.brand} size="small" />
                    : <Text style={[styles.olderTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>{t.messages.loadOlder}</Text>}
                </TouchableOpacity>
              ) : null
            }
          />

          {/* Composer / blocked notice */}
          {blocked ? (
            <View style={[styles.blockedBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
              <Text style={[styles.blockedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.messages.blockedNotice}
              </Text>
              <TouchableOpacity onPress={toggleBlock} activeOpacity={0.8}>
                <Text style={[styles.unblockTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>{t.messages.unblock}</Text>
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
            <Text style={[styles.counter, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{text.length}/4000</Text>
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
        <View style={styles.editOverlay}>
          <View style={[styles.editCard, { backgroundColor: C.surface }]}>
            <Text style={[styles.editTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.messages.editTitle}</Text>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 } as ViewStyle,
  unavail: { fontSize: 13.5, textAlign: 'center' } as TextStyle,

  headerBtns: { flexDirection: 'row', gap: 6 } as ViewStyle,
  hBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, marginTop: 6 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 } as TextStyle,

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3, gap: 7 } as ViewStyle,
  mineRow: { justifyContent: 'flex-end' } as ViewStyle,
  theirRow: { justifyContent: 'flex-start' } as ViewStyle,
  bubbleAvatar: { marginBottom: 2 } as ViewStyle,
  sender: { fontSize: 11, marginBottom: 3, marginLeft: 4 } as TextStyle,
  bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 } as ViewStyle,
  deletedBubble: { borderWidth: 1 } as ViewStyle,
  deletedTxt: { fontSize: 12.5, fontStyle: 'italic' } as TextStyle,
  body: { fontSize: 14.5, lineHeight: 20 } as TextStyle,
  meta: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' } as TextStyle,

  older: { alignItems: 'center', paddingVertical: 12 } as ViewStyle,
  olderTxt: { fontSize: 12.5 } as TextStyle,

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: Layout.screenPadding, paddingTop: 9, paddingBottom: 9, borderTopWidth: StyleSheet.hairlineWidth } as ViewStyle,
  composerInput: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 14.5 } as TextStyle,
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  counter: { fontSize: 11, textAlign: 'right', paddingHorizontal: Layout.screenPadding, paddingBottom: 4 } as TextStyle,

  blockedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth } as ViewStyle,
  blockedTxt: { fontSize: 13 } as TextStyle,
  unblockTxt: { fontSize: 13 } as TextStyle,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' } as ViewStyle,
  menu: { position: 'absolute', top: 70, right: Layout.screenPadding, borderRadius: 14, borderWidth: 1, paddingVertical: 4, minWidth: 150 } as ViewStyle,
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 } as ViewStyle,
  menuTxt: { fontSize: 13.5 } as TextStyle,

  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 28 } as ViewStyle,
  editCard: { borderRadius: 20, padding: 18 } as ViewStyle,
  editTitle: { fontSize: 16, marginBottom: 12 } as TextStyle,
  editInput: { minHeight: 90, borderRadius: 14, borderWidth: 1, padding: 12, fontSize: 14.5, textAlignVertical: 'top' } as TextStyle,
  editBtns: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' } as ViewStyle,
  editBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 } as ViewStyle,
  editBtnTxt: { fontSize: 13.5 } as TextStyle,
});
