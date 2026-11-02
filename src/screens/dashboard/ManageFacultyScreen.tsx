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
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  const [designation, setDesignation] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [building, setBuilding] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [counselingHours, setCounselingHours] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [interests, setInterests] = useState('');
  const [onLeave, setOnLeave] = useState(false);
  const [isAcceptingResearch, setIsAcceptingResearch] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Department quick map and count
  const countByDept = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of list) {
      if (f.department_id) {
        counts[f.department_id] = (counts[f.department_id] || 0) + 1;
      }
    }
    return counts;
  }, [list]);

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
          .order('name'),
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Android back button handler
  useEffect(() => {
    const onBackPress = () => {
      if (syncModalVisible) {
        setSyncModalVisible(false);
        return true;
      }
      if (formDeptPickerVisible) {
        setFormDeptPickerVisible(false);
        return true;
      }
      if (deptPickerVisible) {
        setDeptPickerVisible(false);
        return true;
      }
      if (target) {
        setTarget(null);
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
  }, [syncModalVisible, formDeptPickerVisible, deptPickerVisible, target, query, selectedDeptId]);

  function openEdit(f: FacultyRow) {
    setIsNewTeacher(false);
    setTarget(f);
    setName(f.name);
    setDepartmentId(f.department_id);
    setEmail(f.email ?? '');
    setPhone(f.phone ?? '');
    setDesignation(f.designation ?? '');
    setShortCode(f.short_code ?? '');
    setBuilding(f.building ?? '');
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
        department_id: departmentId || target?.department_id,
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

  const q = query.trim().toLowerCase();
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
            <View style={{ flex: 1 }}>
              <Text style={[styles.syncTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.manage.bubtLiveSyncTitle}
              </Text>
              <Text style={[styles.syncSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {lastSyncLog
                  ? `Last crawl: ${formatRelativeTime(lastSyncLog.created_at || lastSyncLog.started_at || new Date().toISOString())} · Scanned ${lastSyncLog.items_scanned ?? lastSyncLog.total_scanned ?? 0} profiles`
                  : 'Automated crawler for all 13 BUBT departments'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncActionBtn, { backgroundColor: SectorColors.faculty }]}
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

        {/* 58dp Department Dropdown Bar */}
        <TouchableOpacity
          style={[styles.dropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => setDeptPickerVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.dropdownIconTile}>
            <AnimatedIcon name="layers" size={32} color={C.text} />
          </View>
          <View style={styles.dropdownBody}>
            <Text style={[styles.dropdownLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.faculty2.selectDepartment}
            </Text>
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
        rightSlot={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: SectorColors.faculty }]}
            onPress={openCreate}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={[styles.addBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList<FacultyRow>
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TeacherCard
            f={item}
            deptName={deptById[item.department_id]?.name}
            onPress={() => openEdit(item)}
            C={C}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
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

      {/* Department Picker Bottom Sheet Modal */}
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
                    borderColor: selectedDeptId === 'All' ? SectorColors.faculty : C.border,
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
                        color: selectedDeptId === 'All' ? SectorColors.faculty : C.text,
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                  >
                    {t.faculty2.allDepartments}
                  </Text>
                  <Text style={[styles.pickerBarSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    All 13 departments · {list.length} teachers
                  </Text>
                </View>
                {selectedDeptId === 'All' ? (
                  <View style={[styles.checkCircle, { backgroundColor: SectorColors.faculty }]}>
                    <Feather name="check" size={13} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                )}
              </TouchableOpacity>

              {departments.map((d) => {
                const count = countByDept[d.id] || 0;
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
                        borderColor: active ? SectorColors.faculty : C.border,
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
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? SectorColors.faculty : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {shortDept(d.name)}
                      </Text>
                      <Text style={[styles.pickerBarSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {d.branch} · {count} teachers
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: SectorColors.faculty }]}>
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
                        borderColor: active ? SectorColors.faculty : C.border,
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
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: active ? SectorColors.faculty : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {shortDept(d.name)}
                      </Text>
                      <Text style={[styles.pickerBarSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {d.branch}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: SectorColors.faculty }]}>
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

      {/* Edit & Create Sheet */}
      <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => setTarget(null)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setTarget(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.sheetHandleBar, { backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }]} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {isNewTeacher ? t.manage.addFacultyMember : name || target?.name}
              </Text>

              <TouchableOpacity style={styles.photoRow} onPress={pickPhoto} activeOpacity={0.75}>
                <Avatar uri={photoUri ?? target?.photo_url} name={name || target?.name} size="lg" />
                <Text style={[styles.photoHint, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {photoUri ? t.manage.photoSelected : t.manage.changePhoto}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DEPARTMENT</Text>
              <TouchableOpacity
                style={[styles.formDropdownBar, { backgroundColor: C.bg, borderColor: C.border }]}
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
                  <Text style={[styles.formDropdownValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {shortDept(deptById[departmentId]?.name) || 'Select Department'}
                  </Text>
                </View>
                <Feather name="chevron-down" size={18} color={C.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>FULL NAME</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={name} onChangeText={setName} placeholder="Prof. Dr. / Md. ..." placeholderTextColor={C.textMuted}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>ROUTINE INITIAL</Text>
                  <TextInput
                    style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={shortCode} onChangeText={setShortCode} placeholder="DALM / SR" placeholderTextColor={C.textMuted}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>BLOOD GROUP</Text>
                  <TextInput
                    style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={bloodGroup} onChangeText={setBloodGroup} placeholder="A+ / B+ / AB+" placeholderTextColor={C.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DESIGNATION</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={designation} onChangeText={setDesignation} placeholder="Assistant Professor / Lecturer" placeholderTextColor={C.textMuted}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>CAMPUS BUILDING</Text>
                  <TextInput
                    style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={building} onChangeText={setBuilding} placeholder="Building 2" placeholderTextColor={C.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>ROOM NUMBER</Text>
                  <TextInput
                    style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={roomNumber} onChangeText={setRoomNumber} placeholder="405" placeholderTextColor={C.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>COUNSELING HOURS (CH/TuH)</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={counselingHours} onChangeText={setCounselingHours} placeholder="Sun & Tue: 11:30 AM - 1:00 PM" placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.emailLabel}</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={email} onChangeText={setEmail} placeholder="teacher@bubt.edu.bd" placeholderTextColor={C.textMuted}
                autoCapitalize="none" keyboardType="email-address"
              />

              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.phoneLabel}</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={phone} onChangeText={setPhone} placeholder="+8801..." placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.researchInterestsLabel}</Text>
              <TextInput
                style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={interests} onChangeText={setInterests} placeholder="AI, Machine Learning, IoT..." placeholderTextColor={C.textMuted}
              />

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLbl, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Accepting Paper Mentorship</Text>
                <TactileSwitch value={isAcceptingResearch} onValueChange={setIsAcceptingResearch} />
              </View>

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLbl, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.manage.onLeave}</Text>
                <TactileSwitch value={onLeave} onValueChange={setOnLeave} />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: SectorColors.faculty, opacity: saving ? 0.6 : 1 }]}
                onPress={save}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.saveTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{isNewTeacher ? 'Create Faculty Member' : t.manage.saveChanges}</Text>}
              </TouchableOpacity>

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

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  listContent: { paddingBottom: 28 } as ViewStyle,

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
  } as ViewStyle,
  addBtnTxt: { fontSize: 13 } as TextStyle,

  syncCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  } as ViewStyle,
  syncCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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

  // Universal 72dp Picker Bars
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
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  } as ViewStyle,
  sheetCloseTxt: { fontSize: 14 } as TextStyle,

  // Add / Edit Sheet
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 30,
    maxHeight: '90%',
  } as ViewStyle,
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 } as ViewStyle,
  photoHint: { fontSize: 13 } as TextStyle,
  fieldLabel: { fontSize: 10.5, letterSpacing: 0.7, marginTop: 11, marginBottom: 5 } as TextStyle,
  field: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 13.5 } as TextStyle,
  formDropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  } as ViewStyle,
  formDropdownIconTile: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  formDropdownValue: { fontSize: 13.5 } as TextStyle,
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 } as ViewStyle,
  toggleLbl: { fontSize: 13.5 } as TextStyle,
  saveBtn: { height: Layout.controlHeight, borderRadius: Layout.controlRadius, alignItems: 'center', justifyContent: 'center', marginTop: 18 } as ViewStyle,
  saveTxt: { fontSize: 14.5 } as TextStyle,
  deleteBtn: {
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
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
    borderRadius: Layout.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  closeReportTxt: { fontSize: 14 } as TextStyle,
});
