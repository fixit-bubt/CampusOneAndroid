// AI chatbot — talks to the `chat` edge function (Gemini proxy). Each screen
// instance is one conversation: an existing one if opened with a
// conversationId param (from ChatbotHistoryScreen), or a fresh blank one
// otherwise — created lazily in the DB on the first message actually sent,
// so browsing in and backing out never leaves an empty chat behind.
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet, Alert, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import {
  askChatbotStream, loadChatHistory, saveChatMessage, createConversation, deleteConversation, type ChatTurn,
} from '../../services/chatbotService';

interface Bubble {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean; // client-side only — never sent to Gemini as conversation history, never saved to DB
}

export function ChatbotScreen({ navigation, route }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const initialConversationId: string | undefined = route?.params?.conversationId;
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // True only until the first chunk of a reply arrives (or a tool-call
  // round retracts its preamble) — the "thinking" spinner, distinct from
  // `sending` which covers the whole turn and disables the composer.
  const [waitingFirstToken, setWaitingFirstToken] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(!!initialConversationId);
  const seq = useRef(0);

  useEffect(() => {
    if (!initialConversationId) { setLoadingHistory(false); return; }
    loadChatHistory(initialConversationId).then((res) => {
      if (res.ok) setMessages(res.data.map((m) => ({ id: m.id, role: m.role, text: m.text })));
      setLoadingHistory(false);
    });
    // Mount-only: this screen instance is pinned to one conversation — a
    // fresh conversationId means a fresh screen instance (navigation.replace
    // in ChatbotHistoryScreen), not a param change on this one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const body = text.trim();
    if (!body || sending || !user) return;
    setText('');
    const userMsg: Bubble = { id: `local-${seq.current++}`, role: 'user', text: body };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setWaitingFirstToken(true);

    // First message of a brand-new chat — create its conversation row now.
    let convId = conversationId;
    if (!convId) {
      const res = await createConversation(user.id, body);
      if (res.ok) { convId = res.data; setConversationId(res.data); }
    }
    if (convId) saveChatMessage(user.id, convId, 'user', body); // fire-and-forget — a failed save just means this turn won't persist, not worth blocking chat over

    // Exclude past error bubbles — they're a client-side artifact, not something
    // the model actually said, and would confuse it if replayed as history.
    const history: ChatTurn[] = messages.filter((m) => !m.isError).map((m) => ({ role: m.role, text: m.text }));

    const streamId = `local-${seq.current++}`;
    let streamedText = '';
    let bubbleAdded = false;

    await askChatbotStream(body, history, {
      onChunk: (chunk) => {
        streamedText += chunk;
        setWaitingFirstToken(false);
        setMessages((prev) => {
          if (!bubbleAdded) {
            bubbleAdded = true;
            return [...prev, { id: streamId, role: 'model', text: streamedText }];
          }
          return prev.map((m) => (m.id === streamId ? { ...m, text: streamedText } : m));
        });
      },
      onRetract: () => {
        // This round turned out to be a tool call, not the real answer —
        // drop whatever preamble text was showing and go back to "thinking".
        streamedText = '';
        bubbleAdded = false;
        setWaitingFirstToken(true);
        setMessages((prev) => prev.filter((m) => m.id !== streamId));
      },
      onDone: (fullText) => {
        setSending(false);
        setWaitingFirstToken(false);
        setMessages((prev) => [...prev.filter((m) => m.id !== streamId), { id: streamId, role: 'model', text: fullText }]);
        if (convId) saveChatMessage(user.id, convId, 'model', fullText);
      },
      onError: (message) => {
        setSending(false);
        setWaitingFirstToken(false);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== streamId),
          { id: `local-${seq.current++}`, role: 'model', text: `Couldn't reach the assistant: ${message}`, isError: true },
        ]);
      },
    });
  }

  function confirmDelete() {
    if (!conversationId) return;
    Alert.alert(t.chatbot.deleteTitle, t.chatbot.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.chatbot.deleteConfirm, style: 'destructive',
        onPress: async () => {
          const res = await deleteConversation(conversationId);
          if (res.ok) navigation.goBack();
          // on failure, leave the chat as-is — nothing was actually deleted
        },
      },
    ]);
  }

  function renderBubble(m: Bubble) {
    const mine = m.role === 'user';
    const bubbleStyle = mine
      ? { backgroundColor: C.brand }
      : m.isError
        ? { backgroundColor: C.surface, borderColor: C.danger, borderWidth: 1 }
        : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 };
    return (
      <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}>
        <View style={[styles.bubble, bubbleStyle]}>
          <Text style={[styles.body, { color: mine ? C.white : m.isError ? C.danger : C.text, fontFamily: FontFamily.jakartaMedium }]}>
            {m.text}
          </Text>
        </View>
      </View>
    );
  }

  const rendered = [...messages].reverse();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.chatbot.title}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
              onPress={() => navigation.navigate('ChatbotHistory')}
            >
              <Feather name="clock" size={16} color={C.text2} />
            </TouchableOpacity>
            {conversationId && (
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={confirmDelete}
              >
                <Feather name="trash-2" size={16} color={C.text2} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loadingHistory ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.brand} />
          </View>
        ) : rendered.length === 0 ? (
          // Rendered as a plain sibling, never as the inverted FlatList's
          // ListEmptyComponent — RN auto-counter-flips renderItem cells for
          // an inverted list, but not ListEmptyComponent, so putting text
          // there needs a manual scaleY:-1 that doesn't reliably cancel out
          // on newer RN/Fabric and ends up rendering upside-down instead.
          <View style={styles.center}>
            <Feather name="message-circle" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.chatbot.emptyState}
            </Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={rendered}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => renderBubble(item)}
          />
        )}

        {waitingFirstToken && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={C.brand} />
          </View>
        )}

        <View style={[styles.composer, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          <TextInput
            style={[styles.composerInput, { backgroundColor: C.surface2, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder={t.chatbot.placeholder}
            placeholderTextColor={C.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? C.brand : C.surface2 }]}
            onPress={send}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            <Feather name="send" size={18} color={text.trim() ? C.white : C.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 } as ViewStyle,
  emptyTxt: { fontSize: 13.5, textAlign: 'center' } as TextStyle,

  headerBtns: { flexDirection: 'row', gap: 8 } as ViewStyle,
  headerBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  bubbleRow: { flexDirection: 'row', marginVertical: 3 } as ViewStyle,
  mineRow: { justifyContent: 'flex-end' } as ViewStyle,
  theirRow: { justifyContent: 'flex-start' } as ViewStyle,
  bubble: { maxWidth: '78%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 } as ViewStyle,
  body: { fontSize: 14.5, lineHeight: 20 } as TextStyle,

  typingRow: { paddingHorizontal: Layout.screenPadding, paddingBottom: 6 } as ViewStyle,

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: Layout.screenPadding, paddingTop: 9, paddingBottom: 9, borderTopWidth: StyleSheet.hairlineWidth } as ViewStyle,
  composerInput: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 14.5 } as TextStyle,
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
});
