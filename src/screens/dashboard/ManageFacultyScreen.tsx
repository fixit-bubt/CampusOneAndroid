// Admin-only. Manage BUBT faculty directory: 1-tap live website crawler sync,
// manual overrides for office rooms, building, floor, counseling hours,
// teacher initial routine codes (DALM, SR), photos, and research flags.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
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
import { FontFamily, Layout, Accent, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { TablesUpdate, TablesInsert } from '../../types/supabase';
import { useAuth } from '../../store/authStore';
import { uploadFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { formatRelativeTime } from '../../utils/format';

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
  departments?: { id: string; name: string } | null;
}

interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_scanned: number;
  new_added: number;
  promotions_updated: number;
}

const shortDept = (name?: string | null) => (name ?? '').replace(/^Department of\s+/i, '');

export function ManageFacultyScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [list, setList] = useState<FacultyRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState('');
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

  const load = useCallback(async () => {
    const [facRes, deptRes, logRes] = await Promise.all([
      supabase
        .from('faculty')
        .select('id, name, designation, department_id, email, phone, photo_url, short_code, room_number, building, floor, counseling_hours, blood_group, is_accepting_research, research_interests, on_leave, departments(id, name)')
        .order('name'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('faculty_sync_logs').select('*').order('started_at', { ascending: false }).limit(1),
    ]);

    if (facRes.data) setList(facRes.data as any[]);
    if (deptRes.data) setDepartments(deptRes.data as any[]);
    if (logRes.data && logRes.data[0]) setLastSyncLog(logRes.data[0] as unknown as SyncLog);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    setDepartmentId(departments[0]?.id || '');
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
      const { data, error } = await supabase.functions.invoke('sync-faculty');
      if (error) {
        toast({ type: 'error', title: 'Sync Failed', message: error.message });
        setSyncResult({ error: error.message });
      } else {
        setSyncResult(data);
        toast({ type: 'success', title: 'Live Sync Finished', message: `Scanned ${data?.total_scanned || 0} profiles` });
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

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.manage.manageFaculty} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>{t.manage.accessDenied}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const q = query.trim().toLowerCase();
  const cleanQ = q.replace(/[^a-z0-9]/g, '');
  const filtered = q
    ? list.filter(f => {
        const textMatch = [f.name, f.designation, f.departments?.name, f.room_number]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
        const codeMatch = Boolean(
          f.short_code &&
          (f.short_code.toLowerCase().includes(q) ||
            (cleanQ.length > 0 && f.short_code.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQ)))
        );
        return textMatch || codeMatch;
      })
    : list;

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

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Website Automated Sync Card */}
        <View style={[styles.syncCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.syncCardTop}>
            <View style={[styles.syncIconWrap, { backgroundColor: `${SectorColors.faculty}14` }]}>
              <AnimatedIcon family="feather" name="refresh-cw" size={20} color={SectorColors.faculty} animation={syncing ? 'pulse' : 'spring'} loop={syncing} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.syncTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.manage.bubtLiveSyncTitle}
              </Text>
              <Text style={[styles.syncSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {lastSyncLog
                  ? `Last crawl: ${formatRelativeTime(lastSyncLog.started_at)} · Scanned ${lastSyncLog.total_scanned} profiles`
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

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border, marginTop: 12, marginBottom: 12 }]}>
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

        <Text style={[styles.listMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
          {filtered.length} TEACHER{filtered.length === 1 ? '' : 'S'}
        </Text>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {filtered.slice(0, 80).map((f, i) => (
            <View key={f.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
              <TouchableOpacity
                style={styles.row}
                onPress={() => openEdit(f)}
                activeOpacity={0.7}
              >
                <Avatar uri={f.photo_url} name={f.name} size="md" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    {f.short_code ? (
                      <View style={[styles.shortBadge, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.shortBadgeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
                          {f.short_code}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {f.designation} · {shortDept(f.departments?.name)}
                    {f.room_number ? ` · Rm ${f.room_number}` : ''}
                  </Text>
                </View>

                {!f.photo_url && (
                  <View style={[styles.noPhoto, { backgroundColor: C.warnBg }]}>
                    <Text style={[styles.noPhotoTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>No photo</Text>
                  </View>
                )}
                <Feather name="edit-2" size={15} color={C.text2} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Sync Status Modal */}
      <Modal visible={syncModalVisible} transparent animationType="fade" onRequestClose={() => setSyncModalVisible(false)}>
        <View style={styles.syncOverlay}>
          <View style={[styles.syncReportCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.syncIconBig, { backgroundColor: `${SectorColors.faculty}15` }]}>
              {syncing ? (
                <ActivityIndicator color={SectorColors.faculty} size="large" />
              ) : syncResult?.error ? (
                <AnimatedIcon family="feather" name="alert-triangle" size={28} color={C.danger} animation="wobble" />
              ) : (
                <AnimatedIcon family="feather" name="check-circle" size={28} color={C.success} animation="spring" />
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
                : `Successfully scanned ${syncResult?.total_scanned || 0} profiles.\n` +
                  `• ${syncResult?.new_added || 0} new teachers added\n` +
                  `• ${syncResult?.promotions_updated || 0} rank promotions updated\n` +
                  `• ${syncResult?.photos_updated || 0} photos refreshed\n` +
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
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setTarget(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
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
                <TactileSwitch value={isAcceptingResearch} onValueChange={setIsAcceptingResearch} trackColor={{ true: SectorColors.faculty }} />
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
  scroll: { paddingTop: 8, paddingBottom: 24 } as ViewStyle,

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  } as ViewStyle,
  addBtnTxt: { fontSize: 12.5 } as TextStyle,

  syncCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
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
    borderRadius: 13,
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
    height: 58,
    borderRadius: 16,
  } as ViewStyle,
  syncActionTxt: { fontSize: 14.5 } as TextStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, height: 58, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 } as TextStyle,

  listMeta: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 } as TextStyle,

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72, gap: 13, padding: 14 } as ViewStyle,
  name: { fontSize: 14 } as TextStyle,
  shortBadge: { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5 } as ViewStyle,
  shortBadgeTxt: { fontSize: 10 } as TextStyle,
  meta: { fontSize: 11.5, marginTop: 2 } as TextStyle,
  noPhoto: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, marginRight: 4 } as ViewStyle,
  noPhotoTxt: { fontSize: 9.5 } as TextStyle,

  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 30,
    maxHeight: '90%',
  } as ViewStyle,
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: { fontSize: 17, marginBottom: 12 } as TextStyle,
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 } as ViewStyle,
  photoHint: { fontSize: 13 } as TextStyle,
  fieldLabel: { fontSize: 10.5, letterSpacing: 0.7, marginTop: 11, marginBottom: 5 } as TextStyle,
  field: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 13.5 } as TextStyle,
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 } as ViewStyle,
  toggleLbl: { fontSize: 13.5 } as TextStyle,
  saveBtn: { height: Layout.controlHeight, borderRadius: Layout.controlRadius, alignItems: 'center', justifyContent: 'center', marginTop: 18 } as ViewStyle,
  saveTxt: { fontSize: 14.5 } as TextStyle,

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
