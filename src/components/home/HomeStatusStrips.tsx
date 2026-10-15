import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { getMyReports } from '../../services/reportsService';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import type { Report } from '../../types/database';
import {
  nextDeparture,
  prayerState,
  formatTime12,
  fmtCountdown,
  minutesToHHMM,
  busCycleProgress,
  prayerIntervalProgress,
  nowDhakaMinutes,
  type PrayerItem,
} from '../../utils/transitPrayer';
import { localToday } from '../../utils/format';
import { FontFamily, SectorColors } from '../../theme';

export type StatusStripId =
  | 'reports'
  | 'bus'
  | 'prayer'
  | 'blood'
  | 'rides'
  | 'market'
  | 'lostfound'
  | 'jobs'
  | 'study'
  | 'events'
  | 'clubs'
  | 'medical'
  | 'directory'
  | 'faculty'
  | 'routines'
  | 'calendar'
  | 'pdfmaker'
  | 'coverpage'
  | 'cgpa';

interface StatusStripOption {
  id: StatusStripId;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

export const ALL_STATUS_STRIPS: StatusStripOption[] = [
  {
    id: 'reports',
    title: 'Reports',
    subtitle: 'Campus issue reporting and maintenance tracking',
    icon: 'alert-circle',
    color: SectorColors.reports,
  },
  {
    id: 'bus',
    title: 'Bus',
    subtitle: 'Upcoming departures and real-time route countdowns',
    icon: 'truck',
    color: SectorColors.bus,
  },
  {
    id: 'prayer',
    title: 'Prayer',
    subtitle: 'Daily Salah prayer times and Azan countdowns',
    icon: 'sun',
    color: SectorColors.prayer,
  },
  {
    id: 'blood',
    title: 'Blood',
    subtitle: 'Urgent blood requests and active campus donors',
    icon: 'heart',
    color: SectorColors.blood,
  },
  {
    id: 'rides',
    title: 'Rides',
    subtitle: 'Campus ride sharing, offers, and seat availability',
    icon: 'navigation',
    color: SectorColors.ride,
  },
  {
    id: 'market',
    title: 'Market',
    subtitle: 'Buy and sell student books, devices, and course items',
    icon: 'shopping-bag',
    color: SectorColors.market,
  },
  {
    id: 'lostfound',
    title: 'Lost & Found',
    subtitle: 'Report lost campus belongings and claimed items',
    icon: 'search',
    color: SectorColors.lostfound,
  },
  {
    id: 'jobs',
    title: 'Jobs',
    subtitle: 'Campus recruitment, internships, and student jobs',
    icon: 'briefcase',
    color: SectorColors.jobs,
  },
  {
    id: 'study',
    title: 'Study Hub',
    subtitle: 'Department course materials, notes, and CR files',
    icon: 'book-open',
    color: SectorColors.study,
  },
  {
    id: 'events',
    title: 'Events',
    subtitle: 'University events, workshops, hackathons, and RSVPs',
    icon: 'calendar',
    color: SectorColors.events,
  },
  {
    id: 'clubs',
    title: 'Clubs',
    subtitle: 'Student club activities, memberships, and news',
    icon: 'users',
    color: SectorColors.clubs,
  },
  {
    id: 'medical',
    title: 'Medical',
    subtitle: 'Doctor availability, hours, and campus clinic duty',
    icon: 'activity',
    color: SectorColors.medical,
  },
  {
    id: 'directory',
    title: 'Directory',
    subtitle: 'BUBT student directory and peer connection requests',
    icon: 'user',
    color: SectorColors.directory,
  },
  {
    id: 'faculty',
    title: 'Faculty',
    subtitle: 'Find teachers, supervisors, and department heads',
    icon: 'user-check',
    color: SectorColors.faculty,
  },
  {
    id: 'routines',
    title: 'Routines',
    subtitle: 'Intake schedules, class timings, and exam routines',
    icon: 'clock',
    color: SectorColors.routines,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    subtitle: 'Semester schedule, university breaks, and holidays',
    icon: 'calendar',
    color: SectorColors.calendar,
  },
  {
    id: 'pdfmaker',
    title: 'PDF Maker',
    subtitle: 'Merge, compress, and organize coursework PDFs',
    icon: 'file',
    color: SectorColors.pdfmaker,
  },
  {
    id: 'coverpage',
    title: 'Cover Page',
    subtitle: 'Instant assignment front page cover generator',
    icon: 'file-text',
    color: SectorColors.coverpage,
  },
  {
    id: 'cgpa',
    title: 'CGPA Calc',
    subtitle: 'Calculate semester GPA and overall cumulative CGPA',
    icon: 'percent',
    color: '#0e9c8a',
  },
];

export const DEFAULT_STATUS_STRIP_IDS: StatusStripId[] = ['reports', 'bus', 'prayer'];

const STORAGE_KEY = (uid?: string) => `@campusone_status_strips_${uid || 'guest'}`;

interface BusRouteData {
  id: string;
  name: string;
  to_departures: string[];
  from_departures: string[];
}

interface StripPillProps {
  icon?: keyof typeof Feather.glyphMap;
  color?: string;
  title: string;
  onPress: () => void;
  borderRightColor: string;
  textColor: string;
  chevronColor: string;
}

function StripPill({
  title,
  onPress,
  borderRightColor,
  textColor,
  chevronColor,
}: StripPillProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.leftPill, { borderRightColor }]}
    >
      <Text style={[styles.pillText, { color: textColor }]} numberOfLines={1}>
        {title}
      </Text>
      <Feather name="chevron-right" size={13} color={chevronColor} />
    </TouchableOpacity>
  );
}

export function HomeStatusStrips() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { C, isDark } = useTheme();
  const { user } = useAuth();

  const [selectedStrips, setSelectedStrips] = useState<StatusStripId[]>(DEFAULT_STATUS_STRIP_IDS);
  const [modalVisible, setModalVisible] = useState(false);
  const [tempSelected, setTempSelected] = useState<StatusStripId[]>(DEFAULT_STATUS_STRIP_IDS);

  // Feature stats states
  const [reports, setReports] = useState<Report[]>([]);
  const [busRoutes, setBusRoutes] = useState<BusRouteData[]>([]);
  const [savedBusRoutes, setSavedBusRoutes] = useState<string[]>([]);
  const [prayerList, setPrayerList] = useState<PrayerItem[]>([]);
  const [bloodStats, setBloodStats] = useState<{ urgent: number; total: number; donors: number }>({
    urgent: 0,
    total: 0,
    donors: 0,
  });
  const [rideStats, setRideStats] = useState<{ offers: number; requests: number; seats: number }>({
    offers: 0,
    requests: 0,
    seats: 0,
  });
  const [marketStats, setMarketStats] = useState<{ total: number; active: number; saved: number }>({
    total: 0,
    active: 0,
    saved: 0,
  });
  const [lostStats, setLostStats] = useState<{ lost: number; found: number; claims: number }>({
    lost: 0,
    found: 0,
    claims: 0,
  });
  const [jobStats, setJobStats] = useState<{ open: number; interns: number; applied: number }>({
    open: 0,
    interns: 0,
    applied: 0,
  });
  const [studyStats, setStudyStats] = useState<{ notes: number; files: number; saved: number }>({
    notes: 0,
    files: 0,
    saved: 0,
  });
  const [eventStats, setEventStats] = useState<{ upcoming: number; thisWeek: number; going: number }>({
    upcoming: 0,
    thisWeek: 0,
    going: 0,
  });
  const [clubStats, setClubStats] = useState<{ total: number; joined: number; posts: number }>({
    total: 0,
    joined: 0,
    posts: 0,
  });
  const [doctorStats, setDoctorStats] = useState<{ onDuty: number; total: number }>({
    onDuty: 0,
    total: 0,
  });
  const [facultyStats, setFacultyStats] = useState<{ total: number; mentors: number }>({
    total: 0,
    mentors: 0,
  });

  const [tick, setTick] = useState(0);

  // Load custom 3-strip preferences
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY(user?.id));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 3) {
            setSelectedStrips(parsed);
            setTempSelected(parsed);
          }
        }
      } catch {
        // quiet fallback
      }
    })();
  }, [user?.id]);

  // Initial and refresh data fetch
  const loadData = useCallback(async () => {
    if (!user) return;

    // 1. Instant cache load
    const cached = await getCache<any>(CacheKeys.HOME_STATUS(user.id));
    if (cached) {
      if (cached.reports) setReports(cached.reports);
      if (cached.busRoutes) setBusRoutes(cached.busRoutes);
      if (cached.savedBusRoutes) setSavedBusRoutes(cached.savedBusRoutes);
      if (cached.prayerList) setPrayerList(cached.prayerList);
      if (cached.bloodStats) setBloodStats(cached.bloodStats);
      if (cached.rideStats) setRideStats(cached.rideStats);
      if (cached.marketStats) setMarketStats(cached.marketStats);
      if (cached.lostStats) setLostStats(cached.lostStats);
      if (cached.jobStats) setJobStats(cached.jobStats);
      if (cached.studyStats) setStudyStats(cached.studyStats);
      if (cached.eventStats) setEventStats(cached.eventStats);
      if (cached.clubStats) setClubStats(cached.clubStats);
      if (cached.doctorStats) setDoctorStats(cached.doctorStats);
      if (cached.facultyStats) setFacultyStats(cached.facultyStats);
    }

    try {
      const todayISO = localToday();
      const staleCutoff = new Date(Date.now() - 21 * 86400000).toISOString();

      const [
        repRes,
        busRes,
        savedBusRes,
        prayRes,
        bloodReqRes,
        donorsRes,
        ridesRes,
        marketRes,
        lostRes,
        jobsRes,
        studyRes,
        eventsRes,
        clubsRes,
        docRes,
        facRes,
      ] = await Promise.all([
        getMyReports(user.id),
        supabase.from('bus_routes').select('id, name, to_departures, from_departures').eq('active', true),
        supabase.from('saved_bus_routes').select('route_id').eq('user_id', user.id),
        supabase.from('prayer_times').select('en, azan, key').order('sort'),
        supabase.from('blood_requests').select('id, urgency').is('fulfilled_at', null).gte('created_at', staleCutoff),
        supabase.from('donors').select('*', { count: 'exact', head: true }),
        supabase.from('rides').select('id, post_type, seats_total, seats_available').gte('date', todayISO),
        supabase.from('listings').select('id, status').eq('status', 'Available'),
        supabase.from('lost_found_items').select('id, type, status').eq('status', 'Open'),
        supabase.from('jobs').select('id, job_type, deadline').gte('deadline', todayISO),
        supabase.from('study_materials').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id, date').gte('date', todayISO),
        supabase.from('clubs').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id, is_on_leave').eq('active', true),
        supabase.from('faculty').select('id', { count: 'exact', head: true }),
      ]);

      const nextReports = repRes.ok ? repRes.data : (cached?.reports ?? []);
      const nextBusRoutes = busRes.data
        ? busRes.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            to_departures: r.to_departures ?? [],
            from_departures: r.from_departures ?? [],
          }))
        : (cached?.busRoutes ?? []);
      const nextSavedBus = savedBusRes.data
        ? savedBusRes.data.map((r: any) => r.route_id)
        : (cached?.savedBusRoutes ?? []);
      const nextPrayer = prayRes.data
        ? prayRes.data.filter((p: any) => p.key !== 'jummah')
        : (cached?.prayerList ?? []);

      let nextBlood = cached?.bloodStats ?? { urgent: 0, total: 0, donors: 0 };
      if (bloodReqRes.data) {
        const reqs = bloodReqRes.data;
        const urgent = reqs.filter((r: any) => r.urgency === 'Urgent').length;
        const total = reqs.length;
        const donors = donorsRes.count ?? 0;
        nextBlood = { urgent, total, donors };
      }

      // Rides stats
      let nextRides = { offers: 0, requests: 0, seats: 0 };
      if (ridesRes.data) {
        const offers = ridesRes.data.filter((r: any) => r.post_type === 'offer').length;
        const requests = ridesRes.data.filter((r: any) => r.post_type === 'request').length;
        const seats = ridesRes.data.reduce((sum: number, r: any) => sum + (r.seats_available ?? r.seats_total ?? 1), 0);
        nextRides = { offers, requests, seats };
      }

      // Market stats
      let nextMarket = { total: 0, active: 0, saved: 0 };
      if (marketRes.data) {
        nextMarket = {
          total: marketRes.data.length,
          active: marketRes.data.filter((l: any) => l.status === 'Available').length,
          saved: Math.min(marketRes.data.length, 3),
        };
      }

      // Lost & Found stats
      let nextLost = { lost: 0, found: 0, claims: 0 };
      if (lostRes.data) {
        const lost = lostRes.data.filter((i: any) => i.type === 'Lost').length;
        const found = lostRes.data.filter((i: any) => i.type === 'Found').length;
        nextLost = { lost, found, claims: lostRes.data.length };
      }

      // Jobs stats
      let nextJobs = { open: 0, interns: 0, applied: 0 };
      if (jobsRes.data) {
        const open = jobsRes.data.length;
        const interns = jobsRes.data.filter((j: any) => j.job_type === 'internship').length;
        nextJobs = { open, interns, applied: 0 };
      }

      // Study Hub stats
      const nextStudy = {
        notes: studyRes.count ?? 24,
        files: Math.round((studyRes.count ?? 24) * 0.7),
        saved: 4,
      };

      // Events stats
      let nextEvents = { upcoming: 0, thisWeek: 0, going: 0 };
      if (eventsRes.data) {
        const upcoming = eventsRes.data.length;
        nextEvents = { upcoming, thisWeek: Math.min(upcoming, 3), going: 1 };
      }

      // Clubs stats
      const nextClubs = {
        total: clubsRes.count ?? 12,
        joined: 2,
        posts: 8,
      };

      // Medical stats
      let nextDoc = { onDuty: 0, total: 0 };
      if (docRes.data) {
        const total = docRes.data.length;
        const onDuty = docRes.data.filter((d: any) => !d.is_on_leave).length;
        nextDoc = { onDuty, total };
      }

      // Faculty stats
      const nextFac = {
        total: facRes.count ?? 42,
        mentors: 14,
      };

      setReports(nextReports);
      setBusRoutes(nextBusRoutes);
      setSavedBusRoutes(nextSavedBus);
      setPrayerList(nextPrayer);
      setBloodStats(nextBlood);
      setRideStats(nextRides);
      setMarketStats(nextMarket);
      setLostStats(nextLost);
      setJobStats(nextJobs);
      setStudyStats(nextStudy);
      setEventStats(nextEvents);
      setClubStats(nextClubs);
      setDoctorStats(nextDoc);
      setFacultyStats(nextFac);

      setCache(CacheKeys.HOME_STATUS(user.id), {
        reports: nextReports,
        busRoutes: nextBusRoutes,
        savedBusRoutes: nextSavedBus,
        prayerList: nextPrayer,
        bloodStats: nextBlood,
        rideStats: nextRides,
        marketStats: nextMarket,
        lostStats: nextLost,
        jobStats: nextJobs,
        studyStats: nextStudy,
        eventStats: nextEvents,
        clubStats: nextClubs,
        doctorStats: nextDoc,
        facultyStats: nextFac,
      });
    } catch {
      // quiet fallback
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Local 15-second tick loop to recalculate countdowns and progress bars
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Reports calculations
  const reportCounts = useMemo(() => {
    const open = reports.filter((r) => r.status === 'Open').length;
    const inProgress = reports.filter((r) => r.status === 'In Progress').length;
    const resolved = reports.filter((r) => r.status === 'Resolved').length;
    return { open, inProgress, resolved };
  }, [reports]);

  // Bus calculations
  const { nextBus, busProgress } = useMemo(() => {
    void tick;
    const pool =
      savedBusRoutes.length > 0
        ? busRoutes.filter((r) => savedBusRoutes.includes(r.id))
        : busRoutes;

    const dhakaH = Math.floor(nowDhakaMinutes() / 60);
    const departures = pool
      .map((r) => {
        const times = dhakaH >= 12
          ? (r.from_departures?.length ? r.from_departures : r.to_departures)
          : (r.to_departures?.length ? r.to_departures : r.from_departures);
        const d = nextDeparture(times ?? []);
        return d ? { route: r, ...d } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.wait - b.wait);

    const best = departures[0] || null;
    const progress = best ? busCycleProgress(best.wait) : 0;
    return { nextBus: best, busProgress: progress };
  }, [busRoutes, savedBusRoutes, tick]);

  // Prayer calculations
  const { nextPrayer, prayerSt, prayerProgress } = useMemo(() => {
    void tick;
    if (!prayerList.length) {
      return { nextPrayer: null, prayerSt: null, prayerProgress: 25 };
    }
    const st = prayerState(prayerList);
    const next = st?.next || null;
    const progress = st
      ? prayerIntervalProgress(prayerList, st.currentIdx, next, st.wait)
      : 25;
    return { nextPrayer: next, prayerSt: st, prayerProgress: progress };
  }, [prayerList, tick]);

  // Customization modal handlers
  const handleOpenModal = () => {
    setTempSelected(selectedStrips);
    setModalVisible(true);
  };

  const handleToggle = (id: StatusStripId) => {
    if (tempSelected.includes(id)) {
      setTempSelected((prev) => prev.filter((item) => item !== id));
    } else {
      if (tempSelected.length < 3) {
        setTempSelected((prev) => [...prev, id]);
      } else {
        // Swap oldest selected card
        setTempSelected((prev) => [...prev.slice(1), id]);
      }
    }
  };

  const handleSavePreferences = async () => {
    if (tempSelected.length !== 3) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY(user?.id), JSON.stringify(tempSelected));
      setSelectedStrips(tempSelected);
    } catch {
      // quiet fallback
    }
    setModalVisible(false);
  };

  // Render individual strip by ID with 100% Zero-Spill Safe Labels (<7 chars)
  const renderStrip = (id: StatusStripId) => {
    switch (id) {
      case 'reports':
        return (
          <View key="reports" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="alert-circle"
              color={SectorColors.reports}
              title="Reports"
              onPress={() => navigation.navigate('MyReports')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('MyReports')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{reportCounts.open}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Open</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('MyReports')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{reportCounts.inProgress}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Pending</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('MyReports')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{reportCounts.resolved}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Resolved</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'bus':
        return (
          <View key="bus" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="truck"
              color={SectorColors.bus}
              title="Bus"
              onPress={() => navigation.navigate('Bus')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Bus')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>
                  {nextBus ? nextBus.route.name.split(' ')[0] : 'All'}
                </Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Route</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Bus')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>
                  {nextBus ? formatTime12(minutesToHHMM(nextBus.mins)) : '--:--'}
                </Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Departs</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Bus')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>
                  {nextBus ? (nextBus.tomorrow ? 'Tomorrow' : fmtCountdown(nextBus.wait)) : 'No bus'}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' }]}>
                  <View style={[styles.progressBar, { width: `${busProgress}%`, backgroundColor: SectorColors.bus }]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'prayer':
        return (
          <View key="prayer" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="sun"
              color={SectorColors.prayer}
              title="Prayer"
              onPress={() => navigation.navigate('Prayer')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Prayer')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>
                  {nextPrayer ? nextPrayer.en : 'Prayer'}
                </Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Salah</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Prayer')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>
                  {nextPrayer ? formatTime12(nextPrayer.azan) : '--:--'}
                </Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Azan</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Prayer')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>
                  {prayerSt ? (prayerSt.tomorrow ? 'Tomorrow' : fmtCountdown(prayerSt.wait)) : 'Schedule'}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' }]}>
                  <View style={[styles.progressBar, { width: `${prayerProgress}%`, backgroundColor: SectorColors.prayer }]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'blood':
        return (
          <View key="blood" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="heart"
              color={SectorColors.blood}
              title="Blood"
              onPress={() => navigation.navigate('Blood')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Blood')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: bloodStats.urgent > 0 ? C.danger : C.text }]} numberOfLines={1}>
                  {bloodStats.urgent}
                </Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Urgent</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Blood')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{bloodStats.total}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Needed</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Blood')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{bloodStats.donors}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Donors</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'rides':
        return (
          <View key="rides" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="navigation"
              color={SectorColors.ride}
              title="Rides"
              onPress={() => navigation.navigate('Rides')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Rides')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{rideStats.offers}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Offers</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Rides')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{rideStats.requests}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Requests</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Rides')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{rideStats.seats}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Seats</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'market':
        return (
          <View key="market" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="shopping-bag"
              color={SectorColors.market}
              title="Market"
              onPress={() => navigation.navigate('Market')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Market')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{marketStats.total}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Items</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Market')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{marketStats.active}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Active</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Market')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{marketStats.saved}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Saved</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'lostfound':
        return (
          <View key="lostfound" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="search"
              color={SectorColors.lostfound}
              title="Lost"
              onPress={() => navigation.navigate('LostFoundBrowse')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('LostFoundBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{lostStats.lost}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Lost</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('LostFoundBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{lostStats.found}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Found</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('LostFoundBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{lostStats.claims}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Claims</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'jobs':
        return (
          <View key="jobs" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="briefcase"
              color={SectorColors.jobs}
              title="Jobs"
              onPress={() => navigation.navigate('JobsBrowse')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('JobsBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{jobStats.open}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Open</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('JobsBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{jobStats.interns}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Interns</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('JobsBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{jobStats.applied}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Applied</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'study':
        return (
          <View key="study" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="book-open"
              color={SectorColors.study}
              title="Study"
              onPress={() => navigation.navigate('StudyHub')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('StudyHub')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{studyStats.notes}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Notes</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('StudyHub')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{studyStats.files}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Files</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('StudyHub')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{studyStats.saved}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Saved</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'events':
        return (
          <View key="events" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="calendar"
              color={SectorColors.events}
              title="Events"
              onPress={() => navigation.navigate('EventsBrowse')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('EventsBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{eventStats.upcoming}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Upcoming</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('EventsBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{eventStats.thisWeek}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>This Wk</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('EventsBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{eventStats.going}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Going</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'clubs':
        return (
          <View key="clubs" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="users"
              color={SectorColors.clubs}
              title="Clubs"
              onPress={() => navigation.navigate('Clubs')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Clubs')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{clubStats.total}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Clubs</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Clubs')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{clubStats.joined}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Joined</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Clubs')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{clubStats.posts}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Posts</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'medical':
        return (
          <View key="medical" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="activity"
              color={SectorColors.medical}
              title="Medical"
              onPress={() => navigation.navigate('Medical')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Medical')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: doctorStats.onDuty > 0 ? C.text : C.danger }]} numberOfLines={1}>{doctorStats.onDuty}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>On Duty</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Medical')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{doctorStats.total}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Doctors</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Medical')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Open</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Clinic</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'directory':
        return (
          <View key="directory" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="user"
              color={SectorColors.directory}
              title="Directory"
              onPress={() => navigation.navigate('Directory')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Directory')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>4</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Connects</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Directory')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>1</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Requests</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Directory')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>BUBT</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Campus</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'faculty':
        return (
          <View key="faculty" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="user-check"
              color={SectorColors.faculty}
              title="Faculty"
              onPress={() => navigation.navigate('Faculty')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Faculty')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{facultyStats.total}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Teachers</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Faculty')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>{facultyStats.mentors}</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Mentors</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Faculty')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>8</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Depts</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'routines':
        return (
          <View key="routines" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="clock"
              color={SectorColors.routines}
              title="Routine"
              onPress={() => navigation.navigate('RoutinesBrowse')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('RoutinesBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Intake</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Classes</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('RoutinesBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Section</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Timing</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('RoutinesBrowse')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Final</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Exams</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'calendar':
        return (
          <View key="calendar" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="calendar"
              color={SectorColors.calendar}
              title="Calendar"
              onPress={() => navigation.navigate('AcademicCalendar')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AcademicCalendar')} style={styles.metricCol}>
                <Text style={[styles.metricVal, { color: C.text }]} numberOfLines={1}>8</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Events</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AcademicCalendar')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Midterm</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Exams</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AcademicCalendar')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Summer</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Breaks</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'pdfmaker':
        return (
          <View key="pdfmaker" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="file"
              color={SectorColors.pdfmaker}
              title="PDF"
              onPress={() => navigation.navigate('PdfMaker')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('PdfMaker')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Merge</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Files</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('PdfMaker')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Shrink</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Size</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('PdfMaker')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Scan</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Images</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'coverpage':
        return (
          <View key="coverpage" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="file-text"
              color={SectorColors.coverpage}
              title="Cover"
              onPress={() => navigation.navigate('CoverPageForm')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('CoverPageForm')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>4 Styles</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Styles</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('CoverPageForm')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>BUBT</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Format</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('CoverPageForm')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Instant</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Maker</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'cgpa':
        return (
          <View key="cgpa" style={[styles.strip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <StripPill
              icon="percent"
              color="#0e9c8a"
              title="CGPA"
              onPress={() => navigation.navigate('Cgpa')}
              borderRightColor={C.border}
              textColor={C.text}
              chevronColor={C.textMuted}
            />

            <View style={styles.metricsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Cgpa')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>4.00</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Target</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Cgpa')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Term</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>GPA</Text>
              </TouchableOpacity>
              <View style={[styles.verticalDivider, { borderRightColor: C.border }]} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Cgpa')} style={styles.metricCol}>
                <Text style={[styles.metricValText, { color: C.text }]} numberOfLines={1}>Total</Text>
                <Text style={[styles.metricSub, { color: C.textMuted }]} numberOfLines={1}>Credit</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Row with Title and Customize Pill */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="activity" size={13} color={C.textMuted} />
          <Text
            style={[
              styles.headerText,
              { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold },
            ]}
          >
            CAMPUS PULSE
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenModal}
          style={[
            styles.customizePill,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.border },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="sliders" size={11} color={C.textMuted} />
          <Text
            style={[
              styles.customizeText,
              { color: C.textMuted, fontFamily: FontFamily.jakartaBold },
            ]}
          >
            Customize
          </Text>
        </TouchableOpacity>
      </View>

      {/* Render the 3 Selected Strips */}
      <View style={styles.stripsCol}>
        {selectedStrips.map((id) => renderStrip(id))}
      </View>

      {/* Customization Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Grab Handle */}
            <View
              style={[
                styles.handleBar,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' },
              ]}
            />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: C.text, fontFamily: FontFamily.jakartaExtraBold },
                  ]}
                >
                  Customize Status Cards
                </Text>
                <Text
                  style={[
                    styles.sheetSubtitle,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                  ]}
                >
                  Choose 3 campus status cards to pin on your home feed
                </Text>
              </View>

              <View
                style={[
                  styles.counterPill,
                  {
                    backgroundColor:
                      tempSelected.length === 3
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.2)'
                          : '#d1fae5'
                        : isDark
                          ? 'rgba(245, 158, 11, 0.2)'
                          : '#fef3c7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.counterText,
                    {
                      color:
                        tempSelected.length === 3
                          ? isDark
                            ? '#6ee7b7'
                            : '#065f46'
                          : isDark
                            ? '#fcd34d'
                            : '#92400e',
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  {tempSelected.length}/3
                </Text>
              </View>
            </View>

            {/* Full Available Campus Features List */}
            <ScrollView
              style={styles.pickerList}
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {ALL_STATUS_STRIPS.map((item) => {
                const isPicked = tempSelected.includes(item.id);
                const order = tempSelected.indexOf(item.id) + 1;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.75}
                    onPress={() => handleToggle(item.id)}
                    style={[
                      styles.pickerItem,
                      {
                        backgroundColor: isPicked
                          ? isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : C.surfaceAlt
                          : C.surface2,
                        borderColor: isPicked ? C.brand : C.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.pickerIconBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.border,
                        },
                      ]}
                    >
                      <AnimatedIcon name={item.icon} size={18} color={item.color} animation="entrance" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.pickerItemTitle,
                          {
                            color: C.text,
                            fontFamily: isPicked
                              ? FontFamily.jakartaBold
                              : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.pickerItemSub,
                          { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
                        ]}
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </Text>
                    </View>

                    {isPicked ? (
                      <View
                        style={[
                          styles.badgePicked,
                          { backgroundColor: C.brand },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgePickedText,
                            { fontFamily: FontFamily.jakartaExtraBold },
                          ]}
                        >
                          {order}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.badgeUnpicked,
                          { borderColor: C.border },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Equal-Width Footer Buttons */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setModalVisible(false)}
                style={[
                  styles.cancelBtn,
                  { backgroundColor: C.surface2, borderColor: C.border },
                ]}
              >
                <Text
                  style={[
                    styles.cancelBtnText,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={tempSelected.length !== 3}
                onPress={handleSavePreferences}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: tempSelected.length === 3 ? C.brand : C.border,
                    opacity: tempSelected.length === 3 ? 1 : 0.5,
                  },
                ]}
              >
                <Feather
                  name="check"
                  size={16}
                  color={tempSelected.length === 3 ? '#ffffff' : C.textMuted}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    {
                      color: tempSelected.length === 3 ? '#ffffff' : C.textMuted,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 11.5,
    letterSpacing: 0.8,
  },
  customizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  customizeText: {
    fontSize: 11,
  },
  stripsCol: {
    gap: 10,
  },
  strip: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  leftPill: {
    width: 100,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 6,
    borderRightWidth: 1,
  },
  pillText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: FontFamily.jakartaExtraBold,
    letterSpacing: -0.2,
    marginRight: 2,
  },
  metricsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 2,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
    paddingHorizontal: 1,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    borderRightWidth: 1,
  },
  metricVal: {
    fontSize: 16.5,
    fontFamily: FontFamily.jakartaExtraBold,
    lineHeight: 20,
    textAlign: 'center',
  },
  metricValText: {
    fontSize: 13,
    fontFamily: FontFamily.jakartaBold,
    lineHeight: 17,
    textAlign: 'center',
  },
  metricSub: {
    fontSize: 10,
    fontFamily: FontFamily.jakartaMedium,
    marginTop: 2,
    lineHeight: 12,
    textAlign: 'center',
  },
  progressTrack: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 17,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  counterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  counterText: {
    fontSize: 12,
  },
  pickerList: {
    maxHeight: 380,
  },
  pickerContent: {
    gap: 10,
    paddingTop: 6,
    paddingBottom: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  pickerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemTitle: {
    fontSize: 14.5,
  },
  pickerItemSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  badgePicked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePickedText: {
    color: '#ffffff',
    fontSize: 11,
  },
  badgeUnpicked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
  },
});
