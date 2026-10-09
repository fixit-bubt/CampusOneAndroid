import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { TopBar } from '../../components/layout/TopBar';
import { CampusToday } from '../../components/CampusToday';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { type SectorKey } from '../../theme';
import { getMyReports } from '../../services/reportsService';
import { getMyNotifications } from '../../services/notificationsService';
import type { Report } from '../../types/database';

// quick-action sectors (labels live in src/i18n)
const QUICK: SectorKey[] = ['reports', 'bus', 'study', 'medical'];
const QUICK_ROUTE: Record<SectorKey, string> = {
  reports: 'ReportForm', lostfound: 'LostFoundBrowse', clubs: 'Clubs',
  events: 'EventsBrowse', jobs: 'JobsBrowse', announce: 'Announcements',
  study: 'StudyHub', bus: 'Bus', medical: 'Medical', market: 'Market',
  ride: 'Rides', blood: 'Blood', directory: 'Directory', prayer: 'Prayer', faculty: 'Faculty',
  calendar: 'AcademicCalendar', routines: 'RoutinesBrowse', coverpage: 'CoverPageForm',
  pdfmaker: 'PdfMaker',
  messages: 'Messages',
};

// status colors
const STATUS_TONE: Record<string, string> = {
  Open: Accent.amber, 'In Progress': Accent.blue, Resolved: Accent.green,
  Rejected: Accent.red, Closed: Accent.slate,
};

function ReportRow({ r, C, onPress }: { r: Report; C: any; onPress: () => void }) {
  const t = useT();
  const color = STATUS_TONE[r.status] ?? Accent.slate;
  return (
    <TouchableOpacity onPress={onPress} style={styles.reportRow} activeOpacity={0.75}>
      <SectorIcon sector="reports" size="sm" />
      <View style={styles.reportBody}>
        <Text style={[styles.reportTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {(r.description ?? '').split('\n')[0]}
        </Text>
        <View style={styles.reportMeta}>
          <Icon name="pin" size={11} color={C.textMuted} />
          <Text style={[styles.reportLoc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
            {r.building}{r.room ? ` · ${r.room}` : ''}
          </Text>
        </View>
      </View>
      <View style={[styles.statusPill, { backgroundColor: color + '22' }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color, fontFamily: FontFamily.jakartaBold }]}>
          {t.status[r.status] ?? r.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyCard({ icon, text, C }: { icon: string; text: string; C: any }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Icon name={icon} size={26} color={C.textMuted} />
      <Text style={[styles.emptyText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
        {text}
      </Text>
    </View>
  );
}

export function HomeScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile, user } = useAuth();
  const t = useT();

  const [reports, setReports]     = useState<Report[]>([]);
  const [unread, setUnread]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user || (profile && profile.role !== 'student')) return;
    const [rRes, nRes] = await Promise.all([
      getMyReports(user.id),
      getMyNotifications(20),
    ]);
    if (rRes.ok) setReports(rRes.data.slice(0, 2));
    if (nRes.ok) {
      setUnread(nRes.data.filter(n => !n.read).length);
    }
  }, [user, profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (profile && profile.role !== 'student') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.brand} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <TopBar
        profile={profile}
        unread={unread}
        onBell={() => navigation.navigate('Notifications')}
        onAvatar={() => navigation.navigate('Profile')}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
        }
      >
        {/* Quick actions */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 14 }]}>
          {t.home.quickActions}
        </Text>
        <View style={styles.quickGrid}>
          {QUICK.map((id) => (
            <TouchableOpacity
              key={id}
              style={[styles.quickCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => navigation.navigate(QUICK_ROUTE[id])}
              activeOpacity={0.75}
            >
              <SectorIcon sector={id} size="md" />
              <Text style={[styles.quickLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {t.sectors[id]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Reports */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 0 }]}>
            {t.home.myReports}
          </Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => navigation.navigate('MyReports')}
              activeOpacity={0.8}
            >
              <Text style={[styles.newBtnText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                {t.common.seeAll}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => navigation.navigate('ReportForm')}
              activeOpacity={0.8}
            >
              <Icon name="plus" size={15} color={C.brand} />
              <Text style={[styles.newBtnText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                {t.home.newReport}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {reports.length === 0 ? (
          <EmptyCard icon="inbox" text={t.home.noReports} C={C} />
        ) : (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            {reports.map((r, i) => (
              <View key={r.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <ReportRow r={r} C={C} onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })} />
              </View>
            ))}
          </View>
        )}

        <CampusToday navigation={navigation} />

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  scroll: { paddingBottom: 20 } as ViewStyle,

  // Section
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 9,
    marginLeft: 4,
  } as any,

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 9,
  } as ViewStyle,

  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  } as ViewStyle,

  newBtnText: { fontSize: 13 } as any,

  // Quick actions
  quickGrid: {
    flexDirection: 'row',
    gap: 9,
  } as ViewStyle,

  quickCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 13,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,

  quickLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  } as any,

  // Card + rows
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,

  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  // Report row
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
  } as ViewStyle,

  reportBody: { flex: 1 } as ViewStyle,

  reportTitle: { fontSize: 14 } as any,

  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  } as ViewStyle,

  reportLoc: { fontSize: 12 } as any,

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  } as ViewStyle,

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,

  statusText: { fontSize: 11 } as any,

  // Empty
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
  } as ViewStyle,

  emptyText: { fontSize: 13 } as any,
});
