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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { useToast } from '../../components/ui/Toast';
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
      return d.includes('law') || d.includes('justice') || d.includes('llb') || d.includes('llm') || d.includes('ll. b') || d.includes('ll.m');
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

const WEEKDAYS: ('ALL' | 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THR' | 'FRI')[] = [
  'ALL', 'SAT', 'SUN', 'MON', 'TUE', 'WED', 'THR', 'FRI'
];

export const DAY_ORDER: Record<string, number> = {
  SAT: 1,
  SUN: 2,
  MON: 3,
  TUE: 4,
  WED: 5,
  THR: 6,
  FRI: 7,
};

export const DAY_NAMES: Record<string, string> = {
  SAT: 'Saturday',
  SUN: 'Sunday',
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THR: 'Thursday',
  FRI: 'Friday',
};

type RoutineStep = 'types' | 'departments' | 'options' | 'all' | 'choose';

export function RoutinesBrowseScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  // Primary Navigation Step
  const [step, setStep] = useState<RoutineStep>('types');
  const [activeType, setActiveType] = useState<'class' | 'exam'>('class');
  const [selectedDept, setSelectedDept] = useState<DepartmentItem>(DEPARTMENTS[0]);
  const [deptSearch, setDeptSearch] = useState('');

  // Choose sub-selection
  const [chooseTab, setChooseTab] = useState<'intake' | 'section'>('intake');
  const [selectedIntake, setSelectedIntake] = useState<string>('51');
  const [selectedSection, setSelectedSection] = useState<string>('1');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');

  // Datasets
  const [allRoutines, setAllRoutines] = useState<OfficialRoutineRow[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(false);
  const [selectedPdfDoc, setSelectedPdfDoc] = useState<OfficialRoutineRow | null>(null);

  // Section Timetable Slots
  const [classSlots, setClassSlots] = useState<RoutineSlot[]>([]);
  const [examSlots, setExamSlots] = useState<ExamSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // PDF Viewer & Downloads
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [activeModalUrl, setActiveModalUrl] = useState<string | null>(null);
  const [activeModalTitle, setActiveModalTitle] = useState('BUBT Routine');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Initialize from user profile if available
  useEffect(() => {
    if (profile?.department) {
      const match = DEPARTMENTS.find(d => matchesDepartment(profile.department, d.code));
      if (match) {
        setSelectedDept(match);
      }
    }
    if (profile?.intake?.trim()) {
      setSelectedIntake(profile.intake.trim());
    }
    if (profile?.section?.trim()) {
      setSelectedSection(profile.section.trim());
    }
  }, [profile]);

  // Handle deep link or home strip navigation params
  useEffect(() => {
    if (route?.params?.initialTab === 'my_routine') {
      if (route?.params?.subSchedule === 'exam') {
        setActiveType('exam');
      } else {
        setActiveType('class');
      }
      setStep('choose');
    }
  }, [route?.params]);

  // Load all routines from database
  const loadRoutinesData = useCallback(async () => {
    try {
      setLoadingRoutines(true);
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading routines:', error.message);
      } else if (data) {
        setAllRoutines(data as OfficialRoutineRow[]);
      }
    } catch (err: any) {
      console.warn('loadRoutinesData exception:', err?.message);
    } finally {
      setLoadingRoutines(false);
    }
  }, []);

  useEffect(() => {
    loadRoutinesData();
  }, [loadRoutinesData]);

  // Load section routine slots & exam slots when in choose mode
  const loadSlotsData = useCallback(async () => {
    if (step !== 'choose') return;
    try {
      setLoadingSlots(true);
      const intakeClean = selectedIntake.trim();
      const sectionClean = selectedSection.trim();

      if (activeType === 'class') {
        const { data, error } = await supabase
          .from('routine_slots')
          .select('*')
          .or(`department.eq.${selectedDept.code},department.ilike.%${selectedDept.code}%,department.ilike.%${selectedDept.name}%`)
          .eq('intake', intakeClean)
          .eq('section', sectionClean)
          .order('slot_index', { ascending: true });

        if (!error && data) {
          setClassSlots(data as RoutineSlot[]);
        } else {
          setClassSlots([]);
        }
      } else {
        const { data, error } = await supabase
          .from('exam_slots')
          .select('*')
          .or(`department.eq.${selectedDept.code},department.ilike.%${selectedDept.code}%,department.ilike.%${selectedDept.name}%`)
          .eq('intake', intakeClean)
          .eq('section', sectionClean)
          .order('exam_date', { ascending: true });

        if (!error && data) {
          setExamSlots(data as ExamSlot[]);
        } else {
          setExamSlots([]);
        }
      }
    } catch (err: any) {
      console.warn('loadSlotsData exception:', err?.message);
    } finally {
      setLoadingSlots(false);
    }
  }, [step, activeType, selectedDept.code, selectedDept.name, selectedIntake, selectedSection]);

  useEffect(() => {
    loadSlotsData();
  }, [loadSlotsData]);

  // Android hardware back handler
  useEffect(() => {
    const onBackPress = () => {
      if (pdfModalVisible) {
        setPdfModalVisible(false);
        return true;
      }
      if (step === 'all' || step === 'choose') {
        setStep('options');
        return true;
      }
      if (step === 'options') {
        setStep('departments');
        return true;
      }
      if (step === 'departments') {
        setStep('types');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [step, pdfModalVisible]);

  // Filtered department list for Step 2
  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return DEPARTMENTS;
    const q = deptSearch.toLowerCase().trim();
    return DEPARTMENTS.filter(
      d => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.shortName.toLowerCase().includes(q)
    );
  }, [deptSearch]);

  // Department matching routine PDFs for Step 4A
  const departmentPdfs = useMemo(() => {
    const matched = allRoutines.filter(r => {
      const isType = r.type === activeType;
      const isDept = matchesDepartment(r.department, selectedDept.code);
      return isType && isDept && (r.file_url || r.image_url);
    });

    // Sort to prioritize current active semester (Fall 2026) and Master routines at top
    return matched.sort((a, b) => {
      const aIsMaster = (a.title || '').toLowerCase().includes('master');
      const bIsMaster = (b.title || '').toLowerCase().includes('master');
      if (aIsMaster && !bIsMaster) return -1;
      if (!aIsMaster && bIsMaster) return 1;

      const aIsFall = (a.semester || '').toLowerCase().includes('fall');
      const bIsFall = (b.semester || '').toLowerCase().includes('fall');
      if (aIsFall && !bIsFall) return -1;
      if (!aIsFall && bIsFall) return 1;

      return 0;
    });
  }, [allRoutines, activeType, selectedDept.code]);

  // Active PDF for viewer in Step 4A
  const activePdf = useMemo(() => {
    if (selectedPdfDoc && departmentPdfs.some(d => d.id === selectedPdfDoc.id)) {
      return selectedPdfDoc;
    }
    return departmentPdfs[0] || null;
  }, [selectedPdfDoc, departmentPdfs]);

  // Sorted and day-filtered class slots for Step 4B
  const filteredSlots = useMemo(() => {
    const list = classSlots.filter(
      slot => selectedDay === 'ALL' || slot.day_of_week === selectedDay
    );

    return list.sort((a, b) => {
      const dayA = DAY_ORDER[a.day_of_week] || 99;
      const dayB = DAY_ORDER[b.day_of_week] || 99;
      if (dayA !== dayB) return dayA - dayB;
      return (a.slot_index ?? 0) - (b.slot_index ?? 0);
    });
  }, [classSlots, selectedDay]);

  // Sorted exam slots for Step 4B
  const sortedExamSlots = useMemo(() => {
    return [...examSlots].sort((a, b) => {
      const dateA = a.exam_date || '';
      const dateB = b.exam_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.shift || '').localeCompare(b.shift || '');
    });
  }, [examSlots]);

  // Actions
  const handleOpenPdf = (doc: OfficialRoutineRow) => {
    const url = normalizePdfUrl(doc.file_url || doc.image_url);
    if (!url) {
      toast({ type: 'error', title: 'File unavailable', message: 'No downloadable document attached.' });
      return;
    }
    setActiveModalUrl(url);
    setActiveModalTitle(doc.title || `${selectedDept.code} Routine`);
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
        message: `${doc.title}\n\nBUBT ${selectedDept.name} (${selectedDept.code})\n${targetUrl}`,
      });
    } catch {}
  };

  // SubBar Title and onBack resolution
  const { barTitle, onBarBack } = useMemo(() => {
    switch (step) {
      case 'types':
        return { barTitle: 'Routines & Schedules', onBarBack: () => navigation.goBack() };
      case 'departments':
        return {
          barTitle: activeType === 'class' ? 'Class Routines' : 'Exam Routines',
          onBarBack: () => setStep('types'),
        };
      case 'options':
        return {
          barTitle: `${selectedDept.code} · ${activeType === 'class' ? 'Routine' : 'Exam'}`,
          onBarBack: () => setStep('departments'),
        };
      case 'all':
        return {
          barTitle: `${selectedDept.code} Master PDF`,
          onBarBack: () => setStep('options'),
        };
      case 'choose':
        return {
          barTitle: `${selectedDept.code} · Intake ${selectedIntake}-${selectedSection}`,
          onBarBack: () => setStep('options'),
        };
    }
  }, [step, activeType, selectedDept.code, selectedIntake, selectedSection, navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={barTitle}
        onBack={onBarBack}
        rightSlot={
          step === 'all' && activePdf ? (
            <TouchableOpacity onPress={() => handleShareDoc(activePdf)} hitSlop={8} style={styles.headerBtn}>
              <Feather name="share-2" size={19} color={C.text} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* ──────────────── STEP 1: ROUTINE TYPES (TWO 72-SIZE BARS) ──────────────── */}
      {step === 'types' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroBlock}>
            <Text style={[styles.heroHeading, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Academic Timetables
            </Text>
            <Text style={[styles.heroSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              Select routine category to browse full departmental schedules or filter by your section.
            </Text>
          </View>

          {/* Bar 1: Routines (72-size bar) */}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => {
              setActiveType('class');
              setStep('departments');
            }}
            style={[
              styles.bar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <View style={[styles.barIconBox, { backgroundColor: pillBg(SectorColors.study, isDark), borderColor: SectorColors.study + '33' }]}>
              <Feather name="calendar" size={22} color={SectorColors.study} />
            </View>
            <View style={styles.barTextCol}>
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Routines
              </Text>
              <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                Weekly semester class schedules and room allocations
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* Bar 2: Exam Routine (72-size bar) */}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => {
              setActiveType('exam');
              setStep('departments');
            }}
            style={[
              styles.bar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <View style={[styles.barIconBox, { backgroundColor: pillBg(SectorColors.routines, isDark), borderColor: SectorColors.routines + '33' }]}>
              <Feather name="file-text" size={22} color={SectorColors.routines} />
            </View>
            <View style={styles.barTextCol}>
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Exam Routine
              </Text>
              <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                Mid-Term, Final, and Supplementary exam timetables
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* Info Card */}
          <View style={[styles.infoBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="info" size={16} color={C.brand} style={{ marginTop: 2 }} />
            <Text style={[styles.infoText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              All schedules are synchronized with the official BUBT Office of the Controller of Examinations and departmental notices.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ──────────────── STEP 2: DEPARTMENTS (ALL 72-SIZE BARS) ──────────────── */}
      {step === 'departments' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Breadcrumb & Search */}
          <View style={styles.metaRow}>
            <Text style={[styles.breadcrumbText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              {activeType === 'class' ? 'Class Routines' : 'Exam Routines'}
            </Text>
            <Text style={[styles.breadcrumbSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              · Select Department
            </Text>
          </View>

          <View style={[styles.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="search" size={17} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              placeholder="Search department by name or code…"
              placeholderTextColor={C.textMuted}
              value={deptSearch}
              onChangeText={setDeptSearch}
            />
            {deptSearch ? (
              <TouchableOpacity onPress={() => setDeptSearch('')} hitSlop={6}>
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Department 72-size bars */}
          {filteredDepartments.map((dept) => (
            <TouchableOpacity
              key={dept.code}
              activeOpacity={0.78}
              onPress={() => {
                setSelectedDept(dept);
                if (!dept.intakes.includes(selectedIntake)) {
                  setSelectedIntake(dept.intakes[0] || '1');
                }
                if (!dept.sections.includes(selectedSection)) {
                  setSelectedSection(dept.sections[0] || '1');
                }
                setStep('options');
              }}
              style={[
                styles.bar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
            >
              <View style={[styles.barIconBox, { backgroundColor: pillBg(dept.accentColor, isDark), borderColor: dept.accentColor + '33' }]}>
                <Feather name={dept.icon} size={22} color={dept.accentColor} />
              </View>
              <View style={styles.barTextCol}>
                <View style={styles.titleWithBadge}>
                  <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {dept.name}
                  </Text>
                  <View style={[styles.codeBadge, { backgroundColor: pillBg(dept.accentColor, isDark) }]}>
                    <Text style={[styles.codeBadgeText, { color: dept.accentColor, fontFamily: FontFamily.jakartaBold }]}>
                      {dept.code}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                  {dept.shortName} · {activeType === 'class' ? 'Class routines' : 'Exam schedules'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={C.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ──────────────── STEP 3: DEPARTMENT OPTIONS (ALL vs CHOOSE - TWO 72-SIZE BARS) ──────────────── */}
      {step === 'options' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Active Department Banner */}
          <View style={[styles.deptHeroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.barIconBox, { backgroundColor: pillBg(selectedDept.accentColor, isDark), borderColor: selectedDept.accentColor + '33' }]}>
              <Feather name={selectedDept.icon} size={24} color={selectedDept.accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deptHeroTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {selectedDept.name}
              </Text>
              <Text style={[styles.deptHeroSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {selectedDept.code} · {activeType === 'class' ? 'Class Routines' : 'Exam Schedules'}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionSectionHeader, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            HOW WOULD YOU LIKE TO VIEW THE ROUTINE?
          </Text>

          {/* Bar 1: All (72-size bar) */}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => {
              setSelectedPdfDoc(null);
              setStep('all');
            }}
            style={[
              styles.bar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <View style={[styles.barIconBox, { backgroundColor: pillBg(SectorColors.routines, isDark), borderColor: SectorColors.routines + '33' }]}>
              <Feather name="file-text" size={22} color={SectorColors.routines} />
            </View>
            <View style={styles.barTextCol}>
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                All
              </Text>
              <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                Full departmental routine documents & circulars (Official PDF)
              </Text>
            </View>
            <View style={[styles.actionTag, { backgroundColor: isDark ? 'rgba(91, 133, 247, 0.15)' : '#e0edff' }]}>
              <Text style={[styles.actionTagText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                PDF
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={C.textMuted} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* Bar 2: Choose (72-size bar) */}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => {
              setStep('choose');
            }}
            style={[
              styles.bar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <View style={[styles.barIconBox, { backgroundColor: pillBg(C.brand, isDark), borderColor: C.brand + '33' }]}>
              <Feather name="sliders" size={22} color={C.brand} />
            </View>
            <View style={styles.barTextCol}>
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Choose
              </Text>
              <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                Filter by specific Intake & Section timetable
              </Text>
            </View>
            <View style={[styles.actionTag, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#e6f7ef' }]}>
              <Text style={[styles.actionTagText, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                FILTER
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={C.textMuted} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ──────────────── STEP 4A: ALL (FULL DEPARTMENT PDF SHOWCASE & DOWNLOADS) ──────────────── */}
      {step === 'all' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activePdf ? (
            <View style={[styles.masterHeroDocCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              {/* Header Badge */}
              <View style={styles.docHeaderBadgeRow}>
                <View style={[styles.verifiedTag, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#e6f7ef' }]}>
                  <Feather name="shield" size={13} color={C.success} style={{ marginRight: 4 }} />
                  <Text style={[styles.verifiedTagText, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                    OFFICIAL BUBT PUBLICATION
                  </Text>
                </View>
                <View style={[styles.semesterTag, { backgroundColor: isDark ? 'rgba(91, 133, 247, 0.15)' : '#e0edff' }]}>
                  <Text style={[styles.semesterTagText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    {activePdf.semester || 'Fall 2026'}
                  </Text>
                </View>
              </View>

              {/* Document Identity */}
              <View style={styles.docIdentityRow}>
                <View style={[styles.largePdfIconBox, { backgroundColor: pillBg(SectorColors.routines, isDark), borderColor: SectorColors.routines + '44' }]}>
                  <Feather name="file-text" size={32} color={SectorColors.routines} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.masterDocTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                    {activePdf.title}
                  </Text>
                  <Text style={[styles.masterDocSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {selectedDept.name} ({selectedDept.code})
                  </Text>
                  <Text style={[styles.masterDocMeta, { color: C.text3, fontFamily: FontFamily.jakartaRegular }]}>
                    Official controller schedule · Vector PDF format
                  </Text>
                </View>
              </View>

              {/* Primary Action Buttons */}
              <View style={styles.primaryActionsStack}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleOpenPdf(activePdf)}
                  style={[styles.fullscreenViewBtn, { backgroundColor: C.brand }]}
                >
                  <Feather name="maximize-2" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={[styles.fullscreenViewBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                    Open In-App PDF Viewer
                  </Text>
                </TouchableOpacity>

                <View style={styles.secondaryActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleDownloadPdf(activePdf)}
                    disabled={downloadingId === activePdf.id}
                    style={[styles.downloadActionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  >
                    {downloadingId === activePdf.id ? (
                      <ActivityIndicator size="small" color={C.brand} />
                    ) : (
                      <>
                        <Feather name="download" size={16} color={C.text} style={{ marginRight: 6 }} />
                        <Text style={[styles.downloadActionBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          Download PDF
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleShareDoc(activePdf)}
                    style={[styles.shareActionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  >
                    <Feather name="share-2" size={16} color={C.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.shareActionBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Share
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      const url = normalizePdfUrl(activePdf.file_url || activePdf.image_url);
                      if (url) openUrl(url);
                    }}
                    style={[styles.externalActionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  >
                    <Feather name="external-link" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              {loadingRoutines ? (
                <>
                  <ActivityIndicator color={C.brand} size="large" />
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Loading official departmental routine…
                  </Text>
                </>
              ) : (
                <>
                  <Feather name="alert-circle" size={32} color={C.warn} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    No Routine Document Found
                  </Text>
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    No full PDF published yet for {selectedDept.name} in this category.
                  </Text>
                </>
              )}
            </View>
          )}

          {/* List of All Available Documents for this Department */}
          {departmentPdfs.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.sectionSectionHeader, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                ALL AVAILABLE ROUTINE DOCUMENTS ({departmentPdfs.length})
              </Text>

              {departmentPdfs.map((doc) => {
                const isSelected = activePdf?.id === doc.id;
                return (
                  <TouchableOpacity
                    key={doc.id}
                    activeOpacity={0.78}
                    onPress={() => setSelectedPdfDoc(doc)}
                    style={[
                      styles.bar72,
                      {
                        backgroundColor: isSelected ? (isDark ? 'rgba(91, 133, 247, 0.12)' : '#f0f5ff') : C.surface,
                        borderColor: isSelected ? C.brand : C.border,
                      },
                    ]}
                  >
                    <View style={[styles.barIconBox, { backgroundColor: pillBg(SectorColors.routines, isDark), borderColor: SectorColors.routines + '33' }]}>
                      <Feather name="file-text" size={20} color={SectorColors.routines} />
                    </View>
                    <View style={styles.barTextCol}>
                      <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {doc.title}
                      </Text>
                      <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                        {doc.semester || 'Official Schedule'} · {selectedDept.code}
                      </Text>
                    </View>
                    <View style={styles.docRowActions}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleOpenPdf(doc)}
                        style={[styles.smallRowActionBtn, { backgroundColor: C.brand }]}
                      >
                        <Feather name="eye" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={[styles.smallRowActionBtnText, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                          View
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleDownloadPdf(doc)}
                        disabled={downloadingId === doc.id}
                        style={[styles.smallRowActionBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                      >
                        {downloadingId === doc.id ? (
                          <ActivityIndicator size="small" color={C.brand} />
                        ) : (
                          <Feather name="download" size={13} color={C.text} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* ──────────────── STEP 4B: CHOOSE (INTAKE & SECTION TABS & TIMETABLE) ──────────────── */}
      {step === 'choose' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Two Tabs at the Top: Intake & Section */}
          <View style={[styles.tabBarContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setChooseTab('intake')}
              style={[
                styles.topTabBtn,
                chooseTab === 'intake' && [styles.topTabBtnActive, { backgroundColor: isDark ? 'rgba(91, 133, 247, 0.2)' : '#e0edff', borderColor: C.brand }],
              ]}
            >
              <Feather
                name="users"
                size={16}
                color={chooseTab === 'intake' ? C.brand : C.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.topTabBtnText,
                  {
                    color: chooseTab === 'intake' ? C.brand : C.textMuted,
                    fontFamily: chooseTab === 'intake' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                Intake ({selectedIntake})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setChooseTab('section')}
              style={[
                styles.topTabBtn,
                chooseTab === 'section' && [styles.topTabBtnActive, { backgroundColor: isDark ? 'rgba(91, 133, 247, 0.2)' : '#e0edff', borderColor: C.brand }],
              ]}
            >
              <Feather
                name="grid"
                size={16}
                color={chooseTab === 'section' ? C.brand : C.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.topTabBtnText,
                  {
                    color: chooseTab === 'section' ? C.brand : C.textMuted,
                    fontFamily: chooseTab === 'section' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                Section ({selectedSection})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1 Content: Intake Chips */}
          {chooseTab === 'intake' && (
            <View style={[styles.pickerBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.pickerBoxHeader, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Intake for {selectedDept.code}
              </Text>
              <View style={styles.chipsWrap}>
                {selectedDept.intakes.map((intk) => {
                  const isSel = selectedIntake === intk;
                  return (
                    <TouchableOpacity
                      key={intk}
                      activeOpacity={0.78}
                      onPress={() => {
                        setSelectedIntake(intk);
                        setChooseTab('section');
                      }}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: isSel ? C.brand : C.surface2,
                          borderColor: isSel ? C.brand : C.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectChipText,
                          {
                            color: isSel ? '#ffffff' : C.text,
                            fontFamily: isSel ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        Intake {intk}
                      </Text>
                      {isSel && <Feather name="check" size={14} color="#ffffff" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tab 2 Content: Section Chips */}
          {chooseTab === 'section' && (
            <View style={[styles.pickerBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.pickerBoxHeader, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Section for Intake {selectedIntake}
              </Text>
              <View style={styles.chipsWrap}>
                {selectedDept.sections.map((sec) => {
                  const isSel = selectedSection === sec;
                  return (
                    <TouchableOpacity
                      key={sec}
                      activeOpacity={0.78}
                      onPress={() => setSelectedSection(sec)}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: isSel ? C.brand : C.surface2,
                          borderColor: isSel ? C.brand : C.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectChipText,
                          {
                            color: isSel ? '#ffffff' : C.text,
                            fontFamily: isSel ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        Section {sec}
                      </Text>
                      {isSel && <Feather name="check" size={14} color="#ffffff" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Active Selection Summary Banner */}
          <View style={[styles.summaryBanner, { backgroundColor: pillBg(selectedDept.accentColor, isDark), borderColor: selectedDept.accentColor + '44' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryBannerTitle, { color: selectedDept.accentColor, fontFamily: FontFamily.jakartaBold }]}>
                {selectedDept.code} · Intake {selectedIntake} · Section {selectedSection}
              </Text>
              <Text style={[styles.summaryBannerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {activeType === 'class' ? 'Weekly Class Timetable' : 'Examination Schedule'} · Fall 2026
              </Text>
            </View>
            {departmentPdfs.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleOpenPdf(departmentPdfs[0])}
                style={[styles.smallPdfBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              >
                <Feather name="file-text" size={14} color={C.brand} style={{ marginRight: 4 }} />
                <Text style={[styles.smallPdfBtnText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  Master PDF
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ─── CLASS ROUTINE TIMETABLE ─── */}
          {activeType === 'class' && (
            <>
              {/* Day filter pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
                {WEEKDAYS.map((day) => {
                  const isSel = selectedDay === day;
                  return (
                    <TouchableOpacity
                      key={day}
                      activeOpacity={0.8}
                      onPress={() => setSelectedDay(day)}
                      style={[
                        styles.dayPill,
                        {
                          backgroundColor: isSel ? C.brand : C.surface,
                          borderColor: isSel ? C.brand : C.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayPillText,
                          {
                            color: isSel ? '#ffffff' : C.text,
                            fontFamily: isSel ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Class Slots */}
              {loadingSlots ? (
                <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <ActivityIndicator color={C.brand} size="large" />
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Loading timetable slots…
                  </Text>
                </View>
              ) : filteredSlots.length > 0 ? (
                filteredSlots.map((slot, idx) => {
                  const isNewDay =
                    selectedDay === 'ALL' &&
                    (idx === 0 || filteredSlots[idx - 1].day_of_week !== slot.day_of_week);

                  return (
                    <React.Fragment key={slot.id}>
                      {isNewDay && (
                        <View style={styles.dayGroupHeader}>
                          <View style={[styles.dayGroupDot, { backgroundColor: C.brand }]} />
                          <Text style={[styles.dayGroupTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {DAY_NAMES[slot.day_of_week] || slot.day_of_week}
                          </Text>
                          <View style={[styles.dayGroupLine, { backgroundColor: C.border }]} />
                        </View>
                      )}

                      <View style={[styles.slotCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                        {/* Top Time Strip */}
                        <View style={styles.slotTimeRow}>
                          <View style={[styles.timeTag, { backgroundColor: isDark ? 'rgba(91, 133, 247, 0.15)' : '#e0edff' }]}>
                            <Feather name="clock" size={14} color={C.brand} style={{ marginRight: 5 }} />
                            <Text style={[styles.timeTagText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                              {slot.time_slot}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {slot.is_lab && (
                              <View style={[styles.labBadge, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.15)' : '#fff7ed' }]}>
                                <Feather name="activity" size={11} color="#ea580c" style={{ marginRight: 3 }} />
                                <Text style={[styles.labBadgeText, { color: '#ea580c', fontFamily: FontFamily.jakartaBold }]}>
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

                        {/* Course Details */}
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
                            <Text style={[styles.metaItemText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                              Room {slot.room} · {slot.building || 'Main Campus'}
                            </Text>
                          </View>
                          {slot.teacher_short_code ? (
                            <View style={[styles.teacherPill, { backgroundColor: pillBg(Accent.blue, isDark) }]}>
                              <Feather name="user" size={12} color={Accent.blue} style={{ marginRight: 4 }} />
                              <Text style={[styles.teacherPillText, { color: Accent.blue, fontFamily: FontFamily.jakartaBold }]}>
                                {slot.teacher_short_code}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </React.Fragment>
                  );
                })
              ) : classSlots.length > 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="sun" size={30} color={C.textMuted} style={{ marginBottom: 10 }} />
                  <Text style={[styles.emptyCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    No Classes on {DAY_NAMES[selectedDay] || selectedDay}
                  </Text>
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    No lectures or lab sessions are scheduled for this day in Intake {selectedIntake} Section {selectedSection}.
                  </Text>
                </View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="calendar" size={32} color={C.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    No Specific Custom Slots Found
                  </Text>
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    The routine for Intake {selectedIntake} Section {selectedSection} is published inside the Department Master PDF.
                  </Text>
                  {departmentPdfs.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setStep('all')}
                      style={[styles.primaryActionBtn, { backgroundColor: C.brand, marginTop: 14 }]}
                    >
                      <Feather name="file-text" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={[styles.primaryActionBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                        Open Department Master PDF
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}

          {/* ─── EXAM ROUTINE TIMETABLE ─── */}
          {activeType === 'exam' && (
            <>
              {loadingSlots ? (
                <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <ActivityIndicator color={C.brand} size="large" />
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Loading exam schedules…
                  </Text>
                </View>
              ) : sortedExamSlots.length > 0 ? (
                sortedExamSlots.map((slot) => (
                  <View key={slot.id} style={[styles.slotCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                    {/* Date and Shift */}
                    <View style={styles.slotTimeRow}>
                      <View style={[styles.timeTag, { backgroundColor: pillBg(SectorColors.routines, isDark) }]}>
                        <Feather name="calendar" size={14} color={SectorColors.routines} style={{ marginRight: 5 }} />
                        <Text style={[styles.timeTagText, { color: SectorColors.routines, fontFamily: FontFamily.jakartaBold }]}>
                          {slot.exam_date} ({slot.day_of_week})
                        </Text>
                      </View>
                      <View style={[styles.dayBadge, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.dayBadgeText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {slot.shift} · {slot.time_range}
                        </Text>
                      </View>
                    </View>

                    {/* Course */}
                    <Text style={[styles.slotCourseCode, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {slot.course_code}
                    </Text>
                    {slot.course_title && (
                      <Text style={[styles.slotCourseTitle, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                        {slot.course_title}
                      </Text>
                    )}

                    {/* Meta */}
                    <View style={styles.slotMetaRow}>
                      <View style={styles.metaItem}>
                        <Feather name="map-pin" size={13} color={C.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.metaItemText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                          Room {slot.room} · {slot.building || 'Campus'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {slot.teacher_short_code && (
                          <View style={[styles.teacherPill, { backgroundColor: pillBg(Accent.blue, isDark) }]}>
                            <Feather name="user" size={12} color={Accent.blue} style={{ marginRight: 4 }} />
                            <Text style={[styles.teacherPillText, { color: Accent.blue, fontFamily: FontFamily.jakartaBold }]}>
                              {slot.teacher_short_code}
                            </Text>
                          </View>
                        )}
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
                  </View>
                ))
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="alert-triangle" size={32} color={C.warn} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    No Exam Schedule Slots
                  </Text>
                  <Text style={[styles.emptyCardText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    The exam schedule for Intake {selectedIntake} Section {selectedSection} is published inside the Department Master PDF.
                  </Text>
                  {departmentPdfs.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setStep('all')}
                      style={[styles.primaryActionBtn, { backgroundColor: C.brand, marginTop: 14 }]}
                    >
                      <Feather name="file-text" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={[styles.primaryActionBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                        Open Master Exam Routine PDF
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}

          {/* In-app PDF view and download bar for section */}
          {departmentPdfs.length > 0 && (
            <View style={[styles.sectionPdfCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionPdfTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Official Department Document Available
                </Text>
                <Text style={[styles.sectionPdfSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {departmentPdfs[0].title}
                </Text>
              </View>
              <View style={styles.sectionPdfBtnRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleOpenPdf(departmentPdfs[0])}
                  style={[styles.primaryActionBtn, { backgroundColor: C.brand, paddingHorizontal: 12, height: 38 }]}
                >
                  <Feather name="eye" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={[styles.primaryActionBtnText, { fontSize: 13, fontFamily: FontFamily.jakartaBold }]}>
                    View
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleDownloadPdf(departmentPdfs[0])}
                  disabled={downloadingId === departmentPdfs[0].id}
                  style={[styles.secondaryActionBtn, { backgroundColor: C.surface2, borderColor: C.border, paddingHorizontal: 12, height: 38 }]}
                >
                  {downloadingId === departmentPdfs[0].id ? (
                    <ActivityIndicator size="small" color={C.brand} />
                  ) : (
                    <>
                      <Feather name="download" size={14} color={C.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.secondaryActionBtnText, { fontSize: 13, color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        Download
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Universal Campus PDF Viewer Modal */}
      <CampusPdfViewerModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        title={activeModalTitle}
        subtitle={`${selectedDept.name} · BUBT`}
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
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroBlock: {
    marginBottom: 20,
  },
  heroHeading: {
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13.5,
    lineHeight: 19,
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
  barTitle: {
    fontSize: 15.5,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  barSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  actionTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionTagText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },

  /* ─── META & SEARCH ─── */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breadcrumbText: {
    fontSize: 13.5,
  },
  breadcrumbSub: {
    fontSize: 13.5,
    marginLeft: 4,
  },
  searchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },

  /* ─── STEP 3: OPTIONS ─── */
  deptHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  deptHeroTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  deptHeroSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionSectionHeader: {
    fontSize: 11.5,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },

  /* ─── STEP 4A: ALL (MASTER PDF SHOWCASE) ─── */
  masterHeroDocCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  docHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  semesterTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  semesterTagText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  docIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  largePdfIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterDocTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 23,
  },
  masterDocSub: {
    fontSize: 13,
    marginTop: 3,
  },
  masterDocMeta: {
    fontSize: 11.5,
    marginTop: 4,
  },
  primaryActionsStack: {
    gap: 10,
  },
  fullscreenViewBtn: {
    height: 48,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenViewBtnText: {
    color: '#ffffff',
    fontSize: 15,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadActionBtnText: {
    fontSize: 13.5,
  },
  shareActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareActionBtnText: {
    fontSize: 13.5,
  },
  externalActionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallRowActionBtn: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallRowActionBtnText: {
    fontSize: 12,
  },

  /* ─── STEP 4B: CHOOSE ─── */
  tabBarContainer: {
    height: 48,
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  topTabBtnActive: {
    borderWidth: 1,
  },
  topTabBtnText: {
    fontSize: 13.5,
  },
  pickerBox: {
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 14,
  },
  pickerBoxHeader: {
    fontSize: 14,
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  selectChipText: {
    fontSize: 13,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryBannerTitle: {
    fontSize: 13.5,
  },
  summaryBannerSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  smallPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallPdfBtnText: {
    fontSize: 11.5,
  },
  daysRow: {
    gap: 6,
    marginBottom: 14,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 12,
  },
  slotCard: {
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 10,
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeTagText: {
    fontSize: 11.5,
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 11,
  },
  slotCourseCode: {
    fontSize: 16.5,
    letterSpacing: -0.2,
  },
  slotCourseTitle: {
    fontSize: 13.5,
    marginTop: 2,
    marginBottom: 8,
  },
  slotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaItemText: {
    fontSize: 12,
  },
  teacherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teacherPillText: {
    fontSize: 11,
  },
  emptyCard: {
    padding: 24,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    fontSize: 16,
  },
  emptyCardText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  primaryActionBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
  },
  secondaryActionBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtnText: {
    fontSize: 14,
  },
  sectionPdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 10,
    gap: 10,
  },
  sectionPdfTitle: {
    fontSize: 13,
  },
  sectionPdfSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  sectionPdfBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
    gap: 8,
  },
  dayGroupDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayGroupTitle: {
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  dayGroupLine: {
    flex: 1,
    height: 1,
  },
  labBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  labBadgeText: {
    fontSize: 10.5,
  },
});
