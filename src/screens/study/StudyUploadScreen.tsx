// Uploads route to a table per section:
// Materials -> study_materials, Questions -> study_question_bank (exam tag),
// Books -> study_books (author, optional external URL instead of a file).
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { uploadFile } from '../../utils/storage';

const FILE_TYPES = [
  { id: 'materials', label: 'Materials' },
  { id: 'questions', label: 'Questions' },
  { id: 'books',     label: 'Books' },
];

// Must match the DB CHECK constraints exactly.
const MATERIAL_TYPES = ['Class Note', 'Lecture Slide', 'Assignment', 'Reference', 'Lab Manual'];
const BOOK_KINDS = ['Textbook', 'Reference', 'Syllabus'];

interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export function StudyUploadScreen({ route, navigation }: any) {
  const { courseId, courseCode, courseTitle } = (route.params ?? {}) as {
    courseId?: string;
    courseCode?: string;
    courseTitle?: string;
  };
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();

  const toast = useToast();
  const [fileType, setFileType] = useState('materials');
  const [name, setName] = useState('');
  const [materialType, setMaterialType] = useState('Class Note');
  const [bookKind, setBookKind] = useState('Textbook');
  const [exam, setExam] = useState('Midterm');
  const [author, setAuthor] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Questions need the course's section; books are intake-scoped too.
  useEffect(() => {
    (async () => {
      if (!courseId) return;
      const { data: c } = await supabase.from('study_courses').select('section_id').eq('id', courseId).single();
      if (c?.section_id) {
        setSectionId(c.section_id);
        const { data: s } = await supabase.from('study_sections').select('intake_id').eq('id', c.section_id).single();
        if (s?.intake_id) setIntakeId(s.intake_id);
      }
    })();
  }, [courseId]);

  // Questions need the resolved section_id, books need the resolved intake_id
  // (both NOT NULL in the DB) — block submit until the async lookup finishes.
  const canSubmit = name.trim().length > 0 &&
    (fileType === 'books'
      ? ((pickedFile !== null || bookUrl.trim().length > 0) && !!intakeId)
      : fileType === 'questions'
        ? (pickedFile !== null && !!sectionId)
        : pickedFile !== null);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
    if (!name.trim()) {
      // Pre-fill name from filename (strip extension)
      setName(asset.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !user || !courseId || loading) return;
    setLoading(true);
    try {
      let storagePath: string | null = null;
      if (pickedFile) {
        const ext = pickedFile.name.split('.').pop() ?? 'bin';
        storagePath = `${courseId}/${Date.now()}_${name.trim().replace(/\s+/g, '_')}.${ext}`;
        // uploadFile reads real bytes via the SDK 56 File API; fetch().blob() on
        // a content:// URI can silently upload 0 bytes in RN.
        // study-materials is a private bucket → bucketIsPublic=false, store the path.
        const up = await uploadFile(
          'study-materials', pickedFile.uri, storagePath,
          pickedFile.mimeType ?? 'application/octet-stream', false,
        );
        if (!up.success) throw new Error(up.error);
      }

      let insertError = null as any;
      if (fileType === 'questions') {
        ({ error: insertError } = await supabase.from('study_question_bank').insert({
          course_id:    courseId,
          section_id:   sectionId,
          exam,
          title:        name.trim(),
          storage_path: storagePath,
          uploaded_by:  user.id,
        }));
      } else if (fileType === 'books') {
        ({ error: insertError } = await supabase.from('study_books').insert({
          course_id:    courseId,
          intake_id:    intakeId,
          title:        name.trim(),
          author:       author.trim() || null,
          kind:         bookKind,
          storage_path: storagePath,
          url:          bookUrl.trim() || null,
          added_by:     user.id,
        }));
      } else {
        ({ error: insertError } = await supabase.from('study_materials').insert({
          course_id:    courseId,
          type:         materialType,
          title:        name.trim(),
          storage_path: storagePath,
          uploaded_by:  user.id,
        }));
      }
      if (insertError) throw insertError;

      navigation.goBack();
    } catch (err: any) {
      toast({ type: 'error', title: t.common.error, message: err?.message ?? t.study2.couldNotUpload });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.study2.upload} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Course hint */}
        {(courseCode || courseTitle) && (
          <Text style={[styles.courseHint, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
            {courseCode ? `${courseCode} · ` : ''}{courseTitle ?? ''}
          </Text>
        )}

        {/* Section / File type */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.section}</Text>
        <View style={[styles.segRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
          {FILE_TYPES.map(ft => {
            const on = fileType === ft.id;
            return (
              <TouchableOpacity
                key={ft.id}
                style={[styles.segBtn, on && { backgroundColor: C.brand }]}
                onPress={() => setFileType(ft.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.segTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {ft.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Material type (materials only) — must match DB CHECK */}
        {fileType === 'materials' && (
          <>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>TYPE</Text>
            <View style={styles.examRow}>
              {MATERIAL_TYPES.map(mt => {
                const on = materialType === mt;
                return (
                  <TouchableOpacity
                    key={mt}
                    style={[styles.examChip, on
                      ? { backgroundColor: C.brand, borderColor: C.brand }
                      : { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setMaterialType(mt)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.examTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>{mt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Exam tag (questions only) */}
        {fileType === 'questions' && (
          <>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.exam}</Text>
            <View style={styles.examRow}>
              {['CT 1', 'CT 2', 'Midterm', 'Final'].map(e => {
                const on = exam === e;
                return (
                  <TouchableOpacity
                    key={e}
                    style={[styles.examChip, on
                      ? { backgroundColor: C.brand, borderColor: C.brand }
                      : { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setExam(e)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.examTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>{e === 'Midterm' ? t.study2.midterm : e === 'Final' ? t.study2.final : e}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Book extras */}
        {fileType === 'books' && (
          <>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>KIND</Text>
            <View style={styles.examRow}>
              {BOOK_KINDS.map(bk => {
                const on = bookKind === bk;
                return (
                  <TouchableOpacity
                    key={bk}
                    style={[styles.examChip, on
                      ? { backgroundColor: C.brand, borderColor: C.brand }
                      : { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setBookKind(bk)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.examTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>{bk}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.authorOptional}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={author}
              onChangeText={setAuthor}
              placeholder="e.g. Thomas H. Cormen"
              placeholderTextColor={C.textMuted}
            />
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.linkInsteadOfFile}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={bookUrl}
              onChangeText={setBookUrl}
              placeholder="https://..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        )}

        {/* File picker */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
          {fileType === 'books' ? t.study2.fileOptionalIfLink : t.study2.file}
        </Text>
        <TouchableOpacity
          style={[styles.filePicker, { backgroundColor: C.surface, borderColor: pickedFile ? C.brand : C.border }]}
          onPress={pickFile}
          activeOpacity={0.75}
        >
          <Icon name="layers" size={18} color={pickedFile ? C.brand : C.textMuted} />
          <Text style={[styles.filePickerTxt, { color: pickedFile ? C.brand : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {pickedFile ? pickedFile.name : t.study2.chooseAFile}
          </Text>
        </TouchableOpacity>

        {/* File name / title */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.title}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={name}
          onChangeText={setName}
          placeholder={t.study2.titlePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? C.white : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {loading ? t.study2.uploading : t.study2.upload}
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

  courseHint: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 2,
  } as any,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
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
  examRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 } as ViewStyle,
  examChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  examTxt: { fontSize: 12 } as any,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
  } as any,

  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 14,
  } as ViewStyle,

  filePickerTxt: { fontSize: 14 } as any,

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
