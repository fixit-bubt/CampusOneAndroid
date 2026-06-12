// Matches design screens-feature.jsx — Generic sector landing
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , Accent } from '../../theme';

const SECTOR_INFO: Record<string, {
  label: string;
  description: string;
  caps: string[];
  cta: string;
  route: string;
}> = {
  reports:   {
    label: 'Reports',
    description: 'Report campus maintenance issues like broken lights, leaks, or damaged furniture to get them fixed faster.',
    caps: ['Submit issue reports with photos', 'Track status updates', 'Browse all campus issues', 'Get notified when resolved'],
    cta: 'Submit a Report',
    route: 'ReportForm',
  },
  lostfound: {
    label: 'Lost & Found',
    description: 'Post lost items or browse found items. Help each other recover belongings on campus.',
    caps: ['Post lost items', 'Browse found items', 'Claim items', 'Connect with finders'],
    cta: 'Browse Items',
    route: 'LostFoundBrowse',
  },
  clubs: {
    label: 'Clubs',
    description: 'Discover student clubs, join activities, and stay updated on club events.',
    caps: ['Browse all clubs', 'View club feed and events', 'Connect with members', 'Manage your club'],
    cta: 'Explore Clubs',
    route: 'Clubs',
  },
  events: {
    label: 'Events',
    description: 'Stay informed about upcoming campus events, seminars, workshops, and cultural programmes.',
    caps: ['Browse upcoming events', 'RSVP to events', 'Get event reminders', 'View past events'],
    cta: 'View Events',
    route: 'EventsBrowse',
  },
  jobs: {
    label: 'Jobs',
    description: 'Discover part-time jobs, internships, and campus job opportunities posted by students and staff.',
    caps: ['Browse job listings', 'Save interesting jobs', 'Post job opportunities', 'Apply directly'],
    cta: 'Browse Jobs',
    route: 'JobsBrowse',
  },
  announce: {
    label: 'Announcements',
    description: 'Official university announcements, exam schedules, holiday notices, and important updates.',
    caps: ['View all announcements', 'Filter by department', 'Get urgent alerts first', 'Read attached documents'],
    cta: 'View Announcements',
    route: 'Announcements',
  },
  study: {
    label: 'Study Hub',
    description: 'Access course materials, question papers, and books shared by students and faculty.',
    caps: ['Browse course materials', 'Download question papers', 'Find reference books', 'Upload study resources'],
    cta: 'Open Study Hub',
    route: 'StudyHub',
  },
  bus: {
    label: 'Bus Schedule',
    description: 'Check campus bus routes, timetables, and real-time departure information.',
    caps: ['View all bus routes', 'Check next departure', 'See full timetable', 'Get arrival estimates'],
    cta: 'View Routes',
    route: 'Bus',
  },
  medical: {
    label: 'Medical',
    description: 'Find campus medical services, doctor availability, and health-related resources.',
    caps: ['Check doctor availability', 'View duty schedules', 'Find medical center location', 'Get health notices'],
    cta: 'View Doctors',
    route: 'Medical',
  },
  market: {
    label: 'Marketplace',
    description: 'Buy and sell items within the campus community — books, electronics, and more.',
    caps: ['Browse listings', 'Post items for sale', 'Contact sellers', 'Mark items as sold'],
    cta: 'Browse Marketplace',
    route: 'Market',
  },
  ride: {
    label: 'Ride Share',
    description: 'Share rides to and from campus with fellow students to save money and reduce traffic.',
    caps: ['Find available rides', 'Request a seat', 'Offer rides to others', 'Share transport costs'],
    cta: 'Find Rides',
    route: 'Rides',
  },
  blood: {
    label: 'Blood Donation',
    description: 'Connect blood donors with students in need. Register as a donor or post a blood request.',
    caps: ['View blood requests', 'Pledge to donate', 'Register as a donor', 'Filter by blood type'],
    cta: 'View Requests',
    route: 'Blood',
  },
  directory: {
    label: 'Directory',
    description: 'Find and connect with other students, view their departments and contact information.',
    caps: ['Search all students', 'Send connection requests', 'View contact info of connections', 'Accept incoming requests'],
    cta: 'Browse Directory',
    route: 'Directory',
  },
  prayer: {
    label: 'Prayer Times',
    description: 'Daily Islamic prayer times including Azan and Jamaat times for the campus mosque.',
    caps: ['View all prayer times', 'See next upcoming prayer', 'Azan & Jamaat times', 'Get prayer reminders'],
    cta: 'View Times',
    route: 'Prayer',
  },
  faculty: {
    label: 'Faculty',
    description: 'Browse faculty profiles, find supervisors, and view academic links and office information.',
    caps: ['Browse all faculty', 'Save favourite supervisors', 'View academic profiles', 'Access research links'],
    cta: 'Browse Faculty',
    route: 'Faculty',
  },
};

export function FeatureScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { sector } = route.params;
  const info = SECTOR_INFO[sector];

  if (!info) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={info.label} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: C.surface2 }]}>
          <View style={styles.heroTop}>
            <SectorIcon sector={sector} size="lg" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {info.label}
              </Text>
              <View style={[styles.livePill, { backgroundColor: Accent.tealBg }]}>
                <View style={[styles.liveDot, { backgroundColor: Accent.teal }]} />
                <Text style={[styles.liveTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>Live</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.heroDesc, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {info.description}
          </Text>
        </View>

        {/* Capabilities */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          WHAT CAN YOU DO
        </Text>
        <View style={[styles.capsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {info.caps.map((cap, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
              <View style={styles.capRow}>
                <View style={[styles.capCheck, { backgroundColor: C.surface2 }]}>
                  <Icon name="check" size={17} color={C.brand} />
                </View>
                <Text style={[styles.capText, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                  {cap}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: C.brand }]}
          onPress={() => navigation.navigate(info.route)}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{info.cta}</Text>
          <Icon name="chevR" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  heroCard: { padding: 18, borderRadius: 18 } as ViewStyle,
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 } as ViewStyle,
  heroTitle: { fontSize: 19, letterSpacing: -0.4 } as any,
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, marginTop: 6, alignSelf: 'flex-start' } as ViewStyle,
  liveDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  liveTxt: { fontSize: 12 } as any,
  heroDesc: { fontSize: 14, lineHeight: 21, marginTop: 14 } as any,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 20, marginBottom: 10 } as any,

  capsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, paddingHorizontal: 16 } as ViewStyle,
  capCheck: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  capText: { flex: 1, fontSize: 14, lineHeight: 20 } as any,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginTop: 18 } as ViewStyle,
  ctaTxt: { fontSize: 15 } as any,
});
