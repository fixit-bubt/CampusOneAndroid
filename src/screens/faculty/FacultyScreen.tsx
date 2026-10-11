// Faculty Directory - browse departments grouped by branch, search by
// teacher initial routine codes (DALM, SR, SAM), filter research mentors
// for paper publication, and manage saved teachers.
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Animated, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { FontFamily, Layout, Accent, pillBg, Radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { useAuth } from '../../store/authStore';
import {
  FACULTY_ACCENT, BRANCH_ICON, BRANCH_ORDER, shortDept, sortFaculty, interestsOf,
  FacultyCard, type FacultyMember, type Department,
} from './facultyShared';

type TabMode = 'all' | 'mentors' | 'saved';

export function FacultyScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();

  const [mode, setMode] = useState<TabMode>('all');
  const [query, setQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [interest, setInterest] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Active teacher for ContactSheet
  const [contactTeacher, setContactTeacher] = useState<FacultyMember | null>(null);

  // Segmented animated indicator
  const animIndex = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  const modeIndexMap: Record<TabMode, number> = useMemo(
    () => ({ all: 0, mentors: 1, saved: 2 }),
    []
  );

  useEffect(() => {
    const idx = modeIndexMap[mode] ?? 0;
    Animated.spring(animIndex, {
      toValue: idx,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [mode, modeIndexMap, animIndex]);

  const load = useCallback(async () => {
    // 1. Instant cache load
    const [cachedDepts, cachedFac] = await Promise.all([
      getCache<Department[]>(CacheKeys.FACULTY_DEPTS),
      getCache<FacultyMember[]>(CacheKeys.FACULTY_LIST),
    ]);
    if (cachedDepts && cachedDepts.length > 0) setDepartments(cachedDepts);
    if (cachedFac && cachedFac.length > 0) setFaculty(cachedFac);
    if (user?.id) {
      const cachedBookmarks = await getCache<string[]>(CacheKeys.FACULTY_BOOKMARKS(user.id));
      if (cachedBookmarks) setSavedIds(new Set(cachedBookmarks));
    }

    // 2. Fetch fresh
    const [deptRes, facRes, savedRes] = await Promise.all([
      supabase.from('departments').select('id, name, branch, dept_number, chairman').limit(50),
      supabase.from('faculty')
        .select('id, department_id, name, designation, email, phone, short_code, room_number, building, floor, counseling_hours, blood_group, scopus_url, is_accepting_research, research_interests, on_leave, is_chairman, photo_url')
        .order('name')
        .limit(1000),
      supabase.from('faculty_bookmarks').select('faculty_id').eq('user_id', user?.id ?? '').limit(1000),
    ]);

    if (deptRes.error || facRes.error) {
      if ((cachedDepts && cachedDepts.length > 0) || (cachedFac && cachedFac.length > 0)) {
        setIsOffline(true);
      }
      return;
    }

    setIsOffline(false);
    if (deptRes.data) {
      setDepartments(deptRes.data as Department[]);
      setCache(CacheKeys.FACULTY_DEPTS, deptRes.data as Department[]);
    }
    if (facRes.data) {
      setFaculty(facRes.data as FacultyMember[]);
      setCache(CacheKeys.FACULTY_LIST, facRes.data as FacultyMember[]);
    }
    if (savedRes.data) {
      const ids = savedRes.data.map((s: any) => s.faculty_id);
      setSavedIds(new Set(ids));
      if (user?.id) setCache(CacheKeys.FACULTY_BOOKMARKS(user.id), ids);
    }
  }, [user?.id]);

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
    }
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

  // Research mentors: teachers with interests or publications who accept research collaborations
  const researchMentors = useMemo(() => {
    return faculty.filter(f =>
      !f.on_leave &&
      (interestsOf(f).length > 0 || !!f.scopus_url || f.designation.toLowerCase().includes('professor'))
    );
  }, [faculty]);

  // Top research domains for paper collaboration
  const popularInterests = useMemo(() => {
    const counts = new Map<string, { label: string; n: number }>();
    const source = mode === 'mentors' ? researchMentors : faculty;
    source.forEach(f => interestsOf(f).forEach(i => {
      const key = i.trim().toLowerCase();
      if (!key) return;
      const cur = counts.get(key) ?? { label: i.trim(), n: 0 };
      cur.n += 1;
      counts.set(key, cur);
    }));
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 12);
  }, [faculty, researchMentors, mode]);

  // Departments grouped by branch
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
  const isSearchActive = q.length > 0 || !!interest || selectedDeptId !== 'All' || mode !== 'all';

  const results = useMemo(() => {
    let list = faculty;

    if (mode === 'saved') {
      list = list.filter(f => savedIds.has(f.id));
    } else if (mode === 'mentors') {
      list = researchMentors;
    }

    if (selectedDeptId !== 'All') {
      list = list.filter(f => f.department_id === selectedDeptId);
    }

    if (interest) {
      const si = interest.toLowerCase();
      list = list.filter(f => interestsOf(f).some(i => i.toLowerCase() === si));
    }

    if (q) {
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.short_code && f.short_code.toLowerCase().includes(q)) ||
        f.designation.toLowerCase().includes(q) ||
        (f.room_number && f.room_number.toLowerCase().includes(q)) ||
        interestsOf(f).some(i => i.toLowerCase().includes(q)));
    }

    return sortFaculty(list);
  }, [faculty, researchMentors, q, interest, selectedDeptId, mode, savedIds]);

  function clearFilters() {
    setQuery('');
    setInterest(null);
    setSelectedDeptId('All');
  }

  const segmentWidth = trackWidth > 0 ? trackWidth / 3 : 0;
  const translateX = animIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, segmentWidth, segmentWidth * 2],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Faculty Directory"
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.savedBtn, mode === 'saved'
              ? { backgroundColor: `${Accent.gold}24` }
              : { backgroundColor: C.surface2 }]}
            onPress={() => setMode(m => m === 'saved' ? 'all' : 'saved')}
            activeOpacity={0.75}
          >
            <Feather name="star" size={14} color={mode === 'saved' ? Accent.gold : C.text2} />
            <Text style={[styles.savedBtnTxt, { color: mode === 'saved' ? Accent.gold : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {savedIds.size}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* Animated Segmented Tabs */}
        <View
          style={[styles.tabTrack, { backgroundColor: C.surface2 }]}
          onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        >
          {segmentWidth > 0 && (
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  width: segmentWidth - 4,
                  backgroundColor: C.surface,
                  transform: [{ translateX }],
                },
              ]}
            />
          )}

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setMode('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: mode === 'all' ? C.text : C.textMuted,
                  fontFamily: mode === 'all' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
            >
              {t.faculty2.tabDepartments}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setMode('mentors')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: mode === 'mentors' ? FACULTY_ACCENT : C.textMuted,
                  fontFamily: mode === 'mentors' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
            >
              {t.faculty2.tabResearchMentors}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setMode('saved')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: mode === 'saved' ? Accent.gold : C.textMuted,
                  fontFamily: mode === 'saved' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
            >
              {t.faculty2.tabMyTeachers}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar matching initial routine codes and names */}
        <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
          <Icon name="search" size={17} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder={t.faculty2.searchPlaceholderExpanded}
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

        {/* Mode-Specific Banner */}
        {mode === 'mentors' && (
          <View style={[styles.bannerCard, { backgroundColor: `${FACULTY_ACCENT}12`, borderColor: `${FACULTY_ACCENT}30` }]}>
            <View style={styles.bannerRow}>
              <Feather name="award" size={18} color={FACULTY_ACCENT} />
              <Text style={[styles.bannerTitle, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                {t.faculty2.mentorsBannerTitle}
              </Text>
            </View>
            <Text style={[styles.bannerDesc, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
              {t.faculty2.mentorsBannerDesc}
            </Text>
          </View>
        )}

        {/* Department Quick Filter Scroll */}
        {mode !== 'all' || isSearchActive ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deptChipRow}
          >
            <TouchableOpacity
              style={[
                styles.deptChip,
                selectedDeptId === 'All'
                  ? { backgroundColor: C.text, borderColor: C.text }
                  : { backgroundColor: C.surface, borderColor: C.border },
              ]}
              onPress={() => setSelectedDeptId('All')}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.deptChipTxt,
                  { color: selectedDeptId === 'All' ? C.bg : C.text2, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                {t.faculty2.allDepartments}
              </Text>
            </TouchableOpacity>

            {departments.map(d => {
              const active = selectedDeptId === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.deptChip,
                    active
                      ? { backgroundColor: FACULTY_ACCENT, borderColor: FACULTY_ACCENT }
                      : { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                  onPress={() => setSelectedDeptId(active ? 'All' : d.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.deptChipTxt,
                      { color: active ? C.white : C.text2, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    {d.dept_number ? `${d.dept_number} · ` : ''}{shortDept(d.name)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Research Area Chips */}
        {popularInterests.length > 0 && (mode === 'mentors' || query.length > 0) && (
          <View style={styles.interestsContainer}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {mode === 'mentors' ? t.faculty2.filterByDomain : t.faculty2.browseResearchAreas}
            </Text>
            <View style={styles.chips}>
              {popularInterests.map(it => {
                const active = !!interest && interest.toLowerCase() === it.label.toLowerCase();
                return (
                  <TouchableOpacity
                    key={it.label}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: FACULTY_ACCENT, borderColor: FACULTY_ACCENT }
                        : { backgroundColor: C.surface, borderColor: C.border },
                    ]}
                    onPress={() => setInterest(active ? null : it.label)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipTxt,
                        { color: active ? C.white : C.text2, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {it.label}
                    </Text>
                    <Text
                      style={[
                        styles.chipCount,
                        { color: active ? 'rgba(255,255,255,0.75)' : C.textMuted, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {it.n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Results Stream OR Department Branches */}
        {isSearchActive ? (
          <>
            <View style={styles.resultsHead}>
              <Text style={[styles.resultsTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {results.length} teacher{results.length === 1 ? '' : 's'}
                {interest ? ` in ${interest}` : ''}
                {mode === 'saved' ? ' · saved' : ''}
              </Text>
              <TouchableOpacity onPress={clearFilters} hitSlop={8}>
                <Text style={[styles.clearTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                  {t.faculty2.resetFilters}
                </Text>
              </TouchableOpacity>
            </View>

            {results.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="search" size={28} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {mode === 'saved' && !q
                    ? t.faculty2.noSavedTeachersEmpty
                    : t.faculty2.noMatchingTeachers}
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
                    onContact={() => setContactTeacher(f)}
                    C={C}
                    goldColor={Accent.gold}
                    isDark={isDark}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          branches.map(({ branch, depts }) => (
            <View key={branch}>
              <Text style={[styles.branchTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {branch}
              </Text>
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
                      <View style={[styles.deptTile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
                        <Feather name={BRANCH_ICON[d.branch] ?? 'book-open'} size={19} color={FACULTY_ACCENT} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.deptName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {shortDept(d.name)}
                        </Text>
                        <Text style={[styles.deptCount, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {count} teacher{count === 1 ? '' : 's'}
                          {d.chairman ? ` · ${d.chairman.split('(')[0].trim()}` : ''}
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

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Institutional Contact Sheet */}
      {contactTeacher && (
        <ContactSheet
          visible={!!contactTeacher}
          name={contactTeacher.name}
          title={contactTeacher.designation}
          roleSubtitle={deptById[contactTeacher.department_id]?.name}
          avatarUri={contactTeacher.photo_url}
          phone={contactTeacher.phone}
          email={contactTeacher.email}
          whatsAppMessage={`Hello ${contactTeacher.name}, I am a student of BUBT contacting you regarding academic consultation.`}
          onClose={() => setContactTeacher(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 24 } as ViewStyle,

  savedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  } as ViewStyle,
  savedBtnTxt: { fontSize: 12.5 } as TextStyle,

  tabTrack: {
    position: 'relative',
    flexDirection: 'row',
    height: 40,
    borderRadius: 12,
    padding: 2,
    marginBottom: 12,
  } as ViewStyle,
  tabIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 10,
  } as ViewStyle,
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  } as ViewStyle,
  tabText: {
    fontSize: 12.5,
  } as TextStyle,

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 12,
  } as TextStyle,

  bannerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
  } as ViewStyle,
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  } as ViewStyle,
  bannerTitle: {
    fontSize: 13.5,
  } as TextStyle,
  bannerDesc: {
    fontSize: 12,
    lineHeight: 17,
  } as TextStyle,

  deptChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 10,
  } as ViewStyle,
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
  deptChipTxt: {
    fontSize: 12,
  } as TextStyle,

  interestsContainer: {
    marginBottom: 12,
  } as ViewStyle,
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 8,
  } as TextStyle,
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  } as ViewStyle,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
  chipTxt: { fontSize: 11.5 } as TextStyle,
  chipCount: { fontSize: 10.5 } as TextStyle,

  resultsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  } as ViewStyle,
  resultsTxt: { fontSize: 12.5 } as TextStyle,
  clearTxt: { fontSize: 12.5 } as TextStyle,

  branchTitle: {
    fontSize: 14.5,
    marginTop: 18,
    marginBottom: 9,
  } as TextStyle,
  list: { gap: 10 } as ViewStyle,

  deptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  deptTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  deptName: { fontSize: 14 } as TextStyle,
  deptCount: { fontSize: 11.5, marginTop: 2 } as TextStyle,

  empty: {
    alignItems: 'center',
    paddingTop: 50,
    gap: 8,
    paddingHorizontal: 20,
  } as ViewStyle,
  emptyTxt: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 } as TextStyle,
});
