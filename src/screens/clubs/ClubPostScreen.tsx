// Matches design screens-g.jsx — ClubPost
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';

export function ClubPostScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();

  // Hooks must be declared before any early return
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const { clubId, clubName } = (route.params ?? {}) as { clubId: string; clubName: string };
  if (!clubId) return null;

  const canSubmit = content.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('club_posts').insert({
        club_id:   clubId,
        author_id: user.id,
        title:     title.trim() || null,
        body:      content.trim(),
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not post. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.clubs2.newPost} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.clubName, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
          {clubName}
        </Text>

        <TextInput
          style={[styles.titleInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaBold }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Title (optional)"
          placeholderTextColor={C.textMuted}
        />

        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={content}
          onChangeText={setContent}
          placeholder="Share an update with members…"
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? C.white : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Post
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  clubName: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 2,
  } as any,

  titleInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  } as any,

  textarea: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    lineHeight: 23,
  } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 16,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,
});
