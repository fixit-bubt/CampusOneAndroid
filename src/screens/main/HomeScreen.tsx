// Matches design screens-home.jsx — student Home view
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useApp } from '../../store/appStore';
import { TopBar } from '../../components/layout/TopBar';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout, Spacing, Radius , Accent, darken } from '../../theme';
import { SectorColors, type SectorKey , Accent, darken } from '../../theme';
import { getMyReports } from '../../services/reportsService';
import { getMyNotifications, type Notification } from '../../services/notificationsService';
import type { Report } from '../../types/database';

// ── quick-action sectors ──────────────────────────────────────────────────────
const QUICK: SectorKey[] = ['reports', 'bus', 'study', 'medical'];
const QUICK_LABELS_EN: Record<SectorKey, string> = {
  reports: 'Reports', lostfound: 'Lost', clubs: 'Clubs', events: 'Events',
  jobs: 'Jobs', announce: 'News', study: 'Study', bus: 'Bus',
  medical: 'Medical', market: 'Market', ride: 'Ride', blood: 'Blood',
  directory: 'Directory', prayer: 'Prayer', faculty: 'Faculty',
};
const QUICK_LABELS_BN: Record<SectorKey, string> = {
  reports: 'রিপোর্ট', lostfound: 'হারানো', clubs: 'ক্লাব', events: 'ইভেন্ট',
  jobs: 'চাকরি', announce: 'সংবাদ', study: 'পড়াশোনা', bus: 'বাস',
  medical: 'মেডিকেল', market: 'বাজার', ride: 'রাইড', blood: 'রক্ত',
  directory: 'ডিরেক্টরি', prayer: 'নামাজ', faculty: 'শিক্ষক',
};
const QUICK_ROUTE: Record<SectorKey, string> = {
  reports: 'ReportForm', lostfound: 'LostFoundBrowse', clubs: 'Clubs',
  events: 'EventsBrowse', jobs: 'JobsBrowse', announce: 'Announcements',
  study: 'StudyHub', bus: 'Bus', medical: 'Medical', market: 'Market',
  ride: 'Rides', blood: 'Blood', directory: 'Directory', prayer: 'Prayer', faculty: 'Faculty',
};

// ── status colors ─────────────────────────────────────────────────────────────
const STATUS_TONE: Record<string, string> = {
  Open: Accent.amber, 'In Progress': Accent.blue, Resolved: Accent.green,
  Rejected: Accent.red, Closed: Accent.slate,
};

// ── NotifRow ──────────────────────────────────────────────────────────────────
function NotifRow({ n, C, onPress }: { n: Notification; C: any; onPress: () => void }) {
  const sector = (n.sector as SectorKey) in SectorColors ? (n.sector as SectorKey) : 'announce';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.notifRow, !n.read && { backgroundColor: C.brand50 }]}
      activeOpacity={0.75}
    >
      <SectorIcon sector={sector} size="sm" />
      <View style={styles.notifBody}>
        <Text
          style={[styles.notifTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
          numberOfLines={1}
        >
          {n.title}
        </Text>
        <Text
          style={[styles.notifText, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}
          numberOfLines={2}
        >
          {n.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── ReportRow ─────────────────────────────────────────────────────────────────
function ReportRow({ r, C, onPress }: { r: Report; C: any; onPress: () => void }) {
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
          {r.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
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

// ── HomeScreen ────────────────────────────────────────────────────────────────
export function HomeScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile, user } = useAuth();
  const { lang } = useApp();
  const bn = lang === 'bn';
  const QUICK_LABELS = bn ? QUICK_LABELS_BN : QUICK_LABELS_EN;

  const [reports, setReports]     = useState<Report[]>([]);
  const [notifs, setNotifs]       = useState<Notification[]>([]);
  const [unread, setUnread]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [rRes, nRes] = await Promise.all([
      getMyReports(user.id),
      getMyNotifications(20),
    ]);
    if (rRes.ok) setReports(rRes.data.slice(0, 5));
    if (nRes.ok) {
      setNotifs(nRes.data);
      setUnread(nRes.data.filter(n => !n.read).length);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const recentAlerts = notifs.slice(0, 3);

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
        {/* ── Spotlight card ── */}
        <LinearGradient
          colors={[Accent.blue, darken(Accent.blue)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.spotlight}
        >
          <View style={styles.spotBell}>
            <Icon name="bell" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.spotCount, { fontFamily: FontFamily.jakartaExtraBold }]}>
              {bn ? `${unread} টি নতুন অ্যালার্ট` : `${unread} new ${unread === 1 ? 'alert' : 'alerts'}`}
            </Text>
            <Text style={[styles.spotSub, { fontFamily: FontFamily.jakartaMedium }]}>
              {bn ? 'রিপোর্ট, ক্লাব ও আরও কিছু থেকে' : 'From reports, clubs & more'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.spotBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Icon name="chevR" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Quick actions ── */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {bn ? 'দ্রুত কাজ' : 'QUICK ACTIONS'}
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
                {QUICK_LABELS[id]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── My Reports ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 0 }]}>
            {bn ? 'আমার রিপোর্ট' : 'MY REPORTS'}
          </Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('ReportForm')}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={15} color={C.brand} />
            <Text style={[styles.newBtnText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              {bn ? 'নতুন রিপোর্ট' : 'New Report'}
            </Text>
          </TouchableOpacity>
        </View>

        {reports.length === 0 ? (
          <EmptyCard icon="inbox" text={bn ? 'এখনও কোনো রিপোর্ট নেই।' : 'No reports yet. Tap + to submit one.'} C={C} />
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

        {/* ── Recent Alerts ── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 0 }]}>
            {bn ? 'সাম্প্রতিক অ্যালার্ট' : 'RECENT ALERTS'}
          </Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Text style={[styles.newBtnText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              {bn ? 'সব দেখুন' : 'See All'}
            </Text>
            <Icon name="chevR" size={15} color={C.brand} />
          </TouchableOpacity>
        </View>

        {recentAlerts.length === 0 ? (
          <EmptyCard icon="bell" text={bn ? 'এখনও কোনো অ্যালার্ট নেই।' : 'No alerts yet.'} C={C} />
        ) : (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            {recentAlerts.map((n, i) => (
              <View key={n.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <NotifRow n={n} C={C} onPress={() => navigation.navigate('NotifDetail', { notification: n })} />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  scroll: { paddingBottom: 20 } as ViewStyle,

  // Spotlight
  spotlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
    shadowColor: Accent.blue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  } as ViewStyle,

  spotBell: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  spotCount: {
    fontSize: 14.5,
    lineHeight: 19,
    color: '#fff',
  } as any,

  spotSub: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  } as any,

  spotBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

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

  // Notif row
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 13,
  } as ViewStyle,

  notifBody: { flex: 1 } as ViewStyle,

  notifTitle: { fontSize: 13.5 } as any,

  notifText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  } as any,

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
