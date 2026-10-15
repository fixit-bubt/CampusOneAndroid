import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { CollapsibleSection } from '../../components/ui/CollapsibleSection';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { FontFamily, Layout, SectorColors, pillBg } from '../../theme';
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

// All sectors - id, label, description
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

// Sectors a staff (maintenance) account sees in Explore - mirrors the web staff
// nav. Everything else (Study Hub, Clubs, Jobs, Events, Faculty, Calendar,
// Routines, Cover Page, Reports-create) stays student/admin-only.
const STAFF_SECTORS: SectorKey[] = ['bus', 'prayer', 'announce', 'medical', 'market', 'ride', 'blood'];

// Groups sectors into labeled, collapsible sections instead of one long flat
// list - mirrors the web app's sidebar grouping (Academics / Campus Life /
// Services / Community). A group that ends up with zero visible items for
// the current role (e.g. Academics for staff) simply isn't rendered.
const GROUP_ACADEMICS: SectorKey[] = ['study', 'routines', 'calendar', 'faculty', 'coverpage'];
const GROUP_CAMPUS_LIFE: SectorKey[] = ['clubs', 'events', 'announce', 'prayer', 'jobs'];
const GROUP_SERVICES: SectorKey[] = ['medical', 'bus', 'lostfound'];
const GROUP_COMMUNITY: SectorKey[] = ['market', 'ride', 'blood', 'directory'];

export function ExploreScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { profile } = useAuth();
  const role = profile?.role;
  const isStudent = role === 'student';
  const isStaff = role === 'staff';
  // Staff are maintenance crew - their panel is trimmed to maintenance-relevant
  // sectors only (mirrors the web staff nav). Admin keeps everything but the
  // student-only Lost & Found; students get the full grid. Student Directory
  // is ALSO student-only - the backend (student_directory() RPC) is
  // security-definer gated on the CALLER being role='student', so an
  // admin/staff account always gets zero rows back no matter what. Showing
  // the tile to them just leads to a permanently-empty screen with no
  // explanation, so it's excluded here too (matches the web app's own nav,
  // which never lists it for Admin/Staff either).
  const sectors = isStaff
    ? SECTORS.filter((s) => STAFF_SECTORS.includes(s.id))
    : isStudent
      ? SECTORS
      : SECTORS.filter((s) => s.id !== 'lostfound' && s.id !== 'directory');

  // Pulls the role-filtered sectors in a group's own order (not SECTORS'
  // declaration order) - the group arrays already read in the order each
  // section should display in.
  const pick = (ids: SectorKey[]) => ids.map((id) => sectors.find((s) => s.id === id)).filter((s): s is typeof sectors[number] => !!s);

  function renderSectorRow(s: { id: SectorKey; en: string; dEn: string }, accentColor: string) {
    return (
      <TouchableOpacity
        key={s.id}
        style={[
          styles.childBar,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
            borderLeftColor: accentColor,
          },
        ]}
        onPress={() => navigation.navigate(SECTOR_ROUTE[s.id])}
        activeOpacity={0.7}
      >
        <SectorIcon sector={s.id} size="md" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {s.en}
          </Text>
          <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
            {s.dEn}
          </Text>
        </View>
        <Feather name="chevron-right" size={17} color={accentColor} />
      </TouchableOpacity>
    );
  }

  const academicsSectors = pick(GROUP_ACADEMICS);
  const campusLifeSectors = pick(GROUP_CAMPUS_LIFE);
  const servicesSectors = pick(GROUP_SERVICES);
  const communitySectors = pick(GROUP_COMMUNITY);
  const showAcademics = !isStaff;
  const academicsCount = academicsSectors.length + 2 + (isStudent ? 1 : 0);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (id: string) => setOpenSection((prev) => (prev === id ? null : id));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: C.bg }]}>
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
        {/* Featured Tools Header */}
        {isStudent && (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
              {t.exploreGroups.quickAccess}
            </Text>
          </View>
        )}

        {/* AI Chatbot - student-only (also enforced server-side in the edge function) */}
        {isStudent && (
          <TouchableOpacity
            style={[styles.featuredCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('Chatbot')}
            activeOpacity={0.75}
          >
            <View style={[styles.toolIcon, { backgroundColor: pillBg(C.brand, isDark) }]}>
              <AnimatedIcon family="feather" name="message-circle" size={20} color={C.brand} animation="entrance" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cellTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                AI Assistant
              </Text>
              <Text style={[styles.cellDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                Ask questions, get help with campus life
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.textMuted} />
          </TouchableOpacity>
        )}

        {/* Campus Issues board - student-only anonymous issues + me-too votes */}
        {isStudent && (
          <TouchableOpacity
            style={[styles.featuredCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('CampusIssues')}
            activeOpacity={0.75}
          >
            <View style={[styles.toolIcon, { backgroundColor: pillBg(C.danger, isDark) }]}>
              <AnimatedIcon family="feather" name="alert-triangle" size={20} color={C.danger} animation="wobble" loop={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cellTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.campusIssues.exploreTitle}
              </Text>
              <Text style={[styles.cellDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.campusIssues.exploreDesc}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.textMuted} />
          </TouchableOpacity>
        )}

        {/* Campus Directory Header */}
        <View style={[styles.sectionHeader, { marginTop: isStudent ? 8 : 0 }]}>
          <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
            {t.exploreGroups.directory}
          </Text>
        </View>

        {showAcademics && (
          <CollapsibleSection
            title={t.exploreGroups.academics}
            subtitle={t.exploreGroups.academicsDesc}
            icon="study"
            accentColor={SectorColors.study}
            count={academicsCount}
            countLabel={t.exploreGroups.toolsLabel}
            open={openSection === 'academics'}
            onToggle={() => toggleSection('academics')}
          >
            {academicsSectors.map((s) => renderSectorRow(s, SectorColors.study))}

            {/* Annex Portal - separate child bar */}
            <TouchableOpacity
              style={[
                styles.childBar,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderLeftColor: SectorColors.study,
                },
              ]}
              onPress={() => navigation.navigate('Annex')}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: pillBg(SectorColors.announce, isDark) }]}>
                <AnimatedIcon family="feather" name="external-link" size={20} color={SectorColors.announce} animation="entrance" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.tabs.annex}
                </Text>
                <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.tabs.annexDesc}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={SectorColors.study} />
            </TouchableOpacity>

            {/* Tool: CGPA calculator - separate child bar */}
            <TouchableOpacity
              style={[
                styles.childBar,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderLeftColor: SectorColors.study,
                },
              ]}
              onPress={() => navigation.navigate('Cgpa')}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: pillBg(SectorColors.study, isDark) }]}>
                <AnimatedIcon family="feather" name="percent" size={20} color={SectorColors.study} animation="entrance" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.cgpa.title}
                </Text>
                <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.cgpa.subtitle}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={SectorColors.study} />
            </TouchableOpacity>

            {/* PDF Maker - student-only separate child bar */}
            {isStudent && (
              <TouchableOpacity
                style={[
                  styles.childBar,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    borderLeftColor: SectorColors.study,
                  },
                ]}
                onPress={() => navigation.navigate('PdfMaker')}
                activeOpacity={0.7}
              >
                <View style={[styles.toolIcon, { backgroundColor: pillBg(SectorColors.pdfmaker, isDark) }]}>
                  <AnimatedIcon family="mci" name="file-pdf-box" size={22} color={SectorColors.pdfmaker} animation="entrance" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.pdfmaker.title}
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                    {t.pdfmaker.exploreDesc}
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={SectorColors.study} />
              </TouchableOpacity>
            )}
          </CollapsibleSection>
        )}

        {campusLifeSectors.length > 0 && (
          <CollapsibleSection
            title={t.exploreGroups.campusLife}
            subtitle={t.exploreGroups.campusLifeDesc}
            icon="events"
            accentColor={SectorColors.events}
            count={campusLifeSectors.length}
            countLabel={t.exploreGroups.toolsLabel}
            open={openSection === 'campusLife'}
            onToggle={() => toggleSection('campusLife')}
          >
            {campusLifeSectors.map((s) => renderSectorRow(s, SectorColors.events))}
          </CollapsibleSection>
        )}

        {servicesSectors.length > 0 && (
          <CollapsibleSection
            title={t.exploreGroups.services}
            subtitle={t.exploreGroups.servicesDesc}
            icon="wrench"
            accentColor={SectorColors.reports}
            count={servicesSectors.length}
            countLabel={t.exploreGroups.toolsLabel}
            open={openSection === 'services'}
            onToggle={() => toggleSection('services')}
          >
            {servicesSectors.map((s) => renderSectorRow(s, SectorColors.reports))}
          </CollapsibleSection>
        )}

        {communitySectors.length > 0 && (
          <CollapsibleSection
            title={t.exploreGroups.community}
            subtitle={t.exploreGroups.communityDesc}
            icon="market"
            accentColor={SectorColors.market}
            count={communitySectors.length}
            countLabel={t.exploreGroups.toolsLabel}
            open={openSection === 'community'}
            onToggle={() => toggleSection('community')}
          >
            {communitySectors.map((s) => renderSectorRow(s, SectorColors.market))}
          </CollapsibleSection>
        )}

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

  sectionHeader: {
    paddingVertical: 7,
    paddingHorizontal: 2,
    marginBottom: 4,
  } as ViewStyle,

  sectionEyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as any,

  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,

  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  childBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    marginBottom: 8,
  } as ViewStyle,

  childTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  } as any,

  childDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  } as any,

  cellTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  } as any,

  cellDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  } as any,
});
