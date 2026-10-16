import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking,
  ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useApp } from '../../store/appStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors, darken } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, CacheKeys } from '../../services/cacheService';
import {
  nowDhakaMinutes,
  minutesToHHMM,
  toMinutes,
  formatTime12,
  fmtCountdown,
  nextDeparture,
} from '../../utils/transitPrayer';
import type { BusRoute } from '../../types/database';

function cleanWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('01')) return `88${digits}`;
  return digits;
}

export function BusDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { lang } = useApp();
  const isBn = lang === 'bn';
  const { id, initialDirection } = route.params ?? {};

  const [busRoute, setBusRoute] = useState<BusRoute | null>(null);
  const [failed, setFailed] = useState(false);
  const [direction, setDirection] = useState<'to' | 'from'>(() => {
    if (initialDirection === 'to' || initialDirection === 'from') return initialDirection;
    return Math.floor(nowDhakaMinutes() / 60) >= 12 ? 'from' : 'to';
  });
  const [selectedDepIndex, setSelectedDepIndex] = useState(0);

  const directionTabs: TabItem<'to' | 'from'>[] = useMemo(
    () => [
      { id: 'to', label: isBn ? 'ক্যাম্পাসে আসা' : 'To Campus', icon: 'arrow-right', accentColor: SectorColors.bus },
      { id: 'from', label: isBn ? 'ক্যাম্পাস থেকে ফেরা' : 'From Campus', icon: 'arrow-left', accentColor: SectorColors.bus },
    ],
    [isBn]
  );

  useEffect(() => {
    if (!id) { setFailed(true); return; }
    (async () => {
      const cached = await getCache<BusRoute[]>(CacheKeys.BUS_ROUTES);
      const found = cached?.find(r => r.id === id);
      if (found) setBusRoute(found);

      const { data, error } = await supabase.from('bus_routes').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        if (!found) setFailed(true);
        return;
      }
      setBusRoute(data as BusRoute);
    })();
  }, [id]);

  const departures = useMemo(() => {
    if (!busRoute) return [];
    return direction === 'to'
      ? (busRoute.to_departures ?? [])
      : (busRoute.from_departures ?? []);
  }, [busRoute, direction]);

  useEffect(() => {
    setSelectedDepIndex(0);
  }, [direction]);

  if (!busRoute) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.bus2?.scheduleTitle ?? 'Bus Schedule'} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {failed ? (
            <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>{t.common.notFound}</Text>
          ) : (
            <ActivityIndicator color={C.brand} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const nextDep = nextDeparture(departures);
  const stops = direction === 'to' ? (busRoute.stops ?? []) : [...(busRoute.stops ?? [])].reverse();
  const legs = direction === 'to' ? (busRoute.leg_mins ?? []) : [...(busRoute.leg_mins ?? [])].reverse();

  const selectedTimeStr = departures[selectedDepIndex] ?? departures[0] ?? '07:00';
  const startMins = toMinutes(selectedTimeStr);

  let cumulative = 0;
  const rows = stops.map((s, i) => {
    if (i > 0) cumulative += (legs[i - 1] ?? 10);
    const stopMins = (startMins + cumulative) % (24 * 60);
    return {
      stop: s,
      minsOffset: cumulative,
      clockTime: formatTime12(minutesToHHMM(stopMins)),
      isFirst: i === 0,
      isLast: i === stops.length - 1,
    };
  });

  const cleanPhone = cleanWhatsAppPhone(busRoute.helper_phone);
  const cleanFridayNote = (busRoute.friday_note || (isBn ? 'শুক্রবার ও সরকারি ছুটির দিনে নিয়মিত বাস সার্ভিস বন্ধ থাকে।' : 'No regular service on Friday & government holidays.')).replace(/–/g, '-');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={busRoute.name}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Direction Switcher (58dp SegmentedTabs) */}
        <View style={{ marginBottom: 12 }}>
          <SegmentedTabs<'to' | 'from'>
            tabs={directionTabs}
            activeTab={direction}
            onTabChange={setDirection}
          />
        </View>

        {/* Next Departure Hero Banner */}
        <LinearGradient
          colors={[SectorColors.bus, darken(SectorColors.bus)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nextCard}
        >
          <View style={styles.nextIcon}>
            <AnimatedIcon key={direction} family="feather" name="clock" size={24} color="#fff" animation="spring" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.heroRow}>
              <Text style={[styles.nextLabel, { fontFamily: FontFamily.jakartaMedium }]}>
                {direction === 'to'
                  ? (isBn ? 'ক্যাম্পাসে যাওয়ার পরবর্তী বাস' : 'Next Departure to Campus')
                  : (isBn ? 'ক্যাম্পাস থেকে ফেরার পরবর্তী বাস' : 'Next Departure from Campus')}
              </Text>
              {nextDep && (
                <View style={styles.heroCountdownBadge}>
                  <Text style={[styles.heroCountdownTxt, { fontFamily: FontFamily.jakartaBold }]}>
                    {nextDep.nextDayLabel === 'Sat'
                      ? (isBn ? 'শনিবার' : 'Saturday')
                      : nextDep.tomorrow
                      ? (isBn ? 'আগামীকাল' : 'Tomorrow')
                      : `in ${fmtCountdown(nextDep.wait)}`}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.nextTime, { fontFamily: FontFamily.jakartaExtraBold }]}>
              {nextDep ? formatTime12(minutesToHHMM(nextDep.mins)) : (isBn ? 'কোনো ট্রিপ নেই' : 'No departures')}
            </Text>
          </View>
        </LinearGradient>

        {/* Departure Trips Selector */}
        {departures.length > 0 && (
          <View style={styles.tripsSection}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {isBn ? 'ট্রিপের সময়সূচি নির্বাচন করুন' : 'SELECT TRIP TIMETABLE'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripsRow}>
              {departures.map((dep, idx) => {
                const isSelected = selectedDepIndex === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.tripChip,
                      {
                        backgroundColor: isSelected ? SectorColors.bus : C.surface,
                        borderColor: isSelected ? SectorColors.bus : C.border,
                      },
                    ]}
                    onPress={() => setSelectedDepIndex(idx)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.tripChipLabel,
                        {
                          color: isSelected ? '#fff' : C.textMuted,
                          fontFamily: FontFamily.jakartaSemiBold,
                        },
                      ]}
                    >
                      {isBn ? `ট্রিপ ${idx + 1}` : `Trip ${idx + 1}`}
                    </Text>
                    <Text
                      style={[
                        styles.tripChipTime,
                        {
                          color: isSelected ? '#fff' : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {formatTime12(dep)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Timetable Section */}
        <View style={styles.timetableHeader}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
            {isBn ? 'স্টপেজ ও পৌঁছানোর সময়' : 'ROUTE STOPS & ARRIVAL TIMES'}
          </Text>
          <Text style={[styles.timetableTripHint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {isBn ? `${formatTime12(selectedTimeStr)} ছাড়ার সময় অনুযায়ী` : `Based on ${formatTime12(selectedTimeStr)} departure`}
          </Text>
        </View>

        <View style={[styles.timetable, { backgroundColor: C.surface, borderColor: C.border }]}>
          {rows.map((row, i) => (
            <View key={i} style={styles.stopRow}>
              {/* Track visual */}
              <View style={styles.trackCol}>
                <View
                  style={[
                    styles.trackDot,
                    (row.isFirst || row.isLast)
                      ? { backgroundColor: SectorColors.bus, borderColor: SectorColors.bus }
                      : { backgroundColor: C.surface, borderColor: SectorColors.bus },
                  ]}
                />
                {!row.isLast && <View style={[styles.trackLine, { backgroundColor: C.border }]} />}
              </View>

              {/* Stop info */}
              <View style={styles.stopInfo}>
                <Text
                  style={[
                    styles.stopName,
                    {
                      color: C.text,
                      fontFamily: (row.isFirst || row.isLast) ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {row.stop}
                </Text>
                <Text style={[styles.stopOffset, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {row.isFirst
                    ? (isBn ? 'শুরুর স্থান' : 'Starting point')
                    : (isBn ? `শুরু থেকে +${row.minsOffset} মিনিট` : `+${row.minsOffset} min from start`)}
                </Text>
              </View>

              {/* Clock Arrival Time */}
              <View style={[styles.timeBox, { backgroundColor: C.surface2 }]}>
                <Text style={[styles.timeBoxTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {row.clockTime}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Route In-Charge & Helper Card */}
        {(busRoute.helper_name || busRoute.helper_phone) && (
          <View style={[styles.helperCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.helperHeader}>
              <View style={[styles.helperAvatar, { backgroundColor: `${SectorColors.bus}1e` }]}>
                <Feather name="user-check" size={20} color={SectorColors.bus} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.helperRole, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {isBn ? 'রুট ইনচার্জ / হেল্পার' : 'Route In-Charge / Helper'}
                </Text>
                <Text style={[styles.helperName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {busRoute.helper_name || (isBn ? 'নির্ধারিত ড্রাইভার' : 'Designated Driver')}
                </Text>
                <Text style={[styles.helperSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {busRoute.bus_no ? `Bus: ${busRoute.bus_no} · ` : ''}{busRoute.helper_phone || 'Contact via helpline'}
                </Text>
              </View>
            </View>

            {busRoute.helper_phone && (
              <View style={styles.helperActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => Linking.openURL(`tel:${busRoute.helper_phone}`)}
                  activeOpacity={0.75}
                >
                  <Feather name="phone" size={16} color={C.text} />
                  <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {isBn ? 'হেল্পারকে কল করুন' : 'Call Helper'}
                  </Text>
                </TouchableOpacity>

                {cleanPhone ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#25D366', borderColor: '#25D366' }]}
                    onPress={() => Linking.openURL(`https://wa.me/${cleanPhone}`)}
                    activeOpacity={0.75}
                  >
                    <Feather name="message-circle" size={16} color="#fff" />
                    <Text style={[styles.actionBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      WhatsApp
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* Campus Transport Policies & Rules */}
        <View style={[styles.policyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.policyHeader, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {isBn ? 'ক্যাম্পাস শাটল বাসের নিয়মাবলি' : 'Campus Shuttle Guidelines'}
          </Text>

          <View style={styles.policyRow}>
            <Feather name="shield" size={15} color={SectorColors.bus} />
            <Text style={[styles.policyTxt, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
              {isBn
                ? 'বিইউবিটি-এর সকল শিক্ষার্থী, শিক্ষক ও কর্মকর্তাদের জন্য ১০০% ফ্রি সেবা।'
                : '100% free service for BUBT students, faculty, and campus staff.'}
            </Text>
          </View>

          <View style={styles.policyRow}>
            <Feather name="credit-card" size={15} color={C.warn} />
            <Text style={[styles.policyTxt, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
              {isBn
                ? 'বাসে ওঠার সময় অবশ্যই বিইউবিটি স্টুডেন্ট আইডি কার্ড প্রদর্শন করতে হবে।'
                : 'Must show your physical BUBT Student ID card when boarding.'}
            </Text>
          </View>

          <View style={styles.policyRow}>
            <Feather name="calendar" size={15} color={C.brand} />
            <Text style={[styles.policyTxt, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
              {isBn
                ? `শনিবার থেকে বৃহস্পতিবার চলাচল করে। ${cleanFridayNote}`
                : `Operates Saturday to Thursday. ${cleanFridayNote}`}
            </Text>
          </View>
        </View>

        {/* Cross-Feature Synergies (72dp Standard) */}
        <View style={styles.synergyRow}>
          <TouchableOpacity
            style={[styles.synergyCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('Rides')}
            activeOpacity={0.75}
          >
            <View style={[styles.synergyIcon, { backgroundColor: `${SectorColors.ride}1e` }]}>
              <Icon name="ride" size={20} color={SectorColors.ride} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.synergyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {isBn ? 'বাস মিস করেছেন?' : 'Missed the Bus?'}
              </Text>
              <Text style={[styles.synergySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {isBn ? 'সহপাঠীদের ক্যাম্পাস রাইড শেয়ার দেখুন' : 'Check student campus rides'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.synergyCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('LostFoundBrowse')}
            activeOpacity={0.75}
          >
            <View style={[styles.synergyIcon, { backgroundColor: `${SectorColors.lostfound}1e` }]}>
              <Icon name="lostfound" size={20} color={SectorColors.lostfound} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.synergyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {isBn ? 'বাসে কিছু হারিয়েছেন?' : 'Lost Item on Bus?'}
              </Text>
              <Text style={[styles.synergySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {isBn ? 'লস্ট অ্যান্ড ফাউন্ডে পোস্ট করুন' : 'Report in Lost & Found'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 6, paddingBottom: 24 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  } as ViewStyle,
  nextIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  } as ViewStyle,
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  } as ViewStyle,
  nextLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  } as any,
  heroCountdownBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  } as ViewStyle,
  heroCountdownTxt: {
    fontSize: 11,
    color: '#fff',
  } as any,
  nextTime: {
    fontSize: 20,
    color: '#fff',
  } as any,

  tripsSection: {
    marginBottom: 16,
  } as ViewStyle,
  tripsRow: {
    gap: 8,
    paddingVertical: 4,
  } as ViewStyle,
  tripChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 92,
  } as ViewStyle,
  tripChipLabel: {
    fontSize: 11,
    marginBottom: 2,
  } as any,
  tripChipTime: {
    fontSize: 13.5,
  } as any,

  timetableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  } as ViewStyle,
  timetableTripHint: {
    fontSize: 11.5,
  } as any,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as any,

  timetable: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    marginBottom: 16,
  } as ViewStyle,
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  } as ViewStyle,
  trackCol: {
    width: 26,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  } as ViewStyle,
  trackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    zIndex: 2,
  } as ViewStyle,
  trackLine: {
    position: 'absolute',
    top: '50%',
    bottom: -24,
    width: 2,
    zIndex: 1,
  } as ViewStyle,
  stopInfo: {
    flex: 1,
    paddingLeft: 8,
  } as ViewStyle,
  stopName: {
    fontSize: 14,
  } as any,
  stopOffset: {
    fontSize: 11.5,
    marginTop: 2,
  } as any,
  timeBox: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  timeBoxTxt: {
    fontSize: 12.5,
  } as any,

  helperCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  } as ViewStyle,
  helperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  helperAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  helperRole: {
    fontSize: 11.5,
  } as any,
  helperName: {
    fontSize: 14.5,
    marginTop: 1,
  } as any,
  helperSub: {
    fontSize: 12,
    marginTop: 2,
  } as any,
  helperActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  } as ViewStyle,
  actionBtn: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  actionBtnTxt: {
    fontSize: 14.5,
  } as any,

  policyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  } as ViewStyle,
  policyHeader: {
    fontSize: 13.5,
    marginBottom: 2,
  } as any,
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  } as ViewStyle,
  policyTxt: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  } as any,

  synergyRow: {
    gap: 10,
  } as ViewStyle,
  synergyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  } as ViewStyle,
  synergyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  synergyTitle: {
    fontSize: 14,
  } as any,
  synergySub: {
    fontSize: 11.5,
    marginTop: 2,
  } as any,
});
