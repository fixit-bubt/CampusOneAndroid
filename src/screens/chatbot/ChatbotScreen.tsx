// AI chatbot — talks to the `chat` edge function (Gemini proxy). Each screen
// instance is one conversation: an existing one if opened with a
// conversationId param (from ChatbotHistoryScreen), or a fresh blank one
// otherwise — created lazily in the DB on the first message actually sent,
// so browsing in and backing out never leaves an empty chat behind.
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet, Alert, Image, type ViewStyle, type TextStyle, type ImageStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import { uploadPhoto } from '../../utils/storage';
import {
  askChatbotStream, loadChatHistory, saveChatMessage, createConversation, deleteConversation, type ChatTurn,
} from '../../services/chatbotService';

interface Bubble {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string | null;
  isError?: boolean; // client-side only — never sent to Gemini as conversation history, never saved to DB
}

// Downscaled/re-encoded before both upload and sending to Gemini — keeps the
// stored copy small and the base64 payload well under the edge function's
// size cap, without a visible quality hit for "photo of a homework problem".
const CHAT_IMAGE_MAX_DIM = 1280;
const CHAT_IMAGE_QUALITY = 0.6;

export function ChatbotScreen({ navigation, route }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
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
  const [pendingImage, setPendingImage] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const seq = useRef(0);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast({ type: 'info', title: t.chatbot.permissionRequired, message: t.chatbot.permissionBody });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setPendingImage({ uri: a.uri, width: a.width, height: a.height });
  }

  useEffect(() => {
    if (!initialConversationId) { setLoadingHistory(false); return; }
    loadChatHistory(initialConversationId).then((res) => {
      if (res.ok) setMessages(res.data.map((m) => ({ id: m.id, role: m.role, text: m.text, imageUrl: m.imageUrl })));
      setLoadingHistory(false);
    });
    // Mount-only: this screen instance is pinned to one conversation — a
    // fresh conversationId means a fresh screen instance (navigation.replace
    // in ChatbotHistoryScreen), not a param change on this one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const body = text.trim();
    const image = pendingImage;
    if ((!body && !image) || sending || !user) return;
    setText('');
    setPendingImage(null);

    // Downscale + re-encode once, reused for both the Gemini call (base64)
    // and the persisted copy (uploaded from the same resized local file) —
    // never the original full-resolution photo either way.
    let imageBase64: string | undefined;
    let imageUrl: string | undefined;
    if (image) {
      setUploadingImage(true);
      try {
        const longEdge = Math.max(image.width, image.height) || CHAT_IMAGE_MAX_DIM;
        const ratio = longEdge > CHAT_IMAGE_MAX_DIM ? CHAT_IMAGE_MAX_DIM / longEdge : 1;
        const targetW = Math.max(1, Math.round((image.width || CHAT_IMAGE_MAX_DIM) * ratio));
        const ctx = ImageManipulator.manipulate(image.uri);
        ctx.resize({ width: targetW });
        const rendered = await ctx.renderAsync();
        const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: CHAT_IMAGE_QUALITY, base64: true });
        if (saved.base64) {
          imageBase64 = saved.base64;
          const up = await uploadPhoto(saved.uri, 'chatbot', user.id);
          if (up.success) imageUrl = up.url;
        }
      } catch {
        // compression/upload failed — fall through and send just the text, if any
      }
      setUploadingImage(false);
    }
    if (!body && !imageBase64) return; // image failed and there's no text either — nothing to send

    const userMsg: Bubble = { id: `local-${seq.current++}`, role: 'user', text: body, imageUrl: imageUrl ?? image?.uri };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setWaitingFirstToken(true);

    // First message of a brand-new chat — create its conversation row now.
    let convId = conversationId;
    if (!convId) {
      const res = await createConversation(user.id, body || 'Photo');
      if (res.ok) { convId = res.data; setConversationId(res.data); }
    }
    if (convId) saveChatMessage(user.id, convId, 'user', body, imageUrl); // fire-and-forget — a failed save just means this turn won't persist, not worth blocking chat over

    // Exclude past error bubbles — they're a client-side artifact, not something
    // the model actually said, and would confuse it if replayed as history.
    // Past images aren't replayed to Gemini (see edge function) — only text.
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
    }, imageBase64 ? { base64: imageBase64, mimeType: 'image/jpeg' } : undefined);
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
        <View style={[styles.bubble, bubbleStyle, m.imageUrl ? styles.bubbleWithImage : null]}>
          {m.imageUrl && <Image source={{ uri: m.imageUrl }} style={styles.bubbleImage} resizeMode="cover" />}
          {!!m.text && (
            <Text style={[styles.body, { color: mine ? C.white : m.isError ? C.danger : C.text, fontFamily: FontFamily.jakartaMedium }]}>
              {m.text}
            </Text>
          )}
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

        {pendingImage && (
          <View style={[styles.previewRow, { backgroundColor: C.surface, borderTopColor: C.border }]}>
            <View style={styles.previewThumbWrap}>
              <Image source={{ uri: pendingImage.uri }} style={styles.previewThumb} resizeMode="cover" />
              {uploadingImage && (
                <View style={styles.previewSpinner}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              <TouchableOpacity
                style={[styles.previewRemove, { backgroundColor: C.surface }]}
                onPress={() => setPendingImage(null)}
                disabled={uploadingImage}
              >
                <Feather name="x" size={12} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.composer, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          <TouchableOpacity
            style={[styles.attachBtn, { backgroundColor: C.surface2 }]}
            onPress={pickImage}
            disabled={sending || !!pendingImage}
            activeOpacity={0.8}
          >
            <Feather name="image" size={19} color={C.text2} />
          </TouchableOpacity>
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
            style={[styles.sendBtn, { backgroundColor: (text.trim() || pendingImage) ? C.brand : C.surface2 }]}
            onPress={send}
            disabled={(!text.trim() && !pendingImage) || sending}
            activeOpacity={0.8}
          >
            <Feather name="send" size={18} color={(text.trim() || pendingImage) ? C.white : C.textMuted} />
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
  bubbleWithImage: { padding: 5, gap: 7 } as ViewStyle,
  bubbleImage: { width: 220, height: 220, borderRadius: 12 } as ImageStyle,
  body: { fontSize: 14.5, lineHeight: 20 } as TextStyle,

  typingRow: { paddingHorizontal: Layout.screenPadding, paddingBottom: 6 } as ViewStyle,

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: Layout.screenPadding, paddingTop: 9, paddingBottom: 9, borderTopWidth: StyleSheet.hairlineWidth } as ViewStyle,
  composerInput: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 14.5 } as TextStyle,
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  attachBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  previewRow: { paddingHorizontal: Layout.screenPadding, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth } as ViewStyle,
  previewThumbWrap: { width: 64, height: 64 } as ViewStyle,
  previewThumb: { width: 64, height: 64, borderRadius: 12 } as ImageStyle,
  previewSpinner: { ...StyleSheet.absoluteFill, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  previewRemove: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
});
