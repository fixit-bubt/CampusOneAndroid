// Admin-only. Manage BUBT faculty directory: 1-tap live website crawler sync,
// manual overrides for office rooms, building, floor, counseling hours,
// teacher initial routine codes (DALM, SR), photos, and research flags.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
  FlatList, RefreshControl, BackHandler, Alert, ScrollView,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { TactileSwitch } from '../../components/ui/TactileSwitch';

import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { uploadFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { formatRelativeTime } from '../../utils/format';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import {
  shortDept, BRANCH_ICON, sortFaculty,
  type Department, type FacultyMember,
} from '../faculty/facultyShared';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

interface FacultyRow {
  id: string;
  name: string;
  designation: string;
  department_id: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  short_code: string | null;
  room_number: string | null;
  building: string | null;
  floor: string | null;
  counseling_hours: string | null;
  blood_group: string | null;
  is_accepting_research: boolean;
  research_interests: string[] | null;
  on_leave: boolean;
  is_chairman?: boolean;
  departments?: { id: string; name: string; branch?: string } | null;
}

interface SyncLog {
  id: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string | null;
  status: string;
  items_scanned?: number;
  total_scanned?: number;
  items_added?: number;
  new_added?: number;
  items_updated?: number;
  promotions_updated?: number;
  duration_ms?: number;
}

// BUBT Academic Designations
const FACULTY_DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Senior Lecturer',
  'Lecturer',
  'Teaching Assistant',
  'Demonstrator',
  'Adjunct / Visiting Faculty',
];

// BUBT Campus Buildings
const CAMPUS_BUILDINGS = [
  'Building 1',
  'Building 2',
  'Building 3',
  'Building 4',
  'Other / Annex',
];

// Standard Blood Groups
const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
];

// Memoized teacher card for 120 FPS virtualized FlatList rendering
const TeacherCard = React.memo(function TeacherCard({
  f,
  deptName,
  onPress,
  C,
}: {
  f: FacultyRow;
  deptName?: string;
  onPress: () => void;
  C: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.teacherBar, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.barAvatarWrap}>
        <Avatar uri={f.photo_url} name={f.name} size="md" />
        {f.on_leave && (
          <View style={[styles.leaveDot, { backgroundColor: C.warn, borderColor: C.surface }]} />
        )}
      </View>

      <View style={styles.barBody}>
        <View style={styles.barNameRow}>
          <Text style={[styles.barName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {f.name}
          </Text>
          {f.short_code ? (
            <View style={[styles.codeBadge, { backgroundColor: `${SectorColors.faculty}18` }]}>
              <Text style={[styles.codeBadgeTxt, { color: SectorColors.faculty, fontFamily: FontFamily.jakartaExtraBold }]}>
                {f.short_code}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.barDesig, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
          {f.designation}{deptName ? ` · ${shortDept(deptName)}` : ''}
        </Text>

        <View style={styles.barMetaRow}>
          {f.room_number ? (
            <View style={styles.metaLoc}>
              <Icon name="pin" size={11} color={C.textMuted} />
              <Text style={[styles.metaLocTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {f.building ? `${f.building} · ` : ''}Rm {f.room_number}
              </Text>
            </View>
          ) : null}
          {!f.photo_url && (
            <View style={[styles.noPhotoPill, { backgroundColor: C.warnBg }]}>
              <Text style={[styles.noPhotoTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                No photo
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.editAction}>
        <Feather name="edit-2" size={16} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
});

export function ManageFacultyScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [list, setList] = useState<FacultyRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [deptPickerVisible, setDeptPickerVisible] = useState(false);
  const [formDeptPickerVisible, setFormDeptPickerVisible] = useState(false);
  const [designationPickerVisible, setDesignationPickerVisible] = useState(false);
  const [bloodPickerVisible, setBloodPickerVisible] = useState(false);
  const [buildingPickerVisible, setBuildingPickerVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(handler);
  }, [query]);

  // Full-page edit and create target
  const [target, setTarget] = useState<FacultyRow | null>(null);
  const [isNewTeacher, setIsNewTeacher] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [lastSyncLog, setLastSyncLog] = useState<SyncLog | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Edit form state
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Lecturer');
  const [shortCode, setShortCode] = useState('');
  const [building, setBuilding] = useState('Building 2');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [counselingHours, setCounselingHours] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [interests, setInterests] = useState('');
  const [onLeave, setOnLeave] = useState(false);
  const [isAcceptingResearch, setIsAcceptingResearch] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const deptById = useMemo(() => {
    const map: Record<string, Department> = {};
    for (const d of departments) {
      map[d.id] = d;
    }
    return map;
  }, [departments]);

  const load = useCallback(async () => {
    // 1. Instant cache load for immediate screen render
    const [cachedDepts, cachedFac] = await Promise.all([
      getCache<Department[]>(CacheKeys.FACULTY_DEPTS),
      getCache<FacultyRow[]>(CacheKeys.FACULTY_LIST),
    ]);
    if (cachedDepts && cachedDepts.length > 0) setDepartments(cachedDepts);
    if (cachedFac && cachedFac.length > 0) {
      setList(cachedFac);
      setLoading(false);
    }

    // 2. Fresh fetch from Supabase
    try {
      const [facRes, deptRes, logRes] = await Promise.all([
        supabase
          .from('faculty')
          .select('id, name, designation, department_id, email, phone, photo_url, short_code, room_number, building, floor, counseling_hours, blood_group, is_accepting_research, research_interests, on_leave, is_chairman, departments(id, name, branch)')
          .order('name')
          .limit(250),
        supabase.from('departments').select('id, name, branch, dept_number, chairman').order('name'),
        supabase.from('crawler_audit_logs' as any).select('*').eq('feature', 'faculty').order('created_at', { ascending: false }).limit(1),
      ]);

      if (facRes.data) {
        setList(facRes.data as unknown as FacultyRow[]);
        setCache(CacheKeys.FACULTY_LIST, facRes.data);
      }
      if (deptRes.data) {
        setDepartments(deptRes.data as unknown as Department[]);
        setCache(CacheKeys.FACULTY_DEPTS, deptRes.data);
      }
      if (logRes.data && logRes.data[0]) {
        setLastSyncLog(logRes.data[0] as unknown as SyncLog);
      } else {
        const { data: legacyLog } = await supabase.from('faculty_sync_logs').select('*').order('started_at', { ascending: false }).limit(1);
        if (legacyLog && legacyLog[0]) setLastSyncLog(legacyLog[0] as unknown as SyncLog);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusRefresh(load);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      if (syncModalVisible) {
        setSyncModalVisible(false);
        return true;
      }
      if (designationPickerVisible) {
        setDesignationPickerVisible(false);
        return true;
      }
      if (bloodPickerVisible) {
        setBloodPickerVisible(false);
        return true;
      }
      if (buildingPickerVisible) {
        setBuildingPickerVisible(false);
        return true;
      }
      if (formDeptPickerVisible) {
        setFormDeptPickerVisible(false);
        return true;
      }
      if (target) {
        setTarget(null);
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
      if (selectedDeptId !== 'All') {
        setSelectedDeptId('All');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [syncModalVisible, designationPickerVisible, bloodPickerVisible, buildingPickerVisible, formDeptPickerVisible, target, deptPickerVisible, query, selectedDeptId]);

  function openEdit(f: FacultyRow) {
    setIsNewTeacher(false);
    setTarget(f);
    setName(f.name);
    setDepartmentId(f.department_id);
    setEmail(f.email ?? '');
    setPhone(f.phone ?? '');
    setDesignation(f.designation ?? 'Lecturer');
    setShortCode(f.short_code ?? '');
    setBuilding(f.building ?? 'Building 2');
    setRoomNumber(f.room_number ?? '');
    setFloor(f.floor ?? '');
    setCounselingHours(f.counseling_hours ?? '');
    setBloodGroup(f.blood_group ?? '');
    setInterests(Array.isArray(f.research_interests) ? f.research_interests.join(', ') : '');
    setOnLeave(f.on_leave);
    setIsAcceptingResearch(f.is_accepting_research ?? true);
    setPhotoUri(null);
  }

  function openCreate() {
    setIsNewTeacher(true);
    setTarget({} as any);
    setName('');
    setDepartmentId(selectedDeptId !== 'All' ? selectedDeptId : (departments[0]?.id || ''));
    setEmail('');
    setPhone('');
    setDesignation('Lecturer');
    setShortCode('');
    setBuilding('Building 2');
    setRoomNumber('');
    setFloor('');
    setCounselingHours('');
    setBloodGroup('');
    setInterests('');
    setOnLeave(false);
    setIsAcceptingResearch(true);
    setPhotoUri(null);
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function triggerLiveSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncModalVisible(true);
    try {
      const { data, error } = await supabase.functions.invoke('bubt-crawler', {
        headers: { 'x-force-sync': 'true' },
        body: { tier: 'faculty', feature: 'faculty' },
      });
      if (error) {
        toast({ type: 'error', title: 'Sync Failed', message: error.message });
        setSyncResult({ error: error.message });
      } else {
        setSyncResult(data);
        const scanned = data?.features?.faculty?.scanned ?? data?.items_scanned ?? data?.total_scanned ?? 0;
        toast({ type: 'success', title: 'Live Sync Finished', message: `Scanned ${scanned} profiles` });
        await load();
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Sync Error', message: err.message });
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function save() {
    if (saving) return;
    if (!name.trim()) {
      toast({ type: 'error', title: 'Please provide teacher name' });
      return;
    }
    const effectiveDeptId = departmentId || target?.department_id;
    if (!effectiveDeptId) {
      toast({ type: 'error', title: 'Please select a department' });
      return;
    }
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      const targetId = isNewTeacher ? `new_${Date.now()}` : target?.id;

      if (photoUri) {
        const up = await uploadFile(BUCKETS.photos, photoUri, `faculty/${targetId}/${Date.now()}.jpg`, 'image/jpeg', true, { preset: 'avatar' });
        if (!up.success) { toast({ type: 'error', title: t.common.error, message: up.error }); return; }
        photoUrl = up.url;
      }

      const payload: any = {
        name: name.trim(),
        department_id: effectiveDeptId,
        email: email.trim() || null,
        phone: phone.trim() || null,
        designation: designation.trim() || 'Lecturer',
        short_code: shortCode.trim().toUpperCase() || null,
        building: building.trim() || null,
        room_number: roomNumber.trim() || null,
        floor: floor.trim() || null,
        counseling_hours: counselingHours.trim() || null,
        blood_group: bloodGroup.trim().toUpperCase() || null,
        is_accepting_research: isAcceptingResearch,
        research_interests: interests.trim()
          ? interests.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        on_leave: onLeave,
      };

      if (photoUrl) payload.photo_url = photoUrl;

      if (isNewTeacher) {
        const { error } = await supabase.from('faculty').insert(payload);
        if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
        toast({ type: 'success', title: 'Teacher Added', message: `${name} added to directory` });
      } else if (target) {
        const { error } = await supabase.from('faculty').update(payload).eq('id', target.id);
        if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
        toast({ type: 'success', title: 'Changes Saved', message: `${name} updated` });
      }

      setTarget(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(f: FacultyRow) {
    Alert.alert(
      'Delete Teacher',
      `Are you sure you want to remove ${f.name} from the directory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase.from('faculty').delete().eq('id', f.id);
              if (error) {
                toast({ type: 'error', title: 'Delete Failed', message: error.message });
                return;
              }
              toast({ type: 'success', title: 'Teacher Removed', message: `${f.name} deleted from directory` });
              setTarget(null);
              await load();
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  const q = debouncedQuery.trim().toLowerCase();
  const cleanQ = q.replace(/[^a-z0-9]/g, '');
  const words = useMemo(() => q.split(/[\s.]+/).filter(Boolean), [q]);

  const filtered = useMemo(() => {
    let res = list;
    if (selectedDeptId !== 'All') {
      res = res.filter(f => f.department_id === selectedDeptId);
    }
    if (q) {
      res = res.filter(f => {
        const lowerName = (f.name || '').toLowerCase();
        const cleanName = lowerName.replace(/[^a-z0-9]/g, '');
        const lowerCode = (f.short_code || '').toLowerCase();
        const cleanCode = lowerCode.replace(/[^a-z0-9]/g, '');

        const nameMatch = lowerName.includes(q) || (cleanQ.length > 0 && cleanName.includes(cleanQ));
        const allWordsMatch = words.length > 1 && words.every(w => {
          const cw = w.replace(/[^a-z0-9]/g, '');
          return lowerName.includes(w) || cleanName.includes(cw) || lowerCode.includes(cw);
        });
        const codeMatch = Boolean(
          cleanCode &&
          cleanQ.length > 0 &&
          (lowerCode.includes(q) || cleanCode.includes(cleanQ) || cleanQ.includes(cleanCode))
        );
        const desigMatch = (f.designation || '').toLowerCase().includes(q);
        const roomMatch = Boolean(
          (f.room_number && f.room_number.toLowerCase().includes(cleanQ || q)) ||
          (f.building && f.building.toLowerCase().includes(q))
        );
        const deptName = deptById[f.department_id]?.name || f.departments?.name;
        const deptMatch = Boolean(deptName && deptName.toLowerCase().includes(q));

        return nameMatch || allWordsMatch || codeMatch || desigMatch || roomMatch || deptMatch;
      });
    }
    return sortFaculty(res as unknown as FacultyMember[]) as unknown as FacultyRow[];
  }, [list, selectedDeptId, q, cleanQ, words, deptById]);

  const renderTeacherItem = useCallback(({ item }: { item: FacultyRow }) => (
    <TeacherCard
      f={item}
      deptName={deptById[item.department_id]?.name}
      onPress={() => openEdit(item)}
      C={C}
    />
  ), [deptById, C]);

  const teacherKeyExtractor = useCallback((item: FacultyRow) => item.id, []);

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.manage.manageFaculty} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>
            {t.manage.accessDenied}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => {
    const selectedDept = selectedDeptId === 'All' ? null : deptById[selectedDeptId];
    return (
      <View style={{ paddingTop: 8 }}>
        {/* Live Website Automated Sync Card */}
        <View style={[styles.syncCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.syncCardTop}>
            <View style={styles.syncIconWrap}>
              <AnimatedIcon name="refresh-cw" size={32} color={C.text} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.syncTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.manage.bubtLiveSyncTitle}
              </Text>
              <Text style={[styles.syncSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {lastSyncLog
                  ? `Last crawl: ${formatRelativeTime(lastSyncLog.created_at || lastSyncLog.started_at || new Date().toISOString())}`
                  : 'Automated crawler for all 13 BUBT departments'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncActionBtn, { backgroundColor: C.brand }]}
            onPress={triggerLiveSync}
            disabled={syncing}
            activeOpacity={0.85}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="globe" size={18} color="#fff" />
                <Text style={[styles.syncActionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.manage.syncNowBtn}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Add Faculty Member 58dp Action Bar */}
        <TouchableOpacity
          style={[styles.addFacultyBar, { backgroundColor: C.brand }]}
          onPress={openCreate}
          activeOpacity={0.85}
        >
          <Feather name="user-plus" size={18} color="#fff" />
          <Text style={[styles.addFacultyBarTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
            {t.manage.addFacultyMember}
          </Text>
        </TouchableOpacity>

        {/* 58dp Department Dropdown Bar */}
        <TouchableOpacity
          style={[styles.dropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => setDeptPickerVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.dropdownIconTile}>
            <AnimatedIcon name="layers" size={32} color={C.text} />
          </View>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={[styles.dropdownValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {selectedDeptId === 'All'
                ? t.faculty2.allDepartments
                : (shortDept(selectedDept?.name) || t.faculty2.allDepartments)}
            </Text>
          </View>
          <Feather name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* 58dp Global Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Icon name="search" size={24} color={C.textMuted} />
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

        {/* Meta / Results Count Header */}
        <View style={styles.resultsHead}>
          <Text style={[styles.resultsTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {filtered.length} TEACHER{filtered.length === 1 ? '' : 'S'}
            {selectedDeptId !== 'All' ? ` · ${shortDept(selectedDept?.name)}` : ''}
          </Text>
          {(selectedDeptId !== 'All' || query.length > 0) && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setSelectedDeptId('All');
              }}
              hitSlop={8}
            >
              <Text style={[styles.clearTxt, { color: SectorColors.faculty, fontFamily: FontFamily.jakartaBold }]}>
                {t.faculty2.resetFilters}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={SectorColors.faculty} />
          <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            Loading faculty directory…
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Feather name="search" size={28} color={C.textMuted} />
        <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {t.faculty2.noMatchingTeachers}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.manage.manageFaculty}
        onBack={() => navigation.goBack()}
      />

      <FlatList<FacultyRow>
        data={filtered}
        keyExtractor={teacherKeyExtractor}
        renderItem={renderTeacherItem}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty()}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: Layout.screenPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.brand}
            colors={[C.brand]}
          />
        }
      />

      {/* Main Department Filter Bottom Sheet Modal */}
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
                    borderColor: selectedDeptId === 'All' ? C.brand : C.border,
                  },
                ]}
                onPress={() => {
                  setSelectedDeptId('All');
                  setDeptPickerVisible(false);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.pickerIconTile}>
                  <AnimatedIcon name="layers" size={32} color={C.text} />
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <Text
                    style={[
                      styles.pickerBarText,
                      {
                        color: selectedDeptId === 'All' ? C.brand : C.text,
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                  >
                    {t.faculty2.allDepartments}
                  </Text>
                </View>
                {selectedDeptId === 'All' ? (
                  <View style={[styles.checkCircle, { backgroundColor: C.brand }]}>
                    <Feather name="check" size={13} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                )}
              </TouchableOpacity>

              {departments.map((d) => {
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
                        borderColor: active ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedDeptId(d.id);
                      setDeptPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pickerIconTile}>
                      <AnimatedIcon
                        name={BRANCH_ICON[d.branch] ?? 'book-open'}
                        size={32}
                        color={C.text}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? C.brand : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {shortDept(d.name)}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: C.brand }]}>
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

      {/* Form Department Picker Modal */}
      <Modal
        visible={formDeptPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormDeptPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setFormDeptPickerVisible(false)}
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
              {departments.map((d) => {
                const active = departmentId === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.pickerBar,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)')
                          : C.surface2,
                        borderColor: active ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setDepartmentId(d.id);
                      setFormDeptPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pickerIconTile}>
                      <AnimatedIcon
                        name={BRANCH_ICON[d.branch] ?? 'book-open'}
                        size={32}
                        color={C.text}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? C.brand : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {shortDept(d.name)}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: C.brand }]}>
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
              onPress={() => setFormDeptPickerVisible(false)}
            >
              <Text style={[styles.sheetCloseTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Designation Picker Modal */}
      <Modal
        visible={designationPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDesignationPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDesignationPickerVisible(false)}
          />
          <View style={[styles.sheetCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Select Designation
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {FACULTY_DESIGNATIONS.map((d) => {
                const active = designation === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.pickerBar,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)')
                          : C.surface2,
                        borderColor: active ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setDesignation(d);
                      setDesignationPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pickerIconTile}>
                      <AnimatedIcon name="award" size={32} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? C.brand : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {d}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: C.brand }]}>
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
              onPress={() => setDesignationPickerVisible(false)}
            >
              <Text style={[styles.sheetCloseTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Blood Group Picker Modal */}
      <Modal
        visible={bloodPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBloodPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setBloodPickerVisible(false)}
          />
          <View style={[styles.sheetCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Select Blood Group
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {BLOOD_GROUPS.map((bg) => {
                const active = bloodGroup === bg;
                return (
                  <TouchableOpacity
                    key={bg}
                    style={[
                      styles.pickerBar,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)')
                          : C.surface2,
                        borderColor: active ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setBloodGroup(bg);
                      setBloodPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pickerIconTile}>
                      <AnimatedIcon name="droplet" size={32} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? C.brand : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                      >
                        {bg}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: C.brand }]}>
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
              onPress={() => setBloodPickerVisible(false)}
            >
              <Text style={[styles.sheetCloseTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Campus Building Picker Modal */}
      <Modal
        visible={buildingPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBuildingPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setBuildingPickerVisible(false)}
          />
          <View style={[styles.sheetCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Select Campus Building
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {CAMPUS_BUILDINGS.map((b) => {
                const active = building === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.pickerBar,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)')
                          : C.surface2,
                        borderColor: active ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setBuilding(b);
                      setBuildingPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pickerIconTile}>
                      <AnimatedIcon name="home" size={32} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? C.brand : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                      >
                        {b}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: C.brand }]}>
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
              onPress={() => setBuildingPickerVisible(false)}
            >
              <Text style={[styles.sheetCloseTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sync Status Modal */}
      <Modal visible={syncModalVisible} transparent animationType="fade" onRequestClose={() => setSyncModalVisible(false)}>
        <View style={styles.syncOverlay}>
          <View style={[styles.syncReportCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.syncIconBig}>
              {syncing ? (
                <ActivityIndicator color={SectorColors.faculty} size="large" />
              ) : syncResult?.error ? (
                <AnimatedIcon name="alert-triangle" size={28} color={C.danger} />
              ) : (
                <AnimatedIcon name="check-circle" size={28} color={C.success} />
              )}
            </View>

            <Text style={[styles.syncReportTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {syncing ? t.manage.crawlingTitle : syncResult?.error ? t.manage.syncFailed : t.manage.syncCompleted}
            </Text>

            <Text style={[styles.syncReportDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {syncing
                ? t.manage.crawlingDesc
                : syncResult?.error
                ? syncResult.error
                : `Successfully scanned ${syncResult?.features?.faculty?.scanned ?? syncResult?.items_scanned ?? syncResult?.total_scanned ?? 0} profiles.\n` +
                  `• ${syncResult?.features?.faculty?.added ?? syncResult?.items_added ?? syncResult?.new_added ?? 0} new teachers added\n` +
                  `• ${syncResult?.features?.faculty?.updated ?? syncResult?.items_updated ?? syncResult?.promotions_updated ?? 0} profiles updated\n` +
                  `Duration: ${((syncResult?.duration_ms || 0) / 1000).toFixed(1)}s`}
            </Text>

            {!syncing && (
              <TouchableOpacity
                style={[styles.closeReportBtn, { backgroundColor: C.surface2 }]}
                onPress={() => setSyncModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.closeReportTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Done
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Full-Page Edit & Create Screen Modal */}
      <Modal
        visible={!!target}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setTarget(null)}
      >
        <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
          <SubBar
            title={isNewTeacher ? t.manage.addFacultyMember : (name || target?.name || 'Edit Faculty')}
            onBack={() => setTarget(null)}
          />

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={[styles.fullPageScroll, { paddingHorizontal: Layout.screenPadding }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Profile Photo Row */}
              <TouchableOpacity style={styles.photoRow} onPress={pickPhoto} activeOpacity={0.75}>
                <Avatar uri={photoUri ?? target?.photo_url} name={name || target?.name} size="lg" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.photoTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Profile Photo
                  </Text>
                  <Text style={[styles.photoHint, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {photoUri ? t.manage.photoSelected : t.manage.changePhoto}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Department Dropdown (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DEPARTMENT</Text>
              <TouchableOpacity
                style={[styles.formDropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setFormDeptPickerVisible(true)}
                activeOpacity={0.75}
              >
                <View style={styles.formDropdownIconTile}>
                  <AnimatedIcon
                    name={BRANCH_ICON[deptById[departmentId]?.branch ?? ''] ?? 'book-open'}
                    size={24}
                    color={C.text}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <Text style={[styles.formDropdownValue, { color: departmentId ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {shortDept(deptById[departmentId]?.name) || 'Select Department'}
                  </Text>
                </View>
                <Feather name="chevron-down" size={18} color={C.textMuted} />
              </TouchableOpacity>

              {/* Full Name (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>FULL NAME</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={name}
                onChangeText={setName}
                placeholder="Prof. Dr. / Md. ..."
                placeholderTextColor={C.textMuted}
              />

              {/* Designation Dropdown (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DESIGNATION</Text>
              <TouchableOpacity
                style={[styles.formDropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setDesignationPickerVisible(true)}
                activeOpacity={0.75}
              >
                <View style={styles.formDropdownIconTile}>
                  <AnimatedIcon name="award" size={22} color={C.text} />
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <Text style={[styles.formDropdownValue, { color: designation ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {designation || 'Select Designation'}
                  </Text>
                </View>
                <Feather name="chevron-down" size={18} color={C.textMuted} />
              </TouchableOpacity>

              {/* Routine Initial (58dp) & Blood Group Dropdown (58dp) */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>ROUTINE INITIAL</Text>
                  <TextInput
                    style={[styles.field, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={shortCode}
                    onChangeText={setShortCode}
                    placeholder="DALM / SR"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>BLOOD GROUP</Text>
                  <TouchableOpacity
                    style={[styles.formDropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setBloodPickerVisible(true)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.formDropdownIconTile}>
                      <AnimatedIcon name="droplet" size={20} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text style={[styles.formDropdownValue, { color: bloodGroup ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {bloodGroup || 'Select'}
                      </Text>
                    </View>
                    <Feather name="chevron-down" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Campus Building Dropdown (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>CAMPUS BUILDING</Text>
              <TouchableOpacity
                style={[styles.formDropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setBuildingPickerVisible(true)}
                activeOpacity={0.75}
              >
                <View style={styles.formDropdownIconTile}>
                  <AnimatedIcon name="home" size={22} color={C.text} />
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <Text style={[styles.formDropdownValue, { color: building ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {building || 'Select Campus Building'}
                  </Text>
                </View>
                <Feather name="chevron-down" size={18} color={C.textMuted} />
              </TouchableOpacity>

              {/* Room Number (58dp) & Floor (58dp) */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>ROOM NUMBER</Text>
                  <TextInput
                    style={[styles.field, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={roomNumber}
                    onChangeText={setRoomNumber}
                    placeholder="405"
                    placeholderTextColor={C.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>FLOOR</Text>
                  <TextInput
                    style={[styles.field, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={floor}
                    onChangeText={setFloor}
                    placeholder="4th Floor"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              </View>

              {/* Counseling Hours (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>COUNSELING HOURS</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={counselingHours}
                onChangeText={setCounselingHours}
                placeholder="Sun & Tue: 11:30 AM - 1:00 PM"
                placeholderTextColor={C.textMuted}
              />

              {/* Institutional Email (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.emailLabel}</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={email}
                onChangeText={setEmail}
                placeholder="teacher@bubt.edu.bd"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {/* Phone / Mobile (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.phoneLabel}</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+8801..."
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
              />

              {/* Research Interests (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.researchInterestsLabel}</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={interests}
                onChangeText={setInterests}
                placeholder="AI, Machine Learning, IoT..."
                placeholderTextColor={C.textMuted}
              />

              {/* Toggles */}
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLbl, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Accepting Paper Mentorship</Text>
                <TactileSwitch value={isAcceptingResearch} onValueChange={setIsAcceptingResearch} />
              </View>

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLbl, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.manage.onLeave}</Text>
                <TactileSwitch value={onLeave} onValueChange={setOnLeave} />
              </View>

              {/* Save Button (58dp) */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: C.brand, opacity: saving ? 0.6 : 1 }]}
                onPress={save}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.saveTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {isNewTeacher ? 'Create Faculty Member' : t.manage.saveChanges}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Delete Button (58dp) */}
              {!isNewTeacher && target?.id && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: C.border }]}
                  onPress={() => confirmDelete(target)}
                  disabled={saving}
                  activeOpacity={0.75}
                >
                  <Feather name="trash-2" size={16} color={C.danger} />
                  <Text style={[styles.deleteTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                    Delete Teacher
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  listContent: { paddingBottom: 28 } as ViewStyle,

  syncCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  } as ViewStyle,
  syncCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  } as ViewStyle,
  syncIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  syncTitle: { fontSize: 14.5 } as TextStyle,
  syncSub: { fontSize: 12, marginTop: 2 } as TextStyle,
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: Layout.controlHeight,
    borderRadius: 16,
  } as ViewStyle,
  syncActionTxt: { fontSize: 14.5 } as TextStyle,

  // Add Faculty Member 58dp Bar
  addFacultyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: Layout.controlHeight,
    borderRadius: 16,
    marginBottom: 10,
  } as ViewStyle,
  addFacultyBarTxt: {
    fontSize: 14.5,
  } as TextStyle,

  // 58dp Dropdown Selector Bar
  dropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: Layout.controlHeight,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  dropdownIconTile: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dropdownValue: {
    fontSize: 14,
  } as TextStyle,

  // 58dp Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    height: Layout.controlHeight,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 } as TextStyle,

  // Results meta header
  resultsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 2,
  } as ViewStyle,
  resultsTxt: { fontSize: 11.5, letterSpacing: 0.8 } as TextStyle,
  clearTxt: { fontSize: 12.5 } as TextStyle,

  // Universal 72dp Teacher Bar Card
  teacherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 72,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,
  barAvatarWrap: {
    position: 'relative',
  } as ViewStyle,
  leaveDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  } as ViewStyle,
  barBody: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  barNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  barName: {
    fontSize: 14,
    flexShrink: 1,
  } as TextStyle,
  codeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  } as ViewStyle,
  codeBadgeTxt: {
    fontSize: 10,
  } as TextStyle,
  barDesig: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,
  barMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  } as ViewStyle,
  metaLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  metaLocTxt: {
    fontSize: 11,
  } as TextStyle,
  noPhotoPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  } as ViewStyle,
  noPhotoTxt: {
    fontSize: 9.5,
  } as TextStyle,
  editAction: {
    padding: 4,
  } as ViewStyle,

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  } as ViewStyle,
  emptyTxt: {
    fontSize: 13.5,
    textAlign: 'center',
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

  // Universal 72dp Picker Bars (Clean Titles, Vertically Centered)
  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 72,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  pickerIconTile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pickerBarText: {
    fontSize: 14.5,
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
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  } as ViewStyle,
  sheetCloseTxt: { fontSize: 14 } as TextStyle,

  // Full Page Scroll & Forms (All 58dp Standard)
  fullPageScroll: {
    paddingTop: 12,
    paddingBottom: 40,
  } as ViewStyle,
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    marginBottom: 6,
  } as ViewStyle,
  photoTitle: { fontSize: 15 } as TextStyle,
  photoHint: { fontSize: 13, marginTop: 2 } as TextStyle,
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginTop: 14,
    marginBottom: 6,
  } as TextStyle,
  field: {
    height: Layout.controlHeight,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as TextStyle,
  formDropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: Layout.controlHeight,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  } as ViewStyle,
  formDropdownIconTile: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  formDropdownValue: { fontSize: 14 } as TextStyle,
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 4,
  } as ViewStyle,
  toggleLbl: { fontSize: 14 } as TextStyle,
  saveBtn: {
    height: Layout.controlHeight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  } as ViewStyle,
  saveTxt: { fontSize: 15 } as TextStyle,
  deleteBtn: {
    height: Layout.controlHeight,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  } as ViewStyle,
  deleteTxt: { fontSize: 14.5 } as TextStyle,

  syncOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  } as ViewStyle,
  syncReportCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  } as ViewStyle,
  syncIconBig: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  } as ViewStyle,
  syncReportTitle: { fontSize: 17, textAlign: 'center' } as TextStyle,
  syncReportDesc: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, marginBottom: 18 } as TextStyle,
  closeReportBtn: {
    width: '100%',
    height: Layout.controlHeight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  closeReportTxt: { fontSize: 14 } as TextStyle,
});
