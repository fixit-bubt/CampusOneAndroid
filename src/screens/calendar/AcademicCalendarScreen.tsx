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
  ActivityIndicator,
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
  OFFICIAL_CALENDAR_PDF_URL,
  SEMESTER_NAME,
  TOTAL_SEMESTER_WEEKS,
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
  const [allSemesterEvents, setAllSemesterEvents] = useState<AcademicEvent[]>(OFFICIAL_SUMMER_2026_EVENTS);
  const [loadingMonths, setLoadingMonths] = useState<Record<string, boolean>>({});

  const events = eventsByMonth[monthKey] ?? inMemoryCalendar[monthKey] ?? getCacheSync<AcademicEvent[]>(calKey) ?? [];
  const isLoading = loadingMonths[monthKey] ?? (!inMemoryCalendar[monthKey] && !hasCacheSync(calKey));

  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editEvent, setEditEvent] = useState<AcademicEvent | null>(null);
  const [calendarPdfUrl, setCalendarPdfUrl] = useState<string>(OFFICIAL_CALENDAR_PDF_URL);

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
        // Fallback to official verified BUBT dataset for this month
        const fallbackForMonth = OFFICIAL_SUMMER_2026_EVENTS.filter((ev) => {
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
  }, [year, month]);

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

  const isCurrentMonthView = year === todayYear && month === todayMonth - 1;

  // Semester Progress and Week Calculation
  const semesterProgress = useMemo(() => {
    const semStart = new Date('2026-05-06T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.floor((today.getTime() - semStart.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(TOTAL_SEMESTER_WEEKS, Math.max(1, Math.floor(diffDays / 7) + 1));
    const progressPercent = Math.min(100, Math.max(0, Math.round((currentWeek / TOTAL_SEMESTER_WEEKS) * 100)));

    let phaseName = 'Pre-Midterm Phase';
    if (currentWeek >= 7 && currentWeek <= 8) phaseName = 'Midterm Examination Phase';
    else if (currentWeek >= 9 && currentWeek <= 13) phaseName = 'Post-Midterm Phase';
    else if (currentWeek >= 14) phaseName = 'Final Examination Phase';

    return {
      currentWeek,
      progressPercent,
      phaseName,
    };
  }, [todayStr]);

  // Next Milestone Hero Calculation
  const nextMilestone = useMemo(() => {
    const upcoming = allSemesterEvents
      .filter((ev) => (ev.end_date || ev.event_date) >= todayStr)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    if (upcoming.length === 0) return null;
    const target = upcoming[0];

    const isOngoing = target.event_date <= todayStr && (target.end_date || target.event_date) >= todayStr;
    const targetDate = new Date(target.event_date + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.ceil((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      event: target,
      isOngoing,
      diffDays,
    };
  }, [allSemesterEvents, todayStr]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Multi-day Spanning Grid Engine
  const { weeks, eventsCoveringDate } = useMemo(() => {
    const coveringMap = new Map<string, AcademicEvent[]>();

    // Scan all events across current month
    const curPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${curPrefix}-${String(d).padStart(2, '0')}`;
      const matched = (events.length > 0 ? events : OFFICIAL_SUMMER_2026_EVENTS).filter((ev) => {
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
  }, [events, daysInMonth, firstDay, year, month]);

  // Selected Day Events
  const selectedDayEvents = useMemo(() => {
    const list = eventsCoveringDate.get(selectedDate) ?? [];
    if (activeFilter === 'all') return list;
    return list.filter((e) => e.event_type === activeFilter);
  }, [eventsCoveringDate, selectedDate, activeFilter]);

  // Month Events Filtered
  const filteredMonthEvents = useMemo(() => {
    let list = events.length > 0 ? events : OFFICIAL_SUMMER_2026_EVENTS.filter((e) => {
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
  }, [events, activeFilter, searchQuery, year, month]);

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
        message: `Official BUBT Academic Calendar (${SEMESTER_NAME}): ${calendarPdfUrl}`,
        url: calendarPdfUrl,
      });
    } catch {
      // ignore
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 1. Header SubBar */}
      <SubBar
        title={t.calendar2.title}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.headerActions}>
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

      {/* 2. Universal 58 dp Top Segmented Switcher */}
      <View style={{ paddingHorizontal: Layout.screenPadding, marginBottom: Spacing[3] }}>
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
        />
      </View>

      {/* ========================================================================= */}
      {/* TAB 1: INTERACTIVE CALENDAR & MILESTONES                                  */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        >
          <View style={{ paddingHorizontal: Layout.screenPadding }}>
            <OfflineBanner visible={isOffline} onRetry={load} />

            {/* 3. Next Milestone Countdown Hero Card */}
            {nextMilestone && (
              <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.heroTopRow}>
                  <View style={[styles.heroIconBox, { backgroundColor: TYPE_COLOR[nextMilestone.event.event_type] + '20' }]}>
                    <Feather
                      name={
                        nextMilestone.event.event_type === 'exam'
                          ? 'award'
                          : nextMilestone.event.event_type === 'holiday'
                          ? 'sun'
                          : 'calendar'
                      }
                      size={18}
                      color={TYPE_COLOR[nextMilestone.event.event_type]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroLabel, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                      {t.calendar2.nextMilestone}
                    </Text>
                    <Text style={[styles.heroTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {nextMilestone.event.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.heroBadge,
                      {
                        backgroundColor: nextMilestone.isOngoing
                          ? C.success + '20'
                          : TYPE_COLOR[nextMilestone.event.event_type] + '20',
                        borderColor: nextMilestone.isOngoing
                          ? C.success
                          : TYPE_COLOR[nextMilestone.event.event_type],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.heroBadgeText,
                        {
                          color: nextMilestone.isOngoing
                            ? C.success
                            : TYPE_COLOR[nextMilestone.event.event_type],
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {nextMilestone.isOngoing
                        ? t.calendar2.ongoing
                        : `${nextMilestone.diffDays} ${nextMilestone.diffDays === 1 ? t.calendar2.dayLeft : t.calendar2.daysLeft}`}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={[styles.progressTrack, { backgroundColor: C.surface2 }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${semesterProgress.progressPercent}%`,
                          backgroundColor: SectorColors.calendar,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressText, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      {SEMESTER_NAME} · {t.calendar2.week} {semesterProgress.currentWeek} {t.calendar2.of} {TOTAL_SEMESTER_WEEKS}
                    </Text>
                    <Text style={[styles.phaseText, { color: C.text3, fontFamily: FontFamily.jakartaSemiBold }]}>
                      {semesterProgress.phaseName}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 4. Horizontal Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
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

            {/* 5. Month Navigation & Today Snap Row */}
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

            {/* 6. Interactive Calendar Grid with Multi-Day Span Ribbons */}
            <View style={[styles.calendarCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.dayHeader}>
                {DAYS.map((d) => (
                  <Text key={d} style={[styles.dayLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {d}
                  </Text>
                ))}
              </View>

              {weeks.map((wk, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {wk.map((day, di) => {
                    if (!day) return <View key={di} style={styles.dayCell} />;

                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = dateKey === todayStr;
                    const isSelected = dateKey === selectedDate;
                    const coveringEvents = eventsCoveringDate.get(dateKey) ?? [];
                    const topEvent = coveringEvents[0];

                    return (
                      <TouchableOpacity
                        key={di}
                        style={[
                          styles.dayCell,
                          topEvent && {
                            backgroundColor: TYPE_COLOR[topEvent.event_type] + '18',
                          },
                          // Round caps for start and end of multi-day ranges
                          topEvent?.event_date === dateKey && { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
                          topEvent?.end_date === dateKey && { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
                        ]}
                        onPress={() => setSelectedDate(dateKey)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.dayCircle,
                            isToday && { backgroundColor: SectorColors.calendar },
                            isSelected && !isToday && { borderWidth: 2, borderColor: C.brand },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNum,
                              {
                                color: isToday ? '#ffffff' : isSelected ? C.brand : C.text,
                                fontFamily: isToday || isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                              },
                            ]}
                          >
                            {day}
                          </Text>
                        </View>

                        {/* Event Dot Indicators */}
                        {coveringEvents.length > 0 && (
                          <View style={styles.dotRow}>
                            {coveringEvents.slice(0, 3).map((e, idx) => (
                              <View
                                key={idx}
                                style={[styles.dot, { backgroundColor: TYPE_COLOR[e.event_type] ?? C.brand }]}
                              />
                            ))}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* 7. Selected Day Inspector & Direct Actions */}
            <View style={[styles.inspectorCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.inspectorHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="calendar" size={15} color={C.brand} />
                  <Text style={[styles.inspectorDateText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {formatDateFull(selectedDate)}
                  </Text>
                </View>
                {selectedDate === todayStr && (
                  <View style={[styles.todayTag, { backgroundColor: SectorColors.calendar + '20' }]}>
                    <Text style={[styles.todayTagText, { color: SectorColors.calendar, fontFamily: FontFamily.jakartaBold }]}>
                      {t.calendar2.today}
                    </Text>
                  </View>
                )}
              </View>

              {selectedDayEvents.length === 0 ? (
                <View style={styles.noEventsDay}>
                  <Text style={[styles.noEventsDayText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    No academic events scheduled on this day.
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
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* 8. Full Month Agenda List */}
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
                Complete 2-page institutional document for {SEMESTER_NAME}. Contains all official term dates, installment schedules, waiver periods, and exam dates signed by the Registrar.
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
                  Registrar Key Deadlines Summary
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  1st Installment Fee
                </Text>
                <Text style={[styles.summaryItemVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  06 May - 22 May 2026
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  Course Add/Drop Deadline
                </Text>
                <Text style={[styles.summaryItemVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  21 May 2026
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  Midterm Examination
                </Text>
                <Text style={[styles.summaryItemVal, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                  25 June - 03 July 2026
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  Final Examination
                </Text>
                <Text style={[styles.summaryItemVal, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                  22 Aug - 30 Aug 2026
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                  Final Results Publication
                </Text>
                <Text style={[styles.summaryItemVal, { color: Accent.blue, fontFamily: FontFamily.jakartaBold }]}>
                  03 September 2026
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

      {/* 9. Native In-App PDF Viewer Modal */}
      <CampusPdfViewerModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        title={t.calendar2.title}
        subtitle={`${SEMESTER_NAME} Registrar Circular`}
        category="Academic Calendar"
        fileUrl={calendarPdfUrl}
        fileName="bubt-academic-calendar-summer-2026.pdf"
      />

      {/* 10. Admin Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {editEvent ? t.calendar2.editEvent : t.calendar2.addEvent}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <Icon name="x" size={22} color={C.text2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
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
              <View style={styles.typeRow}>
                {EVENT_TYPES.filter((ty) => ty !== 'all').map((ty) => (
                  <TouchableOpacity
                    key={ty}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: fType === ty ? TYPE_COLOR[ty] : C.border,
                        backgroundColor: fType === ty ? TYPE_COLOR[ty] + '18' : C.surface2,
                      },
                    ]}
                    onPress={() => setFType(ty)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        {
                          color: fType === ty ? TYPE_COLOR[ty] : C.text2,
                          fontFamily: FontFamily.jakartaMedium,
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pdfCapsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
  },
  pdfCapsuleTxt: { fontSize: 12.5 },

  // Hero Milestone Card
  heroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: FontSize.md,
  },
  heroBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 11,
  },
  progressContainer: {
    marginTop: Spacing[3],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 11.5,
  },
  phaseText: {
    fontSize: 11,
  },

  // Category Filter Row
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing[3],
  },
  filterChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 12.5,
  },

  // Month navigation row
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[2],
    marginBottom: Spacing[2],
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navArrow: {
    padding: 4,
  },
  monthLabel: {
    fontSize: FontSize.lg,
  },
  todaySnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  todaySnapTxt: {
    fontSize: 12,
  },

  // Calendar Grid
  calendarCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[3],
    marginBottom: Spacing[3],
  },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: Spacing[2],
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    minHeight: 46,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: FontSize.sm,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
  },

  // Inspector Card
  inspectorCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  inspectorDateText: {
    fontSize: FontSize.base,
  },
  todayTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  todayTagText: {
    fontSize: 11,
  },
  noEventsDay: {
    paddingVertical: Spacing[2],
  },
  noEventsDayText: {
    fontSize: FontSize.sm,
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
    fontSize: FontSize.base,
    flex: 1,
    marginRight: 8,
  },
  dayEventDate: {
    fontSize: FontSize.xs,
    marginBottom: 4,
  },
  dayEventDesc: {
    fontSize: FontSize.sm,
    marginBottom: Spacing[3],
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
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
  },
  gCalBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
  },
  routineLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
  },
  routineLinkText: {
    fontSize: 11.5,
  },

  // Month Agenda List
  monthListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  sectionHeading: {
    fontSize: FontSize.base,
  },
  eventCountText: {
    fontSize: FontSize.xs,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyBoxText: {
    fontSize: FontSize.sm,
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
    fontSize: FontSize.md,
    flex: 1,
    marginRight: 8,
  },
  eventDate: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  eventDesc: {
    fontSize: FontSize.sm,
    marginTop: 4,
  },

  // TAB 2: PDF Tab Styles
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
    marginBottom: Spacing[3],
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  provenanceTitle: {
    fontSize: FontSize.lg,
  },
  provenanceSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  verifiedTxt: {
    fontSize: 10.5,
  },
  docMetaNote: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing[4],
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
    gap: 7,
    height: 48,
    borderRadius: 14,
  },
  primaryReaderBtnText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
  },
  secondaryPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryPdfBtnText: {
    fontSize: FontSize.sm,
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
    paddingBottom: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  summaryTitle: {
    fontSize: FontSize.base,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryItemLabel: {
    fontSize: FontSize.sm,
  },
  summaryItemVal: {
    fontSize: FontSize.sm,
  },

  tapDocumentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing[4],
  },
  bannerTitle: {
    fontSize: FontSize.base,
  },
  bannerSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },

  // Modal Sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Layout.screenPadding, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  modalTitle: { fontSize: FontSize['2xl'] },
  fieldLabel: { fontSize: FontSize.xs, letterSpacing: 0.5, marginBottom: Spacing[1], marginTop: Spacing[3] },
  input: { height: Layout.inputHeight, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], fontSize: FontSize.base },
  multiline: { height: 90, paddingTop: Spacing[2], textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  typeChip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1 },
  typeChipText: { fontSize: FontSize.sm },
  saveBtn: { height: Layout.inputHeight, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing[5] },
  saveBtnText: { color: '#fff', fontSize: FontSize.base },
});
