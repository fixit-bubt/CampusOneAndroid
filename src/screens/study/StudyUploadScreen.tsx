// Matches design screens-g.jsx — StudyUpload
// Uploads route to the right table per section (web parity):
// Materials -> study_materials, Questions -> study_question_bank (exam tag),
// Books -> study_books (author, optional external URL instead of a file).
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, type ViewStyle,
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

const FILE_TYPES = [
  { id: 'materials', label: 'Materials' },
  { id: 'questions', label: 'Questions' },
  { id: 'books',     label: 'Books' },
];

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

  const [fileType, setFileType] = useState('materials');
  const [name, setName] = useState('');
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

  const canSubmit = name.trim().length > 0 &&
    (fileType === 'books' ? (pickedFile !== null || bookUrl.trim().length > 0) : pickedFile !== null);

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
    if (!canSubmit || !user || !courseId) return;
    setLoading(true);
    try {
      let storagePath: string | null = null;
      if (pickedFile) {
        const response = await fetch(pickedFile.uri);
        const blob = await response.blob();
        const ext = pickedFile.name.split('.').pop() ?? 'bin';
        storagePath = `${courseId}/${Date.now()}_${name.trim().replace(/\s+/g, '_')}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('study-materials')
          .upload(storagePath, blob, {
            contentType: pickedFile.mimeType ?? 'application/octet-stream',
            upsert: false,
          });
        if (uploadError) throw uploadError;
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
          kind:         storagePath ? 'file' : 'link',
          storage_path: storagePath,
          url:          bookUrl.trim() || null,
          added_by:     user.id,
        }));
      } else {
        ({ error: insertError } = await supabase.from('study_materials').insert({
          course_id:    courseId,
          type:         fileType,
          title:        name.trim(),
          storage_path: storagePath,
          uploaded_by:  user.id,
        }));
      }
      if (insertError) throw insertError;

      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t.common.error, err?.message ?? t.study2.couldNotUpload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.study2.upload} onBack={() => navigation.goBack()} />

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

        {/* Exam tag (questions only) */}
        {fileType === 'questions' && (
          <>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.exam}</Text>
            <View style={styles.examRow}>
              {['Midterm', 'Final', 'Quiz', 'Assignment'].map(e => {
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
                    <Text style={[styles.examTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>{e === 'Midterm' ? t.study2.midterm : e === 'Final' ? t.study2.final : e === 'Quiz' ? t.study2.quiz : t.study2.assignment}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Book extras */}
        {fileType === 'books' && (
          <>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>AUTHOR (OPTIONAL)</Text>
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
          {fileType === 'books' ? 'FILE (OPTIONAL IF LINK GIVEN)' : 'FILE'}
        </Text>
        <TouchableOpacity
          style={[styles.filePicker, { backgroundColor: C.surface, borderColor: pickedFile ? C.brand : C.border }]}
          onPress={pickFile}
          activeOpacity={0.75}
        >
          <Icon name="layers" size={18} color={pickedFile ? C.brand : C.textMuted} />
          <Text style={[styles.filePickerTxt, { color: pickedFile ? C.brand : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {pickedFile ? pickedFile.name : 'Choose a file (PDF, DOC…)'}
          </Text>
        </TouchableOpacity>

        {/* File name / title */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>TITLE</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Lecture 6 notes"
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
            {loading ? 'Uploading…' : 'Upload'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
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
