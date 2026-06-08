// Matches design screens-home.jsx — Explore tab
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { FontFamily, Layout } from '../../theme';
import type { SectorKey } from '../../theme';

// Maps sector id → app navigator route name
const SECTOR_ROUTE: Record<SectorKey, string> = {
  reports:   'ReportForm',
  lostfound: 'LostFoundBrowse',
  clubs:     'Clubs',
  events:    'EventsBrowse',
  jobs:      'JobsBrowse',
  announce:  'Announcements',
  study:     'StudyHub',
  bus:       'Bus',
  medical:   'Medical',
  market:    'Market',
  ride:      'Rides',
  blood:     'Blood',
  directory: 'Directory',
  prayer:    'Prayer',
  faculty:   'Faculty',
};

// All 15 sectors from design data.jsx — id, label, description
const SECTORS: { id: SectorKey; en: string; dEn: string }[] = [
  { id: 'reports',   en: 'Issue Reports',     dEn: 'Status updates on issues you reported' },
  { id: 'lostfound', en: 'Lost & Found',       dEn: 'Claims and matches on your posts' },
  { id: 'clubs',     en: 'Clubs',              dEn: 'Posts, membership and roles' },
  { id: 'events',    en: 'Events',             dEn: 'RSVPs and reminders' },
  { id: 'jobs',      en: 'Jobs & Internships', dEn: 'New matches and application updates' },
  { id: 'announce',  en: 'Announcements',      dEn: 'Official university announcements' },
  { id: 'study',     en: 'Study Hub',          dEn: 'New notes and question banks' },
  { id: 'bus',       en: 'Bus Schedule',       dEn: 'Route and timing changes' },
  { id: 'medical',   en: 'Medical Center',     dEn: 'Doctor availability & hours' },
  { id: 'market',    en: 'Marketplace',        dEn: 'Watchlist and listing activity' },
  { id: 'ride',      en: 'Ride Share',         dEn: 'Ride offers and seat requests' },
  { id: 'blood',     en: 'Blood Donation',     dEn: 'Urgent requests for your blood group' },
  { id: 'directory', en: 'Student Directory',  dEn: 'Connection requests' },
  { id: 'prayer',    en: 'Prayer Times',       dEn: 'Azan & jamaat times' },
  { id: 'faculty',   en: 'Faculty',            dEn: 'Find teachers & supervisors' },
];

export function ExploreScreen({ navigation }: any) {
  const { C, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Tab header matching design's TabHeader */}
      <View style={[styles.tabHeader, { paddingHorizontal: Layout.screenPadding }]}>
        <Text style={[styles.tabSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          CampusOne
        </Text>
        <Text style={[styles.tabTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          Explore
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pair rows — 2-col grid with proper gap */}
        {Array.from({ length: Math.ceil(SECTORS.length / 2) }, (_, i) => (
          <View key={i} style={styles.row}>
            {SECTORS.slice(i * 2, i * 2 + 2).map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.cell, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => navigation.navigate(SECTOR_ROUTE[s.id])}
                activeOpacity={0.75}
              >
                <SectorIcon sector={s.id} size="md" dark={isDark} />
                <View style={styles.cellText}>
                  <Text style={[styles.cellTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {s.en}
                  </Text>
                  <Text style={[styles.cellDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                    {s.dEn}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {/* pad last row if odd number of items */}
            {SECTORS.slice(i * 2, i * 2 + 2).length === 1 && <View style={styles.cell} />}
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  tabHeader: {
    paddingTop: 8,
    paddingBottom: 12,
  } as ViewStyle,

  tabSub: {
    fontSize: 11,
    letterSpacing: 0.3,
  } as any,

  tabTitle: {
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 2,
  } as any,

  content: {
    paddingBottom: 20,
  } as ViewStyle,

  row: {
    flexDirection: 'row',
    gap: 11,
    marginBottom: 11,
  } as ViewStyle,

  cell: {
    flex: 1,
    minHeight: 116,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
  } as ViewStyle,

  cellText: {
    marginTop: 12,
  } as ViewStyle,

  cellTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  } as any,

  cellDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  } as any,
});
