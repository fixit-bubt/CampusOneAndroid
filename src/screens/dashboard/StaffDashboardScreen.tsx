// Matches design screens-dash.jsx — StaffBody dashboard
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { TopBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

const ISSUE_MAP: Record<string, { icon: string; fg: string }> = {
  electrical: { icon: 'bolt',     fg: '#d9870b' },
  plumbing:   { icon: 'droplets', fg: '#2b88d8' },
  cleanliness:{ icon: 'sparkles', fg: '#0e9c8a' },
  it_network: { icon: 'wifi',     fg: '#8b5cf6' },
  furniture:  { icon: 'box',      fg: '#b9760a' },
  safety:     { icon: 'shield',   fg: '#e2483d' },
  other:      { icon: 'sliders',  fg: '#5b6b86' },
};

const STATUS_CONFIG: Record<string, { label: string; fg: string; bg: string }> = {
  'Open':        { label: 'Open',        fg: '#b9760a', bg: '#fbefdb' },
  'In Progress': { label: 'In Progress', fg: '#2b5be3', bg: '#eef3ff' },
  'Resolved':    { label: 'Resolved',    fg: '#0e9c8a', bg: '#e4f5f4' },
  'Closed':      { label: 'Closed',      fg: '#5b6b86', bg: '#f0f2f6' },
  'Rejected':    { label: 'Rejected',    fg: '#e2483d', bg: '#fbe7e5' },
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
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

function ReportCard({ r, C, onAdvance }: { r: Report; C: any; onAdvance: (id: string, status: string) => void }) {
  const issueConf = ISSUE_MAP[r.category] ?? ISSUE_MAP.other;
  const statusConf = STATUS_CONFIG[r.status] ?? STATUS_CONFIG['Open'];
  const issueBg = `${issueConf.fg}1e`;
  return (
    <View style={[styles.reportCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.reportTop}>
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
          <Text style={[styles.statusTxt, { color: statusConf.fg, fontFamily: FontFamily.jakartaBold }]}>{statusConf.label}</Text>
        </View>
      </View>

      <View style={styles.reportMeta}>
        {r.reporter_name && (
          <View style={styles.byRow}>
            <Avatar name={r.reporter_name} size="xs" />
            <Text style={[styles.byName, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{r.reporter_name}</Text>
          </View>
        )}
        {r.priority && (
          <View style={[styles.urgentPill, { backgroundColor: '#fbe7e5' }]}>
            <Icon name="bolt" size={10} color="#e2483d" />
            <Text style={[styles.urgentTxt, { color: '#e2483d', fontFamily: FontFamily.jakartaBold }]}>Urgent</Text>
          </View>
        )}
        <Text style={[styles.reportTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{timeAgo(r.created_at)}</Text>
      </View>

      {r.status === 'Open' && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#eef3ff' }]} onPress={() => onAdvance(r.id, 'In Progress')} activeOpacity={0.75}>
          <Icon name="pulse" size={15} color="#2b5be3" />
          <Text style={[styles.actionTxt, { color: '#2b5be3', fontFamily: FontFamily.jakartaBold }]}>Start Work</Text>
        </TouchableOpacity>
      )}
      {r.status === 'In Progress' && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e4f5f4' }]} onPress={() => onAdvance(r.id, 'Resolved')} activeOpacity={0.75}>
          <Icon name="check" size={15} color="#0e9c8a" />
          <Text style={[styles.actionTxt, { color: '#0e9c8a', fontFamily: FontFamily.jakartaBold }]}>Mark Resolved</Text>
        </TouchableOpacity>
      )}
      {r.status === 'Resolved' && (
        <View style={[styles.actionBtn, { backgroundColor: '#e4f5f4', opacity: 0.7 }]}>
          <Icon name="check" size={15} color="#0e9c8a" />
          <Text style={[styles.actionTxt, { color: '#0e9c8a', fontFamily: FontFamily.jakartaBold }]}>Done</Text>
        </View>
      )}
    </View>
  );
}

export function StaffDashboardScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('*, profiles:reporter_id(full_name)')
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
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function advanceStatus(reportId: string, newStatus: string) {
    await supabase.from('reports').update({ status: newStatus }).eq('id', reportId);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
  }

  const active = reports.filter(r => r.status === 'In Progress');
  const resolved = reports.filter(r => r.status === 'Resolved');

  const sorted = [...reports].sort((a, b) => {
    const order = (r: Report) => r.status === 'In Progress' ? 0 : r.status === 'Open' ? 1 : 2;
    return order(a) - order(b);
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <TopBar title="Staff Dashboard" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <Text style={[styles.intro, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          Manage your assigned maintenance reports
        </Text>

        {/* Stat row */}
        <View style={styles.statRow}>
          <StatCard icon="inbox"  fg="#2b5be3" num={reports.length} label="Assigned"   C={C} />
          <StatCard icon="pulse"  fg="#b9760a" num={active.length}  label="In Progress" C={C} />
          <StatCard icon="check"  fg="#0e9c8a" num={resolved.length} label="Resolved"  C={C} />
        </View>

        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>ASSIGNED TO ME</Text>

        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="check" size={30} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>All clear!</Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>No reports assigned to you</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sorted.map(r => (
              <ReportCard key={r.id} r={r} C={C} onAdvance={advanceStatus} />
            ))}
          </View>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
  intro: { fontSize: 13.5, marginBottom: 12 } as any,
  statRow: { flexDirection: 'row', gap: 10 } as ViewStyle,
  statCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 } as ViewStyle,
  statIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  statNum: { fontSize: 20 } as any,
  statLabel: { fontSize: 11, textAlign: 'center' } as any,
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 18, marginBottom: 10 } as any,
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
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13 } as any,
});
