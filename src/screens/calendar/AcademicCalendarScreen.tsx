import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import { supabase } from '../../lib/supabase';
import { getCache, getCacheSync, hasCacheSync, setCache, CacheKeys } from '../../services/cacheService';
import { openUrl } from '../../utils/link';
import { localToday } from '../../utils/format';
import { FontFamily, FontSize, Layout, Radius, Spacing, SectorColors, Accent } from '../../theme';
import {
  OFFICIAL_SUMMER_2026_EVENTS,
  OFFICIAL_FALL_2026_EVENTS,
  OFFICIAL_CALENDAR_PDF_URL,
  SEMESTER_NAME,
  TOTAL_SEMESTER_WEEKS,
  SEMESTER_CONFIGS,
  getActiveSemester,
  type SemesterConfig,
  type AcademicEvent,
} from '../../constants/academicCalendar';

const inMemoryCalendar: Record<string, AcademicEvent[]> = {};

const EVENT_TYPES = ['all', 'exam', 'holiday', 'semester', 'general'] as const;
type FilterType = (typeof EVENT_TYPES)[number];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TYPE_COLOR: Record<string, string> = {
  holiday: Accent.red,
  exam: Accent.amber,
  semester: Accent.blue,
  general: SectorColors.calendar,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0, 3)}`;
}

function formatDateFull(d: string) {
  const dt = new Date(d + 'T00:00:00');
  const dayName = DAYS[dt.getDay()];
  return `${dayName}, ${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function makeGoogleCalendarUrl(
  title: string,
  startDateStr: string,
  endDateStr?: string | null,
  desc?: string | null
) {
  const start = startDateStr.replace(/-/g, '');
  let end = start;
  if (endDateStr) {
    const [y, m, d] = endDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + 1);
    end = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
  } else {
    const [y, m, d] = startDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + 1);
    end = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
  }
  const text = encodeURIComponent(title);
  const details = encodeURIComponent(desc || `Official BUBT Academic Event: ${title}`);
  const location = encodeURIComponent('Bangladesh University of Business and Technology (BUBT), Mirpur, Dhaka');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
}

export function AcademicCalendarScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const isAdmin = profile?.role === 'admin';

  // 2-Tab Navigation State: 'calendar' vs 'pdf'
  const [activeTab, setActiveTab] = useState<'calendar' | 'pdf'>('calendar');

  const todayStr = useMemo(() => localToday(), []);
  const [todayYear, todayMonth, todayDateNum] = useMemo(() => {
    return todayStr.split('-').map(Number);
  }, [todayStr]);

  // Active Semester State (auto-selects active semester e.g. Fall 2026 based on today's date)
  const [selectedSemester, setSelectedSemester] = useState<SemesterConfig>(() => getActiveSemester(todayStr));
  const [semesterModalVisible, setSemesterModalVisible] = useState(false);

  // View Mode: 'grid' vs 'timeline'
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  // Calendar View month state (default to current today)
  const [yearMonth, setYearMonth] = useState<[number, number]>([todayYear, todayMonth - 1]);
  const year = yearMonth[0];
  const month = yearMonth[1];
  const monthKey = `${year}_${month}`;
  const calKey = `${CacheKeys.ACADEMIC_CALENDAR}_${monthKey}`;

  // Interactive selected date in calendar (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Category filter
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Events state
  const [eventsByMonth, setEventsByMonth] = useState<Record<string, AcademicEvent[]>>({});
  const [loadingMonths, setLoadingMonths] = useState<Record<string, boolean>>({});

  const events = eventsByMonth[monthKey] ?? inMemoryCalendar[monthKey] ?? getCacheSync<AcademicEvent[]>(calKey) ?? [];
  const isLoading = loadingMonths[monthKey] ?? (!inMemoryCalendar[monthKey] && !hasCacheSync(calKey));

  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editEvent, setEditEvent] = useState<AcademicEvent | null>(null);
  const [calendarPdfUrl, setCalendarPdfUrl] = useState<string>(selectedSemester.pdfUrl);

  // In-App PDF Fullscreen Modal State
  const [pdfModalVisible, setPdfModalVisible] = useState(false);

  // Admin Form state
  const [fTitle, setFTitle] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fDate, setFDate] = useState('');
  const [fEndDate, setFEndDate] = useState('');
  const [fType, setFType] = useState<string>('general');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const mKey = `${year}_${month}`;
    const cKey = `${CacheKeys.ACADEMIC_CALENDAR}_${mKey}`;
    setLoadingMonths((prev) => ({ ...prev, [mKey]: true }));

    const cached = await getCache<AcademicEvent[]>(cKey);
    if (cached && cached.length > 0) {
      inMemoryCalendar[mKey] = cached;
      setEventsByMonth((prev) => ({ ...prev, [mKey]: cached }));
    }

    try {
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${getDaysInMonth(year, month)}`;

      const { data, error } = await supabase
        .from('academic_calendar')
        .select('*')
        .or(`and(event_date.gte.${monthStart},event_date.lte.${monthEnd}),and(end_date.gte.${monthStart},event_date.lt.${monthStart})`)
        .order('event_date', { ascending: true });

      if (error || !data || data.length === 0) {
        // Fallback to verified dataset of active semester for this month
        const fallbackForMonth = selectedSemester.events.filter((ev) => {
          const s = ev.event_date;
          const e = ev.end_date || ev.event_date;
          return (s >= monthStart && s <= monthEnd) || (e >= monthStart && s < monthStart);
        });

        const activeList = fallbackForMonth.length > 0 ? fallbackForMonth : (cached ?? []);
        inMemoryCalendar[mKey] = activeList;
        setEventsByMonth((prev) => ({ ...prev, [mKey]: activeList }));
        setCache(cKey, activeList);
        return;
      }

      setIsOffline(false);
      const evList = data as AcademicEvent[];
      inMemoryCalendar[mKey] = evList;
      setEventsByMonth((prev) => ({ ...prev, [mKey]: evList }));
      setCache(cKey, evList);
    } catch {
      setIsOffline(true);
    } finally {
      setLoadingMonths((prev) => ({ ...prev, [mKey]: false }));
    }

    // Instant cached calendar PDF url
    const cachedPdf = await getCache<string>(CacheKeys.CALENDAR_PDF_URL);
    if (cachedPdf) setCalendarPdfUrl(cachedPdf);

    // Fetch dynamic calendar PDF url from app_config if crawler updated it
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'current_academic_calendar_url')
      .maybeSingle()
      .then(({ data: cfg }) => {
        if (cfg?.value) {
          setCalendarPdfUrl(cfg.value);
          setCache(CacheKeys.CALENDAR_PDF_URL, cfg.value);
        }
      });
  }, [year, month, selectedSemester]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function prevMonth() {
    setYearMonth(([y, m]) => (m === 0 ? [y - 1, 11] : [y, m - 1]));
  }

  function nextMonth() {
    setYearMonth(([y, m]) => (m === 11 ? [y + 1, 0] : [y, m + 1]));
  }

  function jumpToToday() {
    setYearMonth([todayYear, todayMonth - 1]);
    setSelectedDate(todayStr);
  }

  function jumpToMonth(targetYear: number, targetMonthIdx: number) {
    setYearMonth([targetYear, targetMonthIdx]);
  }

  function handleSelectSemester(sem: SemesterConfig) {
    setSelectedSemester(sem);
    setCalendarPdfUrl(sem.pdfUrl);
    setSemesterModalVisible(false);

    // If today is within this semester, land on today's month; otherwise land on start month
    const [sY, sM] = sem.startDate.split('-').map(Number);
    if (todayStr >= sem.startDate && todayStr <= sem.endDate) {
      setYearMonth([todayYear, todayMonth - 1]);
    } else {
      setYearMonth([sY, sM - 1]);
    }
  }

  const isCurrentMonthView = year === todayYear && month === todayMonth - 1;

  // Semester Progress and Week Calculation
  const semesterProgress = useMemo(() => {
    const semStart = new Date(selectedSemester.startDate + 'T00:00:00');
    const semEnd = new Date(selectedSemester.endDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const totalDays = Math.max(1, Math.floor((semEnd.getTime() - semStart.getTime()) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.floor((today.getTime() - semStart.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(selectedSemester.totalWeeks, Math.max(1, Math.floor(elapsedDays / 7) + 1));
    const progressPercent = Math.min(100, Math.max(0, Math.round((Math.max(0, elapsedDays) / totalDays) * 100)));

    let phaseName = t.calendar2.phasePreMidterm;
    let phaseKey: 'pre' | 'mid' | 'post' | 'final' = 'pre';
    if (todayStr >= selectedSemester.midtermStart && todayStr <= selectedSemester.midtermEnd) {
      phaseName = t.calendar2.phaseMidterms;
      phaseKey = 'mid';
    } else if (todayStr > selectedSemester.midtermEnd && todayStr < selectedSemester.finalStart) {
      phaseName = t.calendar2.phasePostMidterm;
      phaseKey = 'post';
    } else if (todayStr >= selectedSemester.finalStart) {
      phaseName = t.calendar2.phaseFinals;
      phaseKey = 'final';
    }

    return {
      currentWeek,
      progressPercent,
      phaseName,
      phaseKey,
      totalWeeks: selectedSemester.totalWeeks,
    };
  }, [selectedSemester, todayStr, t]);

  // Exam Radar Card Calculation (Upcoming Midterms / Finals)
  const nextExam = useMemo(() => {
    const list = selectedSemester.events
      .filter((ev) => ev.event_type === 'exam' && (ev.end_date || ev.event_date) >= todayStr)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    if (list.length === 0) return null;
    const target = list[0];
    const isOngoing = target.event_date <= todayStr && (target.end_date || target.event_date) >= todayStr;
    const targetDate = new Date(target.event_date + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.ceil((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      event: target,
      isOngoing,
      diffDays,
    };
  }, [selectedSemester, todayStr]);

  // Holiday & Off-Day Radar Card Calculation (Upcoming vacations / off days)
  const nextHoliday = useMemo(() => {
    const list = selectedSemester.events
      .filter((ev) => ev.event_type === 'holiday' && (ev.end_date || ev.event_date) >= todayStr)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    if (list.length === 0) return null;
    const target = list[0];
    const isOngoing = target.event_date <= todayStr && (target.end_date || target.event_date) >= todayStr;
    const targetDate = new Date(target.event_date + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.ceil((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    let durationDays = 1;
    if (target.end_date) {
      const s = new Date(target.event_date + 'T00:00:00');
      const e = new Date(target.end_date + 'T00:00:00');
      durationDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    return {
      event: target,
      isOngoing,
      diffDays,
      durationDays,
    };
  }, [selectedSemester, todayStr]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Multi-day Spanning Grid Engine
  const { weeks, eventsCoveringDate } = useMemo(() => {
    const coveringMap = new Map<string, AcademicEvent[]>();

    // Scan all events across current month
    const curPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${curPrefix}-${String(d).padStart(2, '0')}`;
      const matched = (events.length > 0 ? events : selectedSemester.events).filter((ev) => {
        const s = ev.event_date;
        const e = ev.end_date || ev.event_date;
        return dateKey >= s && dateKey <= e;
      });
      if (matched.length > 0) coveringMap.set(dateKey, matched);
    }

    const wks: (number | null)[][] = [];
    let wk: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      wk.push(d);
      if (wk.length === 7) {
        wks.push(wk);
        wk = [];
      }
    }
    if (wk.length > 0) {
      while (wk.length < 7) wk.push(null);
      wks.push(wk);
    }
    return { weeks: wks, eventsCoveringDate: coveringMap };
  }, [events, selectedSemester, daysInMonth, firstDay, year, month]);

  // Selected Day Events
  const selectedDayEvents = useMemo(() => {
    const list = eventsCoveringDate.get(selectedDate) ?? [];
    if (activeFilter === 'all') return list;
    return list.filter((e) => e.event_type === activeFilter);
  }, [eventsCoveringDate, selectedDate, activeFilter]);

  // Month Events Filtered for Agenda
  const filteredMonthEvents = useMemo(() => {
    let list = events.length > 0 ? events : selectedSemester.events.filter((e) => {
      const pad = String(month + 1).padStart(2, '0');
      const prefix = `${year}-${pad}`;
      return e.event_date.startsWith(prefix) || (e.end_date && e.end_date.startsWith(prefix));
    });

    if (activeFilter !== 'all') {
      list = list.filter((e) => e.event_type === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) =>
        e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [events, selectedSemester, activeFilter, searchQuery, year, month]);

  // All Semester Events Filtered for Timeline Mode
  const filteredTimelineEvents = useMemo(() => {
    let list = selectedSemester.events;
    if (activeFilter !== 'all') {
      list = list.filter((e) => e.event_type === activeFilter);
    }
    return list.slice().sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [selectedSemester, activeFilter]);

  const typeLabel = (ty: string) => {
    const map: Record<string, string> = {
      holiday: t.calendar2.typeHoliday,
      exam: t.calendar2.typeExam,
      semester: t.calendar2.typeSemester,
      general: t.calendar2.typeGeneral,
    };
    return map[ty] ?? ty;
  };

  const tabs: TabItem<'calendar' | 'pdf'>[] = [
    { id: 'calendar', label: t.calendar2.tabCalendar, icon: 'calendar' },
    { id: 'pdf', label: t.calendar2.tabPdf, icon: 'file-text' },
  ];

  function openAdd() {
    setEditEvent(null);
    setFTitle('');
    setFDesc('');
    setFDate(selectedDate);
    setFEndDate('');
    setFType('general');
    setModalVisible(true);
  }

  function openEdit(ev: AcademicEvent) {
    setEditEvent(ev);
    setFTitle(ev.title);
    setFDesc(ev.description ?? '');
    setFDate(ev.event_date);
    setFEndDate(ev.end_date ?? '');
    setFType(ev.event_type);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!fTitle.trim() || !fDate.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: fTitle.trim(),
        description: fDesc.trim() || null,
        event_date: fDate.trim(),
        end_date: fEndDate.trim() || null,
        event_type: fType,
      };
      if (editEvent) {
        const { error } = await supabase.from('academic_calendar').update(payload).eq('id', editEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('academic_calendar').insert(payload);
        if (error) throw error;
      }
      setModalVisible(false);
      load();
    } catch {
      Alert.alert(t.common.error, t.calendar2.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(ev: AcademicEvent) {
    Alert.alert(t.calendar2.deleteEventTitle, t.calendar2.deleteEventBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('academic_calendar').delete().eq('id', ev.id);
          if (error) {
            Alert.alert(t.common.error, error.message);
            return;
          }
          load();
        },
      },
    ]);
  }

  async function handleSharePdf() {
    try {
      await Share.share({
        title: 'BUBT Academic Calendar',
        message: `Official BUBT Academic Calendar (${selectedSemester.name}): ${calendarPdfUrl}`,
        url: calendarPdfUrl,
      });
    } catch {
      // ignore
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 1. Header SubBar with Semester Switcher */}
      <SubBar
        title={t.calendar2.title}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.semesterPillBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setSemesterModalVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.semesterPillTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {selectedSemester.shortName}
              </Text>
              <Feather name="chevron-down" size={13} color={C.text3} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pdfCapsuleBtn, { borderColor: C.border }]}
              onPress={() => setPdfModalVisible(true)}
              accessibilityLabel={t.calendar2.officialPdf}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={13} color={C.text2} />
              <Text style={[styles.pdfCapsuleTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {t.calendar2.pdf}
              </Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity onPress={openAdd} hitSlop={8}>
                <Icon name="plus" size={22} color={C.brand} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* 2. Top Segmented Switcher (Calendar vs PDF) */}
      <View style={{ paddingHorizontal: Layout.screenPadding, marginBottom: Spacing[3] }}>
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
        />
      </View>

      {/* ========================================================================= */}
      {/* TAB 1: INTERACTIVE CALENDAR & RADAR BARS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        >
          {isOffline && <OfflineBanner onRetry={load} />}

          <View style={{ paddingHorizontal: Layout.screenPadding }}>
            {/* 3. Master Semester Roadmap Ribbon (Visual Progress Bar) */}
            <View style={[styles.roadmapCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.roadmapHeaderRow}>
                <View style={styles.roadmapHeaderLeft}>
                  <Text style={[styles.roadmapLabel, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                    {t.calendar2.semesterRoadmap}
                  </Text>
                  <Text style={[styles.roadmapSemesterTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {selectedSemester.name}
                  </Text>
                </View>

                <View style={[styles.weekPill, { backgroundColor: C.surface2, borderColor: C.border2 }]}>
                  <Text style={[styles.weekPillText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    {t.calendar2.week} {semesterProgress.currentWeek} {t.calendar2.of} {selectedSemester.totalWeeks}
                  </Text>
                </View>
              </View>

              {/* Visual Gantt Bar with Segmented Color Blocks */}
              <View style={styles.ganttTrackContainer}>
                <View style={[styles.ganttTrack, { backgroundColor: C.surface2 }]}>
                  {/* Phase 1: Pre-Midterm Classes (Weeks 1-7) */}
                  <View style={[styles.ganttSegment, { flex: 50, backgroundColor: Accent.blue + '30', borderRightWidth: 1, borderColor: C.border }]} />
                  {/* Phase 2: Midterm Exams (Weeks 8) */}
                  <View style={[styles.ganttSegment, { flex: 12, backgroundColor: Accent.amber + '40', borderRightWidth: 1, borderColor: C.border }]} />
                  {/* Phase 3: Post-Midterm Classes (Weeks 9-13) */}
                  <View style={[styles.ganttSegment, { flex: 31, backgroundColor: Accent.blue + '30', borderRightWidth: 1, borderColor: C.border }]} />
                  {/* Phase 4: Final Exams (Week 14) */}
                  <View style={[styles.ganttSegment, { flex: 11, backgroundColor: Accent.red + '40' }]} />

                  {/* Dynamic Progress Fill Line */}
                  <View
                    style={[
                      styles.ganttActiveFill,
                      {
                        width: `${semesterProgress.progressPercent}%`,
                        backgroundColor: C.brand,
                      },
                    ]}
                  />
                </View>

                {/* You Are Here Pin */}
                <View style={[styles.pinWrapper, { left: `${Math.min(92, Math.max(4, semesterProgress.progressPercent))}%` }]}>
                  <View style={[styles.pinPill, { backgroundColor: C.brand }]}>
                    <Text style={[styles.pinText, { fontFamily: FontFamily.jakartaBold }]}>
                      {semesterProgress.progressPercent}%
                    </Text>
                  </View>
                  <View style={[styles.pinArrow, { borderTopColor: C.brand }]} />
                </View>
              </View>

              {/* Phase Key Labels */}
              <View style={styles.phasesRow}>
                <View style={styles.phaseLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Accent.blue }]} />
                  <Text style={[styles.phaseLegendText, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    Classes
                  </Text>
                </View>
                <View style={styles.phaseLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Accent.amber }]} />
                  <Text style={[styles.phaseLegendText, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    Midterms
                  </Text>
                </View>
                <View style={styles.phaseLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Accent.red }]} />
                  <Text style={[styles.phaseLegendText, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    Finals
                  </Text>
                </View>
                <Text style={[styles.phaseCurrentNote, { color: C.text3, fontFamily: FontFamily.jakartaSemiBold }]}>
                  {semesterProgress.phaseName}
                </Text>
              </View>
            </View>

            {/* 4. Two Visual Radar Cards: Upcoming Exam & Next Off-Day */}
            <View style={styles.radarsContainer}>
              {/* Radar A: Upcoming Examination */}
              {nextExam && (
                <View style={[styles.radarCard, { backgroundColor: C.surface, borderColor: Accent.amber + '40' }]}>
                  <View style={styles.radarTopRow}>
                    <View style={[styles.radarIconBox, { backgroundColor: Accent.amber + '18' }]}>
                      <Feather name="edit-3" size={16} color={Accent.amber} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.radarCategoryLabel, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                        {t.calendar2.nextExam}
                      </Text>
                    </View>
                    <View style={[styles.radarBadge, { backgroundColor: Accent.amber + '20', borderColor: Accent.amber }]}>
                      <Text style={[styles.radarBadgeText, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                        {nextExam.isOngoing
                          ? t.calendar2.ongoing
                          : `${nextExam.diffDays === 1 ? t.calendar2.startsTomorrow : `${t.calendar2.startsIn} ${nextExam.diffDays}d`}`}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.radarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {nextExam.event.title}
                  </Text>

                  <Text style={[styles.radarDateSpan, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    {formatDate(nextExam.event.event_date)}
                    {nextExam.event.end_date ? ` - ${formatDate(nextExam.event.end_date)}` : ''}
                  </Text>

                  {/* Readiness Progress Strip */}
                  <View style={styles.readinessContainer}>
                    <View style={[styles.readinessTrack, { backgroundColor: C.surface2 }]}>
                      <View
                        style={[
                          styles.readinessFill,
                          {
                            width: `${Math.min(100, Math.round((semesterProgress.currentWeek / 8) * 100))}%`,
                            backgroundColor: Accent.amber,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.readinessText, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                      {semesterProgress.currentWeek} of 8 preparation weeks completed
                    </Text>
                  </View>
                </View>
              )}

              {/* Radar B: Next Off-Day / Vacation */}
              {nextHoliday && (
                <View style={[styles.radarCard, { backgroundColor: C.surface, borderColor: Accent.green + '40' }]}>
                  <View style={styles.radarTopRow}>
                    <View style={[styles.radarIconBox, { backgroundColor: Accent.green + '18' }]}>
                      <Feather name="sun" size={16} color={Accent.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.radarCategoryLabel, { color: Accent.green, fontFamily: FontFamily.jakartaBold }]}>
                        {t.calendar2.nextOffDay}
                      </Text>
                    </View>
                    <View style={[styles.radarBadge, { backgroundColor: Accent.green + '20', borderColor: Accent.green }]}>
                      <Text style={[styles.radarBadgeText, { color: Accent.green, fontFamily: FontFamily.jakartaBold }]}>
                        {nextHoliday.durationDays} {nextHoliday.durationDays === 1 ? t.calendar2.dayOff : t.calendar2.daysOff}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.radarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {nextHoliday.event.title}
                  </Text>

                  <View style={styles.holidayMetaRow}>
                    <Text style={[styles.radarDateSpan, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      {formatDate(nextHoliday.event.event_date)}
                      {nextHoliday.event.end_date ? ` - ${formatDate(nextHoliday.event.end_date)}` : ''}
                    </Text>
                    <Text style={[styles.holidayCountText, { color: Accent.green, fontFamily: FontFamily.jakartaBold }]}>
                      {nextHoliday.isOngoing
                        ? t.calendar2.ongoing
                        : nextHoliday.diffDays === 1
                        ? t.calendar2.startsTomorrow
                        : `${t.calendar2.startsIn} ${nextHoliday.diffDays}d`}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* 5. View Mode Switcher + Category Filters Bar */}
            <View style={styles.controlsRow}>
              {/* Category Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={{ flex: 1 }}
              >
                {[
                  { id: 'all', label: t.calendar2.filterAll },
                  { id: 'exam', label: t.calendar2.filterExams },
                  { id: 'holiday', label: t.calendar2.filterHolidays },
                  { id: 'semester', label: t.calendar2.filterSemester },
                  { id: 'general', label: t.calendar2.filterFees },
                ].map((chip) => {
                  const isSelected = activeFilter === chip.id;
                  const chipColor = chip.id === 'all' ? C.brand : TYPE_COLOR[chip.id] || C.brand;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isSelected ? chipColor + '20' : C.surface,
                          borderColor: isSelected ? chipColor : C.border,
                        },
                      ]}
                      onPress={() => setActiveFilter(chip.id as FilterType)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: isSelected ? chipColor : C.text2,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* View Mode Toggle: Grid vs Timeline */}
              <View style={[styles.viewToggleContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TouchableOpacity
                  style={[
                    styles.viewToggleBtn,
                    viewMode === 'grid' && { backgroundColor: C.brand },
                  ]}
                  onPress={() => setViewMode('grid')}
                  activeOpacity={0.75}
                >
                  <Feather name="grid" size={14} color={viewMode === 'grid' ? '#ffffff' : C.text3} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewToggleBtn,
                    viewMode === 'timeline' && { backgroundColor: C.brand },
                  ]}
                  onPress={() => setViewMode('timeline')}
                  activeOpacity={0.75}
                >
                  <Feather name="list" size={14} color={viewMode === 'timeline' ? '#ffffff' : C.text3} />
                </TouchableOpacity>
              </View>
            </View>

            {/* =================================================================== */}
            {/* VIEW A: CALENDAR GRID MODE                                          */}
            {/* =================================================================== */}
            {viewMode === 'grid' ? (
              <>
                {/* Month Navigation & Today Snap Row */}
                <View style={styles.monthNavRow}>
                  <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={prevMonth} hitSlop={12} style={styles.navArrow}>
                      <Icon name="chevL" size={22} color={C.text} />
                    </TouchableOpacity>
                    <Text style={[styles.monthLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {MONTHS[month]} {year}
                    </Text>
                    <TouchableOpacity onPress={nextMonth} hitSlop={12} style={styles.navArrow}>
                      <Icon name="chevR" size={22} color={C.text} />
                    </TouchableOpacity>
                  </View>

                  {!isCurrentMonthView && (
                    <TouchableOpacity
                      style={[styles.todaySnapBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={jumpToToday}
                      activeOpacity={0.75}
                    >
                      <Feather name="corner-up-left" size={13} color={C.brand} />
                      <Text style={[styles.todaySnapTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                        {t.calendar2.today}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Zero-Events Helper Banner if current month is outside active semester schedule */}
                {filteredMonthEvents.length === 0 && (
                  <View style={[styles.zeroEventsBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Feather name="info" size={15} color={C.brand} />
                    <Text style={[styles.zeroEventsText, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      No events in {MONTHS[month]} {year} for {selectedSemester.name}.
                    </Text>
                    <TouchableOpacity
                      style={[styles.zeroJumpBtn, { backgroundColor: C.brand + '20' }]}
                      onPress={() => {
                        const [sY, sM] = selectedSemester.startDate.split('-').map(Number);
                        jumpToMonth(sY, sM - 1);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.zeroJumpText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                        View Term
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 7-Column Calendar Grid with Floating Multi-Day Event Bars */}
                <View style={[styles.calendarCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.dayHeader}>
                    {DAYS.map((d, di) => {
                      const isWeekend = di === 5 || di === 6; // Fri & Sat at BUBT
                      return (
                        <Text
                          key={d}
                          style={[
                            styles.dayLabel,
                            {
                              color: isWeekend ? Accent.red + '90' : C.textMuted,
                              fontFamily: FontFamily.jakartaSemiBold,
                            },
                          ]}
                        >
                          {d}
                        </Text>
                      );
                    })}
                  </View>

                  {weeks.map((wk, wi) => (
                    <View key={wi} style={styles.weekRow}>
                      {wk.map((day, di) => {
                        if (!day) return <View key={di} style={styles.dayCell} />;

                        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = dateKey === todayStr;
                        const isSelected = dateKey === selectedDate;
                        const isWeekend = di === 5 || di === 6;
                        const coveringEvents = eventsCoveringDate.get(dateKey) ?? [];
                        const topEvent = coveringEvents[0];
                        const isMultiDay = topEvent && topEvent.end_date && topEvent.end_date !== topEvent.event_date;
                        const isBarStart = topEvent && (topEvent.event_date === dateKey || di === 0);
                        const isBarEnd = topEvent && (topEvent.end_date === dateKey || di === 6);

                        return (
                          <TouchableOpacity
                            key={di}
                            style={[
                              styles.dayCell,
                              isWeekend && { backgroundColor: C.surface2 + '40' },
                              isSelected && { borderColor: C.brand, borderWidth: 1.5, borderRadius: Radius.sm },
                            ]}
                            onPress={() => setSelectedDate(dateKey)}
                            activeOpacity={0.7}
                          >
                            {/* Day Number Pill */}
                            <View
                              style={[
                                styles.dayCircle,
                                isToday && { backgroundColor: C.brand },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayNum,
                                  {
                                    color: isToday ? '#ffffff' : isWeekend ? Accent.red : C.text,
                                    fontFamily: isToday || isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                                  },
                                ]}
                              >
                                {day}
                              </Text>
                            </View>

                            {/* Floating Multi-Day Capsule Bar or Dot */}
                            {topEvent ? (
                              isMultiDay ? (
                                <View
                                  style={[
                                    styles.floatingBar,
                                    {
                                      backgroundColor: TYPE_COLOR[topEvent.event_type] || C.brand,
                                      borderTopLeftRadius: isBarStart ? 6 : 0,
                                      borderBottomLeftRadius: isBarStart ? 6 : 0,
                                      borderTopRightRadius: isBarEnd ? 6 : 0,
                                      borderBottomRightRadius: isBarEnd ? 6 : 0,
                                    },
                                  ]}
                                >
                                  {isBarStart && (
                                    <Text style={[styles.floatingBarText, { fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                                      {topEvent.title}
                                    </Text>
                                  )}
                                </View>
                              ) : (
                                <View style={styles.dotRow}>
                                  <View
                                    style={[
                                      styles.dot,
                                      { backgroundColor: TYPE_COLOR[topEvent.event_type] || C.brand },
                                    ]}
                                  />
                                </View>
                              )
                            ) : (
                              <View style={styles.emptyDotPlaceholder} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>

                {/* Day Inspector Card (Displays Selected Date Details) */}
                <View style={[styles.inspectorCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.inspectorHeader}>
                    <Text style={[styles.inspectorDateText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {formatDateFull(selectedDate)}
                    </Text>
                    {selectedDate === todayStr && (
                      <View style={[styles.todayTag, { backgroundColor: C.brand + '20' }]}>
                        <Text style={[styles.todayTagText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                          {t.calendar2.today}
                        </Text>
                      </View>
                    )}
                  </View>

                  {selectedDayEvents.length === 0 ? (
                    <View style={styles.noEventsDay}>
                      <Text style={[styles.noEventsDayTitle, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                        {t.calendar2.regularDay}
                      </Text>
                      <Text style={[styles.noEventsDayText, { color: C.text3, fontFamily: FontFamily.jakartaRegular }]}>
                        {t.calendar2.noSpecialEvents}
                      </Text>
                    </View>
                  ) : (
                    selectedDayEvents.map((ev) => (
                      <View key={ev.id} style={[styles.dayEventItem, { borderColor: C.border2, backgroundColor: C.surface2 }]}>
                        <View style={styles.dayEventTopRow}>
                          <Text style={[styles.dayEventTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {ev.title}
                          </Text>
                          <Pill label={typeLabel(ev.event_type)} customColor={TYPE_COLOR[ev.event_type]} />
                        </View>

                        <Text style={[styles.dayEventDate, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                          {formatDate(ev.event_date)}
                          {ev.end_date ? ` - ${formatDate(ev.end_date)}` : ''}
                        </Text>

                        {ev.description ? (
                          <Text style={[styles.dayEventDesc, { color: C.text3, fontFamily: FontFamily.jakartaRegular }]}>
                            {ev.description}
                          </Text>
                        ) : null}

                        {/* Action Bar: Google Calendar + Section Routine */}
                        <View style={styles.dayEventActions}>
                          <TouchableOpacity
                            style={[styles.gCalBtn, { backgroundColor: C.brand }]}
                            onPress={() => {
                              const url = makeGoogleCalendarUrl(ev.title, ev.event_date, ev.end_date, ev.description);
                              openUrl(url);
                            }}
                            activeOpacity={0.8}
                          >
                            <Feather name="calendar" size={13} color="#ffffff" />
                            <Text style={[styles.gCalBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                              {t.calendar2.addToGoogleCalendar}
                            </Text>
                          </TouchableOpacity>

                          {ev.event_type === 'exam' && (
                            <TouchableOpacity
                              style={[styles.routineLinkBtn, { borderColor: C.border }]}
                              onPress={() => navigation.navigate('RoutinesBrowse')}
                              activeOpacity={0.7}
                            >
                              <Feather name="list" size={13} color={C.text2} />
                              <Text style={[styles.routineLinkText, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                                {t.calendar2.viewRoutines}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Month Agenda List */}
                <View style={styles.monthListHeader}>
                  <Text style={[styles.sectionHeading, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {MONTHS[month]} Schedule
                  </Text>
                  <Text style={[styles.eventCountText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {filteredMonthEvents.length} events
                  </Text>
                </View>

                {filteredMonthEvents.length === 0 ? (
                  <View style={[styles.emptyBox, { borderColor: C.border }]}>
                    <Feather name="calendar" size={28} color={C.textMuted} />
                    <Text style={[styles.emptyBoxText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {t.calendar2.noEventsForFilter}
                    </Text>
                  </View>
                ) : (
                  filteredMonthEvents.map((ev) => (
                    <TouchableOpacity
                      key={ev.id}
                      style={[styles.eventCard, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={() => {
                        setSelectedDate(ev.event_date);
                        if (isAdmin) openEdit(ev);
                      }}
                      onLongPress={() => (isAdmin ? handleDelete(ev) : undefined)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.eventStripe, { backgroundColor: TYPE_COLOR[ev.event_type] }]} />
                      <View style={styles.eventContent}>
                        <View style={styles.eventTopRow}>
                          <Text style={[styles.eventTitle, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>
                            {ev.title}
                          </Text>
                          <Pill label={typeLabel(ev.event_type)} customColor={TYPE_COLOR[ev.event_type]} />
                        </View>
                        <Text style={[styles.eventDate, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                          {formatDate(ev.event_date)}
                          {ev.end_date ? ` - ${formatDate(ev.end_date)}` : ''}
                        </Text>
                        {ev.description ? (
                          <Text style={[styles.eventDesc, { color: C.text3, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={2}>
                            {ev.description}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </>
            ) : (
              /* =================================================================== */
              /* VIEW B: TIMELINE ROADMAP MODE                                       */
              /* =================================================================== */
              <View style={styles.timelineContainer}>
                {filteredTimelineEvents.map((ev) => {
                  const isPast = (ev.end_date || ev.event_date) < todayStr;
                  const isOngoing = ev.event_date <= todayStr && (ev.end_date || ev.event_date) >= todayStr;
                  const targetDate = new Date(ev.event_date + 'T00:00:00');
                  const todayDate = new Date(todayStr + 'T00:00:00');
                  const diffDays = Math.ceil((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <View
                      key={ev.id}
                      style={[
                        styles.timelineCard,
                        {
                          backgroundColor: C.surface,
                          borderColor: isOngoing ? C.brand : C.border,
                          opacity: isPast ? 0.75 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.timelineStripe, { backgroundColor: TYPE_COLOR[ev.event_type] }]} />

                      <View style={styles.timelineContent}>
                        <View style={styles.timelineHeaderRow}>
                          <View style={[styles.timelineDateBadge, { backgroundColor: C.surface2 }]}>
                            <Text style={[styles.timelineDateText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                              {formatDate(ev.event_date)}
                              {ev.end_date ? ` - ${formatDate(ev.end_date)}` : ''}
                            </Text>
                          </View>

                          {isOngoing ? (
                            <View style={[styles.statusBadge, { backgroundColor: C.success + '20', borderColor: C.success }]}>
                              <Text style={[styles.statusBadgeText, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                                {t.calendar2.ongoing}
                              </Text>
                            </View>
                          ) : isPast ? (
                            <View style={[styles.statusBadge, { backgroundColor: C.surface2, borderColor: C.border2 }]}>
                              <Text style={[styles.statusBadgeText, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                                {t.calendar2.completed}
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.statusBadge, { backgroundColor: C.brand + '20', borderColor: C.brand }]}>
                              <Text style={[styles.statusBadgeText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                                {diffDays === 1 ? t.calendar2.startsTomorrow : `${t.calendar2.startsIn} ${diffDays}d`}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text style={[styles.timelineTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {ev.title}
                        </Text>

                        {ev.description ? (
                          <Text style={[styles.timelineDesc, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
                            {ev.description}
                          </Text>
                        ) : null}

                        <View style={styles.timelineActions}>
                          <Pill label={typeLabel(ev.event_type)} customColor={TYPE_COLOR[ev.event_type]} />

                          <TouchableOpacity
                            style={[styles.timelineGCalBtn, { borderColor: C.border }]}
                            onPress={() => {
                              const url = makeGoogleCalendarUrl(ev.title, ev.event_date, ev.end_date, ev.description);
                              openUrl(url);
                            }}
                            activeOpacity={0.75}
                          >
                            <Feather name="calendar" size={12} color={C.text2} />
                            <Text style={[styles.timelineGCalText, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                              Google Cal
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* ========================================================================= */
        /* TAB 2: OFFICIAL REGISTRAR PDF VIEWER                                      */
        /* ========================================================================= */
        <ScrollView contentContainerStyle={styles.pdfTabScroll} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: Layout.screenPadding }}>
            {/* Provenance Card */}
            <View style={[styles.provenanceCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.provenanceTopRow}>
                <View style={[styles.docIconBox, { backgroundColor: C.brand + '20' }]}>
                  <Feather name="file-text" size={24} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.provenanceTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.calendar2.officialCircular}
                  </Text>
                  <Text style={[styles.provenanceSub, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                    {t.calendar2.issuedByRegistrar}
                  </Text>
                </View>
                <View style={[styles.verifiedPill, { backgroundColor: C.success + '20', borderColor: C.success }]}>
                  <Feather name="check-circle" size={12} color={C.success} />
                  <Text style={[styles.verifiedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                    Official
                  </Text>
                </View>
              </View>

              <Text style={[styles.docMetaNote, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
                Complete 2-page institutional document for {selectedSemester.name}. Contains all official term dates, installment schedules, waiver periods, and exam dates signed by the Registrar.
              </Text>

              {/* Action Buttons Row */}
              <View style={styles.pdfBtnRow}>
                <TouchableOpacity
                  style={[styles.primaryReaderBtn, { backgroundColor: SectorColors.calendar }]}
                  onPress={() => setPdfModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="maximize-2" size={15} color="#ffffff" />
                  <Text style={[styles.primaryReaderBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                    {t.calendar2.fullscreenReader}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryPdfBtn, { borderColor: C.border, backgroundColor: C.surface2 }]}
                  onPress={handleSharePdf}
                  activeOpacity={0.7}
                >
                  <Feather name="share-2" size={15} color={C.text} />
                  <Text style={[styles.secondaryPdfBtnText, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {t.calendar2.sharePdf}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Summary Tables Breakdown */}
            <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.summaryHeader}>
                <Feather name="bookmark" size={16} color={C.brand} />
                <Text style={[styles.summaryTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Registrar Key Deadlines Summary ({selectedSemester.name})
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  1st Installment Fee
                </Text>
                <Text style={[styles.summaryItemVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {selectedSemester.id === 'fall-2026' ? '05 Sep - 24 Sep 2026' : '06 May - 22 May 2026'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  Course Add/Drop Deadline
                </Text>
                <Text style={[styles.summaryItemVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {selectedSemester.id === 'fall-2026' ? '24 September 2026' : '21 May 2026'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  Midterm Examination
                </Text>
                <Text style={[styles.summaryItemVal, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                  {selectedSemester.id === 'fall-2026' ? '05 Nov - 14 Nov 2026' : '25 June - 03 July 2026'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  Final Examination
                </Text>
                <Text style={[styles.summaryItemVal, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                  {selectedSemester.id === 'fall-2026' ? '07 Jan - 16 Jan 2027' : '22 Aug - 30 Aug 2026'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  Final Results Publication
                </Text>
                <Text style={[styles.summaryItemVal, { color: Accent.blue, fontFamily: FontFamily.jakartaBold }]}>
                  {selectedSemester.id === 'fall-2026' ? '21 January 2027' : '03 September 2026'}
                </Text>
              </View>
            </View>

            {/* Tap to open Document banner */}
            <TouchableOpacity
              style={[styles.tapDocumentBanner, { borderColor: C.brand, backgroundColor: C.brand + '15' }]}
              onPress={() => setPdfModalVisible(true)}
              activeOpacity={0.8}
            >
              <Feather name="eye" size={18} color={C.brand} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  View Official Scanned Document
                </Text>
                <Text style={[styles.bannerSub, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                  Tap to launch high-resolution zoomable viewer
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.brand} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 6. Semester Switcher Modal */}
      <Modal visible={semesterModalVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSemesterModalVisible(false)}
        >
          <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Academic Semester
              </Text>
              <TouchableOpacity onPress={() => setSemesterModalVisible(false)} hitSlop={10}>
                <Feather name="x" size={20} color={C.text3} />
              </TouchableOpacity>
            </View>

            {SEMESTER_CONFIGS.map((sem) => {
              const isSelected = selectedSemester.id === sem.id;
              const isCurrent = todayStr >= sem.startDate && todayStr <= sem.endDate;
              return (
                <TouchableOpacity
                  key={sem.id}
                  style={[
                    styles.semesterChoiceItem,
                    {
                      backgroundColor: isSelected ? C.brand + '18' : C.surface2,
                      borderColor: isSelected ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => handleSelectSemester(sem)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.semesterChoiceTop}>
                      <Text style={[styles.semesterChoiceName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {sem.name}
                      </Text>
                      {isCurrent && (
                        <View style={[styles.activeTermPill, { backgroundColor: C.success + '20' }]}>
                          <Text style={[styles.activeTermText, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                            Active
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.semesterChoiceDates, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      {sem.startDate} to {sem.endDate} · {sem.events.length} Events
                    </Text>
                  </View>

                  {isSelected && <Feather name="check-circle" size={18} color={C.brand} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 7. Native In-App PDF Viewer Modal */}
      <CampusPdfViewerModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        title={t.calendar2.title}
        subtitle={`${selectedSemester.name} Registrar Circular`}
        category="Academic Calendar"
        fileUrl={calendarPdfUrl}
        fileName="bubt-academic-calendar-summer-2026.pdf"
      />

      {/* 8. Admin Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {editEvent ? t.calendar2.editEvent : t.calendar2.addEvent}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.text3} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.eventTitle}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fTitle}
                onChangeText={setFTitle}
                placeholder={t.calendar2.titlePlaceholder}
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.eventType}
              </Text>
              <View style={styles.typeSelector}>
                {(['general', 'holiday', 'exam', 'semester'] as const).map((ty) => (
                  <TouchableOpacity
                    key={ty}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: fType === ty ? TYPE_COLOR[ty] + '20' : C.surface2,
                        borderColor: fType === ty ? TYPE_COLOR[ty] : C.border,
                      },
                    ]}
                    onPress={() => setFType(ty)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        {
                          color: fType === ty ? TYPE_COLOR[ty] : C.text2,
                          fontFamily: fType === ty ? FontFamily.jakartaBold : FontFamily.jakartaRegular,
                        },
                      ]}
                    >
                      {typeLabel(ty)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.eventDate}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fDate}
                onChangeText={setFDate}
                placeholder={t.calendar2.datePlaceholder}
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.endDate}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fEndDate}
                onChangeText={setFEndDate}
                placeholder={t.calendar2.endDatePlaceholder}
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.description}
              </Text>
              <TextInput
                style={[styles.input, styles.multiline, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fDesc}
                onChangeText={setFDesc}
                placeholder={t.calendar2.descPlaceholder}
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: SectorColors.calendar,
                    opacity: saving || !fTitle.trim() || !fDate.trim() ? 0.5 : 1,
                  },
                ]}
                onPress={handleSave}
                disabled={saving || !fTitle.trim() || !fDate.trim()}
              >
                <Text style={[styles.saveBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                  {t.calendar2.saveEvent}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },
  pdfTabScroll: { paddingBottom: 40 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  semesterPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
  },
  semesterPillTxt: { fontSize: 12 },

  pdfCapsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
  },
  pdfCapsuleTxt: { fontSize: 12 },

  // Master Semester Roadmap Ribbon
  roadmapCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  roadmapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  roadmapHeaderLeft: {
    gap: 2,
  },
  roadmapLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  roadmapSemesterTitle: {
    fontSize: FontSize.md,
  },
  weekPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  weekPillText: {
    fontSize: 11,
  },
  ganttTrackContainer: {
    position: 'relative',
    marginVertical: Spacing[2],
  },
  ganttTrack: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  ganttSegment: {
    height: '100%',
  },
  ganttActiveFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 5,
    opacity: 0.45,
  },
  pinWrapper: {
    position: 'absolute',
    top: -24,
    alignItems: 'center',
    transform: [{ translateX: -16 }],
  },
  pinPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinText: {
    color: '#ffffff',
    fontSize: 9.5,
  },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  phasesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing[2],
  },
  phaseLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseLegendText: {
    fontSize: 11,
  },
  phaseCurrentNote: {
    marginLeft: 'auto',
    fontSize: 11,
  },

  // 2 Radar Cards
  radarsContainer: {
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  radarCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[3] + 2,
  },
  radarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  radarIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCategoryLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  radarBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  radarBadgeText: {
    fontSize: 10.5,
  },
  radarTitle: {
    fontSize: FontSize.base,
    marginBottom: 3,
  },
  radarDateSpan: {
    fontSize: FontSize.xs,
  },
  holidayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  holidayCountText: {
    fontSize: 11.5,
  },
  readinessContainer: {
    marginTop: Spacing[2],
    gap: 4,
  },
  readinessTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  readinessFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  readinessText: {
    fontSize: 10.5,
  },

  // Controls & Filters Row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing[3],
  },
  filterRow: {
    flexDirection: 'row',
    gap: 7,
  },
  filterChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 12,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 2,
  },
  viewToggleBtn: {
    width: 32,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Month navigation row
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[1],
    marginBottom: Spacing[2],
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navArrow: {
    padding: 4,
  },
  monthLabel: {
    fontSize: FontSize.md,
  },
  todaySnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  todaySnapTxt: {
    fontSize: 11.5,
  },

  // Zero-Events Helper Banner
  zeroEventsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing[2],
  },
  zeroEventsText: {
    flex: 1,
    fontSize: 11.5,
  },
  zeroJumpBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  zeroJumpText: {
    fontSize: 11,
  },

  // Calendar Grid
  calendarCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[2],
    marginBottom: Spacing[3],
  },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: Spacing[1],
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
  },
  weekRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
    minHeight: 52,
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 12.5,
  },
  floatingBar: {
    width: '100%',
    height: 14,
    justifyContent: 'center',
    paddingHorizontal: 3,
    marginTop: 2,
  },
  floatingBarText: {
    color: '#ffffff',
    fontSize: 8.5,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 14,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  emptyDotPlaceholder: {
    height: 14,
  },

  // Inspector Card
  inspectorCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[3] + 2,
    marginBottom: Spacing[3],
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  inspectorDateText: {
    fontSize: FontSize.sm + 1,
  },
  todayTag: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  todayTagText: {
    fontSize: 10.5,
  },
  noEventsDay: {
    paddingVertical: Spacing[1],
  },
  noEventsDayTitle: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  noEventsDayText: {
    fontSize: FontSize.xs,
  },
  dayEventItem: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  dayEventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayEventTitle: {
    fontSize: FontSize.sm + 1,
    flex: 1,
    marginRight: 8,
  },
  dayEventDate: {
    fontSize: FontSize.xs,
    marginBottom: 4,
  },
  dayEventDesc: {
    fontSize: FontSize.xs,
    marginBottom: Spacing[2],
  },
  dayEventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  gCalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    height: 32,
    borderRadius: 8,
  },
  gCalBtnText: {
    color: '#ffffff',
    fontSize: 11,
  },
  routineLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
  },
  routineLinkText: {
    fontSize: 11,
  },

  // Month Agenda List
  monthListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  sectionHeading: {
    fontSize: FontSize.sm + 1,
  },
  eventCountText: {
    fontSize: FontSize.xs,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyBoxText: {
    fontSize: FontSize.xs,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing[2],
    overflow: 'hidden',
  },
  eventStripe: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: Spacing[3],
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: FontSize.sm,
    flex: 1,
    marginRight: 8,
  },
  eventDate: {
    fontSize: FontSize.xs,
    marginBottom: 3,
  },
  eventDesc: {
    fontSize: FontSize.xs,
  },

  // Timeline Roadmap Mode
  timelineContainer: {
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  timelineCard: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timelineStripe: {
    width: 4,
  },
  timelineContent: {
    flex: 1,
    padding: Spacing[3],
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timelineDateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timelineDateText: {
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
  },
  timelineTitle: {
    fontSize: FontSize.sm + 1,
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: FontSize.xs,
    marginBottom: 8,
  },
  timelineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timelineGCalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
  },
  timelineGCalText: {
    fontSize: 10.5,
  },

  // PDF Tab Styles
  provenanceCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  provenanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing[2],
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  provenanceTitle: {
    fontSize: FontSize.base,
  },
  provenanceSub: {
    fontSize: FontSize.xs,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  verifiedTxt: {
    fontSize: 10.5,
  },
  docMetaNote: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing[3],
  },
  pdfBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryReaderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: Radius.md,
  },
  primaryReaderBtnText: {
    color: '#ffffff',
    fontSize: 13,
  },
  secondaryPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  secondaryPdfBtnText: {
    fontSize: 12.5,
  },
  summaryCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing[3],
  },
  summaryTitle: {
    fontSize: FontSize.sm + 1,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  summaryItemLabel: {
    fontSize: FontSize.xs,
  },
  summaryItemVal: {
    fontSize: FontSize.xs,
  },
  tapDocumentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing[3] + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  bannerTitle: {
    fontSize: FontSize.sm,
  },
  bannerSub: {
    fontSize: 11,
  },

  // Semester Choice Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: Layout.screenPadding,
  },
  pickerSheet: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
    gap: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pickerTitle: {
    fontSize: FontSize.base,
  },
  semesterChoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  semesterChoiceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  semesterChoiceName: {
    fontSize: FontSize.base,
  },
  activeTermPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTermText: {
    fontSize: 10,
  },
  semesterChoiceDates: {
    fontSize: FontSize.xs,
  },

  // Admin Modal
  modalSheet: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  modalTitle: {
    fontSize: FontSize.base,
  },
  modalBody: {
    paddingBottom: Spacing[4],
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: Spacing[2],
  },
  input: {
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing[3],
    fontSize: FontSize.sm,
  },
  multiline: {
    height: 72,
    paddingTop: Spacing[2],
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  typeChip: {
    flex: 1,
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: {
    fontSize: 11,
  },
  saveBtn: {
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[4],
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
  },
});
