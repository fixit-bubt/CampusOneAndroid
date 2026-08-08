// AI chatbot — talks to the `chat` edge function (Gemini proxy). History is
// persisted per-user in chatbot_messages (RLS: own rows only), loaded once on
// mount and appended to as the conversation goes.
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
import { askChatbot, loadChatHistory, saveChatMessage, clearChatHistory, type ChatTurn } from '../../services/chatbotService';

interface Bubble {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean; // client-side only — never sent to Gemini as conversation history, never saved to DB
}

export function ChatbotScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const seq = useRef(0);

  useEffect(() => {
    if (!user) { setLoadingHistory(false); return; }
    loadChatHistory(user.id).then((res) => {
      if (res.ok) setMessages(res.data.map((m) => ({ id: m.id, role: m.role, text: m.text })));
      setLoadingHistory(false);
    });
    // Mount-only: nothing outside this screen can change chat history, so no
    // need to reload on focus — local state already reflects everything sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const body = text.trim();
    if (!body || sending || !user) return;
    setText('');
    const userMsg: Bubble = { id: `local-${seq.current++}`, role: 'user', text: body };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    saveChatMessage(user.id, 'user', body); // fire-and-forget — a failed save just means this turn won't persist, not worth blocking chat over

    // Exclude past error bubbles — they're a client-side artifact, not something
    // the model actually said, and would confuse it if replayed as history.
    const history: ChatTurn[] = messages.filter((m) => !m.isError).map((m) => ({ role: m.role, text: m.text }));
    const res = await askChatbot(body, history);
    setSending(false);

    if (res.ok) {
      setMessages((prev) => [...prev, { id: `local-${seq.current++}`, role: 'model', text: res.data }]);
      saveChatMessage(user.id, 'model', res.data);
    } else {
      setMessages((prev) => [...prev, { id: `local-${seq.current++}`, role: 'model', text: `Couldn't reach the assistant: ${res.error}`, isError: true }]);
    }
  }

  function confirmClear() {
    if (!user || messages.length === 0) return;
    Alert.alert(t.chatbot.clearTitle, t.chatbot.clearBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.chatbot.clearConfirm, style: 'destructive',
        onPress: async () => {
          const prev = messages;
          setMessages([]);
          const res = await clearChatHistory(user.id);
          if (!res.ok) setMessages(prev); // roll back — the delete didn't actually happen
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
          messages.length > 0 ? (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
              onPress={confirmClear}
            >
              <Feather name="trash-2" size={16} color={C.text2} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loadingHistory ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.brand} />
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
            ListEmptyComponent={
              <View style={[styles.center, { transform: [{ scaleY: -1 }] }]}>
                <Feather name="message-circle" size={28} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.chatbot.emptyState}
                </Text>
              </View>
            }
          />
        )}

        {sending && (
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

  clearBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

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
