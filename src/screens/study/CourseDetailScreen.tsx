// Materials / Questions / Books tabs read study_materials, study_question_bank,
// study_books. Questions carry an exam tag and a CR-verifiable badge; books can
// be external links or files. Files open in an in-app browser tab; members can
// bookmark, search, filter by exam, and sort. CRs verify/delete entries.
import { useProgressiveCount } from '../../hooks/useProgressiveCount';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, BackHandler, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { getCache, setCache } from '../../services/cacheService';
import { openInApp } from '../../utils/link';
import { fetchPeople } from '../../services/peopleService';
import { formatFileSize, formatRelativeTime } from '../../utils/format';

const STUDY_COLOR = SectorColors.study;

type Tab = 'materials' | 'questions' | 'books' | 'slides';
type Sort = 'new' | 'name';

const TAB_LABELS: Record<Tab, string> = {
  materials: 'Notes',
  questions: 'Questions',
  books: 'Books',
  slides: 'Slides',
};

const CATEGORIES: { id: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'materials', label: 'Notes', icon: 'file-text' },
  { id: 'questions', label: 'Questions', icon: 'help-circle' },
  { id: 'books', label: 'Books', icon: 'book-open' },
  { id: 'slides', label: 'Slides', icon: 'monitor' },
];

const ITEM_TYPE: Record<Tab, 'material' | 'question' | 'book'> = {
  materials: 'material', questions: 'question', books: 'book', slides: 'material',
};

interface Entry {
  id: string;
  course_id?: string | null;
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
  uploaded_by?: string | null;
  added_by?: string | null;
  batch_label?: string | null;
  uploader_name?: string | null;
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
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { courseId } = route.params ?? {};
  const [course, setCourse] = useState<any>(null);
  const [materials, setMaterials] = useState<Entry[]>([]);
  const [slides, setSlides] = useState<Entry[]>([]);
  const [questions, setQuestions] = useState<Entry[]>([]);
  const [books, setBooks] = useState<Entry[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [isCR, setIsCR] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [tab, setTab] = useState<Tab>('materials');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [forSale, setForSale] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  // In-app PDF Viewer
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');
  const [activePdfSubtitle, setActivePdfSubtitle] = useState('');

  // Controls
  const scrollRef = useRef<ScrollView>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [sort] = useState<Sort>('new');
  const [examFilter, setExamFilter] = useState<string>('All');
  const [batchFilter, setBatchFilter] = useState<string>('All');
  const [batchOptions, setBatchOptions] = useState<string[]>([]);

  const toggleSearch = () => {
    if (dropdownOpen) setDropdownOpen(false);
    setShowSearch(s => {
      const next = !s;
      if (next) {
        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
      }
      return next;
    });
    setQuery('');
  };

  const load = useCallback(async () => {
    if (!courseId) { setLoading(false); return; }

    const cacheKey = `course_detail_${courseId}`;
    const cached = await getCache<{
      course: any;
      materials: Entry[];
      slides?: Entry[];
      questions: Entry[];
      books: Entry[];
      saved: string[];
    }>(cacheKey);

    if (cached) {
      setCourse(cached.course);
      setMaterials(cached.materials);
      setSlides(cached.slides ?? []);
      setQuestions(cached.questions);
      setBooks(cached.books);
      setSaved(new Set(cached.saved));
      setLoading(false);
    }

    try {
      const courseRes = await supabase.from('study_courses').select('*').eq('id', courseId).maybeSingle();

      if (!courseRes.data && !cached) {
        setLoading(false);
        return;
      }

      setIsOffline(false);
      let siblingCourseIds = [courseId];
      const batchLabels: Record<string, string> = {};

      if (courseRes.data) {
        const currentCourse = courseRes.data;
        setCourse(currentCourse);
        const code = currentCourse.code;

        // Query sibling courses across batches with the same code (e.g. CSE 101)
        if (code) {
          const rawCode = code.trim();
          const { data: siblings } = await supabase
            .from('study_courses')
            .select('id, section_id, study_sections(number, intake_id, study_intakes(number))')
            .ilike('code', rawCode);

          if (siblings && siblings.length > 0) {
            siblingCourseIds = Array.from(new Set([courseId, ...siblings.map(s => s.id)]));
            siblings.forEach((s: any) => {
              const iNum = s.study_sections?.study_intakes?.number;
              const secNum = s.study_sections?.number;
              if (iNum) {
                batchLabels[s.id] = `Intake ${iNum}${secNum ? ` · Sec ${secNum}` : ''}`;
              }
            });
          }
        }

        if (user) {
          const { data: myMemberships } = await supabase
            .from('study_section_members')
            .select('section_id, role, status')
            .eq('user_id', user.id)
            .eq('status', 'approved');

          const directMembership = (myMemberships ?? []).find(m => m.section_id === currentCourse.section_id);
          const isDirectCR = directMembership?.role === 'cr' || profile?.role === 'admin';
          setIsCR(isDirectCR);

          const isDirectPermitted = directMembership
            ? (directMembership.role === 'cr' || directMembership.role === 'editor')
            : (myMemberships ?? []).some(m => m.role === 'cr' || m.role === 'editor');
          setCanUpload(isDirectPermitted || profile?.role === 'admin');
        } else {
          setIsCR(profile?.role === 'admin');
          setCanUpload(profile?.role === 'admin');
        }
      }

      const [matRes, qbRes, bookRes] = await Promise.all([
        supabase.from('study_materials').select('*').in('course_id', siblingCourseIds).order('created_at', { ascending: false }),
        supabase.from('study_question_bank').select('*').in('course_id', siblingCourseIds).order('created_at', { ascending: false }),
        supabase.from('study_books').select('*').in('course_id', siblingCourseIds).order('created_at', { ascending: false }),
      ]);

      const rawMats = (matRes.data ?? []) as any[];
      const rawQbs = (qbRes.data ?? []) as any[];
      const rawBks = (bookRes.data ?? []) as any[];

      // Fetch uploader names for attribution
      const uploaderIds = Array.from(new Set([...rawMats, ...rawQbs, ...rawBks].map(r => r.uploaded_by || r.added_by).filter(Boolean)));
      let peopleMap: Record<string, { full_name?: string }> = {};
      if (uploaderIds.length > 0) {
        try {
          peopleMap = await fetchPeople(uploaderIds);
        } catch {
          // fallback
        }
      }

      const allMats = rawMats.map(r => ({
        ...r,
        table: 'study_materials' as const,
        batch_label: batchLabels[r.course_id] || null,
        uploader_name: peopleMap[r.uploaded_by]?.full_name || null,
      }));
      const noteEntries = allMats.filter(f => f.type !== 'Lecture Slide' && !['ppt', 'pptx'].includes((f.file_kind ?? '').toLowerCase()));
      const slideEntries = allMats.filter(f => f.type === 'Lecture Slide' || ['ppt', 'pptx'].includes((f.file_kind ?? '').toLowerCase()));
      const qs = rawQbs.map(r => ({
        ...r,
        table: 'study_question_bank' as const,
        batch_label: batchLabels[r.course_id] || null,
        uploader_name: peopleMap[r.uploaded_by]?.full_name || null,
      }));
      const bks = rawBks.map(r => ({
        ...r,
        table: 'study_books' as const,
        batch_label: batchLabels[r.course_id] || null,
        uploader_name: peopleMap[r.added_by]?.full_name || null,
      }));

      // Collect distinct batches
      const distinctBatches = Array.from(new Set(
        [...noteEntries, ...slideEntries, ...qs, ...bks]
          .map(e => e.batch_label)
          .filter(Boolean) as string[]
      )).sort();
      setBatchOptions(distinctBatches.length > 1 ? ['All Batches', ...distinctBatches] : []);

      setMaterials(noteEntries);
      setSlides(slideEntries);
      setQuestions(qs);
      setBooks(bks);

      // My bookmarks for these items (RLS already scopes to me).
      const ids = [...noteEntries, ...slideEntries, ...qs, ...bks].map(e => e.id);
      let savedList: string[] = [];
      if (user && ids.length) {
        const { data: bm } = await supabase.from('study_bookmarks').select('item_id').in('item_id', ids);
        savedList = (bm ?? []).map((b: any) => b.item_id);
        setSaved(new Set(savedList));
      } else {
        setSaved(new Set());
      }

      setCache(cacheKey, {
        course: courseRes.data ?? cached?.course,
        materials: noteEntries,
        slides: slideEntries,
        questions: qs,
        books: bks,
        saved: savedList,
      });

      // Marketplace listings tagged with this course code
      const code: string | undefined = courseRes.data?.code;
      if (code) {
        const norm = (s: string) => (s ?? '').toLowerCase().replace(/\s+/g, '');
        const raw = code.trim();
        const nospace = raw.replace(/\s+/g, '');
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
    } catch {
      if (cached) setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [courseId, user, profile?.role]);

  // 'focus' also fires on first mount, so this covers the initial load too.
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [load, navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (dropdownOpen) {
          setDropdownOpen(false);
          return true;
        }
        if (showSearch) {
          setShowSearch(false);
          setQuery('');
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [dropdownOpen, showSearch])
  );

  async function openEntry(f: Entry) {
    if (openingId) return;
    if (isOffline && !f.url) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to download or view remote files.' });
      return;
    }
    const isPdf = (f.file_kind ?? '').toLowerCase() === 'pdf' || f.title.toLowerCase().endsWith('.pdf');
    if (f.url) {
      if (isPdf) {
        setActivePdfUrl(f.url);
        setActivePdfTitle(f.title);
        setActivePdfSubtitle(`${course?.code ?? ''} · ${TAB_LABELS[tab]}`);
        setPdfModalVisible(true);
        return;
      }
      openInApp(f.url);
      return;
    }
    if (!f.storage_path) return;
    setOpeningId(f.id);
    const { data, error } = await supabase.storage
      .from('study-materials')
      .createSignedUrl(f.storage_path, 3600);
    setOpeningId(null);
    if (error || !data?.signedUrl) {
      toast({ type: 'error', title: t.common.error, message: error?.message ?? t.study2.couldNotOpenFile });
      return;
    }
    if (isPdf) {
      setActivePdfUrl(data.signedUrl);
      setActivePdfTitle(f.title);
      setActivePdfSubtitle(`${course?.code ?? ''} · ${TAB_LABELS[tab]}`);
      setPdfModalVisible(true);
      return;
    }
    openInApp(data.signedUrl);
  }

  async function toggleSaved(f: Entry) {
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to update bookmarks.' });
      return;
    }
    const isSaved = saved.has(f.id);
    // Optimistic
    setSaved(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(f.id); else next.add(f.id);
      return next;
    });
    if (!user) return;
    const { error } = isSaved
      ? await supabase.from('study_bookmarks').delete().eq('user_id', user.id).eq('item_id', f.id)
      : await supabase.from('study_bookmarks').insert({ user_id: user.id, item_type: ITEM_TYPE[tab], item_id: f.id });
    if (error && error.code !== '23505') {
      // roll back the optimistic toggle on failure
      setSaved(prev => {
        const next = new Set(prev);
        if (isSaved) next.add(f.id); else next.delete(f.id);
        return next;
      });
      toast({ type: 'error', title: t.common.error });
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
          if (f.storage_path) {
            await supabase.storage.from('study-materials').remove([f.storage_path]);
          }
          const { error } = await supabase.from(f.table).delete().eq('id', f.id);
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
          load();
        },
      },
    ]);
  }

  const lists: Record<Tab, Entry[]> = { materials, questions, books, slides };
  const counts: Record<Tab, number> = {
    materials: materials.length, questions: questions.length, books: books.length, slides: slides.length,
  };

  // Exam options for the questions filter (memoized)
  const examOptions = useMemo(
    () => ['All', ...Array.from(new Set(questions.map(q => q.exam).filter(Boolean) as string[]))],
    [questions]
  );

  // Derived list: search + exam filter + batch filter + sort (memoized, zero-alloc date comparison)
  const tabFiles = useMemo(() => {
    let files = lists[tab] || [];
    const qStr = query.trim().toLowerCase();
    if (qStr) files = files.filter(f => f.title.toLowerCase().includes(qStr));
    if (tab === 'questions' && examFilter !== 'All') files = files.filter(f => f.exam === examFilter);
    if (batchFilter !== 'All') files = files.filter(f => f.batch_label === batchFilter);
    return [...files].sort((a, b) =>
      sort === 'name'
        ? a.title.localeCompare(b.title)
        : (b.created_at > a.created_at ? 1 : b.created_at < a.created_at ? -1 : 0)
    );
  }, [lists, tab, query, examFilter, batchFilter, sort]);
  const tabFilesCount = useProgressiveCount(tabFiles.length);

  if (!course) {
    return (
      <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <SubBar title={t.study2.course} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={C.brand} />
          ) : (
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>{t.common.notFound}</Text>
          )}
        </View>
      </View>
    );
  }

  const emptyMsg = query.trim()
    ? t.study2.noMatches
    : tab === 'materials' ? 'No notes uploaded yet'
      : tab === 'questions' ? t.study2.noQuestions
        : tab === 'books' ? t.study2.noBooks
          : 'No lecture slides uploaded yet';

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <SubBar
        title={course.code}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.iconBtn} onPress={toggleSearch} activeOpacity={0.75}>
              <Feather name={showSearch ? 'x' : 'search'} size={20} color={C.text} />
            </TouchableOpacity>
            {canUpload && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('StudyUpload', {
                  courseId,
                  courseCode: course.code,
                  courseTitle: course.name,
                  initialTab: tab,
                })}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={22} color={C.text} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <OfflineBanner
          visible={isOffline}
          message="Showing cached course materials. Connect to the internet to download new files or bookmark."
        />
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{course.name}</Text>
        {batchOptions.length > 1 ? (
          <View style={[styles.readOnlyBadge, { backgroundColor: isDark ? 'rgba(45, 212, 191, 0.12)' : '#f0fdfa', borderColor: isDark ? 'rgba(45, 212, 191, 0.3)' : '#99f6e4' }]}>
            <Feather name="layers" size={13} color={STUDY_COLOR} />
            <Text style={[styles.readOnlyTxt, { color: STUDY_COLOR, fontFamily: FontFamily.jakartaBold }]}>
              Compounding Knowledge Base · {batchOptions.length - 1} Batches Contributed
            </Text>
          </View>
        ) : !canUpload ? (
          <View style={[styles.readOnlyBadge, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Feather name="book-open" size={13} color={C.textMuted} />
            <Text style={[styles.readOnlyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              Open Department Library
            </Text>
          </View>
        ) : null}

        {/* Marketplace cross-link - textbooks/notes on sale for this course */}
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

        {/* Category Dropdown (58 height bar) */}
        <View style={styles.dropdownWrap}>
          <TouchableOpacity
            style={[
              styles.dropdownTrigger58,
              {
                backgroundColor: C.surface,
                borderColor: dropdownOpen ? C.brand : C.border,
              },
            ]}
            onPress={() => setDropdownOpen(v => !v)}
            activeOpacity={0.75}
          >
            <View style={styles.triggerLeft}>
              <Feather
                name={CATEGORIES.find(c => c.id === tab)?.icon ?? 'file-text'}
                size={28}
                color={C.text}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.triggerLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {TAB_LABELS[tab]}
              </Text>
              {counts[tab] > 0 && (
                <View style={[styles.countBadge, { backgroundColor: C.surface2 }]}>
                  <Text style={[styles.countTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {counts[tab]}
                  </Text>
                </View>
              )}
            </View>
            <Feather name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.text2} />
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={[styles.dropdownMenu, { backgroundColor: C.surface, borderColor: C.border }]}>
              {CATEGORIES.map((cat, idx) => {
                const isSelected = tab === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.dropdownItem58,
                      isSelected && { backgroundColor: C.surface2 },
                      idx < CATEGORIES.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                    ]}
                    onPress={() => {
                      setTab(cat.id);
                      setExamFilter('All');
                      setDropdownOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.itemLeft}>
                      <Feather
                        name={cat.icon}
                        size={28}
                        color={C.text}
                        style={{ marginRight: 12 }}
                      />
                      <Text
                        style={[
                          styles.itemLabel,
                          {
                            color: isSelected ? C.text : C.text2,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                      {counts[cat.id] > 0 && (
                        <View style={[styles.countBadge, { backgroundColor: isSelected ? C.surface3 : C.surface2 }]}>
                          <Text style={[styles.countTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                            {counts[cat.id]}
                          </Text>
                        </View>
                      )}
                    </View>
                    {isSelected && <Feather name="check" size={18} color={C.brand} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Batch filter (cross-intake knowledge inheritance) */}
        {batchOptions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 10 }} contentContainerStyle={{ gap: 7 }}>
            {batchOptions.map(b => {
              const on = batchFilter === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={[styles.examChip, on ? { backgroundColor: C.surface2, borderColor: STUDY_COLOR } : { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => setBatchFilter(b)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.examTxt, { color: on ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{b}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

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
        <View style={{ marginTop: 12 }}>
          {tabFiles.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="inbox" size={32} color={C.textMuted} />
              <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>{emptyMsg}</Text>
            </View>
          ) : tabFiles.slice(0, tabFilesCount).map((f, idx) => {
            const isLink = !!f.url && !f.storage_path;
            const sizeStr = f.size_bytes ? formatFileSize(f.size_bytes) : null;
            const tagText = tab === 'materials' ? f.type : tab === 'questions' ? f.exam : tab === 'books' ? f.kind : 'Slide';
            return (
              <TouchableOpacity key={idx}
                style={[styles.fileCard72, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => openEntry(f)}
                activeOpacity={0.75}
              >
                <View style={styles.fileIcon44}>
                  <Feather name={fileIcon(f.file_kind, isLink)} size={32} color={C.text} />
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
                    {f.batch_label ? (
                      <View style={[styles.tagPill, { backgroundColor: isDark ? 'rgba(45, 212, 191, 0.15)' : '#f0fdfa' }]}>
                        <Feather name="layers" size={9} color={STUDY_COLOR} />
                        <Text style={[styles.tagTxt, { color: STUDY_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                          {f.batch_label}
                        </Text>
                      </View>
                    ) : null}
                    {tab === 'questions' && f.verified ? (
                      <View style={[styles.tagPill, { backgroundColor: C.successBg }]}>
                        <Feather name="check" size={10} color={C.success} />
                        <Text style={[styles.tagTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>{t.study2.verified}</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.fileSize, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {[f.uploader_name ? `By ${f.uploader_name}` : null, tab === 'books' && f.author ? f.author : null, sizeStr, formatRelativeTime(f.created_at)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>

                {/* Bookmark & Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TouchableOpacity onPress={() => toggleSaved(f)} hitSlop={8} activeOpacity={0.7} style={{ padding: 6 }}>
                    <Feather name="bookmark" size={18} color={saved.has(f.id) ? STUDY_COLOR : C.textMuted} />
                  </TouchableOpacity>

                  {tab === 'questions' && isCR && (
                    <TouchableOpacity onPress={() => toggleVerified(f)} hitSlop={8} activeOpacity={0.7} style={{ padding: 6 }}>
                      <Feather name="check-circle" size={18} color={f.verified ? C.success : C.textMuted} />
                    </TouchableOpacity>
                  )}
                  {(isCR || (!!user && (f.uploaded_by === user.id || f.added_by === user.id))) && (
                    <TouchableOpacity onPress={() => deleteEntry(f)} hitSlop={8} activeOpacity={0.7} style={{ padding: 6 }}>
                      <Feather name="trash-2" size={17} color={C.danger} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.downloadBtn} onPress={() => openEntry(f)} activeOpacity={0.75} disabled={openingId === f.id}>
                    {openingId === f.id
                      ? <ActivityIndicator size="small" color={C.text2} />
                      : <Feather name={isLink ? 'external-link' : ((f.file_kind ?? '').toLowerCase() === 'pdf' || f.title.toLowerCase().endsWith('.pdf')) ? 'eye' : 'download'} size={18} color={C.text2} />}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Universal In-App PDF Viewer Modal */}
      <CampusPdfViewerModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        title={activePdfTitle || course.name}
        subtitle={activePdfSubtitle || `${course.code} · Study Hub`}
        category={tab === 'materials' ? 'Course Notes' : tab === 'questions' ? 'Question Bank' : tab === 'books' ? 'Reference Book' : 'Lecture Slides'}
        fileUrl={activePdfUrl}
        fileName={activePdfTitle.toLowerCase().endsWith('.pdf') ? activePdfTitle : `${activePdfTitle}.pdf`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,
  title: { fontSize: 20, letterSpacing: -0.4, marginBottom: 2 } as any,
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  } as ViewStyle,
  readOnlyTxt: { fontSize: 11.5 } as any,

  forSaleWrap: { marginTop: 12 } as ViewStyle,
  forSaleTitle: { fontSize: 11, letterSpacing: 0.7, marginBottom: 8 } as any,
  forSaleCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 260,
  } as ViewStyle,
  forSaleName: { fontSize: 13.5, flexShrink: 1 } as any,
  forSalePrice: { fontSize: 13, marginTop: 2 } as any,

  search: { height: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 14.5, marginTop: 12 } as any,
  dropdownWrap: { marginTop: 12 } as ViewStyle,
  dropdownTrigger58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,
  triggerLabel: {
    fontSize: 15,
    marginRight: 8,
  } as any,
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  } as ViewStyle,
  countTxt: {
    fontSize: 11.5,
  } as any,
  dropdownMenu: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  dropdownItem58: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,
  itemLabel: {
    fontSize: 15,
    marginRight: 8,
  } as any,
  examChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  examTxt: { fontSize: 12.5 } as any,

  emptyCard: { padding: 36, alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  emptyTxt: { fontSize: 13.5, textAlign: 'center' } as any,

  fileCard72: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  fileIcon44: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  fileBody: { flex: 1, minWidth: 0 } as ViewStyle,
  fileName: { fontSize: 14.5 } as any,
  fileSize: { fontSize: 11.5, flexShrink: 1 } as any,
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 } as ViewStyle,
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999 } as ViewStyle,
  tagTxt: { fontSize: 10.5 } as any,
  downloadBtn: { padding: 6, minWidth: 32, alignItems: 'center' } as ViewStyle,
  iconBtn: { padding: 8 } as ViewStyle,
});
