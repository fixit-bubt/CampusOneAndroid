// Chatbot conversation list — the "sidebar" equivalent for mobile. Tap a row
// to resume that chat, tap the header's plus to start a new one, swipe/tap
// trash to delete a chat outright (cascades its messages via FK).
import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import { listConversations, deleteConversation, type Conversation } from '../../services/chatbotService';

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export function ChatbotHistoryScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await listConversations(user.id);
    if (res.ok) setConversations(res.data);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(c: Conversation) {
    Alert.alert(t.chatbot.deleteTitle, t.chatbot.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.chatbot.deleteConfirm, style: 'destructive',
        onPress: async () => {
          const prev = conversations;
          setConversations((cs) => cs.filter((x) => x.id !== c.id));
          const res = await deleteConversation(c.id);
          if (!res.ok) setConversations(prev);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.chatbot.historyTitle}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={() => navigation.replace('Chatbot')}
          >
            <Feather name="edit" size={16} color={C.text2} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: C.border }]} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Feather name="message-circle" size={30} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.chatbot.historyEmptyTitle}
              </Text>
              <Text style={[styles.emptyBody, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.chatbot.historyEmptyBody}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: c }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.replace('Chatbot', { conversationId: c.id })}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, { backgroundColor: C.surface2 }]}>
              <Feather name="message-circle" size={18} color={C.brand} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {c.title}
              </Text>
              <Text style={[styles.rowTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {timeAgo(c.updatedAt)}
              </Text>
            </View>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => confirmDelete(c)}
            >
              <Feather name="trash-2" size={17} color={C.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  newBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  divider: { height: StyleSheet.hairlineWidth, marginLeft: 58 } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 } as ViewStyle,
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  rowBody: { flex: 1, minWidth: 0 } as ViewStyle,
  rowTitle: { fontSize: 14.5 } as TextStyle,
  rowTime: { fontSize: 11.5, marginTop: 2 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 80, gap: 9, paddingHorizontal: 32 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as TextStyle,
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 } as TextStyle,
});
