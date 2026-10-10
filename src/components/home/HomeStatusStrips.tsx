import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
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
  type PrayerItem,
} from '../../utils/transitPrayer';
import { FontFamily } from '../../theme';

interface BusRouteData {
  id: string;
  name: string;
  to_departures: string[];
}

export function HomeStatusStrips() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [busRoutes, setBusRoutes] = useState<BusRouteData[]>([]);
  const [savedBusRoutes, setSavedBusRoutes] = useState<string[]>([]);
  const [prayerList, setPrayerList] = useState<PrayerItem[]>([]);
  const [bloodStats, setBloodStats] = useState<{
    urgent: number;
    total: number;
    donors: number;
  }>({ urgent: 0, total: 0, donors: 0 });
  const [tick, setTick] = useState(0);

  // Initial and refresh data fetch
  const loadData = useCallback(async () => {
    if (!user) return;

    // 1. Instant cache load
    const cached = await getCache<{
      reports: Report[];
      busRoutes: BusRouteData[];
      savedBusRoutes: string[];
      prayerList: PrayerItem[];
      bloodStats: { urgent: number; total: number; donors: number };
    }>(CacheKeys.HOME_STATUS(user.id));
    if (cached) {
      if (cached.reports) setReports(cached.reports);
      if (cached.busRoutes) setBusRoutes(cached.busRoutes);
      if (cached.savedBusRoutes) setSavedBusRoutes(cached.savedBusRoutes);
      if (cached.prayerList) setPrayerList(cached.prayerList);
      if (cached.bloodStats) setBloodStats(cached.bloodStats);
    }

    try {
      const staleCutoff = new Date(Date.now() - 21 * 86400000).toISOString();
      const [repRes, busRes, savedBusRes, prayRes, bloodReqRes, donorsRes] = await Promise.all([
        getMyReports(user.id),
        supabase
          .from('bus_routes')
          .select('id, name, to_departures')
          .eq('active', true),
        supabase
          .from('saved_bus_routes')
          .select('route_id')
          .eq('user_id', user.id),
        supabase
          .from('prayer_times')
          .select('en, azan, key')
          .order('sort'),
        supabase
          .from('blood_requests')
          .select('id, urgency')
          .is('fulfilled_at', null)
          .gte('created_at', staleCutoff),
        supabase
          .from('donors')
          .select('*', { count: 'exact', head: true }),
      ]);

      const nextReports = repRes.ok ? repRes.data : (cached?.reports ?? []);
      const nextBusRoutes = busRes.data
        ? busRes.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            to_departures: r.to_departures ?? [],
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

      setReports(nextReports);
      setBusRoutes(nextBusRoutes);
      setSavedBusRoutes(nextSavedBus);
      setPrayerList(nextPrayer);
      setBloodStats(nextBlood);

      setCache(CacheKeys.HOME_STATUS(user.id), {
        reports: nextReports,
        busRoutes: nextBusRoutes,
        savedBusRoutes: nextSavedBus,
        prayerList: nextPrayer,
        bloodStats: nextBlood,
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
    // suppress unused warning for tick
    void tick;
    const pool =
      savedBusRoutes.length > 0
        ? busRoutes.filter((r) => savedBusRoutes.includes(r.id))
        : busRoutes;

    const departures = pool
      .map((r) => {
        const d = nextDeparture(r.to_departures);
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

  return (
    <View style={styles.container}>
      {/* 1. Reports Strip (Indigo Blueprint Theme) */}
      <View style={styles.stripWrapper}>
        <LinearGradient
          colors={['#0a1226', '#101b3b', '#080e20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.strip, styles.reportsBorder]}
        >
          {/* Left Title Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MyReports')}
            style={[styles.leftPill, styles.reportsDivider]}
          >
            <Text style={styles.pillText}>Reports</Text>
            <Feather name="chevron-right" size={13} color="rgba(129, 140, 248, 0.85)" />
          </TouchableOpacity>

          {/* 3 Metric Columns */}
          <View style={styles.metricsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MyReports')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricVal, { color: '#fcd34d' }]}>
                {reportCounts.open}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(199, 210, 254, 0.7)' }]}>
                Open
              </Text>
            </TouchableOpacity>

            <View style={[styles.verticalDivider, styles.reportsDivider]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MyReports')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricVal, { color: '#7dd3fc' }]}>
                {reportCounts.inProgress}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(199, 210, 254, 0.7)' }]}>
                In Progress
              </Text>
            </TouchableOpacity>

            <View style={[styles.verticalDivider, styles.reportsDivider]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MyReports')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricVal, { color: '#6ee7b7' }]}>
                {reportCounts.resolved}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(199, 210, 254, 0.7)' }]}>
                Resolved
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* 2. Bus Schedule Strip (Dark Transit Amber Theme) */}
      <View style={styles.stripWrapper}>
        <LinearGradient
          colors={['#1c1305', '#261b07', '#160f04']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.strip, styles.busBorder]}
        >
          {/* Left Title Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Bus')}
            style={[styles.leftPill, styles.busDivider]}
          >
            <Text style={styles.pillText}>Bus</Text>
            <Feather name="chevron-right" size={13} color="rgba(251, 191, 36, 0.85)" />
          </TouchableOpacity>

          {/* 3 Metric Columns */}
          <View style={styles.metricsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Bus')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricValText, { color: '#ffffff' }]} numberOfLines={1}>
                {nextBus ? nextBus.route.name.split(' ')[0] : 'All'}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(252, 211, 77, 0.7)' }]}>
                Route
              </Text>
            </TouchableOpacity>

            <View style={[styles.verticalDivider, styles.busDivider]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Bus')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricValText, { color: '#ffffff' }]}>
                {nextBus ? formatTime12(minutesToHHMM(nextBus.mins)) : '--:--'}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(252, 211, 77, 0.7)' }]}>
                Departs
              </Text>
            </TouchableOpacity>

            <View style={[styles.verticalDivider, styles.busDivider]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Bus')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricValText, { color: '#fde68a' }]}>
                {nextBus
                  ? nextBus.tomorrow
                    ? 'Tomorrow'
                    : fmtCountdown(nextBus.wait)
                  : 'No bus'}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${busProgress}%`, backgroundColor: '#fbbf24' },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* 3. Prayer Time Strip (Midnight Islamic Emerald Theme) */}
      <View style={styles.stripWrapper}>
        <LinearGradient
          colors={['#031d16', '#05261d', '#021b13']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.strip, styles.prayerBorder]}
        >
          {/* Left Title Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Prayer')}
            style={[styles.leftPill, styles.prayerDivider]}
          >
            <Text style={styles.pillText}>Prayer</Text>
            <Feather name="chevron-right" size={13} color="rgba(52, 211, 153, 0.85)" />
          </TouchableOpacity>

          {/* 3 Metric Columns */}
          <View style={styles.metricsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Prayer')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricValText, { color: '#ffffff' }]} numberOfLines={1}>
                {nextPrayer ? nextPrayer.en : 'Prayer'}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(110, 231, 183, 0.7)' }]}>
                Salah
              </Text>
            </TouchableOpacity>

            <View style={[styles.verticalDivider, styles.prayerDivider]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Prayer')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricValText, { color: '#ffffff' }]}>
                {nextPrayer ? formatTime12(nextPrayer.azan) : '--:--'}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(110, 231, 183, 0.7)' }]}>
                Azan
              </Text>
            </TouchableOpacity>

            <View style={[styles.verticalDivider, styles.prayerDivider]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Prayer')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricValText, { color: '#a7f3d0' }]}>
                {prayerSt
                  ? prayerSt.tomorrow
                    ? 'Tomorrow'
                    : fmtCountdown(prayerSt.wait)
                  : 'Schedule'}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${prayerProgress}%`, backgroundColor: '#34d399' },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* 4. Blood Donation Strip (Midnight Crimson Theme) */}
      <View style={styles.stripWrapper}>
        <LinearGradient
          colors={['#200508', '#2d090e', '#190306']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.strip, styles.bloodBorder]}
        >
          {/* Left Title Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Blood')}
            style={[styles.leftPill, styles.bloodDivider]}
          >
            <Text style={styles.pillText}>Blood</Text>
            <Feather name="chevron-right" size={13} color="rgba(251, 113, 133, 0.85)" />
          </TouchableOpacity>

          {/* 3 Metric Columns */}
          <View style={styles.metricsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Blood')}
              style={styles.metricCol}
            >
              <Text
                style={[
                  styles.metricVal,
                  { color: bloodStats.urgent > 0 ? '#fb7185' : '#fda4af' },
                ]}
              >
                {bloodStats.urgent}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(254, 205, 211, 0.7)' }]}>
                Urgent
              </Text>
            </TouchableOpacity>

            <View style={[styles.verticalDivider, styles.bloodDivider]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Blood')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricVal, { color: '#ffffff' }]}>
                {bloodStats.total}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(254, 205, 211, 0.7)' }]}>
                Needed
              </Text>
            </TouchableOpacity>

            <View style={[styles.verticalDivider, styles.bloodDivider]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Blood')}
              style={styles.metricCol}
            >
              <Text style={[styles.metricVal, { color: '#fecdd3' }]}>
                {bloodStats.donors}
              </Text>
              <Text style={[styles.metricSub, { color: 'rgba(254, 205, 211, 0.7)' }]}>
                Donors
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 4,
    marginBottom: 14,
  },
  stripWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  reportsBorder: {
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  reportsDivider: {
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  busBorder: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  busDivider: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  prayerBorder: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  prayerDivider: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  bloodBorder: {
    borderColor: 'rgba(225, 29, 72, 0.4)',
  },
  bloodDivider: {
    borderColor: 'rgba(225, 29, 72, 0.28)',
  },
  leftPill: {
    width: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    borderRightWidth: 1,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: FontFamily.jakartaExtraBold,
    letterSpacing: -0.2,
  },
  metricsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    borderRightWidth: 1,
  },
  metricVal: {
    fontSize: 15,
    fontFamily: FontFamily.jakartaExtraBold,
    lineHeight: 18,
  },
  metricValText: {
    fontSize: 12.5,
    fontFamily: FontFamily.jakartaBold,
    lineHeight: 16,
  },
  metricSub: {
    fontSize: 10,
    fontFamily: FontFamily.jakartaMedium,
    marginTop: 2,
    lineHeight: 12,
  },
  progressTrack: {
    width: 44,
    height: 3.5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 2,
    marginTop: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
