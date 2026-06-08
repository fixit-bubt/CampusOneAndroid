// Matches design screens-g.jsx — StudyUpload
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';

const FILE_TYPES = [
  { id: 'materials', label: 'Materials' },
  { id: 'questions', label: 'Questions' },
  { id: 'books',     label: 'Books' },
];

export function StudyUploadScreen({ route, navigation }: any) {
  const { courseId, courseCode, courseTitle } = (route.params ?? {}) as {
    courseId?: string;
    courseCode?: string;
    courseTitle?: string;
  };
  const { C } = useTheme();
  const { user } = useAuth();

  const [fileType, setFileType] = useState('materials');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || !user || !courseId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('study_files').insert({
        course_id:  courseId,
        file_type:  fileType,
        file_name:  name.trim(),
        uploaded_by: user.id,
        file_url:   '',
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not upload. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Upload" onBack={() => navigation.goBack()} />

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
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>SECTION</Text>
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

        {/* File name */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>FILE NAME</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Lecture 6 notes"
          placeholderTextColor={C.textMuted}
        />

        {/* File picker (mock) */}
        <TouchableOpacity
          style={[styles.filePicker, { backgroundColor: C.surface, borderColor: C.brand }]}
          activeOpacity={0.75}
        >
          <Icon name="layers" size={18} color={C.brand} />
          <Text style={[styles.filePickerTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
            Choose a file (PDF, DOC…)
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? '#fff' : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Upload
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
