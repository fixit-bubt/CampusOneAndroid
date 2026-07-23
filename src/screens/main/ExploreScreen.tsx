import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { FontFamily, Layout, SectorColors } from '../../theme';
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
  calendar:  'AcademicCalendar',
  routines:  'RoutinesBrowse',
  coverpage: 'CoverPageForm',
  pdfmaker:  'PdfMaker',
  messages:  'Messages',
};

// All sectors — id, label, description
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
  { id: 'calendar',  en: 'Academic Calendar',  dEn: 'University events & breaks' },
  { id: 'routines',  en: 'Class Routines',     dEn: 'Class & exam schedules' },
  { id: 'coverpage', en: 'Cover Page',         dEn: 'Generate assignment covers' },
];

// Sectors a staff (maintenance) account sees in Explore — mirrors the web staff
// nav. Everything else (Study Hub, Clubs, Jobs, Events, Faculty, Calendar,
// Routines, Cover Page, Reports-create) stays student/admin-only.
const STAFF_SECTORS: SectorKey[] = ['bus', 'prayer', 'announce', 'medical', 'market', 'ride', 'blood'];

export function ExploreScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { profile } = useAuth();
  const role = profile?.role;
  const isStudent = role === 'student';
  const isStaff = role === 'staff';
  // Staff are maintenance crew — their panel is trimmed to maintenance-relevant
  // sectors only (mirrors the web staff nav). Admin keeps everything but the
  // student-only Lost & Found; students get the full grid.
  const sectors = isStaff
    ? SECTORS.filter((s) => STAFF_SECTORS.includes(s.id))
    : isStudent
      ? SECTORS
      : SECTORS.filter((s) => s.id !== 'lostfound');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
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
        {/* Tool: CGPA calculator — academic tool, hidden from maintenance staff */}
        {!isStaff && (
          <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('Cgpa')}
            activeOpacity={0.75}
          >
            <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
              <Feather name="percent" size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cellTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.cgpa.title}
              </Text>
              <Text style={[styles.cellDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.cgpa.subtitle}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}

        {/* Campus Issues board — student-only anonymous issues + me-too votes */}
        {isStudent && (
          <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('CampusIssues')}
            activeOpacity={0.75}
          >
            <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
              <Feather name="alert-triangle" size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cellTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.campusIssues.exploreTitle}
              </Text>
              <Text style={[styles.cellDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.campusIssues.exploreDesc}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}

        {/* PDF Maker — student-only, everything runs on the phone */}
        {isStudent && (
          <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('PdfMaker')}
            activeOpacity={0.75}
          >
            <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
              <Feather name="file-plus" size={20} color={SectorColors.pdfmaker} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cellTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.title}
              </Text>
              <Text style={[styles.cellDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.exploreDesc}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}

        {/* 2-col grid */}
        {Array.from({ length: Math.ceil(sectors.length / 2) }, (_, i) => (
          <View key={i} style={styles.row}>
            {sectors.slice(i * 2, i * 2 + 2).map((s) => (
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
            {sectors.slice(i * 2, i * 2 + 2).length === 1 && <View style={styles.cell} />}
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

  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 11,
  } as ViewStyle,

  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
