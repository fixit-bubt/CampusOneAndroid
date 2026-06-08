// Matches design screens-dash.jsx — AdminBody dashboard
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Modal, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { TopBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';

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
  assignee_name?: string;
  title?: string;
  location?: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  department: string;
  active_count: number;
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

function ReportCard({ r, C, onAssign }: { r: Report; C: any; onAssign: (r: Report) => void }) {
  const issueConf = ISSUE_MAP[r.category?.toLowerCase()] ?? ISSUE_MAP.other;
  const statusConf = STATUS_CONFIG[r.status] ?? STATUS_CONFIG['Open'];
  const issueBg = `${issueConf.fg}1e`;
  return (
    <View style={[styles.reportCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.reportTop}>
        <View style={[styles.issueIcon, { backgroundColor: issueBg }]}>
          <Icon name={issueConf.icon} size={20} color={issueConf.fg} />
        </View>
        <View style={styles.reportBody}>
          <Text style={[styles.reportTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>{r.title}</Text>
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
        <Text style={[styles.reportTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{timeAgo(r.created_at)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#eef3ff' }]}
        onPress={() => onAssign(r)}
        activeOpacity={0.75}
      >
        <Icon name="userPlus" size={15} color="#2b5be3" />
        <Text style={[styles.actionTxt, { color: '#2b5be3', fontFamily: FontFamily.jakartaBold }]}>
          {r.assignee_name ? `Reassign · ${r.assignee_name}` : 'Assign'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const MANAGE_TILES = [
  { icon: 'layers',    fg: '#2b5be3', label: 'All Reports',   route: 'AllReports',   sub: 'reports'    },
  { icon: 'directory', fg: '#8b5cf6', label: 'Users',         route: 'ManageUsers',  sub: 'users'      },
  { icon: 'announce',  fg: '#3e7de0', label: 'Announcements', route: 'Announcements',sub: 'announce'   },
  { icon: 'directory', fg: '#0e9c8a', label: 'Faculty',       route: 'Faculty',      sub: 'faculty'    },
];

export function AdminDashboardScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assignTarget, setAssignTarget] = useState<Report | null>(null);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('*, profiles!reporter_id(full_name), assignee:profiles!assigned_staff_id(full_name)')
      .in('status', ['Open', 'In Progress'])
      .order('created_at', { ascending: false })
      .limit(40);
    if (data) {
      setReports(data.map((r: any) => ({
        ...r,
        reporter_name: r.profiles?.full_name,
        assignee_name: r.assignee?.full_name,
        title: r.description?.split('\n')[0] ?? '',
        location: [r.building, r.room].filter(Boolean).join(' · '),
      })));
    }
    const { data: staff } = await supabase.from('profiles').select('id, full_name, department').eq('role', 'staff');
    if (staff) setStaffList(staff as StaffMember[]);
    const { count } = await supabase.from('reports').select('id', { count: 'exact', head: true }).in('status', ['Resolved', 'Closed']);
    setResolvedCount(count ?? 0);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function assignReport(reportId: string, staffId: string) {
    await supabase.from('reports').update({ assigned_staff_id: staffId, status: 'In Progress' }).eq('id', reportId);
    setAssignTarget(null);
    load();
  }

  const open = reports.filter(r => r.status === 'Open');
  const unassigned = reports.filter(r => !r.assigned_staff_id);
  const inprog = reports.filter(r => r.status === 'In Progress');

  const sorted = [...reports].sort((a, b) => {
    const rank = (r: Report) => !r.assigned_staff_id ? 0 : 2;
    return rank(a) - rank(b);
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <TopBar title="Admin Dashboard" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <Text style={[styles.intro, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          Manage reports and campus operations
        </Text>

        {/* Stat grid */}
        <View style={styles.statGrid}>
          <StatCard icon="inbox"    fg="#b9760a" num={open.length}       label="Open"        C={C} />
          <StatCard icon="userPlus" fg="#e2483d" num={unassigned.length} label="Unassigned"  C={C} />
          <StatCard icon="pulse"    fg="#2b5be3" num={inprog.length}     label="In Progress" C={C} />
          <StatCard icon="check"    fg="#0e9c8a" num={resolvedCount}     label="Resolved"    C={C} />
        </View>

        {/* Needs assignment */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>NEEDS ASSIGNMENT</Text>
        {sorted.filter(r => !r.assigned_staff_id).length === 0 ? (
          <View style={[styles.allClear, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="check" size={20} color="#0e9c8a" />
            <Text style={[styles.allClearTxt, { color: '#0e9c8a', fontFamily: FontFamily.jakartaBold }]}>All reports assigned</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sorted.filter(r => !r.assigned_staff_id).map(r => (
              <ReportCard key={r.id} r={r} C={C} onAssign={setAssignTarget} />
            ))}
          </View>
        )}

        {/* Manage tiles */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>MANAGE</Text>
        <View style={styles.tilesGrid}>
          {MANAGE_TILES.map((tile, i) => {
            const tileBg = isDark ? `${tile.fg}2e` : `${tile.fg}14`;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.tile, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => navigation.navigate(tile.route)}
                activeOpacity={0.75}
              >
                <View style={[styles.tileIcon, { backgroundColor: tileBg }]}>
                  <Icon name={tile.icon} size={17} color={tile.fg} />
                </View>
                <Text style={[styles.tileLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{tile.label}</Text>
                <Text style={[styles.tileSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{tile.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Assign modal */}
      <Modal visible={!!assignTarget} transparent animationType="slide" onRequestClose={() => setAssignTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAssignTarget(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Assign Report</Text>
          {assignTarget && (
            <View style={styles.assignInfo}>
              <Text style={[styles.assignReportTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{assignTarget.title}</Text>
              <Text style={[styles.assignReportLoc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{assignTarget.location}</Text>
            </View>
          )}
          <View style={styles.staffList}>
            {staffList.map((s, i) => (
              <View key={s.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <TouchableOpacity
                  style={styles.staffRow}
                  onPress={() => assignTarget && assignReport(assignTarget.id, s.id)}
                  activeOpacity={0.75}
                >
                  <Avatar name={s.full_name} size="md" />
                  <View style={styles.staffInfo}>
                    <Text style={[styles.staffName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{s.full_name}</Text>
                    <Text style={[styles.staffDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{s.department}</Text>
                  </View>
                  <Text style={[styles.staffLoad, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {s.active_count ?? 0} active
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
  intro: { fontSize: 13.5, marginBottom: 12 } as any,
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } as ViewStyle,
  statCard: { width: '47.5%', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 } as ViewStyle,
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
  allClear: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  allClearTxt: { fontSize: 14 } as any,
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } as ViewStyle,
  tile: { width: '47.5%', padding: 13, borderRadius: 14, borderWidth: 1, gap: 6 } as ViewStyle,
  tileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  tileLabel: { fontSize: 13.5 } as any,
  tileSub: { fontSize: 12 } as any,
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' } as ViewStyle,
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 } as ViewStyle,
  sheetTitle: { fontSize: 16, marginBottom: 12 } as any,
  assignInfo: { marginBottom: 12 } as ViewStyle,
  assignReportTitle: { fontSize: 14 } as any,
  assignReportLoc: { fontSize: 12, marginTop: 2 } as any,
  staffList: { gap: 0 } as ViewStyle,
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 } as ViewStyle,
  staffInfo: { flex: 1 } as ViewStyle,
  staffName: { fontSize: 14 } as any,
  staffDept: { fontSize: 12, marginTop: 1 } as any,
  staffLoad: { fontSize: 12 } as any,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
});
