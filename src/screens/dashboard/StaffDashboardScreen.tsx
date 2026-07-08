import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { TopBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout, Accent } from '../../theme';
import { useT } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { getMyNotifications } from '../../services/notificationsService';
import { declineReport } from '../../services/reportsService';
import { CampusToday } from '../../components/CampusToday';

const ISSUE_MAP: Record<string, { icon: string; fg: string }> = {
  electrical: { icon: 'bolt',     fg: Accent.gold },
  plumbing:   { icon: 'droplets', fg: Accent.sky },
  cleanliness:{ icon: 'sparkles', fg: Accent.teal },
  it_network: { icon: 'wifi',     fg: Accent.purple },
  furniture:  { icon: 'box',      fg: Accent.amber },
  safety:     { icon: 'shield',   fg: Accent.red },
  other:      { icon: 'sliders',  fg: Accent.slate },
};

// DB categories include multi-word values ("IT / Network", "Safety / Security")
// that don't lowercase straight to an ISSUE_MAP key.
function issueKey(cat?: string): string {
  const c = (cat ?? '').toLowerCase();
  if (c.includes('it') || c.includes('network')) return 'it_network';
  if (c.includes('safety') || c.includes('security')) return 'safety';
  if (c.includes('clean')) return 'cleanliness';
  if (c.includes('plumb')) return 'plumbing';
  if (c.includes('electric')) return 'electrical';
  if (c.includes('furnitur')) return 'furniture';
  return 'other';
}

// Status colors, light + dark aware via C.
function statusTone(C: any, status: string): { fg: string; bg: string } {
  switch (status) {
    case 'In Progress': return { fg: C.info,      bg: C.infoBg };
    case 'Resolved':    return { fg: C.success,   bg: C.successBg };
    case 'Closed':      return { fg: C.textMuted, bg: C.surface2 };
    case 'Rejected':    return { fg: C.danger,    bg: C.dangerBg };
    case 'Open':
    default:            return { fg: C.warn,      bg: C.warnBg };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

interface Report {
  id: string;
  description: string;
  building: string;
  room: string;
  category: string;
  status: string;
  created_at: string;
  reporter_name?: string;
  assigned_staff_id?: string;
  title?: string;
  location?: string;
}

function StatCard({ icon, fg, num, label, C }: any) {
  const bg = `${fg}1a`;
  return (
    <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={20} color={fg} />
      </View>
      <Text style={[styles.statNum, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{num}</Text>
      <Text style={[styles.statLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{label}</Text>
    </View>
  );
}

function ReportCard({ r, C, onAdvance, onDecline, onPress }: { r: Report; C: any; onAdvance: (id: string, status: string) => void; onDecline: (id: string) => void; onPress: () => void }) {
  const t = useT();
  const issueConf = ISSUE_MAP[issueKey(r.category)] ?? ISSUE_MAP.other;
  const statusConf = statusTone(C, r.status);
  const issueBg = `${issueConf.fg}1e`;
  return (
    <View style={[styles.reportCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <TouchableOpacity style={styles.reportTop} onPress={onPress} activeOpacity={0.75}>
        <View style={[styles.issueIcon, { backgroundColor: issueBg }]}>
          <Icon name={issueConf.icon} size={20} color={issueConf.fg} />
        </View>
        <View style={styles.reportBody}>
          <Text style={[styles.reportTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {r.title}
          </Text>
          <View style={styles.reportLoc}>
            <Icon name="pin" size={13} color={C.textMuted} />
            <Text style={[styles.reportLocTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{r.location}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusConf.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConf.fg }]} />
          <Text style={[styles.statusTxt, { color: statusConf.fg, fontFamily: FontFamily.jakartaBold }]}>{t.status[r.status]}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.reportMeta}>
        {r.reporter_name && (
          <View style={styles.byRow}>
            <Avatar name={r.reporter_name} size="xs" />
            <Text style={[styles.byName, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{r.reporter_name}</Text>
          </View>
        )}
        <Text style={[styles.reportTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{timeAgo(r.created_at)}</Text>
      </View>

      {r.status === 'Open' && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.infoBg }]} onPress={() => onAdvance(r.id, 'In Progress')} activeOpacity={0.75}>
          <Icon name="pulse" size={15} color={C.info} />
          <Text style={[styles.actionTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>{t.dash.startWork}</Text>
        </TouchableOpacity>
      )}
      {r.status === 'In Progress' && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.successBg }]} onPress={() => onAdvance(r.id, 'Resolved')} activeOpacity={0.75}>
          <Icon name="check" size={15} color={C.success} />
          <Text style={[styles.actionTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>{t.dash.markResolved}</Text>
        </TouchableOpacity>
      )}
      {r.status === 'Resolved' && (
        <View style={[styles.actionBtn, { backgroundColor: C.successBg, opacity: 0.7 }]}>
          <Icon name="check" size={15} color={C.success} />
          <Text style={[styles.actionTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>{t.common.done}</Text>
        </View>
      )}
      {(r.status === 'Open' || r.status === 'In Progress') && (
        <TouchableOpacity style={[styles.declineBtn, { borderColor: C.border }]} onPress={() => onDecline(r.id)} activeOpacity={0.75}>
          <Icon name="x" size={14} color={C.textMuted} />
          <Text style={[styles.declineTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.dash.decline}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function StaffDashboardScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('*, profiles:profiles!reporter_id(full_name)')
      .eq('assigned_staff_id', user?.id ?? '')
      .order('status')
      .limit(30);
    if (data) {
      setReports(data.map((r: any) => ({
        ...r,
        reporter_name: r.profiles?.full_name,
        title: r.description?.split('\n')[0] ?? '',
        location: [r.building, r.room].filter(Boolean).join(' · '),
      })));
    }
    const nRes = await getMyNotifications(20);
    if (nRes.ok) setUnread(nRes.data.filter(n => !n.read).length);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function advanceStatus(reportId: string, newStatus: string) {
    const prevStatus = reports.find(r => r.id === reportId)?.status;
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    const { error } = await supabase.from('reports').update({ status: newStatus }).eq('id', reportId);
    if (error) {
      // revert the optimistic change on failure
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: prevStatus ?? r.status } : r));
      toast({ type: 'error', title: t.common.error, message: error.message });
    }
  }

  function declineAssigned(reportId: string) {
    Alert.alert(t.dash.declineTitle, t.dash.declineBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.dash.decline, style: 'destructive',
        onPress: async () => {
          const res = await declineReport(reportId);
          if (!res.ok) { Alert.alert(t.common.error, res.error); return; }
          // No longer assigned to me, so drop it from the list.
          setReports(prev => prev.filter(r => r.id !== reportId));
        },
      },
    ]);
  }

  const active = reports.filter(r => r.status === 'In Progress');
  const resolved = reports.filter(r => r.status === 'Resolved');

  const sorted = [...reports].sort((a, b) => {
    const order = (r: Report) => r.status === 'In Progress' ? 0 : r.status === 'Open' ? 1 : 2;
    return order(a) - order(b);
  });

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <Text style={[styles.pageTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.dash.staffTitle}
        </Text>
        <Text style={[styles.intro, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {t.dash.staffIntro}
        </Text>

        {/* Stat row */}
        <View style={styles.statRow}>
          <StatCard icon="inbox"  fg={C.info} num={reports.length} label={t.dash.statAssigned}   C={C} />
          <StatCard icon="pulse"  fg={C.warn} num={active.length}  label={t.dash.statInProgress} C={C} />
          <StatCard icon="check"  fg={C.success} num={resolved.length} label={t.dash.statResolved}  C={C} />
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 0, marginBottom: 0 }]}>{t.dash.assignedToMe}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AssignedToMe')} activeOpacity={0.8}>
            <Text style={[styles.seeAll, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>{t.common.seeAll}</Text>
          </TouchableOpacity>
        </View>

        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="check" size={30} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.dash.allClear}</Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.dash.noReportsAssigned}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sorted.map(r => (
              <ReportCard key={r.id} r={r} C={C} onAdvance={advanceStatus} onDecline={declineAssigned} onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })} />
            ))}
          </View>
        )}

        <CampusToday navigation={navigation} />

        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
  pageTitle: { fontSize: 19, letterSpacing: -0.3 } as any,
  intro: { fontSize: 13.5, marginTop: 2, marginBottom: 12 } as any,
  statRow: { flexDirection: 'row', gap: 10 } as ViewStyle,
  statCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 } as ViewStyle,
  statIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  statNum: { fontSize: 20 } as any,
  statLabel: { fontSize: 11, textAlign: 'center' } as any,
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 18, marginBottom: 10 } as any,
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 } as ViewStyle,
  seeAll: { fontSize: 12.5 } as any,
  list: { gap: 11 } as ViewStyle,
  reportCard: { padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  reportTop: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
  issueIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  reportBody: { flex: 1 } as ViewStyle,
  reportTitle: { fontSize: 14 } as any,
  reportLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 } as ViewStyle,
  reportLocTxt: { fontSize: 12 } as any,
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, flexShrink: 0 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as any,
  reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 } as ViewStyle,
  byRow: { flexDirection: 'row', alignItems: 'center', gap: 5 } as ViewStyle,
  byName: { fontSize: 12 } as any,
  urgentPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  urgentTxt: { fontSize: 11 } as any,
  reportTime: { fontSize: 11, marginLeft: 'auto' } as any,
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, borderRadius: 11, marginTop: 11 } as ViewStyle,
  actionTxt: { fontSize: 13 } as any,
  declineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, borderRadius: 10, borderWidth: 1, marginTop: 8 } as ViewStyle,
  declineTxt: { fontSize: 12.5 } as any,
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13 } as any,
});
