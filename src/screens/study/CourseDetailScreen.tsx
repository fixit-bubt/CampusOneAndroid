// Materials / Questions / Books tabs read study_materials, study_question_bank,
// study_books. Questions carry an exam tag and a CR-verifiable badge; books can
// be external links or files. CRs can delete entries.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { openUrl } from '../../utils/link';

const STUDY_COLOR = SectorColors.study;
const STUDY_BG    = `${SectorColors.study}1e`;

type Tab = 'materials' | 'questions' | 'books';

const TAB_LABELS: Record<Tab, string> = {
  materials: 'Materials',
  questions: 'Questions',
  books:     'Books',
};

interface Entry {
  id: string;
  title: string;
  storage_path: string | null;
  url?: string | null;
  exam?: string | null;
  verified?: boolean;
  author?: string | null;
  table: 'study_materials' | 'study_question_bank' | 'study_books';
}

export function CourseDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { courseId } = route.params ?? {};
  const [course, setCourse] = useState<any>(null);
  const [materials, setMaterials] = useState<Entry[]>([]);
  const [questions, setQuestions] = useState<Entry[]>([]);
  const [books, setBooks] = useState<Entry[]>([]);
  const [isCR, setIsCR] = useState(false);
  const [tab, setTab] = useState<Tab>('materials');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!courseId) { setLoading(false); return; }
    setLoading(true);
    const [courseRes, matRes, qbRes, bookRes] = await Promise.all([
      supabase.from('study_courses').select('*').eq('id', courseId).maybeSingle(),
      supabase.from('study_materials').select('*').eq('course_id', courseId).order('created_at', { ascending: false }),
      supabase.from('study_question_bank').select('*').eq('course_id', courseId).order('created_at', { ascending: false }),
      supabase.from('study_books').select('*').eq('course_id', courseId).order('created_at', { ascending: false }),
    ]);
    if (courseRes.data) {
      setCourse(courseRes.data);
      // CR check on the course's section (admins moderate too).
      if (user) {
        const { data: me } = await supabase
          .from('study_section_members')
          .select('role')
          .eq('section_id', courseRes.data.section_id)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();
        setIsCR(me?.role === 'cr' || profile?.role === 'admin');
      }
    }
    if (matRes.data) setMaterials((matRes.data as any[]).map(r => ({ ...r, table: 'study_materials' as const })));
    if (qbRes.data) setQuestions((qbRes.data as any[]).map(r => ({ ...r, table: 'study_question_bank' as const })));
    if (bookRes.data) setBooks((bookRes.data as any[]).map(r => ({ ...r, table: 'study_books' as const })));
    setLoading(false);
  }, [courseId, user, profile?.role]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [load, navigation]);

  async function openEntry(f: Entry) {
    if (f.url) { openUrl(f.url); return; }
    if (!f.storage_path) return;
    const { data, error } = await supabase.storage
      .from('study-materials')
      .createSignedUrl(f.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast({ type: 'error', title: t.common.error, message: error?.message ?? t.study2.couldNotOpenFile });
      return;
    }
    openUrl(data.signedUrl);
  }

  async function toggleVerified(f: Entry) {
    const { error } = await supabase
      .from('study_question_bank')
      .update({ verified: !f.verified })
      .eq('id', f.id);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setQuestions(prev => prev.map(x => (x.id === f.id ? { ...x, verified: !f.verified } : x)));
  }

  function deleteEntry(f: Entry) {
    Alert.alert('Delete?', f.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from(f.table).delete().eq('id', f.id);
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
          load();
        },
      },
    ]);
  }

  if (!course) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.study2.course} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={C.brand} />
          ) : (
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>{t.common.notFound}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const lists: Record<Tab, Entry[]> = { materials, questions, books };
  const tabFiles = lists[tab];
  const counts: Record<Tab, number> = {
    materials: materials.length, questions: questions.length, books: books.length,
  };
  const tintBg = isDark ? `${STUDY_COLOR}2e` : STUDY_BG;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={course.code}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('StudyUpload', { courseId, courseCode: course.code, courseTitle: course.name })} activeOpacity={0.75}>
            <Feather name="plus" size={22} color={C.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{course.name}</Text>

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
              <Text style={[styles.chipTxt, { color: tab === t ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
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
                    {f.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {tab === 'questions' && f.exam ? (
                      <View style={[styles.tagPill, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.tagTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{f.exam}</Text>
                      </View>
                    ) : null}
                    {tab === 'questions' && f.verified ? (
                      <View style={[styles.tagPill, { backgroundColor: C.successBg }]}>
                        <Feather name="check" size={9} color={C.success} />
                        <Text style={[styles.tagTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>{t.study2.verified}</Text>
                      </View>
                    ) : null}
                    {tab === 'books' && f.author ? (
                      <Text style={[styles.fileSize, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {f.author}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {tab === 'questions' && isCR && (
                  <TouchableOpacity onPress={() => toggleVerified(f)} hitSlop={6} activeOpacity={0.7} style={{ padding: 4 }}>
                    <Feather name="check-circle" size={17} color={f.verified ? C.success : C.textMuted} />
                  </TouchableOpacity>
                )}
                {isCR && (
                  <TouchableOpacity onPress={() => deleteEntry(f)} hitSlop={6} activeOpacity={0.7} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={15} color={C.danger} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => openEntry(f)}
                  activeOpacity={0.75}
                >
                  <Feather name={f.url ? 'external-link' : 'download'} size={18} color={C.text2} />
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
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, paddingHorizontal: 15 } as ViewStyle,
  fileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  fileBody: { flex: 1, minWidth: 0 } as ViewStyle,
  fileName: { fontSize: 14 } as any,
  fileSize: { fontSize: 11.5 } as any,
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 } as ViewStyle,
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 } as ViewStyle,
  tagTxt: { fontSize: 10 } as any,
  downloadBtn: { padding: 6 } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  empty: { padding: 24, alignItems: 'center' } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as any,
  iconBtn: { padding: 8 } as ViewStyle,
});
