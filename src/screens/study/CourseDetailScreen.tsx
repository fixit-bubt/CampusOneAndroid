// Matches design screens-d.jsx — CourseDetail (Materials / Questions / Books tabs)
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Linking, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';

const STUDY_COLOR = '#2ba0c9';
const STUDY_BG    = '#2ba0c91e';

type Tab = 'materials' | 'questions' | 'books';

const TAB_LABELS: Record<Tab, string> = {
  materials: 'Materials',
  questions: 'Questions',
  books:     'Books',
};

interface CourseFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: Tab;
}

export function CourseDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { id } = route.params;
  const [course, setCourse] = useState<any>(null);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [tab, setTab] = useState<Tab>('materials');

  useEffect(() => {
    (async () => {
      const [courseRes, filesRes] = await Promise.all([
        supabase.from('study_courses').select('*').eq('id', id).single(),
        supabase.from('study_files').select('*').eq('course_id', id),
      ]);
      if (courseRes.data) setCourse(courseRes.data);
      if (filesRes.data) setFiles(filesRes.data as CourseFile[]);
    })();
  }, [id]);

  if (!course) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Course" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  const tabFiles = files.filter(f => f.file_type === tab);
  const counts: Record<Tab, number> = {
    materials: files.filter(f => f.file_type === 'materials').length,
    questions: files.filter(f => f.file_type === 'questions').length,
    books:     files.filter(f => f.file_type === 'books').length,
  };
  const tintBg = isDark ? `${STUDY_COLOR}2e` : STUDY_BG;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={course.code}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('StudyUpload', { courseId: id, courseCode: course.code, courseTitle: course.title })} activeOpacity={0.75}>
            <Feather name="plus" size={22} color={C.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{course.title}</Text>

        {/* Tabs */}
        <View style={styles.chips}>
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, tab === t
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setTab(t)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipTxt, { color: tab === t ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {TAB_LABELS[t]}
              </Text>
              <Text style={[styles.chipCount, { color: tab === t ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {counts[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Files list */}
        <View style={[styles.filesList, { backgroundColor: C.surface, borderColor: C.border }]}>
          {tabFiles.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>—</Text>
            </View>
          ) : tabFiles.map((f, i) => (
            <View key={f.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
              <View style={styles.fileRow}>
                <View style={[styles.fileIcon, { backgroundColor: tintBg }]}>
                  <Icon name={tab === 'books' ? 'study' : 'mail'} size={16} color={STUDY_COLOR} />
                </View>
                <View style={styles.fileBody}>
                  <Text style={[styles.fileName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {f.file_name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => f.file_url && Linking.openURL(f.file_url)}
                  activeOpacity={0.75}
                >
                  <Feather name="download" size={19} color={C.text2} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,
  title: { fontSize: 19, letterSpacing: -0.4, marginBottom: 2 } as any,
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
  filesList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginTop: 12 } as ViewStyle,
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15 } as ViewStyle,
  fileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  fileBody: { flex: 1, minWidth: 0 } as ViewStyle,
  fileName: { fontSize: 14 } as any,
  fileSize: { fontSize: 11.5, marginTop: 1 } as any,
  downloadBtn: { padding: 8 } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  empty: { padding: 24, alignItems: 'center' } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as any,
  iconBtn: { padding: 8 } as ViewStyle,
});
