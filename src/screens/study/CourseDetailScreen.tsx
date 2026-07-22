// Materials / Questions / Books tabs read study_materials, study_question_bank,
// study_books. Questions carry an exam tag and a CR-verifiable badge; books can
// be external links or files. Files open in an in-app browser tab; members can
// bookmark, search, filter by exam, and sort. CRs verify/delete entries.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { openInApp } from '../../utils/link';
import { formatFileSize, formatRelativeTime } from '../../utils/format';

const STUDY_COLOR = SectorColors.study;
const STUDY_BG    = `${SectorColors.study}1e`;

type Tab = 'materials' | 'questions' | 'books';
type Sort = 'new' | 'name';

const TAB_LABELS: Record<Tab, string> = {
  materials: 'Materials',
  questions: 'Questions',
  books:     'Books',
};

const ITEM_TYPE: Record<Tab, 'material' | 'question' | 'book'> = {
  materials: 'material', questions: 'question', books: 'book',
};

interface Entry {
  id: string;
  title: string;
  storage_path: string | null;
  url?: string | null;
  exam?: string | null;
  type?: string | null;      // material type (Class Note, ...)
  kind?: string | null;      // book kind (Textbook, ...)
  author?: string | null;
  verified?: boolean;
  file_kind?: string | null;
  size_bytes?: number | null;
  created_at: string;
  table: 'study_materials' | 'study_question_bank' | 'study_books';
}

// Feather icon for a file, keyed off its extension (file_kind).
function fileIcon(kind: string | null | undefined, isLink: boolean): keyof typeof Feather.glyphMap {
  if (isLink) return 'link';
  switch ((kind ?? '').toLowerCase()) {
    case 'pdf': return 'file-text';
    case 'doc': case 'docx': return 'file-text';
    case 'ppt': case 'pptx': return 'monitor';
    case 'xls': case 'xlsx': case 'csv': return 'grid';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return 'image';
    case 'zip': case 'rar': case '7z': return 'archive';
    default: return 'file';
  }
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
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [isCR, setIsCR] = useState(false);
  const [tab, setTab] = useState<Tab>('materials');
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [forSale, setForSale] = useState<any[]>([]);

  // Controls
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const [examFilter, setExamFilter] = useState<string>('All');

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
    const mats = ((matRes.data ?? []) as any[]).map(r => ({ ...r, table: 'study_materials' as const }));
    const qs   = ((qbRes.data ?? []) as any[]).map(r => ({ ...r, table: 'study_question_bank' as const }));
    const bks  = ((bookRes.data ?? []) as any[]).map(r => ({ ...r, table: 'study_books' as const }));
    setMaterials(mats);
    setQuestions(qs);
    setBooks(bks);

    // My bookmarks for these items (RLS already scopes to me).
    const ids = [...mats, ...qs, ...bks].map(e => e.id);
    if (user && ids.length) {
      const { data: bm } = await supabase.from('study_bookmarks').select('item_id').in('item_id', ids);
      setSaved(new Set((bm ?? []).map((b: any) => b.item_id)));
    } else {
      setSaved(new Set());
    }

    // Marketplace listings tagged with this course code (case/space-insensitive).
    const code: string | undefined = courseRes.data?.code;
    if (code) {
      const norm = (s: string) => (s ?? '').toLowerCase().replace(/\s+/g, '');
      const raw = code.trim();
      const nospace = raw.replace(/\s+/g, '');
      // Match server-side (case-insensitive, spaced + unspaced) and order newest
      // first — a client-side cap would silently blank the strip once the
      // marketplace grows past it.
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, price, course_code, status')
        .eq('status', 'Available')
        .or(`course_code.ilike.${raw},course_code.ilike.${nospace}`)
        .order('created_at', { ascending: false })
        .limit(20);
      const n = norm(code);
      setForSale(((listings ?? []) as any[]).filter(l => norm(l.course_code) === n));
    } else {
      setForSale([]);
    }
    setLoading(false);
  }, [courseId, user, profile?.role]);

  // 'focus' also fires on first mount, so this covers the initial load too.
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [load, navigation]);

  async function openEntry(f: Entry) {
    if (openingId) return;
    if (f.url) { openInApp(f.url); return; }
    if (!f.storage_path) return;
    setOpeningId(f.id);
    const { data, error } = await supabase.storage
      .from('study-materials')
      .createSignedUrl(f.storage_path, 60);
    setOpeningId(null);
    if (error || !data?.signedUrl) {
      toast({ type: 'error', title: t.common.error, message: error?.message ?? t.study2.couldNotOpenFile });
      return;
    }
    openInApp(data.signedUrl);
  }

  async function toggleSaved(f: Entry) {
    const isSaved = saved.has(f.id);
    // Optimistic
    setSaved(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(f.id); else next.add(f.id);
      return next;
    });
    if (!user) return;
    if (isSaved) {
      await supabase.from('study_bookmarks').delete()
        .eq('user_id', user.id).eq('item_id', f.id);
    } else {
      await supabase.from('study_bookmarks').insert({
        user_id: user.id, item_type: ITEM_TYPE[tab], item_id: f.id,
      });
    }
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
    Alert.alert(t.study2.deleteQ, f.title, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
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
  const counts: Record<Tab, number> = {
    materials: materials.length, questions: questions.length, books: books.length,
  };
  const tintBg = isDark ? `${STUDY_COLOR}2e` : STUDY_BG;

  // Exam options for the questions filter
  const examOptions = ['All', ...Array.from(new Set(questions.map(q => q.exam).filter(Boolean) as string[]))];

  // Derived list: search + exam filter + sort
  let tabFiles = lists[tab];
  const q = query.trim().toLowerCase();
  if (q) tabFiles = tabFiles.filter(f => f.title.toLowerCase().includes(q));
  if (tab === 'questions' && examFilter !== 'All') tabFiles = tabFiles.filter(f => f.exam === examFilter);
  tabFiles = [...tabFiles].sort((a, b) =>
    sort === 'name'
      ? a.title.localeCompare(b.title)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const emptyMsg = q
    ? t.study2.noMatches
    : tab === 'materials' ? t.study2.noMaterials
    : tab === 'questions' ? t.study2.noQuestions
    : t.study2.noBooks;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={course.code}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setShowSearch(s => !s); setQuery(''); }} activeOpacity={0.75}>
              <Feather name={showSearch ? 'x' : 'search'} size={20} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('StudyUpload', { courseId, courseCode: course.code, courseTitle: course.name })} activeOpacity={0.75}>
              <Feather name="plus" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{course.name}</Text>

        {/* Marketplace cross-link — textbooks/notes on sale for this course */}
        {forSale.length > 0 && (
          <View style={styles.forSaleWrap}>
            <Text style={[styles.forSaleTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.study2.forSaleTitle}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
              {forSale.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.forSaleCard, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('MarketDetail', { listingId: l.id })}
                  activeOpacity={0.75}
                >
                  <Feather name="shopping-bag" size={14} color={SectorColors.market} />
                  <Text style={[styles.forSaleName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {l.title}
                  </Text>
                  {l.price != null && (
                    <Text style={[styles.forSalePrice, { color: SectorColors.market, fontFamily: FontFamily.jakartaExtraBold }]}>
                      ৳{l.price}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showSearch && (
          <TextInput
            style={[styles.search, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t.study2.searchFiles}
            placeholderTextColor={C.textMuted}
            autoFocus
          />
        )}

        {/* Tabs + sort */}
        <View style={styles.tabsRow}>
          <View style={styles.chips}>
            {(Object.keys(TAB_LABELS) as Tab[]).map(tb => (
              <TouchableOpacity
                key={tb}
                style={[styles.chip, tab === tb
                  ? { backgroundColor: C.brand, borderColor: C.brand }
                  : { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => { setTab(tb); setExamFilter('All'); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipTxt, { color: tab === tb ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {TAB_LABELS[tb]}
                </Text>
                <Text style={[styles.chipCount, { color: tab === tb ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {counts[tb]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.sortBtn, { borderColor: C.border, backgroundColor: C.surface }]}
            onPress={() => setSort(s => (s === 'new' ? 'name' : 'new'))}
            activeOpacity={0.75}
          >
            <Feather name={sort === 'new' ? 'clock' : 'type'} size={15} color={C.text2} />
          </TouchableOpacity>
        </View>

        {/* Exam filter (questions only) */}
        {tab === 'questions' && examOptions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 10 }} contentContainerStyle={{ gap: 7 }}>
            {examOptions.map(e => {
              const on = examFilter === e;
              return (
                <TouchableOpacity
                  key={e}
                  style={[styles.examChip, on ? { backgroundColor: C.surface2, borderColor: C.text2 } : { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => setExamFilter(e)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.examTxt, { color: on ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{e === 'All' ? t.study2.allExams : e}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Files list */}
        <View style={[styles.filesList, { backgroundColor: C.surface, borderColor: C.border }]}>
          {tabFiles.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="inbox" size={26} color={C.textMuted} />
              <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>{emptyMsg}</Text>
            </View>
          ) : tabFiles.map((f, i) => {
            const isLink = !!f.url && !f.storage_path;
            const sizeStr = f.size_bytes ? formatFileSize(f.size_bytes) : null;
            const tagText = tab === 'materials' ? f.type : tab === 'questions' ? f.exam : f.kind;
            return (
            <View key={f.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
              <View style={styles.fileRow}>
                <View style={[styles.fileIcon, { backgroundColor: tintBg }]}>
                  <Feather name={fileIcon(f.file_kind, isLink)} size={16} color={STUDY_COLOR} />
                </View>
                <View style={styles.fileBody}>
                  <Text style={[styles.fileName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {f.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {tagText ? (
                      <View style={[styles.tagPill, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.tagTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{tagText}</Text>
                      </View>
                    ) : null}
                    {tab === 'questions' && f.verified ? (
                      <View style={[styles.tagPill, { backgroundColor: C.successBg }]}>
                        <Feather name="check" size={9} color={C.success} />
                        <Text style={[styles.tagTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>{t.study2.verified}</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.fileSize, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {[tab === 'books' && f.author ? f.author : null, sizeStr, formatRelativeTime(f.created_at)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>

                {/* Bookmark */}
                <TouchableOpacity onPress={() => toggleSaved(f)} hitSlop={6} activeOpacity={0.7} style={{ padding: 4 }}>
                  <Feather name="bookmark" size={16} color={saved.has(f.id) ? STUDY_COLOR : C.textMuted} />
                </TouchableOpacity>

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
                <TouchableOpacity style={styles.downloadBtn} onPress={() => openEntry(f)} activeOpacity={0.75} disabled={openingId === f.id}>
                  {openingId === f.id
                    ? <ActivityIndicator size="small" color={C.text2} />
                    : <Feather name={isLink ? 'external-link' : 'download'} size={18} color={C.text2} />}
                </TouchableOpacity>
              </View>
            </View>
          );})}
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

  forSaleWrap: { marginTop: 12 } as ViewStyle,
  forSaleTitle: { fontSize: 11, letterSpacing: 0.6, marginBottom: 8 } as any,
  forSaleCard: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, maxWidth: 220 } as ViewStyle,
  forSaleName: { fontSize: 12.5, flexShrink: 1 } as any,
  forSalePrice: { fontSize: 12.5 } as any,
  search: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginTop: 12 } as any,
  tabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 } as ViewStyle,
  chips: { flexDirection: 'row', gap: 8, flexShrink: 1 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
  sortBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  examChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  examTxt: { fontSize: 12 } as any,
  filesList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginTop: 12 } as ViewStyle,
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, paddingHorizontal: 15 } as ViewStyle,
  fileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  fileBody: { flex: 1, minWidth: 0 } as ViewStyle,
  fileName: { fontSize: 14 } as any,
  fileSize: { fontSize: 11.5, flexShrink: 1 } as any,
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 } as ViewStyle,
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 } as ViewStyle,
  tagTxt: { fontSize: 10 } as any,
  downloadBtn: { padding: 6, minWidth: 30, alignItems: 'center' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  empty: { padding: 28, alignItems: 'center', gap: 10 } as ViewStyle,
  emptyTxt: { fontSize: 13, textAlign: 'center' } as any,
  iconBtn: { padding: 8 } as ViewStyle,
});
