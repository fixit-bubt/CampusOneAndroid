// Faculty - one department's roster.
// Header: branch icon tile, dept name, branch · count, chair line.
// Search appears when the roster is bigger than 6. Chairman sorts first.
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import {
  FACULTY_ACCENT, BRANCH_ICON, shortDept, sortFaculty, interestsOf,
  TeacherBar, type FacultyMember, type Department,
} from './facultyShared';
import { DepartmentAuthoritiesDropdown } from './DepartmentAuthoritiesDropdown';

export function FacultyDeptScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const deptId: string = route.params?.deptId;
  const [dept, setDept] = useState<Department | null>(null);
  const [roster, setRoster] = useState<FacultyMember[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const INITIAL_LIMIT = 24;
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_LIMIT);

  useEffect(() => {
    setVisibleLimit(INITIAL_LIMIT);
  }, [query]);

  const load = useCallback(async () => {
    const [deptRes, facRes, savedRes] = await Promise.all([
      supabase.from('departments').select('id, name, branch, dept_number, chairman').eq('id', deptId).single(),
      supabase.from('faculty')
        .select('id, department_id, name, designation, email, phone, cell_phone, personal_email, short_code, room_number, building, floor, counseling_hours, blood_group, scopus_url, is_accepting_research, research_interests, teaching_areas, courses_taught, qualifications, publications, on_leave, is_chairman, photo_url')
        .eq('department_id', deptId),
      supabase.from('faculty_bookmarks').select('faculty_id').eq('user_id', user?.id ?? ''),
    ]);
    if (deptRes.data) setDept(deptRes.data as Department);
    if (facRes.data) setRoster(sortFaculty(facRes.data as FacultyMember[]));
    if (savedRes.data) setSavedIds(new Set(savedRes.data.map((s: any) => s.faculty_id)));
  }, [deptId, user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleSave(facId: string) {
    if (!user) return;
    const isSaved = savedIds.has(facId);
    const next = new Set(savedIds);
    isSaved ? next.delete(facId) : next.add(facId);
    setSavedIds(next); // optimistic
    const { error } = isSaved
      ? await supabase.from('faculty_bookmarks').delete().eq('faculty_id', facId).eq('user_id', user.id)
      : await supabase.from('faculty_bookmarks').insert({ faculty_id: facId, user_id: user.id });
    if (error && error.code !== '23505') {
      setSavedIds(savedIds); // rollback
      toast({ type: 'error', title: t.common.error });
      return;
    }
  }

  const q = query.trim().toLowerCase();
  const cleanQ = q.replace(/[^a-z0-9]/g, '');
  const words = q.split(/[\s.]+/).filter(Boolean);

  const list = useMemo(() => {
    if (!q) return roster;
    return roster.filter(f => {
      const lowerName = (f.name || '').toLowerCase();
      const cleanName = lowerName.replace(/[^a-z0-9]/g, '');
      const lowerCode = (f.short_code || '').toLowerCase();
      const cleanCode = lowerCode.replace(/[^a-z0-9]/g, '');

      // 1. Direct name match (exact substring OR punctuation-stripped e.g. "Md.As" -> "mdashikkhan")
      const nameMatch = lowerName.includes(q) || (cleanQ.length > 0 && cleanName.includes(cleanQ));

      // 2. Multi-word token match (e.g. "Md As" or "Ashik Khan")
      const allWordsMatch = words.length > 1 && words.every(w => {
        const cw = w.replace(/[^a-z0-9]/g, '');
        return lowerName.includes(w) || cleanName.includes(cw) || lowerCode.includes(cw);
      });

      // 3. Short routine code match (e.g. MDAK, MDAR, SR)
      const codeMatch = Boolean(
        cleanCode &&
        cleanQ.length > 0 &&
        (lowerCode.includes(q) || cleanCode.includes(cleanQ) || cleanQ.includes(cleanCode))
      );

      // 4. Designation match
      const desigMatch = (f.designation || '').toLowerCase().includes(q);

      // 5. Room / Building match
      const roomMatch = Boolean(
        (f.room_number && f.room_number.toLowerCase().includes(cleanQ || q)) ||
        (f.building && f.building.toLowerCase().includes(q))
      );

      // 6. Research interests
      const interestMatch = interestsOf(f).some(i => i.toLowerCase().includes(q));

      // 7. Course code & title match
      const courseMatch = Boolean(
        f.courses_taught &&
        f.courses_taught.some(c => {
          if (typeof c !== 'string') return false;
          const lc = c.toLowerCase();
          return lc.includes(q) || (cleanQ.length > 0 && lc.replace(/[^a-z0-9]/g, '').includes(cleanQ));
        })
      );

      // 8. Teaching areas
      const teachingAreaMatch = Boolean(
        f.teaching_areas &&
        f.teaching_areas.some(ta => typeof ta === 'string' && ta.toLowerCase().includes(q))
      );

      // 9. Publication titles and venues
      const pubMatch = Boolean(
        f.publications &&
        f.publications.some((p: any) => {
          if (typeof p === 'string') return p.toLowerCase().includes(q);
          return (
            (p?.title && typeof p.title === 'string' && p.title.toLowerCase().includes(q)) ||
            (p?.venue && typeof p.venue === 'string' && p.venue.toLowerCase().includes(q))
          );
        })
      );

      return nameMatch || allWordsMatch || codeMatch || desigMatch || roomMatch || interestMatch || courseMatch || teachingAreaMatch || pubMatch;
    });
  }, [roster, q, cleanQ, words]);

  const displayedList = useMemo(() => {
    return list.slice(0, visibleLimit);
  }, [list, visibleLimit]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={shortDept(dept?.name) || t.faculty2.departmentFallback} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Dept header */}
        {dept && (
          <View style={styles.header}>
            <View style={[styles.tile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
              <AnimatedIcon family="feather" name={BRANCH_ICON[dept.branch] ?? 'book-open'} size={20} color={FACULTY_ACCENT} animation="entrance" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.deptName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {shortDept(dept.name)}
              </Text>
              <Text style={[styles.deptMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {dept.branch} · {roster.length} teacher{roster.length === 1 ? '' : 's'}
              </Text>
              {dept.chairman ? (
                <Text style={[styles.chair, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  <Text style={{ color: C.textMuted }}>{t.faculty2.chairPrefix}</Text>{dept.chairman}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Department Authorities & Decision Makers (Universal 72dp Card Standard Dropdown) */}
        {dept && (
          <DepartmentAuthoritiesDropdown
            deptNumber={dept.dept_number}
            deptName={dept.name}
            deptChairmanName={dept.chairman}
            roster={roster}
            navigation={navigation}
          />
        )}

        {/* Search */}
        {roster.length > 4 && (
          <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Icon name="search" size={18} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
              placeholder={t.faculty2.searchInDept(shortDept(dept?.name) || t.faculty2.departmentFallback)}
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {list.length === 0 ? (
          <View style={styles.empty}>
            <AnimatedIcon family="feather" name="search" size={28} color={C.textMuted} animation="pulse" loop />
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.faculty2.noTeachersFound}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {displayedList.map(f => (
              <TeacherBar
                key={f.id}
                f={f}
                deptName={dept?.name}
                saved={savedIds.has(f.id)}
                onToggleSave={() => toggleSave(f.id)}
                onOpen={() => navigation.navigate('FacultyProfile', { facultyId: f.id })}
                C={C}
                goldColor={Accent.gold}
              />
            ))}

            {list.length > visibleLimit && (
              <TouchableOpacity
                style={[styles.loadMoreBar, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setVisibleLimit(prev => prev + 30)}
                activeOpacity={0.75}
              >
                <Text style={[styles.loadMoreTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                  Show more ({list.length - visibleLimit} remaining)
                </Text>
                <Feather name="chevron-down" size={16} color={FACULTY_ACCENT} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginBottom: 14 } as ViewStyle,
  tile: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  deptName: { fontSize: 18, letterSpacing: -0.01 } as TextStyle,
  deptMeta: { fontSize: 12, marginTop: 2 } as TextStyle,
  chair: { fontSize: 12.5, marginTop: 4 } as TextStyle,

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 } as TextStyle,

  list: { gap: 10 } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 50, gap: 8 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as TextStyle,
  loadMoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  } as ViewStyle,
  loadMoreTxt: {
    fontSize: 13,
  } as TextStyle,
});
