import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  BackHandler,
  TextInput,
  Share,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { useToast } from '../../components/ui/Toast';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import { supabase } from '../../lib/supabase';
import { normalizePdfUrl } from '../../utils/pdfUrl';
import { openUrl } from '../../utils/link';
import { FontFamily, Layout, Radius, SectorColors, pillBg, Accent } from '../../theme';

export interface DepartmentItem {
  code: string;
  name: string;
  shortName: string;
  icon: keyof typeof Feather.glyphMap;
  accentColor: string;
  intakes: string[];
  sections: string[];
}

export const DEPARTMENTS: DepartmentItem[] = [
  {
    code: 'CSE',
    name: 'Computer Science & Engineering',
    shortName: 'CSE / Data Science',
    icon: 'cpu',
    accentColor: '#2563eb',
    intakes: ['51', '52', '53', '54', '55', '56', '57'],
    sections: ['1', '2', '3', '4'],
  },
  {
    code: 'EEE',
    name: 'Electrical & Electronic Engineering',
    shortName: 'EEE (Day & Evening)',
    icon: 'zap',
    accentColor: '#0284c7',
    intakes: ['45', '46', '47', '48', '49', '50'],
    sections: ['1', '2', '3'],
  },
  {
    code: 'BBA',
    name: 'Faculty of Business',
    shortName: 'BBA / MBA / EMBA',
    icon: 'briefcase',
    accentColor: '#b45309',
    intakes: ['48', '49', '50', '51', '52', '53'],
    sections: ['1', '2', '3'],
  },
  {
    code: 'English',
    name: 'Department of English',
    shortName: 'BA (Hons) in English',
    icon: 'book',
    accentColor: '#059669',
    intakes: ['42', '43', '44', '45', '46'],
    sections: ['1', '2'],
  },
  {
    code: 'Law',
    name: 'Law & Justice',
    shortName: 'LLB / LLM Programs',
    icon: 'shield',
    accentColor: '#7c3aed',
    intakes: ['48', '49', '50', '51', '56'],
    sections: ['1', '2'],
  },
  {
    code: 'Civil',
    name: 'Civil Engineering',
    shortName: 'CE (Day & Evening)',
    icon: 'tool',
    accentColor: '#ea580c',
    intakes: ['35', '36', '37', '38', '39'],
    sections: ['1', '2'],
  },
  {
    code: 'Textile',
    name: 'Textile Engineering',
    shortName: 'TE (Day & Evening)',
    icon: 'layers',
    accentColor: '#db2777',
    intakes: ['38', '39', '40', '41', '42'],
    sections: ['1', '2'],
  },
  {
    code: 'Economics',
    name: 'Economics',
    shortName: 'B.Sc. in Economics',
    icon: 'trending-up',
    accentColor: '#0d9488',
    intakes: ['20', '21', '22', '23', '24'],
    sections: ['1', '2'],
  },
  {
    code: 'Math',
    name: 'Mathematics & Statistics',
    shortName: 'Dept. of Math & Stats',
    icon: 'grid',
    accentColor: '#6366f1',
    intakes: ['15', '16', '17', '18'],
    sections: ['1', '2'],
  },
];

export interface OfficialRoutineRow {
  id: string;
  type: 'class' | 'exam';
  title: string;
  department: string | null;
  semester: string | null;
  intake: string | null;
  section: string | null;
  file_url: string | null;
  image_url: string | null;
  created_at: string;
}

export interface RoutineSlot {
  id: string;
  department: string;
  intake: string;
  section: string;
  semester: string;
  day_of_week: 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THR' | 'FRI';
  time_slot: string;
  slot_index: number;
  course_code: string;
  course_title: string;
  teacher_short_code: string;
  room: string;
  building: string;
  is_lab?: boolean;
}

export interface ExamSlot {
  id: string;
  department: string;
  intake: string;
  section: string;
  semester: string;
  exam_date: string;
  day_of_week: string;
  shift: string;
  time_range: string;
  course_code: string;
  course_title: string;
  teacher_short_code: string;
  room: string;
  building: string;
  seat_range?: string;
}

export interface MergedSlot extends RoutineSlot {
  isRetake?: boolean;
  hasClash?: boolean;
}

export function normalizeDeptCode(dept: string | null | undefined): string {
  if (!dept) return 'CSE';
  const d = dept.toLowerCase().trim();
  if (d.includes('computer') || d.includes('cse') || d.includes('dse')) return 'CSE';
  if (d.includes('electrical') || d.includes('eee')) return 'EEE';
  if (d.includes('business') || d.includes('bba') || d.includes('mba')) return 'BBA';
  if (d.includes('english') || d.includes('eng')) return 'English';
  if (d.includes('law') || d.includes('justice') || d.includes('llb') || d.includes('llm')) return 'Law';
  if (d.includes('civil') || d.includes('ce')) return 'Civil';
  if (d.includes('textile') || d.includes('te')) return 'Textile';
  if (d.includes('economics') || d.includes('econ')) return 'Economics';
  if (d.includes('math') || d.includes('statistics')) return 'Math';
  return dept.trim() || 'CSE';
}

export function matchesDepartment(routineDept: string | null | undefined, targetCode: string): boolean {
  if (!routineDept) return false;
  const d = routineDept.toLowerCase().trim();
  switch (targetCode) {
    case 'CSE':
      return d.includes('cse') || d.includes('computer') || d.includes('dse');
    case 'EEE':
      return d.includes('eee') || d.includes('electrical');
    case 'BBA':
      return d.includes('bba') || d.includes('mba') || d.includes('business') || d.includes('faculty of business');
    case 'English':
      return d.includes('english') || d.includes('eng');
    case 'Law':
      return d.includes('law') || d.includes('justice') || d.includes('llb') || d.includes('llm');
    case 'Civil':
      return d.includes('civil') || d.includes('ce');
    case 'Textile':
      return d.includes('textile') || d.includes('te');
    case 'Economics':
      return d.includes('economics') || d.includes('econ') || d.includes('ede');
    case 'Math':
      return d.includes('math') || d.includes('statistics');
    default:
      return d.includes(targetCode.toLowerCase());
  }
}

function getOrdinal(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

export function decodeRoom(roomStr: string) {
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
      roomNumber: `Room ${r}`,
    };
  }
  return {
    building: 'BUBT Main Campus',
    floor: 'Academic Floor',
    roomNumber: `Room ${r}`,
  };
}

export function getTodayDayKey(): 'ALL' | 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THR' | 'FRI' {
  const day = new Date().getDay();
  switch (day) {
    case 6: return 'SAT';
    case 0: return 'SUN';
    case 1: return 'MON';
    case 2: return 'TUE';
    case 3: return 'WED';
    case 4: return 'THR';
    case 5: return 'FRI';
    default: return 'ALL';
  }
}

const WEEKDAYS: ('ALL' | 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THR' | 'FRI')[] = [
  'ALL', 'SAT', 'SUN', 'MON', 'TUE', 'WED', 'THR', 'FRI'
];

type MainTab = 'my_routine' | 'other_routines' | 'official_pdfs';
type SubScheduleType = 'class' | 'exam';

export function RoutinesBrowseScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  // Navigation Parameters with Defaults
  const initialTabParam = route?.params?.initialTab as MainTab | undefined;
  const subScheduleParam = route?.params?.subSchedule as SubScheduleType | undefined;

  // 1. Primary 58dp Segmented Navigation Tabs (Strictly 3 Tabs)
  const [mainTab, setMainTab] = useState<MainTab>(initialTabParam || 'my_routine');
  const [subType, setSubType] = useState<SubScheduleType>(subScheduleParam || 'class');
  const [selectedDay, setSelectedDay] = useState<string>(getTodayDayKey());

  // 2. Student Personal Routine State (Resolved from Profile)
  const myDeptCode = useMemo(() => normalizeDeptCode(profile?.department), [profile?.department]);
  const myIntake = profile?.intake?.trim() || '51';
  const mySec = profile?.section?.trim() || '1';

  // 3. Other Section Explorer State
  const [otherDeptCode, setOtherDeptCode] = useState<string>(myDeptCode === 'CSE' ? 'CSE' : myDeptCode);
  const [otherIntake, setOtherIntake] = useState<string>(myIntake === '51' ? '51' : myIntake);
  const [otherSec, setOtherSec] = useState<string>(mySec === '1' ? '2' : '1');

  // Resolved Active Scope based on active mainTab
  const activeDept = mainTab === 'my_routine' ? myDeptCode : otherDeptCode;
  const activeIntake = mainTab === 'my_routine' ? myIntake : otherIntake;
  const activeSec = mainTab === 'my_routine' ? mySec : otherSec;

  // Datasets
  const [classSlots, setClassSlots] = useState<MergedSlot[]>([]);
  const [userRetakeSlots, setUserRetakeSlots] = useState<MergedSlot[]>([]);
  const [examSlots, setExamSlots] = useState<ExamSlot[]>([]);
  const [allRoutines, setAllRoutines] = useState<OfficialRoutineRow[]>([]);
  const [pdfDeptFilter, setPdfDeptFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Sheets
  const [sectionPickerVisible, setSectionPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'my' | 'other'>('other');
  const [draftDept, setDraftDept] = useState(otherDeptCode);
  const [draftIntake, setDraftIntake] = useState(otherIntake);
  const [draftSec, setDraftSec] = useState(otherSec);

  const [retakeModalVisible, setRetakeModalVisible] = useState(false);
  const [retakeQuery, setRetakeQuery] = useState('');
  const [retakeResults, setRetakeResults] = useState<RoutineSlot[]>([]);
  const [retakeSearching, setRetakeSearching] = useState(false);

  const [teacherModalVisible, setTeacherModalVisible] = useState(false);
  const [selectedTeacherCode, setSelectedTeacherCode] = useState<string>('');
  const [selectedTeacherRoom, setSelectedTeacherRoom] = useState<string>('');

  // PDF Viewer Modal
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [activeModalUrl, setActiveModalUrl] = useState<string | null>(null);
  const [activeModalTitle, setActiveModalTitle] = useState('BUBT Routine');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Sync route params when re-navigated
  useEffect(() => {
    if (route?.params?.initialTab) {
      setMainTab(route.params.initialTab);
    }
    if (route?.params?.subSchedule) {
      setSubType(route.params.subSchedule);
    }
  }, [route?.params]);

  // Primary 58dp Segmented Tabs
  const MAIN_TABS: TabItem<MainTab>[] = useMemo(() => [
    { id: 'my_routine', label: 'My Routine', icon: 'calendar', color: SectorColors.routines },
    { id: 'other_routines', label: 'Other Routines', icon: 'compass', color: C.brand },
    { id: 'official_pdfs', label: 'Official PDFs', icon: 'file-text', color: SectorColors.study },
  ], [C.brand]);

  // 58dp Sub-Toggle Tabs
  const SUB_TABS: TabItem<SubScheduleType>[] = useMemo(() => [
    { id: 'class', label: 'Class Schedule', icon: 'clock', color: SectorColors.routines },
    { id: 'exam', label: 'Exam Schedule', icon: 'file-text', color: SectorColors.routines },
  ], []);

  // Department Item for active selection
  const activeDeptItem = useMemo(() => {
    return DEPARTMENTS.find(d => matchesDepartment(d.code, activeDept)) || DEPARTMENTS[0];
  }, [activeDept]);

  // Load Routine Data (Routine Slots, Retake Slots, Exam Slots, Official PDFs)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Section Class Routine Slots
      const { data: slotsData, error: slotsErr } = await supabase
        .from('routine_slots')
        .select('*')
        .or(`department.eq.${activeDept},department.ilike.%${activeDept}%`)
        .eq('intake', activeIntake)
        .eq('section', activeSec)
        .order('slot_index', { ascending: true });

      const baseSlots: MergedSlot[] = (!slotsErr && slotsData ? (slotsData as RoutineSlot[]) : []).map(s => ({
        ...s,
        isRetake: false,
      }));

      // 2. Fetch User Personalized Retake Courses (for My Routine tab)
      let combinedSlots = baseSlots;
      if (mainTab === 'my_routine' && user?.id) {
        const { data: retakeRows, error: retakeErr } = await supabase
          .from('user_custom_routine_slots')
          .select('slot_id, routine_slots(*)')
          .eq('user_id', user.id);

        if (!retakeErr && retakeRows && retakeRows.length > 0) {
          const retakes: MergedSlot[] = retakeRows
            .map((r: any) => r.routine_slots)
            .filter(Boolean)
            .map((s: RoutineSlot) => ({ ...s, isRetake: true }));
          setUserRetakeSlots(retakes);
          combinedSlots = [...baseSlots, ...retakes];
        } else {
          setUserRetakeSlots([]);
        }
      }

      // Check for schedule clashes (same day & time slot)
      const slotBuckets: Record<string, number> = {};
      for (const slot of combinedSlots) {
        const key = `${slot.day_of_week}_${slot.slot_index}`;
        slotBuckets[key] = (slotBuckets[key] || 0) + 1;
      }
      combinedSlots = combinedSlots.map(s => ({
        ...s,
        hasClash: (slotBuckets[`${s.day_of_week}_${s.slot_index}`] || 0) > 1,
      }));

      setClassSlots(combinedSlots);

      // 3. Fetch Exam Schedule Slots
      const { data: examData, error: examErr } = await supabase
        .from('exam_slots')
        .select('*')
        .or(`department.eq.${activeDept},department.ilike.%${activeDept}%`)
        .eq('intake', activeIntake)
        .eq('section', activeSec)
        .order('exam_date', { ascending: true });

      if (!examErr && examData) {
        setExamSlots(examData as ExamSlot[]);
      } else {
        setExamSlots([]);
      }

      // 4. Fetch Official University Routine Documents
      const { data: pdfsData, error: pdfsErr } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      if (!pdfsErr && pdfsData) {
        setAllRoutines(pdfsData as OfficialRoutineRow[]);
      }
    } catch (err: any) {
      console.warn('Routines loadData exception:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [activeDept, activeIntake, activeSec, mainTab, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Hardware Back Handler
  useEffect(() => {
    const onBackPress = () => {
      if (pdfModalVisible) {
        setPdfModalVisible(false);
        return true;
      }
      if (sectionPickerVisible) {
        setSectionPickerVisible(false);
        return true;
      }
      if (retakeModalVisible) {
        setRetakeModalVisible(false);
        return true;
      }
      if (teacherModalVisible) {
        setTeacherModalVisible(false);
        return true;
      }
      if (mainTab !== 'my_routine') {
        setMainTab('my_routine');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [pdfModalVisible, sectionPickerVisible, retakeModalVisible, teacherModalVisible, mainTab]);

  // Open Section Picker Sheet
  const openPicker = (target: 'my' | 'other') => {
    setPickerTarget(target);
    if (target === 'my') {
      setDraftDept(myDeptCode);
      setDraftIntake(myIntake);
      setDraftSec(mySec);
    } else {
      setDraftDept(otherDeptCode);
      setDraftIntake(otherIntake);
      setDraftSec(otherSec);
    }
    setSectionPickerVisible(true);
  };

  const applyPickerSelection = () => {
    if (pickerTarget === 'other') {
      setOtherDeptCode(draftDept);
      setOtherIntake(draftIntake);
      setOtherSec(draftSec);
    }
    setSectionPickerVisible(false);
  };

  // Search Retakes
  const searchRetakes = async (query: string) => {
    setRetakeQuery(query);
    if (!query.trim() || query.trim().length < 2) {
      setRetakeResults([]);
      return;
    }
    setRetakeSearching(true);
    try {
      const q = query.trim().toUpperCase();
      const { data, error } = await supabase
        .from('routine_slots')
        .select('*')
        .or(`course_code.ilike.%${q}%,course_title.ilike.%${q}%`)
        .limit(20);

      if (!error && data) {
        // Exclude current section's own slots
        const filtered = (data as RoutineSlot[]).filter(
          s => !(s.department === activeDept && s.intake === activeIntake && s.section === activeSec)
        );
        setRetakeResults(filtered);
      } else {
        setRetakeResults([]);
      }
    } finally {
      setRetakeSearching(false);
    }
  };

  // Add Retake Slot to Student Profile
  const handleAddRetake = async (slot: RoutineSlot) => {
    if (!user?.id) {
      toast({ type: 'info', title: 'Sign-in required', message: 'Sign in to save retake courses to your profile.' });
      return;
    }
    try {
      const { error } = await supabase
        .from('user_custom_routine_slots')
        .insert({
          user_id: user.id,
          slot_id: slot.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({ type: 'info', title: 'Already added', message: 'This course is already in your routine.' });
          return;
        }
        throw error;
      }

      toast({ type: 'success', title: 'Retake course added', message: `${slot.course_code} added to your weekly routine.` });
      setRetakeModalVisible(false);
      await loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to add', message: err?.message || 'Could not save retake course.' });
    }
  };

  // Remove Retake Slot
  const handleRemoveRetake = async (slotId: string) => {
    if (!user?.id) return;
    try {
      await supabase
        .from('user_custom_routine_slots')
        .delete()
        .eq('user_id', user.id)
        .eq('slot_id', slotId);

      toast({ type: 'success', title: 'Retake course removed' });
      await loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: 'Could not remove course.' });
    }
  };

  // Filtered Class Slots by Weekday
  const filteredClassSlots = useMemo(() => {
    if (selectedDay === 'ALL') return classSlots;
    return classSlots.filter(s => s.day_of_week === selectedDay);
  }, [classSlots, selectedDay]);

  // Today's classes count
  const todayKey = getTodayDayKey();
  const todayClassesCount = useMemo(() => {
    if (todayKey === 'ALL') return 0;
    return classSlots.filter(s => s.day_of_week === todayKey).length;
  }, [classSlots, todayKey]);

  // Filtered Official PDFs
  const filteredPdfs = useMemo(() => {
    if (pdfDeptFilter === 'All') return allRoutines;
    return allRoutines.filter(r => matchesDepartment(r.department, pdfDeptFilter));
  }, [allRoutines, pdfDeptFilter]);

  // PDF Actions
  const handleOpenPdf = (doc: OfficialRoutineRow) => {
    const url = normalizePdfUrl(doc.file_url || doc.image_url);
    if (!url) {
      toast({ type: 'error', title: 'File unavailable', message: 'No downloadable document attached.' });
      return;
    }
    setActiveModalUrl(url);
    setActiveModalTitle(doc.title || `${doc.department || 'BUBT'} Routine`);
    setPdfModalVisible(true);
  };

  const handleDownloadPdf = async (doc: OfficialRoutineRow) => {
    const rawUrl = doc.file_url || doc.image_url;
    if (!rawUrl) return;
    setDownloadingId(doc.id);
    toast({ type: 'info', title: 'Downloading routine PDF…' });
    try {
      const targetUrl = normalizePdfUrl(rawUrl) || rawUrl;
      const downloaded = await File.downloadFileAsync(targetUrl, Paths.cache, { idempotent: true });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${doc.title}`,
          UTI: 'com.adobe.pdf',
        });
        toast({ type: 'success', title: 'Routine PDF downloaded' });
      } else {
        toast({ type: 'success', title: 'Downloaded to device cache' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Download failed', message: err?.message || 'Could not download routine' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShareDoc = async (doc: OfficialRoutineRow) => {
    const targetUrl = normalizePdfUrl(doc.file_url || doc.image_url) || 'https://www.bubt.edu.bd/notice';
    try {
      await Share.share({
        title: doc.title,
        message: `${doc.title}\n\nBUBT ${doc.department || 'Official'}\n${targetUrl}`,
      });
    } catch {}
  };

  // Draft department item for section picker sheet
  const draftDeptItem = useMemo(() => {
    return DEPARTMENTS.find(d => d.code === draftDept) || DEPARTMENTS[0];
  }, [draftDept]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Universal Top SubBar */}
      <SubBar
        title="Class & Exam Routines"
        onBack={() => navigation.goBack()}
        rightSlot={
          mainTab === 'my_routine' ? (
            <TouchableOpacity
              onPress={() => {
                setRetakeQuery('');
                searchRetakes('');
                setRetakeModalVisible(true);
              }}
              hitSlop={8}
              style={[styles.headerIconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            >
              <Feather name="plus" size={17} color={SectorColors.routines} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* 1. Primary 58dp Segmented Navigation Tabs */}
        <View style={styles.primaryTabsContainer}>
          <SegmentedTabs<MainTab>
            tabs={MAIN_TABS}
            activeTab={mainTab}
            onTabChange={setMainTab}
            size="md"
          />
        </View>

        {/* 2. THE 72-SIZE BAR STANDARD (Dedicated per Mode) */}
        {mainTab === 'my_routine' && (
          <View
            style={[
              styles.bar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderLeftColor: SectorColors.routines,
              },
            ]}
          >
            <View style={[styles.barIconBox, { backgroundColor: pillBg(SectorColors.routines, isDark), borderColor: SectorColors.routines + '44' }]}>
              <Feather name="calendar" size={22} color={SectorColors.routines} />
            </View>
            <View style={styles.barTextCol}>
              <Text style={[styles.barEyebrow, { color: SectorColors.routines, fontFamily: FontFamily.jakartaBold }]}>
                MY PERSONAL ROUTINE
              </Text>
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {`${myDeptCode} • Intake ${myIntake} · Sec ${mySec}`}
              </Text>
              <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {`${classSlots.length} weekly classes · ${todayClassesCount} today${userRetakeSlots.length > 0 ? ` · ${userRetakeSlots.length} retakes` : ''}`}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setRetakeQuery('');
                searchRetakes('');
                setRetakeModalVisible(true);
              }}
              style={[styles.barActionBtn, { backgroundColor: pillBg(SectorColors.routines, isDark), borderColor: SectorColors.routines + '55' }]}
            >
              <Feather name="plus" size={13} color={SectorColors.routines} style={{ marginRight: 4 }} />
              <Text style={[styles.barActionBtnText, { color: SectorColors.routines, fontFamily: FontFamily.jakartaBold }]}>
                Retake
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mainTab === 'other_routines' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openPicker('other')}
            style={[
              styles.bar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderLeftColor: C.brand,
              },
            ]}
          >
            <View style={[styles.barIconBox, { backgroundColor: pillBg(C.brand, isDark), borderColor: C.brand + '44' }]}>
              <Feather name="compass" size={22} color={C.brand} />
            </View>
            <View style={styles.barTextCol}>
              <Text style={[styles.barEyebrow, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                EXPLORE OTHER SECTIONS
              </Text>
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {`${otherDeptCode} • Intake ${otherIntake} · Sec ${otherSec}`}
              </Text>
              <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {`Showing section ${otherSec} timetable · Tap to change`}
              </Text>
            </View>
            <View style={[styles.barActionBtn, { backgroundColor: pillBg(C.brand, isDark), borderColor: C.brand + '55' }]}>
              <Text style={[styles.barActionBtnText, { color: C.brand, fontFamily: FontFamily.jakartaBold, marginRight: 2 }]}>
                Change
              </Text>
              <Feather name="chevron-down" size={13} color={C.brand} />
            </View>
          </TouchableOpacity>
        )}

        {mainTab === 'official_pdfs' && (
          <View
            style={[
              styles.bar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderLeftColor: SectorColors.study,
              },
            ]}
          >
            <View style={[styles.barIconBox, { backgroundColor: pillBg(SectorColors.study, isDark), borderColor: SectorColors.study + '44' }]}>
              <Feather name="file-text" size={22} color={SectorColors.study} />
            </View>
            <View style={styles.barTextCol}>
              <Text style={[styles.barEyebrow, { color: SectorColors.study, fontFamily: FontFamily.jakartaBold }]}>
                OFFICIAL BUBT CIRCULARS
              </Text>
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                Master Departmental PDFs
              </Text>
              <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                Official controller schedules and signed notices
              </Text>
            </View>
            <View style={[styles.badgeTag, { backgroundColor: pillBg(SectorColors.study, isDark) }]}>
              <Text style={[styles.badgeTagText, { color: SectorColors.study, fontFamily: FontFamily.jakartaBold }]}>
                {filteredPdfs.length} DOCS
              </Text>
            </View>
          </View>
        )}

        {/* 3. Sub-Schedule Switcher (Class vs Exam Schedule) for Routine Views */}
        {mainTab !== 'official_pdfs' && (
          <View style={styles.subToggleContainer}>
            <SegmentedTabs<SubScheduleType>
              tabs={SUB_TABS}
              activeTab={subType}
              onTabChange={setSubType}
              size="sm"
            />
          </View>
        )}

        {/* ─── TAB 1 & 2 CONTENT: CLASS SCHEDULE ─── */}
        {mainTab !== 'official_pdfs' && subType === 'class' && (
          <>
            {/* Weekday Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekdayRow}>
              {WEEKDAYS.map((day) => {
                const isSel = selectedDay === day;
                const isToday = day === todayKey;
                return (
                  <TouchableOpacity
                    key={day}
                    activeOpacity={0.8}
                    onPress={() => setSelectedDay(day)}
                    style={[
                      styles.weekdayPill,
                      {
                        backgroundColor: isSel ? C.brand : C.surface,
                        borderColor: isSel ? C.brand : (isToday ? C.brand + '88' : C.border),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekdayPillText,
                        {
                          color: isSel ? '#ffffff' : (isToday ? C.brand : C.text),
                          fontFamily: isSel ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                    {isToday && !isSel && <View style={[styles.todayDot, { backgroundColor: C.brand }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Class Cards List */}
            {loading ? (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <ActivityIndicator color={C.brand} size="large" />
                <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Loading weekly timetable…
                </Text>
              </View>
            ) : filteredClassSlots.length > 0 ? (
              filteredClassSlots.map((slot) => {
                const roomInfo = decodeRoom(slot.room);
                return (
                  <View
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      {
                        backgroundColor: slot.hasClash ? (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2') : C.surface,
                        borderColor: slot.hasClash ? C.danger : C.border,
                        borderLeftColor: slot.hasClash ? C.danger : (slot.isRetake ? '#f59e0b' : C.brand),
                      },
                    ]}
                  >
                    {/* Clash Alert Banner */}
                    {slot.hasClash && (
                      <View style={[styles.clashBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                        <Feather name="alert-triangle" size={13} color={C.danger} style={{ marginRight: 5 }} />
                        <Text style={[styles.clashBannerText, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                          SCHEDULE CONFLICT · Multiple classes at this slot
                        </Text>
                      </View>
                    )}

                    {/* Top Time Strip */}
                    <View style={styles.slotTimeRow}>
                      <View style={[styles.timeTag, { backgroundColor: pillBg(C.brand, isDark) }]}>
                        <Feather name="clock" size={13} color={C.brand} style={{ marginRight: 5 }} />
                        <Text style={[styles.timeTagText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                          {slot.time_slot}
                        </Text>
                      </View>
                      <View style={styles.tagGroup}>
                        {slot.isRetake && (
                          <View style={[styles.badgeTagSmall, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
                            <Text style={[styles.badgeTagSmallText, { color: '#f59e0b', fontFamily: FontFamily.jakartaBold }]}>
                              RETAKE
                            </Text>
                          </View>
                        )}
                        {slot.is_lab && (
                          <View style={[styles.badgeTagSmall, { backgroundColor: pillBg(SectorColors.study, isDark) }]}>
                            <Text style={[styles.badgeTagSmallText, { color: SectorColors.study, fontFamily: FontFamily.jakartaBold }]}>
                              LAB
                            </Text>
                          </View>
                        )}
                        <View style={[styles.dayBadge, { backgroundColor: C.surface2 }]}>
                          <Text style={[styles.dayBadgeText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {slot.day_of_week}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Course Code & Title */}
                    <Text style={[styles.slotCourseCode, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {slot.course_code}
                    </Text>
                    {slot.course_title && (
                      <Text style={[styles.slotCourseTitle, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                        {slot.course_title}
                      </Text>
                    )}

                    {/* Location & Teacher Meta */}
                    <View style={styles.slotMetaRow}>
                      <View style={styles.metaItem}>
                        <Feather name="map-pin" size={13} color={C.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.metaItemText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {roomInfo.roomNumber} · {roomInfo.building}
                        </Text>
                      </View>

                      {slot.teacher_short_code && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            setSelectedTeacherCode(slot.teacher_short_code);
                            setSelectedTeacherRoom(slot.room);
                            setTeacherModalVisible(true);
                          }}
                          style={[styles.teacherPill, { backgroundColor: pillBg(Accent.blue, isDark) }]}
                        >
                          <Feather name="user" size={12} color={Accent.blue} style={{ marginRight: 4 }} />
                          <Text style={[styles.teacherPillText, { color: Accent.blue, fontFamily: FontFamily.jakartaBold }]}>
                            {`FC: ${slot.teacher_short_code}`}
                          </Text>
                          <Feather name="info" size={10} color={Accent.blue} style={{ marginLeft: 3 }} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Retake Remove Action */}
                    {slot.isRetake && mainTab === 'my_routine' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleRemoveRetake(slot.id)}
                        style={styles.removeRetakeBtn}
                      >
                        <Feather name="trash-2" size={12} color={C.danger} style={{ marginRight: 4 }} />
                        <Text style={[styles.removeRetakeBtnText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
                          Remove from My Routine
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Feather name="calendar" size={32} color={C.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {selectedDay === 'ALL' ? 'No Classes Scheduled' : `No Classes on ${selectedDay}`}
                </Text>
                <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {`No scheduled classes found for ${activeDept} Intake ${activeIntake} Section ${activeSec}.`}
                </Text>
              </View>
            )}
          </>
        )}

        {/* ─── TAB 1 & 2 CONTENT: EXAM SCHEDULE ─── */}
        {mainTab !== 'official_pdfs' && subType === 'exam' && (
          <>
            {loading ? (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <ActivityIndicator color={C.brand} size="large" />
                <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Loading examination timetable…
                </Text>
              </View>
            ) : examSlots.length > 0 ? (
              examSlots.map((slot) => {
                const roomInfo = decodeRoom(slot.room);
                return (
                  <View key={slot.id} style={[styles.slotCard, { backgroundColor: C.surface, borderColor: C.border, borderLeftColor: SectorColors.routines }]}>
                    {/* Date and Shift Header */}
                    <View style={styles.slotTimeRow}>
                      <View style={[styles.timeTag, { backgroundColor: pillBg(SectorColors.routines, isDark) }]}>
                        <Feather name="calendar" size={13} color={SectorColors.routines} style={{ marginRight: 5 }} />
                        <Text style={[styles.timeTagText, { color: SectorColors.routines, fontFamily: FontFamily.jakartaBold }]}>
                          {`${slot.exam_date} (${slot.day_of_week})`}
                        </Text>
                      </View>
                      <View style={[styles.dayBadge, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.dayBadgeText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {`${slot.shift} · ${slot.time_range}`}
                        </Text>
                      </View>
                    </View>

                    {/* Course Code & Title */}
                    <Text style={[styles.slotCourseCode, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {slot.course_code}
                    </Text>
                    {slot.course_title && (
                      <Text style={[styles.slotCourseTitle, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                        {slot.course_title}
                      </Text>
                    )}

                    {/* Meta Row */}
                    <View style={styles.slotMetaRow}>
                      <View style={styles.metaItem}>
                        <Feather name="map-pin" size={13} color={C.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.metaItemText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {roomInfo.roomNumber} · {roomInfo.building}
                        </Text>
                      </View>
                      {slot.seat_range && (
                        <View style={[styles.teacherPill, { backgroundColor: pillBg(C.warn, isDark) }]}>
                          <Feather name="check-square" size={12} color={C.warn} style={{ marginRight: 4 }} />
                          <Text style={[styles.teacherPillText, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                            {slot.seat_range}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Feather name="alert-circle" size={32} color={C.warn} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  No Exam Schedule Published Yet
                </Text>
                <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {`Exam timetable for ${activeDept} Intake ${activeIntake} Section ${activeSec} will appear once published by the controller.`}
                </Text>
              </View>
            )}
          </>
        )}

        {/* ─── TAB 3 CONTENT: OFFICIAL CIRCULARS & PDFS ─── */}
        {mainTab === 'official_pdfs' && (
          <>
            {/* Department Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deptFilterRow}>
              {['All', ...DEPARTMENTS.map(d => d.code)].map((deptCode) => {
                const isSel = pdfDeptFilter === deptCode;
                return (
                  <TouchableOpacity
                    key={deptCode}
                    activeOpacity={0.8}
                    onPress={() => setPdfDeptFilter(deptCode)}
                    style={[
                      styles.deptFilterPill,
                      {
                        backgroundColor: isSel ? C.brand : C.surface,
                        borderColor: isSel ? C.brand : C.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deptFilterPillText,
                        {
                          color: isSel ? '#ffffff' : C.text,
                          fontFamily: isSel ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {deptCode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Document List */}
            {filteredPdfs.length > 0 ? (
              filteredPdfs.map((doc) => (
                <View key={doc.id} style={[styles.pdfCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={[styles.pdfIconBox, { backgroundColor: pillBg(SectorColors.study, isDark), borderColor: SectorColors.study + '44' }]}>
                    <Feather name="file-text" size={24} color={SectorColors.study} />
                  </View>
                  <View style={styles.pdfBody}>
                    <Text style={[styles.pdfTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
                      {doc.title}
                    </Text>
                    <Text style={[styles.pdfSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                      {doc.semester || 'Official Schedule'} · {doc.department || 'BUBT'}
                    </Text>
                    <View style={styles.pdfActionsRow}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleOpenPdf(doc)}
                        style={[styles.pdfActionBtn, { backgroundColor: C.brand }]}
                      >
                        <Feather name="eye" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={[styles.pdfActionBtnText, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                          View PDF
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleDownloadPdf(doc)}
                        disabled={downloadingId === doc.id}
                        style={[styles.pdfActionBtnSecondary, { backgroundColor: C.surface2, borderColor: C.border }]}
                      >
                        {downloadingId === doc.id ? (
                          <ActivityIndicator size="small" color={C.brand} />
                        ) : (
                          <>
                            <Feather name="download" size={13} color={C.text} style={{ marginRight: 4 }} />
                            <Text style={[styles.pdfActionBtnSecondaryText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                              Download
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleShareDoc(doc)}
                        style={[styles.pdfIconOnlyBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                      >
                        <Feather name="share-2" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Feather name="file-text" size={32} color={C.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  No Documents Found
                </Text>
                <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {`No official routine circulars matching "${pdfDeptFilter}".`}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── MODAL 1: SECTION SELECTOR SHEET ─── */}
      <Modal visible={sectionPickerVisible} transparent animationType="slide" onRequestClose={() => setSectionPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {pickerTarget === 'my' ? 'Select Your Section' : 'Select Section Routine'}
              </Text>
              <TouchableOpacity onPress={() => setSectionPickerVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Department Picker */}
            <Text style={[styles.modalSectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              DEPARTMENT
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChipRow}>
              {DEPARTMENTS.map((dept) => {
                const isSel = draftDept === dept.code;
                return (
                  <TouchableOpacity
                    key={dept.code}
                    activeOpacity={0.8}
                    onPress={() => {
                      setDraftDept(dept.code);
                      if (!dept.intakes.includes(draftIntake)) {
                        setDraftIntake(dept.intakes[0] || '1');
                      }
                      if (!dept.sections.includes(draftSec)) {
                        setDraftSec(dept.sections[0] || '1');
                      }
                    }}
                    style={[
                      styles.modalChip,
                      {
                        backgroundColor: isSel ? C.brand : C.surface2,
                        borderColor: isSel ? C.brand : C.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        {
                          color: isSel ? '#ffffff' : C.text,
                          fontFamily: isSel ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {dept.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Intake Picker */}
            <Text style={[styles.modalSectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              INTAKE
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChipRow}>
              {draftDeptItem.intakes.map((intk) => {
                const isSel = draftIntake === intk;
                return (
                  <TouchableOpacity
                    key={intk}
                    activeOpacity={0.8}
                    onPress={() => setDraftIntake(intk)}
                    style={[
                      styles.modalChip,
                      {
                        backgroundColor: isSel ? C.brand : C.surface2,
                        borderColor: isSel ? C.brand : C.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        {
                          color: isSel ? '#ffffff' : C.text,
                          fontFamily: isSel ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {`Intake ${intk}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Section Picker */}
            <Text style={[styles.modalSectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              SECTION
            </Text>
            <View style={styles.modalSectionGrid}>
              {draftDeptItem.sections.map((sec) => {
                const isSel = draftSec === sec;
                return (
                  <TouchableOpacity
                    key={sec}
                    activeOpacity={0.8}
                    onPress={() => setDraftSec(sec)}
                    style={[
                      styles.modalSecCard,
                      {
                        backgroundColor: isSel ? pillBg(C.brand, isDark) : C.surface2,
                        borderColor: isSel ? C.brand : C.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalSecCardText,
                        {
                          color: isSel ? C.brand : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {`Section ${sec}`}
                    </Text>
                    {isSel && <Feather name="check" size={15} color={C.brand} style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={applyPickerSelection}
              style={[styles.modalApplyBtn, { backgroundColor: C.brand }]}
            >
              <Text style={[styles.modalApplyBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                {`View Routine for ${draftDept} Intake ${draftIntake}-${draftSec}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 2: RETAKE COURSE FINDER ─── */}
      <Modal visible={retakeModalVisible} transparent animationType="slide" onRequestClose={() => setRetakeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.retakeModalContent, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Add Retake Course
                </Text>
                <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  Merge subjects from other intakes into your routine
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRetakeModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Feather name="search" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder="Search course code (e.g. PHY 101, CSE 111)…"
                placeholderTextColor={C.textMuted}
                value={retakeQuery}
                onChangeText={searchRetakes}
                autoCapitalize="characters"
              />
              {retakeQuery ? (
                <TouchableOpacity onPress={() => searchRetakes('')} hitSlop={6}>
                  <Feather name="x" size={15} color={C.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Search Results List */}
            <ScrollView style={styles.retakeResultsList} showsVerticalScrollIndicator={false}>
              {retakeSearching ? (
                <ActivityIndicator color={C.brand} size="small" style={{ marginVertical: 20 }} />
              ) : retakeResults.length > 0 ? (
                retakeResults.map((slot) => {
                  const alreadyAdded = userRetakeSlots.some(s => s.id === slot.id);
                  const clashWithMine = classSlots.some(s => s.day_of_week === slot.day_of_week && s.slot_index === slot.slot_index);
                  return (
                    <View key={slot.id} style={[styles.retakeResultCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.retakeCode, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {slot.course_code}
                          </Text>
                          <View style={[styles.badgeTagSmall, { backgroundColor: pillBg(C.brand, isDark) }]}>
                            <Text style={[styles.badgeTagSmallText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                              {`Intake ${slot.intake}-${slot.section}`}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.retakeTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                          {slot.course_title}
                        </Text>
                        <Text style={[styles.retakeMeta, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                          {`${slot.day_of_week} · ${slot.time_slot} · Room ${slot.room}`}
                        </Text>
                        {clashWithMine && (
                          <Text style={[styles.retakeClashWarn, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                            ⚠️ Overlaps with an enrolled class
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleAddRetake(slot)}
                        disabled={alreadyAdded}
                        style={[
                          styles.addRetakeActionBtn,
                          {
                            backgroundColor: alreadyAdded ? C.surface3 : (clashWithMine ? '#ef4444' : C.brand),
                          },
                        ]}
                      >
                        <Text style={[styles.addRetakeActionBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                          {alreadyAdded ? 'Added' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : retakeQuery.length >= 2 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    No courses matching "{retakeQuery}" found.
                  </Text>
                </View>
              ) : (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Feather name="search" size={28} color={C.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    Search by course code or title to find and add retakes.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 3: TEACHER INFO CARD ─── */}
      <Modal visible={teacherModalVisible} transparent animationType="fade" onRequestClose={() => setTeacherModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.teacherModalCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.teacherModalIconBox, { backgroundColor: pillBg(Accent.blue, isDark), borderColor: Accent.blue + '44' }]}>
              <Feather name="user-check" size={24} color={Accent.blue} />
            </View>
            <Text style={[styles.teacherModalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Faculty Teacher
            </Text>
            <View style={[styles.teacherModalCodePill, { backgroundColor: pillBg(Accent.blue, isDark) }]}>
              <Text style={[styles.teacherModalCodePillText, { color: Accent.blue, fontFamily: FontFamily.jakartaBold }]}>
                {`Code: ${selectedTeacherCode}`}
              </Text>
            </View>
            <Text style={[styles.teacherModalRoom, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {`Scheduled classroom: Room ${selectedTeacherRoom}`}
            </Text>
            <Text style={[styles.teacherModalDesc, { color: C.text3, fontFamily: FontFamily.jakartaRegular }]}>
              Official counseling and office consultations can be found under the Faculty Directory.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTeacherModalVisible(false)}
              style={[styles.teacherModalCloseBtn, { backgroundColor: C.brand }]}
            >
              <Text style={[styles.teacherModalCloseBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Universal Campus PDF Viewer Modal */}
      <CampusPdfViewerModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        title={activeModalTitle}
        subtitle={`${activeDept} · BUBT`}
        fileUrl={activeModalUrl}
        fileName={`${activeModalTitle.replace(/\s+/g, '_')}.pdf`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── PRIMARY TABS (58DP) ─── */
  primaryTabsContainer: {
    marginBottom: 12,
  },

  /* ─── 72-SIZE BAR STANDARD ─── */
  bar72: {
    height: 72,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    marginBottom: 12,
  },
  barIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  barTextCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingRight: 8,
  },
  barEyebrow: {
    fontSize: 10.5,
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  barTitle: {
    fontSize: 15.5,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  barSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1.5,
  },
  barActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  barActionBtnText: {
    fontSize: 12,
  },
  badgeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTagText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },

  /* ─── SUB-SCHEDULE TOGGLE ─── */
  subToggleContainer: {
    marginBottom: 12,
  },

  /* ─── WEEKDAY SELECTOR PILLS ─── */
  weekdayRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingRight: Layout.screenPadding,
  },
  weekdayPill: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  weekdayPillText: {
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 5,
  },

  /* ─── SLOT CARDS ─── */
  slotCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
  },
  clashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  clashBannerText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  slotTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  timeTagText: {
    fontSize: 11.5,
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeTagSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTagSmallText: {
    fontSize: 10,
  },
  dayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 10.5,
  },
  slotCourseCode: {
    fontSize: 17,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  slotCourseTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    marginBottom: 8,
  },
  slotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  metaItemText: {
    fontSize: 12,
  },
  teacherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teacherPillText: {
    fontSize: 11,
  },
  removeRetakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
  },
  removeRetakeBtnText: {
    fontSize: 11.5,
  },

  /* ─── OFFICIAL PDF CARDS ─── */
  deptFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingRight: Layout.screenPadding,
  },
  deptFilterPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptFilterPillText: {
    fontSize: 12.5,
  },
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  pdfIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pdfBody: {
    flex: 1,
    minWidth: 0,
  },
  pdfTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    marginBottom: 2,
  },
  pdfSubtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  pdfActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
  },
  pdfActionBtnText: {
    fontSize: 11.5,
  },
  pdfActionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pdfActionBtnSecondaryText: {
    fontSize: 11.5,
  },
  pdfIconOnlyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── EMPTY STATE ─── */
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyCardTitle: {
    fontSize: 15.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  /* ─── MODAL STYLES ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  modalSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 8,
  },
  modalChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    paddingRight: 10,
  },
  modalChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalChipText: {
    fontSize: 13,
  },
  modalSectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  modalSecCard: {
    flex: 1,
    minWidth: '45%',
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalSecCardText: {
    fontSize: 14,
  },
  modalApplyBtn: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  modalApplyBtnText: {
    fontSize: 14.5,
    color: '#ffffff',
  },

  /* ─── RETAKE MODAL ─── */
  retakeModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    height: '80%',
  },
  searchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    marginHorizontal: 8,
  },
  retakeResultsList: {
    flex: 1,
  },
  retakeResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  retakeCode: {
    fontSize: 14.5,
  },
  retakeTitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  retakeMeta: {
    fontSize: 11.5,
    marginTop: 2,
  },
  retakeClashWarn: {
    fontSize: 10.5,
    marginTop: 3,
  },
  addRetakeActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addRetakeActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
  },

  /* ─── TEACHER MODAL ─── */
  teacherModalCard: {
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  teacherModalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  teacherModalTitle: {
    fontSize: 17,
    marginBottom: 6,
  },
  teacherModalCodePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  teacherModalCodePillText: {
    fontSize: 13,
  },
  teacherModalRoom: {
    fontSize: 13,
    marginBottom: 6,
  },
  teacherModalDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
  },
  teacherModalCloseBtn: {
    width: '100%',
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherModalCloseBtnText: {
    color: '#ffffff',
    fontSize: 14,
  },
});
