import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet, Alert,
  TextInput, Modal, Platform, KeyboardAvoidingView,
  RefreshControl, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { supabase } from '../../lib/supabase';
import { getCache, getCacheSync, hasCacheSync, setCache, CacheKeys } from '../../services/cacheService';
import { uploadFile } from '../../utils/storage';
import { isImageFile } from '../../utils/imageCompress';
import { MAX_FILE_SIZE_MB } from '../../constants/app';
import { formatRelativeTime } from '../../utils/format';
import { openUrl } from '../../utils/link';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, FontSize, Layout, Radius, Spacing, SectorColors } from '../../theme';
import type { RoutineSlot, ExamSlot, Faculty } from '../../types/database';

export const BUBT_DAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THR', 'FRI'] as const;
export type DayKey = typeof BUBT_DAYS[number];

export const BUBT_TIME_SLOTS = [
  { index: 0, label: '08:15 AM to 09:45 AM', short: '08:15 - 09:45' },
  { index: 1, label: '09:45 AM to 11:15 AM', short: '09:45 - 11:15' },
  { index: 2, label: '11:15 AM to 12:45 PM', short: '11:15 - 12:45' },
  { index: 3, label: '01:15 PM to 02:45 PM', short: '01:15 - 02:45' },
  { index: 4, label: '02:45 PM to 04:15 PM', short: '02:45 - 04:15' },
  { index: 5, label: '04:15 PM to 05:45 PM', short: '04:15 - 05:45' },
];

export const BUBT_EXAM_SHIFTS = [
  { shift: 'Shift 1', label: '09:30 AM to 11:30 AM (Shift 1)', short: '09:30 - 11:30' },
  { shift: 'Shift 2', label: '01:30 PM to 03:30 PM (Shift 2)', short: '01:30 - 03:30' },
];

const DEPARTMENTS = ['CSE', 'EEE', 'BBA', 'English', 'Law', 'Civil', 'Textile', 'Economics'];

interface OfficialRoutine {
  id: string;
  type: 'class' | 'exam';
  title: string;
  department: string | null;
  semester: string | null;
  intake: string | null;
  section: string | null;
  file_url: string | null;
  image_url: string | null;
  published_by: string | null;
  created_at: string;
}

type RoutineTab = 'class' | 'exam' | 'pdfs';

interface MergedSlot extends RoutineSlot {
  isRetake?: boolean;
}

function getOrdinal(n: number) {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

function decodeRoom(roomStr: string) {
  const r = (roomStr || '').trim();
  if (/^\d{4}$/.test(r)) {
    const bldgNum = r[0];
    const floorNum = Number(r[1]);
    let bldgName = `Building ${bldgNum}`;
    if (bldgNum === '2') bldgName = 'Building 2: Martyr Sujan Mahmud Building';
    else if (bldgNum === '3') bldgName = 'Building 3: Martyr Tahmid Abdullah Building';
    else if (bldgNum === '5') bldgName = 'Campus 2 (Building 5)';
    else if (bldgNum === '1') bldgName = 'Building 1 (Main Building)';
    return {
      building: bldgName,
      floor: `${floorNum}${getOrdinal(floorNum)} Floor`,
      roomNumber: `Room ${r.slice(1)} (${r})`,
    };
  }
  return {
    building: 'BUBT Campus',
    floor: 'Campus Facility',
    roomNumber: `Room ${r}`,
  };
}

export function RoutinesBrowseScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const canPost = profile?.role === 'admin' || profile?.role === 'staff';

  // 1. Navigation & Tab state (Strict 3 Tabs Max)
  const [tab, setTab] = useState<RoutineTab>('class');

  // 2. Active Department, Intake, Section Context
  const myDept = profile?.department?.trim() || 'CSE';
  const myIntake = profile?.intake?.trim() || '51';
  const mySec = profile?.section?.trim() || '2';

  const [activeDept, setActiveDept] = useState(myDept);
  const [activeIntake, setActiveIntake] = useState(myIntake);
  const [activeSec, setActiveSec] = useState(mySec);

  const isViewingMySection =
    activeDept.toLowerCase() === myDept.toLowerCase() &&
    activeIntake === myIntake &&
    activeSec === mySec;

  // 3. Class & Exam Slot Data
  const [classSlots, setClassSlots] = useState<MergedSlot[]>([]);
  const [userRetakeSlots, setUserRetakeSlots] = useState<MergedSlot[]>([]);
  const [examSlots, setExamSlots] = useState<ExamSlot[]>([]);
  const [officialPdfs, setOfficialPdfs] = useState<OfficialRoutine[]>([]);
  const [facultyMap, setFacultyMap] = useState<Record<string, Faculty>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 4. Modals
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [retakeModalVisible, setRetakeModalVisible] = useState(false);
  const [slotDetailModalVisible, setSlotDetailModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MergedSlot | null>(null);
  const [selectedClashSlots, setSelectedClashSlots] = useState<MergedSlot[] | null>(null);
  const [pdfUploadModalVisible, setPdfUploadModalVisible] = useState(false);

  // Section Selector Draft State
  const [draftDept, setDraftDept] = useState(activeDept);
  const [draftIntake, setDraftIntake] = useState(activeIntake);
  const [draftSec, setDraftSec] = useState(activeSec);

  // Retake Finder State
  const [retakeQuery, setRetakeQuery] = useState('');
  const [retakeSearchResults, setRetakeSearchResults] = useState<RoutineSlot[]>([]);
  const [retakeSearching, setRetakeSearching] = useState(false);

  // PDF Upload Form State
  const [fTitle, setFTitle] = useState('');
  const [fDept, setFDept] = useState('');
  const [fSemester, setFSemester] = useState('');
  const [fIntake, setFIntake] = useState('');
  const [fSection, setFSection] = useState('');
  const [fType, setFType] = useState<'class' | 'exam'>('class');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [postingPdf, setPostingPdf] = useState(false);

  // Tab definitions
  const ROUTINE_TABS: TabItem<RoutineTab>[] = useMemo(() => [
    { id: 'class', label: t.routines2.tabClassGrid || 'Class Grid', icon: 'calendar', color: SectorColors.routines },
    { id: 'exam', label: t.routines2.tabExamGrid || 'Exam Grid', icon: 'file-text', color: SectorColors.routines },
    { id: 'pdfs', label: t.routines2.tabOfficialPdfs || 'Official PDFs', icon: 'download', color: SectorColors.routines },
  ], [t.routines2]);

  // Load Faculty lookup for short-codes
  const loadFaculty = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('faculty')
        .select('id, name, designation, email, phone, short_code, room_number, building, floor, counseling_hours, photo_url');
      if (data) {
        const map: Record<string, Faculty> = {};
        for (const f of data as any[]) {
          if (f.short_code) {
            map[f.short_code.toUpperCase().trim()] = f;
          }
        }
        setFacultyMap(map);
      }
    } catch {}
  }, []);

  // Main data loader
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // A. Load Main Routine Slots for current section
      const { data: slotsData } = await supabase
        .from('routine_slots')
        .select('*')
        .eq('department', activeDept)
        .eq('intake', activeIntake)
        .eq('section', activeSec);

      const baseSlots: MergedSlot[] = (slotsData as RoutineSlot[] || []).map(s => ({
        ...s,
        isRetake: false,
      }));

      // B. If viewing my personal section, load my custom retake slots
      let combinedSlots = baseSlots;
      if (isViewingMySection && user) {
        const { data: customData } = await supabase
          .from('user_custom_routine_slots')
          .select('slot_id, routine_slots(*)')
          .eq('user_id', user.id);

        if (customData && customData.length > 0) {
          const retakes: MergedSlot[] = customData
            .map((c: any) => c.routine_slots)
            .filter(Boolean)
            .map((s: RoutineSlot) => ({ ...s, isRetake: true }));
          setUserRetakeSlots(retakes);
          combinedSlots = [...baseSlots, ...retakes];
        } else {
          setUserRetakeSlots([]);
        }
      }

      setClassSlots(combinedSlots);

      // C. Load Exam Slots for current section
      const { data: examData } = await supabase
        .from('exam_slots')
        .select('*')
        .eq('department', activeDept)
        .eq('intake', activeIntake)
        .eq('section', activeSec)
        .order('exam_date', { ascending: true });

      setExamSlots((examData as ExamSlot[]) || []);

      // D. Load Official PDF Circulars
      const { data: pdfsData } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      setOfficialPdfs((pdfsData as OfficialRoutine[]) || []);
    } catch (err: any) {
      console.warn('loadData routines error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [activeDept, activeIntake, activeSec, isViewingMySection, user]);

  useEffect(() => {
    loadFaculty();
  }, [loadFaculty]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // 5. Build Class Grid Matrix (Day x SlotIndex -> MergedSlot[])
  const gridMatrix = useMemo(() => {
    const matrix: Record<string, Record<number, MergedSlot[]>> = {};
    for (const d of BUBT_DAYS) {
      matrix[d] = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    }
    for (const slot of classSlots) {
      const day = slot.day_of_week as DayKey;
      if (matrix[day] && matrix[day][slot.slot_index]) {
        matrix[day][slot.slot_index].push(slot);
      }
    }
    return matrix;
  }, [classSlots]);

  // Total Clash Count
  const clashCount = useMemo(() => {
    let count = 0;
    for (const d of BUBT_DAYS) {
      for (let i = 0; i <= 5; i++) {
        if (gridMatrix[d][i]?.length > 1) {
          count++;
        }
      }
    }
    return count;
  }, [gridMatrix]);

  // Section Selector handlers
  function openSectionModal() {
    setDraftDept(activeDept);
    setDraftIntake(activeIntake);
    setDraftSec(activeSec);
    setSectionModalVisible(true);
  }

  function applySectionSelection() {
    setActiveDept(draftDept);
    setActiveIntake(draftIntake);
    setActiveSec(draftSec);
    setSectionModalVisible(false);
  }

  function resetToMyRoutine() {
    setActiveDept(myDept);
    setActiveIntake(myIntake);
    setActiveSec(mySec);
    setSectionModalVisible(false);
  }

  // Retake Search
  async function searchRetakes(q: string) {
    setRetakeQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setRetakeSearchResults([]);
      return;
    }
    setRetakeSearching(true);
    try {
      const clean = q.trim().toUpperCase();
      const { data } = await supabase
        .from('routine_slots')
        .select('*')
        .or(`course_code.ilike.%${clean}%,course_title.ilike.%${clean}%`)
        .limit(30);

      // Filter out slots that belong to the current section
      const filtered = ((data as RoutineSlot[]) || []).filter(
        s => !(s.department === activeDept && s.intake === activeIntake && s.section === activeSec)
      );
      setRetakeSearchResults(filtered);
    } finally {
      setRetakeSearching(false);
    }
  }

  async function addRetakeSlot(slot: RoutineSlot) {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_custom_routine_slots')
        .insert({
          user_id: user.id,
          slot_id: slot.id,
        });
      if (error) {
        if (error.code === '23505') {
          toast({ type: 'info', title: 'Already Added', message: 'This subject is already in your routine.' });
          return;
        }
        throw error;
      }
      toast({ type: 'success', title: 'Added', message: t.routines2.retakeAdded || 'Added to your personal routine' });
      await loadData();
    } catch (err: any) {
      Alert.alert(t.common.error, err?.message || 'Could not add retake course.');
    }
  }

  async function removeRetakeSlot(slotId: string) {
    if (!user) return;
    try {
      await supabase
        .from('user_custom_routine_slots')
        .delete()
        .eq('user_id', user.id)
        .eq('slot_id', slotId);

      toast({ type: 'success', title: 'Removed', message: 'Retake course removed.' });
      setSlotDetailModalVisible(false);
      await loadData();
    } catch {}
  }

  // Handle tap on a cell
  function handleCellPress(slotsInCell: MergedSlot[]) {
    if (slotsInCell.length === 0) return;
    if (slotsInCell.length > 1) {
      // Clash! Open conflict resolver
      setSelectedClashSlots(slotsInCell);
      setSelectedSlot(null);
      setSlotDetailModalVisible(true);
    } else {
      // Single slot: open faculty & room details
      setSelectedSlot(slotsInCell[0]);
      setSelectedClashSlots(null);
      setSlotDetailModalVisible(true);
    }
  }

  // PDF Upload Handlers
  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isImg = isImageFile(asset.name ?? '', asset.mimeType);
    const size = asset.size ?? 0;
    if (!isImg && size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ type: 'error', title: t.common.error, message: `Document exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
      return;
    }
    setPickedFile({ uri: asset.uri, name: asset.name ?? 'file', mimeType: asset.mimeType ?? 'application/octet-stream' });
  }

  async function handlePostPdf() {
    if (!fTitle.trim() || !user) return;
    setPostingPdf(true);
    try {
      let fileUrl: string | null = null;
      let imageUrl: string | null = null;

      if (pickedFile) {
        const isImg = isImageFile(pickedFile.name, pickedFile.mimeType);
        const ext = isImg ? 'jpg' : (pickedFile.name.split('.').pop() ?? 'bin');
        const safeName = fTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        const storagePath = `routines/${user.id}/${Date.now()}_${safeName}.${ext}`;
        const up = await uploadFile(
          'photos',
          pickedFile.uri,
          storagePath,
          isImg ? 'image/jpeg' : pickedFile.mimeType,
          true,
          isImg ? { preset: 'document' } : undefined
        );
        if (!up.success) throw new Error(up.error);
        if (isImg) imageUrl = up.url;
        else fileUrl = up.url;
      }

      const { error } = await supabase.from('routines').insert({
        type: fType,
        title: fTitle.trim(),
        department: fDept.trim() || null,
        semester: fSemester.trim() || null,
        intake: fIntake.trim() || null,
        section: fSection.trim() || null,
        file_url: fileUrl,
        image_url: imageUrl,
        published_by: user.id,
      });
      if (error) throw error;
      setPdfUploadModalVisible(false);
      loadData();
    } catch {
      Alert.alert(t.common.error, t.routines2.postFailed);
    } finally {
      setPostingPdf(false);
    }
  }

  // RENDER: Class Timetable Grid
  function renderClassGrid() {
    const colWidth = 138;
    const dayColWidth = 60;

    return (
      <ScrollView
        style={styles.gridOuterScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Clash Alert Banner */}
        {clashCount > 0 ? (
          <View style={[styles.clashBanner, { backgroundColor: '#f8717118', borderColor: '#f87171' }]}>
            <Icon name="alert-triangle" size={18} color="#f87171" />
            <Text style={[styles.clashBannerText, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
              {`${clashCount} ${t.routines2.clashDetected || 'Time Conflict Detected'}`}
            </Text>
          </View>
        ) : null}

        {/* Bidirectional Scrollable Grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
          <View style={styles.gridContainer}>
            {/* Table Header Row */}
            <View style={[styles.headerRow, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.dayHeaderCell, { width: dayColWidth, borderColor: C.border }]}>
                <Text style={[styles.headerLabel, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  Day
                </Text>
              </View>
              {BUBT_TIME_SLOTS.map((ts) => (
                <View key={ts.index} style={[styles.timeHeaderCell, { width: colWidth, borderColor: C.border }]}>
                  <Text style={[styles.timeHeaderText, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
                    {ts.short}
                  </Text>
                </View>
              ))}
            </View>

            {/* Table Days & Cells */}
            {BUBT_DAYS.map((day) => {
              const isToday = false; // Could highlight current day
              return (
                <View key={day} style={[styles.dayRow, { borderColor: C.border }]}>
                  {/* Left Sticky Day Cell */}
                  <View style={[styles.dayNameCell, { width: dayColWidth, backgroundColor: C.surface, borderColor: C.border }]}>
                    <Text style={[styles.dayNameText, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {day}
                    </Text>
                  </View>

                  {/* 6 Time Slot Cells */}
                  {BUBT_TIME_SLOTS.map((ts) => {
                    const slotsInCell = gridMatrix[day][ts.index] || [];
                    const isOccupied = slotsInCell.length > 0;
                    const isClash = slotsInCell.length > 1;
                    const first = slotsInCell[0];

                    return (
                      <TouchableOpacity
                        key={ts.index}
                        style={[
                          styles.slotCell,
                          {
                            width: colWidth,
                            backgroundColor: isClash
                              ? '#f8717114'
                              : isOccupied
                              ? (first.isRetake ? '#5c6bc014' : C.surface)
                              : C.bg,
                            borderColor: isClash
                              ? '#f87171'
                              : isOccupied
                              ? (first.isRetake ? SectorColors.routines : C.border)
                              : C.border,
                            borderWidth: isClash || (isOccupied && first.isRetake) ? 1.5 : 0.8,
                          },
                        ]}
                        activeOpacity={isOccupied ? 0.7 : 1}
                        onPress={() => isOccupied && handleCellPress(slotsInCell)}
                      >
                        {isClash ? (
                          <View style={styles.cellContent}>
                            <View style={[styles.badgePill, { backgroundColor: '#f87171', alignSelf: 'flex-start' }]}>
                              <Text style={styles.badgePillText}>CLASH ({slotsInCell.length})</Text>
                            </View>
                            {slotsInCell.map((cs, idx) => (
                              <View key={cs.id || idx} style={styles.stackedClass}>
                                <Text style={[styles.cellCourseCode, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                                  {cs.course_code}
                                </Text>
                                <Text style={[styles.cellMeta, { color: C.textMuted }]} numberOfLines={1}>
                                  R: {cs.room}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : isOccupied ? (
                          <View style={styles.cellContent}>
                            {first.isRetake ? (
                              <View style={[styles.badgePill, { backgroundColor: SectorColors.routines, alignSelf: 'flex-start' }]}>
                                <Text style={styles.badgePillText}>RETAKE</Text>
                              </View>
                            ) : null}
                            <Text style={[styles.cellCourseCode, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                              {first.course_code}
                            </Text>
                            <Text style={[styles.cellMeta, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>
                              {`FC: ${first.teacher_short_code || 'TBA'}`}
                            </Text>
                            <Text style={[styles.cellMeta, { color: C.textMuted }]} numberOfLines={1}>
                              {`R: ${first.room}`}
                            </Text>
                            <Text style={[styles.cellSub, { color: C.text3 }]} numberOfLines={1}>
                              {`Intake: ${first.intake} - ${first.section}`}
                            </Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    );
  }

  // RENDER: Exam Timetable Grid
  function renderExamGrid() {
    return (
      <ScrollView
        style={styles.gridOuterScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {examSlots.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={44} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              No Exams Scheduled
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              Exam routine for {activeDept} Intake {activeIntake}-{activeSec} has not been published yet.
            </Text>
          </View>
        ) : (
          <View style={[styles.examListContainer, { paddingHorizontal: Layout.screenPadding }]}>
            {examSlots.map((ex) => (
              <View key={ex.id} style={[styles.examCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.examCardHeader}>
                  <View style={[styles.badgePill, { backgroundColor: C.brand }]}>
                    <Text style={styles.badgePillText}>{ex.shift}</Text>
                  </View>
                  <Text style={[styles.examDateText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {`${ex.day_of_week}, ${ex.exam_date}`}
                  </Text>
                </View>

                <View style={styles.examCardBody}>
                  <Text style={[styles.examCourseCode, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                    {ex.course_code}
                  </Text>
                  {ex.course_title ? (
                    <Text style={[styles.examCourseTitle, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      {ex.course_title}
                    </Text>
                  ) : null}

                  <View style={styles.examMetaGrid}>
                    <View style={styles.examMetaItem}>
                      <Icon name="clock" size={14} color={C.brand} />
                      <Text style={[styles.examMetaVal, { color: C.text }]}>{ex.time_range}</Text>
                    </View>
                    <View style={styles.examMetaItem}>
                      <Icon name="map-pin" size={14} color={SectorColors.routines} />
                      <Text style={[styles.examMetaVal, { color: C.text }]}>{decodeRoom(ex.room).roomNumber}</Text>
                    </View>
                    {ex.seat_range ? (
                      <View style={styles.examMetaItem}>
                        <Icon name="users" size={14} color={C.success} />
                        <Text style={[styles.examMetaVal, { color: C.text }]}>{ex.seat_range}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // RENDER: Official PDF Circulars
  function renderOfficialPdfs() {
    return (
      <FlatList
        data={officialPdfs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingTop: 12, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.pdfCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => item.file_url ? openUrl(item.file_url) : item.image_url ? openUrl(item.image_url) : null}
            activeOpacity={0.75}
          >
            <View style={[styles.pdfIconBox, { backgroundColor: SectorColors.routines + '18' }]}>
              <Icon name="file-text" size={26} color={SectorColors.routines} />
            </View>
            <View style={styles.pdfBody}>
              <Text style={[styles.pdfTitle, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.pdfMetaRow}>
                {item.department ? <Pill label={item.department} customColor={SectorColors.routines} /> : null}
                {item.semester ? (
                  <Text style={[styles.pdfMetaText, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                    {item.semester}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.pdfTime, { color: C.textMuted }]}>
                {formatRelativeTime(item.created_at)}
              </Text>
            </View>
            <Icon name="download" size={18} color={C.brand} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="file" size={44} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.routines2.noRoutines || 'No official routines posted yet'}
            </Text>
          </View>
        }
      />
    );
  }

  // Selected faculty info for modal
  const activeFaculty = selectedSlot?.teacher_short_code
    ? facultyMap[selectedSlot.teacher_short_code.toUpperCase().trim()]
    : null;

  const decodedActiveRoom = selectedSlot ? decodeRoom(selectedSlot.room) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 1. Header SubBar */}
      <SubBar
        title={t.routines2.title || 'Class & Exam Routines'}
        onBack={() => navigation.goBack()}
        rightSlot={canPost ? (
          <TouchableOpacity onPress={() => setPdfUploadModalVisible(true)} hitSlop={8}>
            <Icon name="plus" size={22} color={C.brand} />
          </TouchableOpacity>
        ) : undefined}
      />

      {/* 2. Strict 3 Segmented Tabs */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6 }}>
        <SegmentedTabs
          tabs={ROUTINE_TABS}
          activeTab={tab}
          onTabChange={setTab}
        />
      </View>

      {/* 3. Dedicated Section Context Row */}
      {tab !== 'pdfs' ? (
        <View style={[styles.contextRow, { paddingHorizontal: Layout.screenPadding, borderBottomColor: C.border }]}>
          <TouchableOpacity
            style={[styles.sectionPillBtn, { backgroundColor: isViewingMySection ? C.surface : '#f59e0b18', borderColor: isViewingMySection ? C.border : '#f59e0b' }]}
            onPress={openSectionModal}
            activeOpacity={0.8}
          >
            <Icon name="map-pin" size={15} color={isViewingMySection ? C.brand : '#f59e0b'} />
            <Text style={[styles.sectionPillText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {`${activeDept} • Intake ${activeIntake}-${activeSec}`}
            </Text>
            <Icon name="chevDown" size={14} color={C.textMuted} />
          </TouchableOpacity>

          {isViewingMySection ? (
            <TouchableOpacity
              style={[styles.actionPillBtn, { backgroundColor: C.brand + '18', borderColor: C.brand }]}
              onPress={() => { setRetakeQuery(''); searchRetakes(''); setRetakeModalVisible(true); }}
              activeOpacity={0.8}
            >
              <Icon name="plus" size={14} color={C.brand} />
              <Text style={[styles.actionPillText, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.routines2.addRetake || 'Add Retake'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionPillBtn, { backgroundColor: C.brand, borderColor: C.brand }]}
              onPress={resetToMyRoutine}
              activeOpacity={0.8}
            >
              <Icon name="corner-up-left" size={14} color="#ffffff" />
              <Text style={[styles.actionPillText, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                {t.routines2.returnToMine || 'My Routine'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* 4. Main Body */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.brand} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {tab === 'class' && renderClassGrid()}
          {tab === 'exam' && renderExamGrid()}
          {tab === 'pdfs' && renderOfficialPdfs()}
        </View>
      )}

      {/* MODAL 1: Section Selector Bottom Sheet */}
      <Modal visible={sectionModalVisible} transparent animationType="slide" onRequestClose={() => setSectionModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.routines2.selectSection || 'Select Section'}
              </Text>
              <TouchableOpacity onPress={() => setSectionModalVisible(false)} hitSlop={8}>
                <Icon name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Department Picker */}
            <Text style={[styles.fieldLabel, { color: C.text3 }]}>{t.routines2.chooseDept || 'DEPARTMENT'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
              {DEPARTMENTS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.deptChip, { backgroundColor: draftDept === d ? C.brand : C.surface2, borderColor: draftDept === d ? C.brand : C.border }]}
                  onPress={() => setDraftDept(d)}
                >
                  <Text style={[styles.deptChipText, { color: draftDept === d ? '#ffffff' : C.text }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Intake & Section Inputs */}
            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.fieldLabel, { color: C.text3 }]}>{t.routines2.chooseIntake || 'INTAKE'}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  value={draftIntake}
                  onChangeText={setDraftIntake}
                  keyboardType="numeric"
                  placeholder="e.g. 51"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.fieldLabel, { color: C.text3 }]}>{t.routines2.chooseSection || 'SECTION'}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  value={draftSec}
                  onChangeText={setDraftSec}
                  keyboardType="numeric"
                  placeholder="e.g. 2"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.brand }]} onPress={applySectionSelection}>
              <Text style={styles.primaryBtnText}>{t.routines2.apply || 'View Routine'}</Text>
            </TouchableOpacity>

            {!isViewingMySection ? (
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: C.border }]} onPress={resetToMyRoutine}>
                <Text style={[styles.secondaryBtnText, { color: C.brand }]}>{t.routines2.returnToMine || 'Reset to My Routine'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: Retake Course Finder & Clash Checker */}
      <Modal visible={retakeModalVisible} transparent animationType="slide" onRequestClose={() => setRetakeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { backgroundColor: C.surface, borderColor: C.border, maxHeight: '85%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.routines2.searchRetake || 'Find Retake Subject'}
              </Text>
              <TouchableOpacity onPress={() => setRetakeModalVisible(false)} hitSlop={8}>
                <Icon name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.searchBox, { backgroundColor: C.bg, borderColor: C.border }]}>
              <Icon name="search" size={18} color={C.textMuted} />
              <TextInput
                style={[styles.searchBoxInput, { color: C.text }]}
                value={retakeQuery}
                onChangeText={searchRetakes}
                placeholder={t.routines2.searchCoursePlaceholder || 'e.g. PHY 101, CSE 467...'}
                placeholderTextColor={C.textMuted}
                autoFocus
              />
            </View>

            {/* Current Active Retakes List */}
            {userRetakeSlots.length > 0 ? (
              <View style={styles.activeRetakesBox}>
                <Text style={[styles.activeRetakeHeader, { color: C.textMuted }]}>CURRENT RETAKE COURSES</Text>
                {userRetakeSlots.map((rs) => (
                  <View key={rs.id} style={[styles.activeRetakeRow, { borderColor: C.border }]}>
                    <View>
                      <Text style={[styles.activeRetakeCode, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{rs.course_code}</Text>
                      <Text style={[styles.activeRetakeSub, { color: C.textMuted }]}>{`${rs.day_of_week} ${rs.time_slot} • Intake ${rs.intake}-${rs.section}`}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeRetakeSlot(rs.id)} hitSlop={8}>
                      <Icon name="trash-2" size={18} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Results List */}
            <ScrollView style={{ marginTop: 12 }}>
              {retakeSearching ? (
                <ActivityIndicator size="small" color={C.brand} style={{ marginVertical: 20 }} />
              ) : retakeSearchResults.length === 0 && retakeQuery.length >= 2 ? (
                <Text style={[styles.emptyHint, { color: C.textMuted }]}>No matching subjects found.</Text>
              ) : (
                retakeSearchResults.map((slot) => {
                  const day = slot.day_of_week as DayKey;
                  const existingAtSlot = gridMatrix[day]?.[slot.slot_index] || [];
                  const isClashing = existingAtSlot.length > 0;
                  const isAlreadyAdded = userRetakeSlots.some(u => u.id === slot.id);

                  return (
                    <View key={slot.id} style={[styles.retakeResultCard, { backgroundColor: C.bg, borderColor: isClashing ? '#f87171' : C.border }]}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.retakeCodeRow}>
                          <Text style={[styles.retakeCode, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {slot.course_code}
                          </Text>
                          <Pill label={`Intake ${slot.intake}-${slot.section}`} customColor={SectorColors.routines} />
                        </View>
                        {slot.course_title ? (
                          <Text style={[styles.retakeTitle, { color: C.text2 }]}>{slot.course_title}</Text>
                        ) : null}
                        <Text style={[styles.retakeTiming, { color: C.textMuted }]}>
                          {`${slot.day_of_week} • ${slot.time_slot} • Room ${slot.room}`}
                        </Text>
                        <View style={{ marginTop: 6 }}>
                          {isClashing ? (
                            <Text style={[styles.clashWarningText, { color: '#f87171' }]}>
                              {`🔴 ${t.routines2.hasClash || 'Clashes with'}: ${existingAtSlot[0].course_code}`}
                            </Text>
                          ) : (
                            <Text style={[styles.safeBadgeText, { color: C.success }]}>
                              {`🟢 ${t.routines2.noClash || 'Fits Your Schedule'}`}
                            </Text>
                          )}
                        </View>
                      </View>

                      {!isAlreadyAdded ? (
                        <TouchableOpacity
                          style={[styles.addRetakeBtn, { backgroundColor: isClashing ? C.surface2 : C.brand }]}
                          onPress={() => addRetakeSlot(slot)}
                          disabled={isAlreadyAdded}
                        >
                          <Text style={[styles.addRetakeBtnText, { color: isClashing ? C.textMuted : '#ffffff' }]}>
                            Add
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.alreadyAddedText, { color: C.textMuted }]}>Added</Text>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: Faculty Details & Room Decoded Modal / Clash Resolver */}
      <Modal visible={slotDetailModalVisible} transparent animationType="fade" onRequestClose={() => setSlotDetailModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {selectedClashSlots ? (t.routines2.conflictTitle || 'Schedule Conflict') : (t.routines2.teacherInfo || 'Class & Faculty Details')}
              </Text>
              <TouchableOpacity onPress={() => setSlotDetailModalVisible(false)} hitSlop={8}>
                <Icon name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedClashSlots ? (
              // Clash Conflict Resolver View
              <ScrollView style={{ maxHeight: 380 }}>
                <View style={[styles.clashWarningBanner, { backgroundColor: '#f8717118', borderColor: '#f87171' }]}>
                  <Icon name="alert-triangle" size={18} color="#f87171" />
                  <Text style={[styles.clashWarningBannerText, { color: C.text }]}>
                    {`The following ${selectedClashSlots.length} subjects overlap at this exact time slot.`}
                  </Text>
                </View>

                {selectedClashSlots.map((cs) => (
                  <View key={cs.id} style={[styles.clashCourseCard, { backgroundColor: C.bg, borderColor: C.border }]}>
                    <Text style={[styles.clashCourseCode, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {cs.course_code}
                    </Text>
                    {cs.course_title ? <Text style={[styles.clashCourseTitle, { color: C.text2 }]}>{cs.course_title}</Text> : null}
                    <Text style={[styles.clashCourseSub, { color: C.textMuted }]}>
                      {`Intake: ${cs.intake}-${cs.section} • Room: ${cs.room} • FC: ${cs.teacher_short_code || 'TBA'}`}
                    </Text>
                    {cs.isRetake ? (
                      <TouchableOpacity
                        style={[styles.removeRetakeBtn, { backgroundColor: C.danger + '18' }]}
                        onPress={() => removeRetakeSlot(cs.id)}
                      >
                        <Text style={[styles.removeRetakeBtnText, { color: C.danger }]}>Remove This Retake</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : selectedSlot ? (
              // Single Slot Faculty & Room View
              <ScrollView style={{ maxHeight: 420 }}>
                {/* Course Header */}
                <View style={styles.dialogCourseHeader}>
                  <Text style={[styles.dialogCourseCode, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                    {selectedSlot.course_code}
                  </Text>
                  {selectedSlot.course_title ? (
                    <Text style={[styles.dialogCourseTitle, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      {selectedSlot.course_title}
                    </Text>
                  ) : null}
                </View>

                {/* Venue Details */}
                <View style={[styles.dialogSectionBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <View style={styles.dialogSectionRow}>
                    <Icon name="map-pin" size={18} color={SectorColors.routines} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[styles.dialogMetaVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {decodedActiveRoom?.roomNumber}
                      </Text>
                      <Text style={[styles.dialogMetaSub, { color: C.textMuted }]}>
                        {decodedActiveRoom?.building} • {decodedActiveRoom?.floor}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.dialogSectionRow, { marginTop: 10 }]}>
                    <Icon name="clock" size={18} color={C.brand} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[styles.dialogMetaVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {selectedSlot.time_slot}
                      </Text>
                      <Text style={[styles.dialogMetaSub, { color: C.textMuted }]}>
                        {`${selectedSlot.day_of_week} • Intake ${selectedSlot.intake} - Section ${selectedSlot.section}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Faculty Card */}
                <View style={[styles.dialogFacultyCard, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <Text style={[styles.dialogFacultyTitle, { color: C.textMuted }]}>
                    {t.routines2.teacherInfo || 'FACULTY INFORMATION'}
                  </Text>
                  <View style={styles.facultyRow}>
                    <View style={[styles.facultyAvatar, { backgroundColor: C.brand + '20' }]}>
                      {activeFaculty?.photo_url ? (
                        <Image source={{ uri: activeFaculty.photo_url }} style={styles.facultyAvatarImg} />
                      ) : (
                        <Text style={[styles.facultyAvatarText, { color: C.brand }]}>
                          {(selectedSlot.teacher_short_code || 'T').slice(0, 2)}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.facultyName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {activeFaculty?.name || `Faculty Code: ${selectedSlot.teacher_short_code}`}
                      </Text>
                      <Text style={[styles.facultyDesignation, { color: C.textMuted }]}>
                        {activeFaculty?.designation || 'Instructor'}
                      </Text>
                      {activeFaculty?.room_number ? (
                        <Text style={[styles.facultyDesk, { color: C.text2 }]}>
                          {`Desk: Room ${activeFaculty.room_number}`}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {activeFaculty?.counseling_hours ? (
                    <View style={[styles.counselingBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                      <Text style={[styles.counselingLabel, { color: C.brand }]}>
                        {t.routines2.counselingHours || 'Counseling Hours'}
                      </Text>
                      <Text style={[styles.counselingVal, { color: C.text }]}>
                        {activeFaculty.counseling_hours}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* If retake: Remove Button */}
                {selectedSlot.isRetake ? (
                  <TouchableOpacity
                    style={[styles.removeRetakeBtn, { backgroundColor: C.danger + '18', marginTop: 12 }]}
                    onPress={() => removeRetakeSlot(selectedSlot.id)}
                  >
                    <Text style={[styles.removeRetakeBtnText, { color: C.danger }]}>
                      {t.routines2.removeRetake || 'Remove From Personal Routine'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Upload PDF Routine (Admin / Staff) */}
      <Modal visible={pdfUploadModalVisible} transparent animationType="slide" onRequestClose={() => setPdfUploadModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.routines2.addRoutine || 'Post Routine PDF'}
              </Text>
              <TouchableOpacity onPress={() => setPdfUploadModalVisible(false)} hitSlop={8}>
                <Icon name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={[styles.fieldLabel, { color: C.text3 }]}>{t.routines2.routineTitle || 'TITLE'}</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                value={fTitle}
                onChangeText={setFTitle}
                placeholder="e.g. CSE Fall 2026 Routine"
                placeholderTextColor={C.textMuted}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.fieldLabel, { color: C.text3 }]}>DEPARTMENT</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    value={fDept}
                    onChangeText={setFDept}
                    placeholder="e.g. CSE"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.fieldLabel, { color: C.text3 }]}>SEMESTER</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    value={fSemester}
                    onChangeText={setFSemester}
                    placeholder="e.g. Fall 2026"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.pickFileBtn, { borderColor: C.border }]} onPress={pickFile}>
                <Icon name="upload" size={18} color={C.brand} />
                <Text style={[styles.pickFileText, { color: C.text }]}>
                  {pickedFile ? pickedFile.name : (t.routines2.chooseFile || 'Choose PDF File')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.brand, marginTop: 16 }]}
                onPress={handlePostPdf}
                disabled={postingPdf}
              >
                {postingPdf ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t.routines2.postRoutine || 'Post Routine'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  gridOuterScroll: {
    flex: 1,
  },
  horizontalScroll: {
    flex: 1,
  },
  gridContainer: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  clashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  clashBannerText: {
    fontSize: FontSize.sm,
    marginLeft: 8,
  },
  headerRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  dayHeaderCell: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  headerLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
  },
  timeHeaderCell: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  timeHeaderText: {
    fontSize: FontSize.xs - 1,
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  dayNameCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: FontSize.sm,
  },
  slotCell: {
    minHeight: 110,
    borderRightWidth: 1,
    padding: 5,
    justifyContent: 'center',
  },
  cellContent: {
    flex: 1,
    justifyContent: 'center',
  },
  badgePill: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 4,
  },
  badgePillText: {
    fontSize: 9,
    fontFamily: FontFamily.jakartaBold,
    color: '#ffffff',
  },
  cellCourseCode: {
    fontSize: FontSize.sm,
    letterSpacing: -0.2,
  },
  cellMeta: {
    fontSize: FontSize.xs - 1,
    marginTop: 1,
    fontFamily: FontFamily.jakartaMedium,
  },
  cellSub: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: FontFamily.jakartaRegular,
  },
  stackedClass: {
    marginTop: 3,
    paddingTop: 3,
    borderTopWidth: 0.5,
    borderTopColor: '#f8717150',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sectionPillText: {
    fontSize: FontSize.sm,
    marginHorizontal: 6,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: FontSize.sm,
    marginLeft: 4,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    marginTop: 14,
  },
  emptySub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: FontFamily.jakartaRegular,
  },
  // Exam Grid Cards
  examListContainer: {
    paddingVertical: 12,
  },
  examCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  examCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  examDateText: {
    fontSize: FontSize.sm,
  },
  examCardBody: {
    padding: 14,
  },
  examCourseCode: {
    fontSize: FontSize.xl,
  },
  examCourseTitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  examMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  examMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  examMetaVal: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaMedium,
  },
  // PDF Cards
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 10,
  },
  pdfIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pdfBody: {
    flex: 1,
  },
  pdfTitle: {
    fontSize: FontSize.base,
  },
  pdfMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  pdfMetaText: {
    fontSize: FontSize.xs,
  },
  pdfTime: {
    fontSize: FontSize.xs - 1,
    marginTop: 4,
    fontFamily: FontFamily.jakartaRegular,
  },
  // Modals & Bottom Sheets
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaBold,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  deptScroll: {
    marginBottom: 16,
  },
  deptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  deptChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.jakartaBold,
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  textInput: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: FontSize.base,
    fontFamily: FontFamily.jakartaRegular,
  },
  primaryBtn: {
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.jakartaBold,
    color: '#ffffff',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.jakartaBold,
  },
  // Retake Finder
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchBoxInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: FontSize.base,
    fontFamily: FontFamily.jakartaRegular,
  },
  activeRetakesBox: {
    marginTop: 14,
  },
  activeRetakeHeader: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaBold,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  activeRetakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  activeRetakeCode: {
    fontSize: FontSize.sm,
  },
  activeRetakeSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  emptyHint: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: FontSize.sm,
  },
  retakeResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  retakeCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retakeCode: {
    fontSize: FontSize.base,
  },
  retakeTitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
    fontFamily: FontFamily.jakartaMedium,
  },
  retakeTiming: {
    fontSize: FontSize.xs - 1,
    marginTop: 4,
    fontFamily: FontFamily.jakartaRegular,
  },
  clashWarningText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaSemiBold,
  },
  safeBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaSemiBold,
  },
  addRetakeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginLeft: 10,
  },
  addRetakeBtnText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaBold,
  },
  alreadyAddedText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaSemiBold,
    marginLeft: 10,
  },
  // Dialog Modal
  dialogCard: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 20,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  dialogCourseHeader: {
    marginBottom: 12,
  },
  dialogCourseCode: {
    fontSize: FontSize.xl,
  },
  dialogCourseTitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  dialogSectionBox: {
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  dialogSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialogMetaVal: {
    fontSize: FontSize.sm,
  },
  dialogMetaSub: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  dialogFacultyCard: {
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  dialogFacultyTitle: {
    fontSize: FontSize.xs - 1,
    fontFamily: FontFamily.jakartaBold,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facultyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  facultyAvatarImg: {
    width: '100%',
    height: '100%',
  },
  facultyAvatarText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.jakartaBold,
  },
  facultyName: {
    fontSize: FontSize.base,
  },
  facultyDesignation: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  facultyDesk: {
    fontSize: FontSize.xs - 1,
    marginTop: 2,
    fontFamily: FontFamily.jakartaMedium,
  },
  counselingBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  counselingLabel: {
    fontSize: FontSize.xs - 1,
    fontFamily: FontFamily.jakartaBold,
  },
  counselingVal: {
    fontSize: FontSize.xs,
    marginTop: 2,
    fontFamily: FontFamily.jakartaRegular,
  },
  removeRetakeBtn: {
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeRetakeBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.jakartaBold,
  },
  clashWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  clashWarningBannerText: {
    fontSize: FontSize.xs,
    marginLeft: 8,
    flex: 1,
    fontFamily: FontFamily.jakartaMedium,
  },
  clashCourseCard: {
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  clashCourseCode: {
    fontSize: FontSize.base,
  },
  clashCourseTitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  clashCourseSub: {
    fontSize: FontSize.xs - 1,
    marginTop: 4,
  },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 12,
    gap: 8,
  },
  pickFileText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.jakartaMedium,
  },
});
