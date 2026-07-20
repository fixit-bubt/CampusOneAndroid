import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, Switch, Image, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import type { Announcement } from '../../types/database';

const PRIORITIES: { id: Announcement['priority']; label: string }[] = [
  { id: 'Urgent',    label: 'Urgent'    },
  { id: 'Important', label: 'Important' },
  { id: 'General',   label: 'General'   },
];

// Priority accent from theme tokens (dark-mode aware via C)
function priColor(C: any, id: Announcement['priority']): string {
  return id === 'Urgent' ? C.danger : id === 'Important' ? C.warn : C.brand;
}

export function AnnouncePostScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();

  // All hooks must be declared before any early return
  const [title, setTitle] = useState('');
  const [dept, setDept] = useState('');
  const [priority, setPriority] = useState<Announcement['priority']>('General');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Announcements are admin-only.
  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="New Announcement" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Icon name="announce" size={36} color={C.textMuted} />
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaBold, fontSize: 16, marginTop: 14 }}>
            Admin Only
          </Text>
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 13.5, marginTop: 8, textAlign: 'center' }}>
            Only admins can post announcements.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = title.trim() && body.trim();
  const busy = uploadingImg || uploadingPdf;

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast({ type: 'info', title: t.announce2.permissionRequired, message: t.announce2.photoPermissionBody });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingImg(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const up = await uploadFile(BUCKETS.attachments, asset.uri, `announcements/${user!.id}/${Date.now()}.${ext}`, contentType);
      if (!up.success) throw new Error(up.error);
      setImageUri(up.url);
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.announce2.uploadFailed });
    } finally {
      setUploadingImg(false);
    }
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingPdf(true);
    try {
      const safeName = asset.name.replace(/\s+/g, '_');
      const up = await uploadFile(BUCKETS.attachments, asset.uri, `announcements/${user!.id}/${Date.now()}_${safeName}`, asset.mimeType ?? 'application/pdf');
      if (!up.success) throw new Error(up.error);
      setAttachmentUrl(up.url);
      setAttachmentName(asset.name);
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.announce2.uploadFailed });
    } finally {
      setUploadingPdf(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !user || loading || busy) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        code:       'ANN-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title:      title.trim(),
        department: dept.trim() || 'Administration',
        priority,
        body:       body.trim(),
        created_by: user.id,
        pinned:     pinned || priority === 'Urgent',
        image_url:       imageUri,
        attachment_url:  attachmentUrl,
        attachment_name: attachmentName,
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.announce2.postFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="New Announcement" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelTitle}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={title}
          onChangeText={setTitle}
          placeholder={t.announce2.titlePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelDepartment}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={dept}
          onChangeText={setDept}
          placeholder={t.announce2.deptPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelPriority}</Text>
        <View style={[styles.segRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
          {PRIORITIES.map(p => {
            const on = priority === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.segBtn, on && { backgroundColor: priColor(C, p.id) }]}
                onPress={() => setPriority(p.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.segTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelBody}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={body}
          onChangeText={setBody}
          placeholder={t.announce2.bodyPlaceholder}
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelImage}</Text>
        <TouchableOpacity
          style={[styles.photoBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={pickImage}
          disabled={uploadingImg}
          activeOpacity={0.75}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Feather name="image" size={22} color={C.textMuted} />
              <Text style={[styles.photoPlaceholderTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {uploadingImg ? t.announce2.uploading : t.announce2.tapToAddImage}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelAttachment}</Text>
        <TouchableOpacity
          style={[styles.fileBtn, { backgroundColor: C.surface, borderColor: attachmentUrl ? C.brand : C.border }]}
          onPress={pickPdf}
          disabled={uploadingPdf}
          activeOpacity={0.75}
        >
          <Feather name="file-text" size={18} color={attachmentUrl ? C.brand : C.textMuted} />
          <Text style={[styles.fileBtnTxt, { color: attachmentUrl ? C.brand : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {uploadingPdf ? t.announce2.uploading : (attachmentName ?? t.announce2.tapToAttachPdf)}
          </Text>
        </TouchableOpacity>

        <View style={styles.pinRow}>
          <Text style={[styles.pinLbl, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Pin to top
          </Text>
          <Switch value={pinned} onValueChange={setPinned} trackColor={{ true: C.brand }} />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: (loading || busy) ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading || busy}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? C.white : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.announce2.publish}
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
  pinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 } as ViewStyle,
  pinLbl: { fontSize: 14 } as any,

  photoBtn: { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden', height: 120 } as ViewStyle,
  photoPreview: { width: '100%', height: '100%' } as any,
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 } as ViewStyle,
  photoPlaceholderTxt: { fontSize: 13 } as any,
  fileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4, paddingHorizontal: 12 } as ViewStyle,
  fileBtnTxt: { fontSize: 14, flexShrink: 1 } as any,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
  } as any,

  segRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  } as ViewStyle,

  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  } as ViewStyle,

  segTxt: { fontSize: 13.5 } as any,

  textarea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    fontSize: 14.5,
    lineHeight: 22,
  } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,
});
