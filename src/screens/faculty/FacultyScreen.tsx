// Faculty Directory (web parity) — browse departments grouped by branch,
// find a supervisor by research area, search everything, view saved teachers.
// Searching / filtering switches to flat teacher cards; otherwise dept cards.
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import {
  FACULTY_ACCENT, BRANCH_ICON, BRANCH_ORDER, shortDept, sortFaculty, interestsOf,
  FacultyCard, type FacultyMember, type Department,
} from './facultyShared';

export function FacultyScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [interest, setInterest] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [deptRes, facRes, savedRes] = await Promise.all([
      supabase.from('departments').select('id, name, branch, chairman'),
      supabase.from('faculty')
        .select('id, department_id, name, designation, email, research_interests, on_leave, is_chairman, photo_url'),
      supabase.from('faculty_bookmarks').select('faculty_id').eq('user_id', user?.id ?? ''),
    ]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (facRes.data) setFaculty(facRes.data as FacultyMember[]);
    if (savedRes.data) setSavedIds(new Set(savedRes.data.map((s: any) => s.faculty_id)));
  }, [user?.id]);

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

  const deptById = useMemo(() => {
    const m: Record<string, Department> = {};
    departments.forEach(d => { m[d.id] = d; });
    return m;
  }, [departments]);

  const countByDept = useMemo(() => {
    const m: Record<string, number> = {};
    faculty.forEach(f => { m[f.department_id] = (m[f.department_id] || 0) + 1; });
    return m;
  }, [faculty]);

  // Most common research areas → "find a supervisor" chips (top 14).
  const popularInterests = useMemo(() => {
    const counts = new Map<string, { label: string; n: number }>();
    faculty.forEach(f => interestsOf(f).forEach(i => {
      const key = i.trim().toLowerCase();
      if (!key) return;
      const cur = counts.get(key) ?? { label: i.trim(), n: 0 };
      cur.n += 1;
      counts.set(key, cur);
    }));
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 14);
  }, [faculty]);

  // Departments grouped by branch, each branch's depts sorted big → small.
  const branches = useMemo(() => {
    const byBranch: Record<string, Department[]> = {};
    departments.forEach(d => { (byBranch[d.branch] ??= []).push(d); });
    const order = [...BRANCH_ORDER, ...Object.keys(byBranch).filter(b => !BRANCH_ORDER.includes(b))];
    return order
      .filter(b => byBranch[b])
      .map(b => ({
        branch: b,
        depts: byBranch[b].sort((a, c) => (countByDept[c.id] || 0) - (countByDept[a.id] || 0)),
      }));
  }, [departments, countByDept]);

  const q = query.trim().toLowerCase();
  const filtering = q.length > 0 || !!interest || savedOnly;

  const results = useMemo(() => {
    if (!filtering) return [];
    let list = faculty;
    if (savedOnly) list = list.filter(f => savedIds.has(f.id));
    if (interest) {
      const si = interest.toLowerCase();
      list = list.filter(f => interestsOf(f).some(i => i.toLowerCase() === si));
    }
    if (q) {
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q) ||
        interestsOf(f).some(i => i.toLowerCase().includes(q)));
    }
    return sortFaculty(list);
  }, [faculty, q, interest, savedOnly, filtering, savedIds]);

  function clearFilters() {
    setQuery(''); setInterest(null); setSavedOnly(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Faculty"
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.savedBtn, savedOnly
              ? { backgroundColor: `${Accent.gold}26` }
              : { backgroundColor: C.surface2 }]}
            onPress={() => setSavedOnly(v => !v)}
            activeOpacity={0.75}
          >
            <Feather name="star" size={14} color={savedOnly ? Accent.gold : C.text2} />
            <Text style={[styles.savedBtnTxt, { color: savedOnly ? Accent.gold : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              Saved{savedIds.size ? ` · ${savedIds.size}` : ''}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {faculty.length} teachers across {departments.length} departments — browse, search, and find a supervisor.
        </Text>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
          <Icon name="search" size={17} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder="Search by name, title, or research area..."
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

        {/* Find a supervisor by research area */}
        {popularInterests.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              FIND A SUPERVISOR BY RESEARCH AREA
            </Text>
            <View style={styles.chips}>
              {popularInterests.map(it => {
                const active = !!interest && interest.toLowerCase() === it.label.toLowerCase();
                return (
                  <TouchableOpacity
                    key={it.label}
                    style={[styles.chip, active
                      ? { backgroundColor: FACULTY_ACCENT, borderColor: FACULTY_ACCENT }
                      : { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setInterest(active ? null : it.label)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipTxt, { color: active ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {it.label}
                    </Text>
                    <Text style={[styles.chipCount, { color: active ? 'rgba(255,255,255,0.75)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      {it.n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {filtering ? (
          <>
            {/* Flat results */}
            <View style={styles.resultsHead}>
              <Text style={[styles.resultsTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {results.length} result{results.length === 1 ? '' : 's'}
                {interest ? ` in ${interest}` : ''}{savedOnly ? ' · saved' : ''}
              </Text>
              <TouchableOpacity onPress={clearFilters} hitSlop={8}>
                <Text style={[styles.clearTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            {results.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="search" size={28} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {savedOnly && !q && !interest ? 'No saved teachers yet — tap the star on any teacher.' : 'No teachers found'}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {results.map(f => (
                  <FacultyCard
                    key={f.id}
                    f={f}
                    deptName={deptById[f.department_id]?.name}
                    saved={savedIds.has(f.id)}
                    onToggleSave={() => toggleSave(f.id)}
                    onOpen={() => navigation.navigate('FacultyProfile', { facultyId: f.id })}
                    C={C}
                    goldColor={Accent.gold}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          /* Branch sections → department cards */
          branches.map(({ branch, depts }) => (
            <View key={branch}>
              <Text style={[styles.branchTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{branch}</Text>
              <View style={styles.list}>
                {depts.map(d => {
                  const count = countByDept[d.id] || 0;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.deptCard, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={() => navigation.navigate('FacultyDept', { deptId: d.id })}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.deptTile, { backgroundColor: `${FACULTY_ACCENT}1a` }]}>
                        <Feather name={BRANCH_ICON[d.branch] ?? 'book-open'} size={19} color={FACULTY_ACCENT} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.deptName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {shortDept(d.name)}
                        </Text>
                        <Text style={[styles.deptCount, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {count} teacher{count === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Icon name="chevR" size={17} color={C.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 20 } as ViewStyle,
  subtitle: { fontSize: 12.5, marginBottom: 12, lineHeight: 18 } as TextStyle,

  savedBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10 } as ViewStyle,
  savedBtnTxt: { fontSize: 12 } as TextStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14, marginBottom: 4 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 13 } as TextStyle,

  sectionLabel: { fontSize: 10.5, letterSpacing: 0.8, marginTop: 14, marginBottom: 8 } as TextStyle,
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12 } as TextStyle,
  chipCount: { fontSize: 10.5 } as TextStyle,

  resultsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 } as ViewStyle,
  resultsTxt: { fontSize: 12.5 } as TextStyle,
  clearTxt: { fontSize: 12.5 } as TextStyle,

  branchTitle: { fontSize: 14.5, marginTop: 18, marginBottom: 9 } as TextStyle,
  list: { gap: 10 } as ViewStyle,

  deptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  deptTile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  deptName: { fontSize: 14 } as TextStyle,
  deptCount: { fontSize: 11.5, marginTop: 2 } as TextStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 8, paddingHorizontal: 20 } as ViewStyle,
  emptyTxt: { fontSize: 13.5, textAlign: 'center' } as TextStyle,
});
