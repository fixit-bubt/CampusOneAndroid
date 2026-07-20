import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, Image, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/storage';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

export function ClubPostScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();

  // Hooks must be declared before any early return
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const { clubId, clubName } = (route.params ?? {}) as { clubId: string; clubName: string };
  if (!clubId) return null;

  const canSubmit = content.trim().length > 0;

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast({ type: 'info', title: t.clubs2.permissionRequired, message: t.clubs2.photoPermissionBody });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const up = await uploadFile('photos', asset.uri, `clubs/${user!.id}/${Date.now()}.${ext}`, contentType);
      if (!up.success) throw new Error(up.error);
      setPhotoUri(up.url);
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.clubs2.uploadFailed });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !user || loading || uploading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('club_posts').insert({
        club_id:   clubId,
        author_id: user.id,
        title:     title.trim() || null,
        body:      content.trim(),
        image_url: photoUri,
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error });
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
          placeholder={t.clubs2.titlePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={content}
          onChangeText={setContent}
          placeholder={t.clubs2.shareUpdatePlaceholder}
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.clubs2.photoOptional}</Text>
        <TouchableOpacity
          style={[styles.photoBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={pickImage}
          disabled={uploading}
          activeOpacity={0.75}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Feather name="camera" size={22} color={C.textMuted} />
              <Text style={[styles.photoPlaceholderTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {uploading ? t.clubs2.uploading : t.clubs2.tapToAddPhoto}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: (loading || uploading) ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading || uploading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? C.white : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.clubs2.postBtn}
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

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 2,
  } as any,

  photoBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 120,
  } as ViewStyle,

  photoPreview: { width: '100%', height: '100%' } as any,

  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,

  photoPlaceholderTxt: { fontSize: 13 } as any,

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
