// Faculty — one department's roster (web parity: DepartmentFaculty).
// Header: branch icon tile, dept name, branch · count, chair line.
// Search appears when the roster is bigger than 6. Chairman sorts first.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import {
  FACULTY_ACCENT, BRANCH_ICON, shortDept, sortFaculty, interestsOf,
  FacultyCard, type FacultyMember, type Department,
} from './facultyShared';

export function FacultyDeptScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const deptId: string = route.params?.deptId;
  const [dept, setDept] = useState<Department | null>(null);
  const [roster, setRoster] = useState<FacultyMember[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [deptRes, facRes, savedRes] = await Promise.all([
      supabase.from('departments').select('id, name, branch, chairman').eq('id', deptId).single(),
      supabase.from('faculty')
        .select('id, department_id, name, designation, email, research_interests, on_leave, is_chairman, photo_url')
        .eq('department_id', deptId),
      supabase.from('faculty_bookmarks').select('faculty_id').eq('user_id', user?.id ?? ''),
    ]);
    if (deptRes.data) setDept(deptRes.data as Department);
    if (facRes.data) setRoster(sortFaculty(facRes.data as FacultyMember[]));
    if (savedRes.data) setSavedIds(new Set(savedRes.data.map((s: any) => s.faculty_id)));
  }, [deptId, user?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleSave(facId: string) {
    if (!user) return;
    const isSaved = savedIds.has(facId);
    const next = new Set(savedIds);
    if (isSaved) {
      next.delete(facId);
      await supabase.from('faculty_bookmarks').delete().eq('faculty_id', facId).eq('user_id', user.id);
    } else {
      next.add(facId);
      await supabase.from('faculty_bookmarks').insert({ faculty_id: facId, user_id: user.id });
    }
    setSavedIds(next);
  }

  const q = query.trim().toLowerCase();
  const list = q
    ? roster.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q) ||
        interestsOf(f).some(i => i.toLowerCase().includes(q)))
    : roster;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={shortDept(dept?.name) || t.faculty2.departmentFallback} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Dept header */}
        {dept && (
          <View style={styles.header}>
            <View style={[styles.tile, { backgroundColor: `${FACULTY_ACCENT}1a` }]}>
              <Feather name={BRANCH_ICON[dept.branch] ?? 'book-open'} size={22} color={FACULTY_ACCENT} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.deptName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {shortDept(dept.name)}
              </Text>
              <Text style={[styles.deptMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {dept.branch} · {t.faculty2.teacherCount(roster.length)}
              </Text>
              {dept.chairman ? (
                <Text style={[styles.chair, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  <Text style={{ color: C.textMuted }}>{t.faculty2.chairPrefix}</Text>{dept.chairman}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Search (only worth showing for bigger rosters) */}
        {roster.length > 6 && (
          <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
            <Icon name="search" size={17} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
              placeholder={t.faculty2.searchInDept(shortDept(dept?.name) || t.faculty2.departmentLower)}
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        )}

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="search" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              No teachers found
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map(f => (
              <FacultyCard
                key={f.id}
                f={f}
                saved={savedIds.has(f.id)}
                onToggleSave={() => toggleSave(f.id)}
                onOpen={() => navigation.navigate('FacultyProfile', { facultyId: f.id })}
                C={C}
                goldColor={Accent.gold}
              />
            ))}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginBottom: 14 } as ViewStyle,
  tile: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  deptName: { fontSize: 18, letterSpacing: -0.01 } as TextStyle,
  deptMeta: { fontSize: 12, marginTop: 2 } as TextStyle,
  chair: { fontSize: 12.5, marginTop: 4 } as TextStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14, marginBottom: 12 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 13 } as TextStyle,

  list: { gap: 10 } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 50, gap: 8 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as TextStyle,
});
