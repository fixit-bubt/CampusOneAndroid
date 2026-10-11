// Faculty Directory - browse departments grouped by faculty categories,
// search by teacher initial routine codes (DALM, SR, SAM), filter research mentors
// for paper publication, and manage saved teachers.
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Animated, Modal, FlatList, KeyboardAvoidingView, Platform,
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

export function FacultyScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();

  const [mode, setMode] = useState<TabMode>('all');
  const [query, setQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [interest, setInterest] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FacultyCategory | null>(null);

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

  // Segmented animated indicator matching HomeCommunityUpdates
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
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 20);
  }, [faculty, researchMentors, mode]);

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
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.short_code && f.short_code.toLowerCase().includes(q)) ||
        f.designation.toLowerCase().includes(q) ||
        (f.room_number && f.room_number.toLowerCase().includes(q)) ||
        interestsOf(f).some(i => i.toLowerCase().includes(q)) ||
        (deptById[f.department_id]?.name && deptById[f.department_id]?.name.toLowerCase().includes(q)));
    }

    return sortFaculty(list);
  }, [faculty, researchMentors, q, interest, selectedDeptId, mode, savedIds, deptById]);

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

  // Sizing matched to HomeCommunityUpdates tab switcher
  const segmentWidth = trackWidth > 0 ? (trackWidth - 8) / 3 : 0;
  const translateX = animIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, segmentWidth, segmentWidth * 2],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Top App Bar with Official App Logo */}
      <SubBar
        title="Faculty Directory"
        onBack={() => {
          if (selectedCategory && mode === 'all' && !isSearchActive) {
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

        {/* 3-Segmented Tabs Switcher styled to match HomeCommunityUpdates */}
        <View
          style={[styles.tabTrack, { backgroundColor: C.surface2 }]}
          onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        >
          {segmentWidth > 0 && (
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  width: segmentWidth,
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  transform: [{ translateX }],
                },
              ]}
            />
          )}

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => {
              setMode('all');
              setSelectedCategory(null);
            }}
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
            {savedIds.size > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: `${Accent.gold}22` }]}>
                <Text style={[styles.tabBadgeTxt, { color: Accent.gold, fontFamily: FontFamily.jakartaBold }]}>
                  {savedIds.size}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Global Search Bar (names, initial codes, rooms) */}
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
              <View>
                <TouchableOpacity
                  style={[styles.backToCatBar, { backgroundColor: C.surface2 }]}
                  onPress={() => setSelectedCategory(null)}
                  activeOpacity={0.75}
                >
                  <Feather name="arrow-left" size={15} color={FACULTY_ACCENT} />
                  <Text style={[styles.backToCatTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                    {t.faculty2.backToFaculties}
                  </Text>
                </TouchableOpacity>

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

            {/* Mentors Roster rendered as compact TeacherBar */}
            {results.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="award" size={28} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.faculty2.noMatchingTeachers}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {results.map(f => (
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
                {results.map(f => (
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
                {results.map(f => (
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
              </View>
            )}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* =========================================================================
          DEPARTMENT PICKER BOTTOM SHEET MODAL
         ========================================================================= */}
      <Modal
        visible={deptPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* All Departments Option */}
              <TouchableOpacity
                style={[
                  styles.pickerRow,
                  { borderBottomColor: C.border },
                  selectedDeptId === 'All' && { backgroundColor: `${FACULTY_ACCENT}10` },
                ]}
                onPress={() => {
                  setSelectedDeptId('All');
                  setDeptPickerVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.pickerIconTile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
                  <Feather name="layers" size={16} color={FACULTY_ACCENT} />
                </View>
                <Text style={[styles.pickerRowText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.faculty2.allDepartments}
                </Text>
                {selectedDeptId === 'All' && (
                  <Feather name="check" size={18} color={FACULTY_ACCENT} />
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
                      styles.pickerRow,
                      { borderBottomColor: C.border },
                      active && { backgroundColor: `${FACULTY_ACCENT}10` },
                    ]}
                    onPress={() => {
                      setSelectedDeptId(d.id);
                      setDeptPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pickerIconTile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
                      <Feather name={BRANCH_ICON[d.branch] ?? 'book-open'} size={16} color={FACULTY_ACCENT} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.pickerRowText, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {shortDept(d.name)}
                      </Text>
                      <Text style={[styles.pickerRowSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {d.branch} · {count} {mode === 'mentors' ? 'mentors' : 'teachers'}
                      </Text>
                    </View>
                    {active && (
                      <Feather name="check" size={18} color={FACULTY_ACCENT} />
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
          PUBLICATION DOMAIN PICKER BOTTOM SHEET MODAL
         ========================================================================= */}
      <Modal
        visible={domainPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDomainPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* All Domains Option */}
              <TouchableOpacity
                style={[
                  styles.pickerRow,
                  { borderBottomColor: C.border },
                  !interest && { backgroundColor: `${FACULTY_ACCENT}10` },
                ]}
                onPress={() => {
                  setInterest(null);
                  setDomainPickerVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.pickerIconTile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
                  <Feather name="award" size={16} color={FACULTY_ACCENT} />
                </View>
                <Text style={[styles.pickerRowText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.faculty2.allDomains}
                </Text>
                {!interest && (
                  <Feather name="check" size={18} color={FACULTY_ACCENT} />
                )}
              </TouchableOpacity>

              {popularInterests.map(it => {
                const active = !!interest && interest.toLowerCase() === it.label.toLowerCase();
                return (
                  <TouchableOpacity
                    key={it.label}
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: C.border },
                      active && { backgroundColor: `${FACULTY_ACCENT}10` },
                    ]}
                    onPress={() => {
                      setInterest(it.label);
                      setDomainPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pickerIconTile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
                      <Feather name="bookmark" size={16} color={FACULTY_ACCENT} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.pickerRowText, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {it.label}
                      </Text>
                      <Text style={[styles.pickerRowSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {it.n} research mentor{it.n === 1 ? '' : 's'}
                      </Text>
                    </View>
                    {active && (
                      <Feather name="check" size={18} color={FACULTY_ACCENT} />
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
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 12,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 11,
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

  // Drilled category view
  backToCatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  } as ViewStyle,
  backToCatTxt: {
    fontSize: 12.5,
  } as TextStyle,

  catHeader: {
    marginBottom: 12,
  } as ViewStyle,
  catHeaderTitle: {
    fontSize: 17,
  } as TextStyle,
  catHeaderSub: {
    fontSize: 12.5,
    marginTop: 2,
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

  // Full-width dropdown selector bars
  dropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  } as ViewStyle,
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.screenPadding + 10,
    maxHeight: '80%',
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  pickerIconTile: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pickerRowText: {
    fontSize: 14,
  } as TextStyle,
  pickerRowSub: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,
  sheetCloseBtn: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  } as ViewStyle,
  sheetCloseTxt: {
    fontSize: 14.5,
  } as TextStyle,
});
