// Faculty Directory - browse departments grouped by faculty categories,
// search by teacher initial routine codes (DALM, SR, SAM), filter research mentors
// for paper publication, and manage saved teachers.
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Animated, Modal, KeyboardAvoidingView, Platform,
  BackHandler,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { LogoMark } from '../../components/ui/Logo';
import { useToast } from '../../components/ui/Toast';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, Accent, Radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { useAuth } from '../../store/authStore';
import {
  FACULTY_ACCENT, BRANCH_ICON, shortDept, sortFaculty, interestsOf,
  FACULTY_CATEGORIES, type FacultyCategory, TeacherBar,
  type FacultyMember, type Department,
} from './facultyShared';

type TabMode = 'all' | 'mentors' | 'saved';

const INITIAL_RENDER_LIMIT = 25;

export function FacultyScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();

  const [mode, setMode] = useState<TabMode>('all');
  const [query, setQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [interest, setInterest] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FacultyCategory | null>(null);

  // Pagination limit to eliminate tab-switch lag
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_RENDER_LIMIT);

  // Modals for dropdown bars
  const [deptPickerVisible, setDeptPickerVisible] = useState(false);
  const [domainPickerVisible, setDomainPickerVisible] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Active teacher for ContactSheet
  const [contactTeacher, setContactTeacher] = useState<FacultyMember | null>(null);



  // Reset pagination when switching tabs or changing filters
  useEffect(() => {
    setVisibleLimit(INITIAL_RENDER_LIMIT);
  }, [mode, selectedDeptId, interest, query]);

  // Handle hardware & gesture back button on Android
  useEffect(() => {
    const onBackPress = () => {
      if (domainPickerVisible) {
        setDomainPickerVisible(false);
        return true;
      }
      if (deptPickerVisible) {
        setDeptPickerVisible(false);
        return true;
      }
      if (query.length > 0) {
        setQuery('');
        return true;
      }
      if (selectedCategory && mode === 'all') {
        setSelectedCategory(null);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedCategory, mode, query, deptPickerVisible, domainPickerVisible]);

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

  // Top research domains memoized strictly against researchMentors to eliminate tab lag
  const popularInterests = useMemo(() => {
    const counts = new Map<string, { label: string; n: number }>();
    researchMentors.forEach(f => interestsOf(f).forEach(i => {
      const key = i.trim().toLowerCase();
      if (!key) return;
      const cur = counts.get(key) ?? { label: i.trim(), n: 0 };
      cur.n += 1;
      counts.set(key, cur);
    }));
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 25);
  }, [researchMentors]);

  const q = query.trim().toLowerCase();
  const isSearchActive = q.length > 0;

  // Filtered teachers list for Mentors, Saved, or Active Search
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
      const cleanQ = q.replace(/[^a-z0-9]/g, '');
      list = list.filter(f => {
        const nameMatch = f.name.toLowerCase().includes(q);
        const codeMatch = Boolean(
          f.short_code &&
          (f.short_code.toLowerCase().includes(q) ||
            (cleanQ.length > 0 && f.short_code.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQ)))
        );
        const desigMatch = f.designation.toLowerCase().includes(q);
        const roomMatch = Boolean(f.room_number && f.room_number.toLowerCase().includes(q));
        const interestMatch = interestsOf(f).some(i => i.toLowerCase().includes(q));
        const deptMatch = Boolean(
          deptById[f.department_id]?.name &&
          deptById[f.department_id]?.name.toLowerCase().includes(q)
        );
        return nameMatch || codeMatch || desigMatch || roomMatch || interestMatch || deptMatch;
      });
    }

    return sortFaculty(list);
  }, [faculty, researchMentors, q, interest, selectedDeptId, mode, savedIds, deptById]);

  // Sliced results for fast, 60fps rendering
  const displayedResults = useMemo(() => {
    return results.slice(0, visibleLimit);
  }, [results, visibleLimit]);

  // Departments under current selected category
  const selectedCategoryDepts = useMemo(() => {
    if (!selectedCategory) return [];
    return departments
      .filter(d => selectedCategory.branches.includes(d.branch))
      .sort((a, b) => (countByDept[b.id] || 0) - (countByDept[a.id] || 0));
  }, [selectedCategory, departments, countByDept]);

  const selectedCategoryTeachers = useMemo(() => {
    return selectedCategoryDepts.reduce((sum, d) => sum + (countByDept[d.id] || 0), 0);
  }, [selectedCategoryDepts, countByDept]);

  function clearFilters() {
    setQuery('');
    setInterest(null);
    setSelectedDeptId('All');
  }

  const FACULTY_TABS: TabItem<TabMode>[] = useMemo(() => [
    { id: 'all',     label: t.faculty2.tabDepartments,     color: FACULTY_ACCENT },
    { id: 'mentors', label: t.faculty2.tabResearchMentors, color: FACULTY_ACCENT },
    { id: 'saved',   label: t.faculty2.tabMyTeachers,      count: savedIds.size > 0 ? savedIds.size : undefined, color: Accent.gold },
  ], [t, savedIds.size]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Top App Bar with Official App Logo */}
      <SubBar
        title="Faculty Directory"
        onBack={() => {
          if (query.length > 0) {
            setQuery('');
          } else if (selectedCategory && mode === 'all') {
            setSelectedCategory(null);
          } else {
            navigation.goBack();
          }
        }}
        rightSlot={<LogoMark size={28} shadow={false} />}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* 3-Segmented Tabs Switcher */}
        <View style={{ marginBottom: 10 }}>
          <SegmentedTabs<TabMode>
            tabs={FACULTY_TABS}
            activeTab={mode}
            onTabChange={(nextMode) => {
              setMode(nextMode);
              if (nextMode === 'all') setSelectedCategory(null);
            }}
          />
        </View>

        {/* Global Search Bar (names, initial codes, rooms) */}
        <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Icon name="search" size={18} color={C.textMuted} />
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

        {/* =========================================================================
            TAB 1: DEPARTMENTS HIERARCHY (Faculty Categories -> Departments -> Teachers)
           ========================================================================= */}
        {mode === 'all' && !isSearchActive && (
          <>
            {!selectedCategory ? (
              // Level 1: Faculty Categories as full-width bars
              <View style={styles.list}>
                {FACULTY_CATEGORIES.map(cat => {
                  const catDepts = departments.filter(d => cat.branches.includes(d.branch));
                  const catTeacherCount = catDepts.reduce((sum, d) => sum + (countByDept[d.id] || 0), 0);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryBar, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.categoryIconTile, { backgroundColor: `${FACULTY_ACCENT}12` }]}>
                        <Feather name={cat.icon} size={22} color={FACULTY_ACCENT} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.categoryTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        <Text style={[styles.categorySubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {t.faculty2.departmentsCount(catDepts.length)} · {catTeacherCount} teachers
                        </Text>
                        <Text style={[styles.categoryDesc, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                          {cat.description}
                        </Text>
                      </View>
                      <Icon name="chevR" size={17} color={C.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              // Level 2: Inside Selected Faculty Category -> Departments as full-width bars
              // (Redundant in-screen back button removed per user request)
              <View>
                <View style={styles.catHeader}>
                  <Text style={[styles.catHeaderTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {selectedCategory.name}
                  </Text>
                  <Text style={[styles.catHeaderSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {selectedCategoryDepts.length} departments · {selectedCategoryTeachers} teachers
                  </Text>
                </View>

                <View style={styles.list}>
                  {selectedCategoryDepts.map(d => {
                    const count = countByDept[d.id] || 0;
                    return (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.deptBar, { backgroundColor: C.surface, borderColor: C.border }]}
                        onPress={() => navigation.navigate('FacultyDept', { deptId: d.id })}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.deptBarTile, { backgroundColor: `${FACULTY_ACCENT}12` }]}>
                          <Feather name={BRANCH_ICON[d.branch] ?? 'book-open'} size={20} color={FACULTY_ACCENT} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.deptBarName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {shortDept(d.name)}
                          </Text>
                          <Text style={[styles.deptBarMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                            {count} teachers{d.chairman ? ` · ${d.chairman.split('(')[0].trim()}` : ''}
                          </Text>
                        </View>
                        <Icon name="chevR" size={17} color={C.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}

        {/* =========================================================================
            TAB 2: RESEARCH MENTORS (Dropdown Bars for Department & Domain)
           ========================================================================= */}
        {mode === 'mentors' && !isSearchActive && (
          <View>
            {/* Mentors Banner */}
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

            {/* Department Dropdown Bar */}
            <TouchableOpacity
              style={[styles.dropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setDeptPickerVisible(true)}
              activeOpacity={0.75}
            >
              <View style={[styles.dropdownIconTile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
                <Feather name="layers" size={17} color={FACULTY_ACCENT} />
              </View>
              <View style={styles.dropdownBody}>
                <Text style={[styles.dropdownLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.faculty2.selectDepartment}
                </Text>
                <Text style={[styles.dropdownValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {selectedDeptId === 'All'
                    ? t.faculty2.allDepartments
                    : (shortDept(deptById[selectedDeptId]?.name) || t.faculty2.allDepartments)}
                </Text>
              </View>
              <Feather name="chevron-down" size={18} color={C.textMuted} />
            </TouchableOpacity>

            {/* Publication Domain Dropdown Bar */}
            <TouchableOpacity
              style={[styles.dropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setDomainPickerVisible(true)}
              activeOpacity={0.75}
            >
              <View style={[styles.dropdownIconTile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
                <Feather name="award" size={17} color={FACULTY_ACCENT} />
              </View>
              <View style={styles.dropdownBody}>
                <Text style={[styles.dropdownLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.faculty2.selectDomain}
                </Text>
                <Text style={[styles.dropdownValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {interest ? interest : t.faculty2.allDomains}
                </Text>
              </View>
              <Feather name="chevron-down" size={18} color={C.textMuted} />
            </TouchableOpacity>

            {/* Mentors Results Header */}
            <View style={styles.resultsHead}>
              <Text style={[styles.resultsTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {results.length} mentor{results.length === 1 ? '' : 's'}
                {interest ? ` · ${interest}` : ''}
              </Text>
              {(selectedDeptId !== 'All' || !!interest) && (
                <TouchableOpacity onPress={clearFilters} hitSlop={8}>
                  <Text style={[styles.clearTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                    {t.faculty2.resetFilters}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Mentors Roster rendered as compact TeacherBar with smooth windowing */}
            {results.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="award" size={28} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.faculty2.noMatchingTeachers}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {displayedResults.map(f => (
                  <TeacherBar
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

                {results.length > visibleLimit && (
                  <TouchableOpacity
                    style={[styles.loadMoreBar, { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setVisibleLimit(prev => prev + 25)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.loadMoreTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                      Show more ({results.length - visibleLimit} remaining)
                    </Text>
                    <Feather name="chevron-down" size={16} color={FACULTY_ACCENT} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            TAB 3: MY TEACHERS (Department Dropdown Bar + Saved TeacherBars)
           ========================================================================= */}
        {mode === 'saved' && !isSearchActive && (
          <View>
            {/* Department Dropdown Bar for Saved Teachers */}
            <TouchableOpacity
              style={[styles.dropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setDeptPickerVisible(true)}
              activeOpacity={0.75}
            >
              <View style={[styles.dropdownIconTile, { backgroundColor: `${Accent.gold}18` }]}>
                <Feather name="layers" size={17} color={Accent.gold} />
              </View>
              <View style={styles.dropdownBody}>
                <Text style={[styles.dropdownLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.faculty2.selectDepartment}
                </Text>
                <Text style={[styles.dropdownValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {selectedDeptId === 'All'
                    ? t.faculty2.allDepartments
                    : (shortDept(deptById[selectedDeptId]?.name) || t.faculty2.allDepartments)}
                </Text>
              </View>
              <Feather name="chevron-down" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <View style={styles.resultsHead}>
              <Text style={[styles.resultsTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {results.length} saved teacher{results.length === 1 ? '' : 's'}
              </Text>
              {selectedDeptId !== 'All' && (
                <TouchableOpacity onPress={() => setSelectedDeptId('All')} hitSlop={8}>
                  <Text style={[styles.clearTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                    {t.faculty2.resetFilters}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {results.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="star" size={32} color={Accent.gold} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.faculty2.noSavedTeachersEmpty}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {displayedResults.map(f => (
                  <TeacherBar
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

                {results.length > visibleLimit && (
                  <TouchableOpacity
                    style={[styles.loadMoreBar, { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setVisibleLimit(prev => prev + 25)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.loadMoreTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                      Show more ({results.length - visibleLimit} remaining)
                    </Text>
                    <Feather name="chevron-down" size={16} color={FACULTY_ACCENT} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            SEARCH RESULTS STREAM (When typing query)
           ========================================================================= */}
        {isSearchActive && (
          <View>
            <View style={styles.resultsHead}>
              <Text style={[styles.resultsTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {results.length} teacher{results.length === 1 ? '' : 's'} found
              </Text>
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Text style={[styles.clearTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                  {t.faculty2.resetFilters}
                </Text>
              </TouchableOpacity>
            </View>

            {results.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="search" size={28} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.faculty2.noMatchingTeachers}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {displayedResults.map(f => (
                  <TeacherBar
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

                {results.length > visibleLimit && (
                  <TouchableOpacity
                    style={[styles.loadMoreBar, { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setVisibleLimit(prev => prev + 25)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.loadMoreTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                      Show more ({results.length - visibleLimit} remaining)
                    </Text>
                    <Feather name="chevron-down" size={16} color={FACULTY_ACCENT} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* =========================================================================
          DEPARTMENT PICKER BOTTOM SHEET MODAL (Bars Layout)
         ========================================================================= */}
      <Modal
        visible={deptPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDeptPickerVisible(false)}
          />
          <View style={[styles.sheetCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.faculty2.selectDepartment}
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* All Departments Bar */}
              <TouchableOpacity
                style={[
                  styles.pickerBar,
                  {
                    backgroundColor: selectedDeptId === 'All'
                      ? (isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)')
                      : C.surface2,
                    borderColor: selectedDeptId === 'All' ? FACULTY_ACCENT : C.border,
                  },
                ]}
                onPress={() => {
                  setSelectedDeptId('All');
                  setDeptPickerVisible(false);
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.pickerIconTile,
                    {
                      backgroundColor: selectedDeptId === 'All'
                        ? FACULTY_ACCENT
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    },
                  ]}
                >
                  <Feather
                    name="layers"
                    size={17}
                    color={selectedDeptId === 'All' ? '#fff' : FACULTY_ACCENT}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      styles.pickerBarText,
                      {
                        color: selectedDeptId === 'All' ? FACULTY_ACCENT : C.text,
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                  >
                    {t.faculty2.allDepartments}
                  </Text>
                  <Text style={[styles.pickerBarSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    All 13 BUBT academic departments
                  </Text>
                </View>
                {selectedDeptId === 'All' ? (
                  <View style={[styles.checkCircle, { backgroundColor: FACULTY_ACCENT }]}>
                    <Feather name="check" size={13} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                )}
              </TouchableOpacity>

              {departments.map(d => {
                const count = mode === 'mentors'
                  ? researchMentors.filter(f => f.department_id === d.id).length
                  : (countByDept[d.id] || 0);
                const active = selectedDeptId === d.id;

                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.pickerBar,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)')
                          : C.surface2,
                        borderColor: active ? FACULTY_ACCENT : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedDeptId(d.id);
                      setDeptPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.pickerIconTile,
                        {
                          backgroundColor: active
                            ? FACULTY_ACCENT
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                        },
                      ]}
                    >
                      <Feather
                        name={BRANCH_ICON[d.branch] ?? 'book-open'}
                        size={17}
                        color={active ? '#fff' : FACULTY_ACCENT}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? FACULTY_ACCENT : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {shortDept(d.name)}
                      </Text>
                      <Text style={[styles.pickerBarSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {d.branch} · {count} {mode === 'mentors' ? 'mentors' : 'teachers'}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: FACULTY_ACCENT }]}>
                        <Feather name="check" size={13} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.sheetCloseBtn, { borderColor: C.border }]}
              onPress={() => setDeptPickerVisible(false)}
            >
              <Text style={[styles.sheetCloseTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =========================================================================
          PUBLICATION DOMAIN PICKER BOTTOM SHEET MODAL (Bars Layout)
         ========================================================================= */}
      <Modal
        visible={domainPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDomainPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDomainPickerVisible(false)}
          />
          <View style={[styles.sheetCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.faculty2.selectDomain}
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* All Domains Bar */}
              <TouchableOpacity
                style={[
                  styles.pickerBar,
                  {
                    backgroundColor: !interest
                      ? (isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)')
                      : C.surface2,
                    borderColor: !interest ? FACULTY_ACCENT : C.border,
                  },
                ]}
                onPress={() => {
                  setInterest(null);
                  setDomainPickerVisible(false);
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.pickerIconTile,
                    {
                      backgroundColor: !interest
                        ? FACULTY_ACCENT
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    },
                  ]}
                >
                  <Feather
                    name="award"
                    size={17}
                    color={!interest ? '#fff' : FACULTY_ACCENT}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      styles.pickerBarText,
                      {
                        color: !interest ? FACULTY_ACCENT : C.text,
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                  >
                    {t.faculty2.allDomains}
                  </Text>
                  <Text style={[styles.pickerBarSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    All publication topics & research areas
                  </Text>
                </View>
                {!interest ? (
                  <View style={[styles.checkCircle, { backgroundColor: FACULTY_ACCENT }]}>
                    <Feather name="check" size={13} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                )}
              </TouchableOpacity>

              {popularInterests.map(it => {
                const active = !!interest && interest.toLowerCase() === it.label.toLowerCase();
                return (
                  <TouchableOpacity
                    key={it.label}
                    style={[
                      styles.pickerBar,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)')
                          : C.surface2,
                        borderColor: active ? FACULTY_ACCENT : C.border,
                      },
                    ]}
                    onPress={() => {
                      setInterest(it.label);
                      setDomainPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.pickerIconTile,
                        {
                          backgroundColor: active
                            ? FACULTY_ACCENT
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                        },
                      ]}
                    >
                      <Feather
                        name="bookmark"
                        size={17}
                        color={active ? '#fff' : FACULTY_ACCENT}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? FACULTY_ACCENT : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {it.label}
                      </Text>
                      <Text style={[styles.pickerBarSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {it.n} research mentor{it.n === 1 ? '' : 's'}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: FACULTY_ACCENT }]}>
                        <Feather name="check" size={13} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.sheetCloseBtn, { borderColor: C.border }]}
              onPress={() => setDomainPickerVisible(false)}
            >
              <Text style={[styles.sheetCloseTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

  // Tab switcher matching HomeCommunityUpdates
  tabTrack: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
    marginTop: 4,
    position: 'relative',
  } as ViewStyle,

  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 13,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  } as ViewStyle,

  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 13,
    zIndex: 1,
  } as ViewStyle,

  tabText: {
    fontSize: 13,
  } as TextStyle,

  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
    minWidth: 19,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  tabBadgeTxt: {
    fontSize: 11,
  } as TextStyle,

  // Search input
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
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  // Faculty category full-width bars
  categoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  categoryIconTile: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  categoryTitle: {
    fontSize: 14.5,
  } as TextStyle,
  categorySubtitle: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  categoryDesc: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,

  // Drilled category view header (clean title and count without redundant back button)
  catHeader: {
    marginBottom: 14,
    paddingHorizontal: 2,
  } as ViewStyle,
  catHeaderTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
  } as TextStyle,
  catHeaderSub: {
    fontSize: 12.5,
    marginTop: 3,
  } as TextStyle,

  // Department bars under category
  deptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,
  deptBarTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  deptBarName: {
    fontSize: 14,
  } as TextStyle,
  deptBarMeta: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,

  // Full-width dropdown selector bars (standard 58dp)
  dropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: Layout.controlHeight,
    paddingHorizontal: 16,
    borderRadius: Layout.controlRadius,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  dropdownIconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dropdownBody: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  dropdownLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } as TextStyle,
  dropdownValue: {
    fontSize: 13.5,
    marginTop: 2,
  } as TextStyle,

  // Banner card
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

  // Results header
  resultsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
  } as ViewStyle,
  resultsTxt: {
    fontSize: 12.5,
  } as TextStyle,
  clearTxt: {
    fontSize: 12.5,
  } as TextStyle,

  list: {
    gap: 2,
  } as ViewStyle,

  // Pagination Load More Bar
  loadMoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  } as ViewStyle,
  loadMoreTxt: {
    fontSize: 13,
  } as TextStyle,

  empty: {
    alignItems: 'center',
    paddingTop: 50,
    gap: 8,
    paddingHorizontal: 20,
  } as ViewStyle,
  emptyTxt: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  } as TextStyle,

  // Bottom sheet modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.screenPadding + 10,
    maxHeight: '82%',
  } as ViewStyle,
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  } as ViewStyle,
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 14,
  } as TextStyle,

  // Institutional bars for picker modal items
  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,
  pickerIconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pickerBarText: {
    fontSize: 14,
  } as TextStyle,
  pickerBarSub: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  } as ViewStyle,

  sheetCloseBtn: {
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  } as ViewStyle,
  sheetCloseTxt: {
    fontSize: 14.5,
  } as TextStyle,
});
