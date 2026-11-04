import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  RefreshControl, Alert, ActivityIndicator, Modal, type ViewStyle, type TextStyle, type ImageStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { personName } from '../../services/peopleService';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { declineReport } from '../../services/reportsService';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { getTradeLabel, isTradeMatch } from '../../utils/tradeMatcher';
import type { Report, ReportEvent } from '../../types/database';

const CAT_MAP: Record<string, { icon: string; fg: string }> = {
  'Electrical':       { icon: 'bolt',    fg: Accent.gold },
  'Plumbing':         { icon: 'droplets',fg: Accent.sky },
  'Cleanliness':      { icon: 'sparkles',fg: Accent.green },
  'IT / Network':     { icon: 'wifi',    fg: Accent.purple },
  'Furniture':        { icon: 'box',     fg: Accent.amber },
  'Safety / Security':{ icon: 'shield',  fg: Accent.red },
  'Other':            { icon: 'sliders', fg: Accent.slate },
};

// Status tones from theme tokens (dark-mode aware via C)
function statusTone(C: any, status: string): { text: string; bg: string } {
  switch (status) {
    case 'In Progress': return { text: C.info,      bg: C.infoBg };
    case 'Resolved':    return { text: C.success,   bg: C.successBg };
    case 'Rejected':    return { text: C.danger,    bg: C.dangerBg };
    case 'Closed':      return { text: C.textMuted, bg: C.surface2 };
    case 'Open':
    default:            return { text: C.warn,      bg: C.warnBg };
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface StatusAction {
  status: Report['status'];
  label: string;
  icon: string;
}

interface StaffCandidate {
  id: string;
  full_name: string;
  department: string;
  expertise?: string | null;
}

export function ReportDetailScreen({ route, navigation }: any) {
  const { reportId: paramReportId, report: initReport } = (route.params ?? {}) as { reportId?: string; report?: Report };
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();

  const toast = useToast();
  const [report, setReport] = useState<Report | null>(initReport ?? null);
  const [loadingReport, setLoadingReport] = useState(!initReport);
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [reporterName, setReporterName] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTab, setAssignTab] = useState<'trade' | 'all'>('trade');
  const [staffList, setStaffList] = useState<StaffCandidate[]>([]);
  const [activeByStaff, setActiveByStaff] = useState<Record<string, number>>({});
  const [assigningStaff, setAssigningStaff] = useState(false);

  const reportId = report?.id ?? paramReportId ?? '';

  const code = report ? (report.code ?? ('RPT-' + report.id.replace(/\D/g, '').padStart(4, '0').slice(-4))) : '…';
  const cat = report ? (CAT_MAP[report.category] ?? { icon: 'wrench', fg: Accent.slate }) : { icon: 'wrench', fg: Accent.slate };
  const statusStyle = report ? (statusTone(C, report.status)) : { text: Accent.slate, bg: pillBg(Accent.slate, isDark) };
  const isMine = report?.reporter_id === user?.id;

  // Admin moderates reports & assigns staff; assigned staff technician executes work.
  const isAdmin = profile?.role === 'admin';
  const isAssignedStaff = profile?.role === 'staff' && !!report?.assigned_staff_id && report.assigned_staff_id === user?.id;
  const canUpdateStatus = isAdmin || isAssignedStaff;

  const load = useCallback(async () => {
    if (!reportId) return;
    const [evRes, rptData, staffRes, activeRes] = await Promise.all([
      supabase.from('report_events').select('*').eq('report_id', reportId).order('created_at', { ascending: true }),
      supabase.from('reports').select('*').eq('id', reportId).maybeSingle(),
      isAdmin
        ? supabase.from('profiles').select('id, full_name, department, expertise').eq('role', 'staff').limit(100)
        : Promise.resolve({ data: null }),
      isAdmin
        ? supabase.from('reports').select('assigned_staff_id').in('status', ['Open', 'In Progress']).is('deleted_at', null).limit(200)
        : Promise.resolve({ data: null }),
    ]);
    if (evRes.data) setEvents(evRes.data as ReportEvent[]);
    if (staffRes?.data) setStaffList(staffRes.data as StaffCandidate[]);
    if (activeRes?.data) {
      const counts: Record<string, number> = {};
      (activeRes.data as any[]).forEach((r) => {
        if (r.assigned_staff_id) {
          counts[r.assigned_staff_id] = (counts[r.assigned_staff_id] || 0) + 1;
        }
      });
      setActiveByStaff(counts);
    }

    let currentReport: any = rptData?.data;
    if (!currentReport) {
      // Viewer isn't the owner/assignee/admin (RLS hides the row) - open it
      // read-only via the campus feed RPC so any student can view it.
      const { data: feed } = await supabase.rpc('campus_reports', { p_limit: 500 });
      currentReport = (feed ?? []).find((x: any) => x.id === reportId) ?? null;
      if (currentReport?.reporter_name) setReporterName(currentReport.reporter_name);
    }
    if (currentReport) setReport(currentReport as Report);
    setLoadingReport(false);

    // Names via the roster RPC - profiles RLS only returns the caller's own row,
    // so reading it directly leaves both of these blank.
    if (currentReport?.reporter_id && !currentReport?.reporter_name) {
      const name = await personName(currentReport.reporter_id);
      if (name) setReporterName(name);
    }
    if (currentReport?.assigned_staff_id) {
      const name = await personName(currentReport.assigned_staff_id);
      if (name) setAssigneeName(name);
    }
  }, [reportId, isAdmin]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Strict role-appropriate status action list:
  // Admin: Triage & lifecycle (Reject, Close, Reopen, or direct Resolve override). Admin NEVER sets 'In Progress'.
  // Staff: Technician execution only ('Start Work' advances Open -> In Progress; 'Mark Resolved' advances In Progress -> Resolved).
  const availableActions = useMemo<StatusAction[]>(() => {
    if (!report) return [];
    const list: StatusAction[] = [];

    if (isAdmin) {
      // 1. Direct Resolve (Admin Override / Verification)
      if (report.status !== 'Resolved') {
        list.push({
          status: 'Resolved',
          label: 'Mark Resolved',
          icon: 'check',
        });
      }
      // 2. Reject Report
      if (report.status !== 'Rejected') {
        list.push({
          status: 'Rejected',
          label: 'Reject Report',
          icon: 'close',
        });
      }
      // 3. Close Ticket
      if (report.status !== 'Closed') {
        list.push({
          status: 'Closed',
          label: 'Close Ticket',
          icon: 'lock',
        });
      }
      // 4. Reopen Ticket (if closed, rejected, or resolved)
      if (report.status === 'Resolved' || report.status === 'Closed' || report.status === 'Rejected') {
        list.push({
          status: 'Open',
          label: 'Reopen Ticket',
          icon: 'rotate-ccw',
        });
      }
    } else if (isAssignedStaff) {
      // Assigned Technician Actions
      if (report.status === 'Open') {
        list.push({
          status: 'In Progress',
          label: 'Start Work',
          icon: 'play',
        });
      } else if (report.status === 'In Progress') {
        list.push({
          status: 'Resolved',
          label: 'Mark Resolved',
          icon: 'check',
        });
      }
    }

    return list;
  }, [report, isAdmin, isAssignedStaff]);

  const tradeLabel = useMemo(() => getTradeLabel(report?.category), [report?.category]);

  const matchingStaff = useMemo(() => {
    if (!report?.category) return staffList;
    return staffList.filter((s) => isTradeMatch(s.expertise, report.category));
  }, [staffList, report?.category]);

  const assignTabs = useMemo<TabItem<'trade' | 'all'>[]>(() => {
    return [
      {
        id: 'trade',
        label: `${tradeLabel} (${matchingStaff.length})`,
        icon: 'zap',
        color: Accent.amber,
      },
      {
        id: 'all',
        label: `All Staff (${staffList.length})`,
        icon: 'users',
        color: C.brand,
      },
    ];
  }, [tradeLabel, matchingStaff.length, staffList.length, C.brand]);

  const displayedStaff = useMemo(() => {
    if (assignTab === 'trade' && matchingStaff.length > 0) {
      return matchingStaff;
    }
    return staffList;
  }, [assignTab, matchingStaff, staffList]);

  async function handleAssignStaff(staffId: string) {
    if (!report) return;
    setAssigningStaff(true);
    const { error } = await supabase
      .from('reports')
      .update({ assigned_staff_id: staffId })
      .eq('id', report.id);
    setAssigningStaff(false);
    if (error) {
      toast({ type: 'error', title: t.common.error, message: error.message });
      return;
    }
    const staff = staffList.find(s => s.id === staffId);
    setAssigneeName(staff?.full_name ?? 'Staff');
    setReport(prev => prev ? { ...prev, assigned_staff_id: staffId } : prev);
    setAssignModalOpen(false);
    toast({ type: 'success', title: 'Staff Assigned', message: `Assigned to ${staff?.full_name ?? 'Staff'}` });
    load();
  }

  async function handleStatusUpdate(newStatus: Report['status']) {
    if (!report) return;
    setUpdatingStatus(true);
    const { error } = await supabase.from('reports').update({ status: newStatus }).eq('id', report.id);
    setUpdatingStatus(false);
    if (error) {
      toast({ type: 'error', title: t.common.error, message: t.reports2.updateStatusFailed(error.message) });
      return;
    }
    setReport(prev => prev ? { ...prev, status: newStatus } : prev);
    toast({ type: 'success', title: 'Status Updated', message: `Report marked as ${newStatus}` });
    // Refresh so the timeline picks up the report_events row a DB trigger may add.
    load();
  }

  function handleDecline() {
    if (!report) return;
    Alert.alert(t.dash.declineTitle, t.dash.declineBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.dash.decline, style: 'destructive',
        onPress: async () => {
          const res = await declineReport(report.id);
          if (!res.ok) { toast({ type: 'error', title: t.common.error, message: res.error }); return; }
          navigation.goBack();
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!report) return;
    Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('reports').update({ deleted_at: new Date().toISOString() }).eq('id', report.id);
          if (error) {
            toast({ type: 'error', title: t.common.error, message: error.message });
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  }

  if (loadingReport) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.reports2.report} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.reports2.report} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
            <Icon name="alert" size={28} color={C.textMuted} />
          </View>
          <Text style={{ color: C.text, fontSize: 17, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 8, textAlign: 'center' }}>
            Report Not Found
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: FontFamily.jakartaMedium, textAlign: 'center', marginBottom: 20 }}>
            This maintenance report may have been removed or is no longer accessible.
          </Text>
          <TouchableOpacity
            style={{ height: 48, paddingHorizontal: 24, borderRadius: 14, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#ffffff', fontFamily: FontFamily.jakartaBold, fontSize: 14 }}>
              {t.common.back || 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Build timeline steps from fetched events + static steps
  const timelineSteps: { label: string; sub?: string; done: boolean }[] = [
    { label: t.reports2.reportFiled, sub: formatDate(report.created_at), done: true },
  ];
  if (assigneeName) {
    timelineSteps.push({ label: t.reports2.assignedToStaff, sub: assigneeName, done: true });
  }
  // Render fetched events, skipping the ones already shown as static steps:
  // the initial 'Open' INSERT event ("Report filed") and the terminal event
  // ("Issue resolved" / "Report rejected") rendered by the tail below.
  const terminal = report.status === 'Resolved' || report.status === 'Closed' || report.status === 'Rejected';
  events.forEach(ev => {
    if (ev.status === 'Open') return;
    if (terminal && ev.status === report.status) return;
    timelineSteps.push({ label: t.reports2.statusChanged(t.status[ev.status] ?? ev.status), sub: ev.note ?? formatDate(ev.created_at), done: true });
  });
  if (report.status === 'Resolved' || report.status === 'Closed') {
    timelineSteps.push({ label: t.reports2.issueResolved, done: true });
  } else if (report.status === 'Rejected') {
    timelineSteps.push({ label: t.reports2.reportRejected, done: true });
  } else {
    timelineSteps.push({ label: t.reports2.awaitingResolution, done: false });
  }

  const rawBuilding = report.building?.trim() || '';
  const displayBuilding = rawBuilding
    ? (/^[0-9]+$/.test(rawBuilding) ? `Building ${rawBuilding}` : rawBuilding)
    : 'Campus';

  const rawRoom = report.room?.trim() || '';
  const displayRoom = rawRoom
    ? (rawRoom.toLowerCase().startsWith('room') || rawRoom.toLowerCase().startsWith('রুম') ? rawRoom : t.reports2.room(rawRoom))
    : 'General';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={code} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Standard 58dp Status & Category Header Bar */}
        <View style={[styles.statusHeaderBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.categoryPill32, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Icon name={cat.icon} size={15} color={C.text} />
            <Text style={[styles.categoryPillTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {report.category}
            </Text>
          </View>
          <View style={[styles.statusPill32, { backgroundColor: statusStyle.bg, borderColor: statusStyle.text + '35' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
            <Text style={[styles.statusText, { color: statusStyle.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.status[report.status] ?? report.status}
            </Text>
          </View>
        </View>

        {/* Issue Title & Filing Timestamp */}
        <View style={styles.titleBlock}>
          <Text style={[styles.reportTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {report.description.split('\n')[0]}
          </Text>
          <Text style={[styles.timeMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            Filed on {formatDate(report.created_at)}
          </Text>
        </View>

        {/* Standard 58dp Location Bar: Building & Room sharing equally */}
        <View style={[styles.locBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.locCol58}>
            <View style={styles.locIconSlot}>
              <Icon name="pin" size={22} color={C.text} />
            </View>
            <View style={styles.locColText}>
              <Text style={[styles.locColLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                BUILDING
              </Text>
              <Text
                style={[styles.locColValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {displayBuilding}
              </Text>
            </View>
          </View>
          <View style={[styles.locDivider, { backgroundColor: C.border }]} />
          <View style={styles.locCol58}>
            <View style={styles.locIconSlot}>
              <Icon name="grid" size={22} color={C.text} />
            </View>
            <View style={styles.locColText}>
              <Text style={[styles.locColLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                ROOM
              </Text>
              <Text
                style={[styles.locColValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {displayRoom}
              </Text>
            </View>
          </View>
        </View>

        {/* Description Details (if multi-line) */}
        {report.description.includes('\n') && (
          <View style={[styles.descCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.desc, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              {report.description}
            </Text>
          </View>
        )}

        {report.photo_url ? (
          <Image source={{ uri: report.photo_url }} style={styles.evidencePhoto} resizeMode="cover" />
        ) : null}

        {/* Reporter + Assignee */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.personRow}>
            <View style={styles.personCol}>
              <Text style={[styles.personLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Reported by
              </Text>
              <View style={styles.personInfo}>
                <Avatar name={reporterName} size="xs" />
                <Text style={[styles.personName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {reporterName || t.reports2.student}
                </Text>
              </View>
            </View>
            {assigneeName ? (
              <View style={styles.personCol}>
                <View style={styles.personHeaderRow}>
                  <Text style={[styles.personLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, marginBottom: 0 }]}>
                    Assigned to
                  </Text>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => {
                        setAssignTab('trade');
                        setAssignModalOpen(true);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.reassignActionTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                        Reassign
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.personInfo}>
                  <Avatar name={assigneeName} size="xs" />
                  <Text style={[styles.personName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {assigneeName}
                  </Text>
                </View>
              </View>
            ) : isAdmin ? (
              <View style={styles.personCol}>
                <Text style={[styles.personLabel, { color: C.warn, fontFamily: FontFamily.jakartaMedium }]}>
                  Unassigned
                </Text>
                <TouchableOpacity
                  style={[styles.assignQuickBtn, { backgroundColor: C.brand + '14', borderColor: C.brand }]}
                  onPress={() => {
                    setAssignTab('trade');
                    setAssignModalOpen(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Icon name="userPlus" size={13} color={C.brand} />
                  <Text style={[styles.assignQuickTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    Assign Staff
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Timeline */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          TIMELINE
        </Text>
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, paddingVertical: 14, paddingHorizontal: 16 }]}>
          {timelineSteps.map((step, i) => (
            <View key={step.label} style={styles.timelineStep}>
              <View style={styles.timelineTrack}>
                <View style={[
                  styles.timelineDot,
                  step.done
                    ? { backgroundColor: C.success, borderColor: C.success }
                    : { backgroundColor: 'transparent', borderColor: C.textMuted, borderStyle: 'dashed' },
                ]}>
                  {step.done && <Icon name="check" size={8} color="#fff" />}
                </View>
                {i < timelineSteps.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: step.done ? C.success : C.border }]} />
                )}
              </View>
              <View style={[styles.timelineBody, { paddingBottom: i < timelineSteps.length - 1 ? 14 : 0 }]}>
                <Text style={[styles.timelineLabel, { color: step.done ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {step.label}
                </Text>
                {step.sub ? (
                  <Text style={[styles.timelineSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {step.sub}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* Edit / Delete (only if mine and open) */}
        {isMine && report.status === 'Open' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => navigation.navigate('ReportForm', { editReportId: report.id })}
              activeOpacity={0.75}
            >
              <Icon name="sliders" size={17} color={C.text2} />
              <Text style={[styles.actionText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.common.edit}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={handleDelete}
              activeOpacity={0.75}
            >
              <Icon name="trash" size={17} color={C.danger} />
              <Text style={[styles.actionText, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>{t.common.delete}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status update - 58dp Dropdown Button Standard */}
        {canUpdateStatus && availableActions.length > 0 && (
          <View style={styles.statusSection}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {isAdmin ? 'ADMIN ACTIONS' : 'UPDATE STATUS'}
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownBar58,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => setStatusModalOpen(true)}
              activeOpacity={0.75}
              disabled={updatingStatus}
            >
              <View style={styles.iconSlot32}>
                <Icon name="sliders" size={24} color={C.text} />
              </View>
              <View style={styles.dropdownBarBody}>
                <Text style={[styles.dropdownBarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {isAdmin ? 'Administrative Actions' : 'Update Status'} · {t.status[report.status] ?? report.status}
                </Text>
              </View>
              {updatingStatus ? (
                <ActivityIndicator size="small" color={C.brand} />
              ) : (
                <Icon name="chevD" size={18} color={C.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Assigned staff can decline → sends the report back to the admin pool */}
        {isAssignedStaff && (report.status === 'Open' || report.status === 'In Progress') && (
          <View style={{ marginTop: 14 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={handleDecline}
              activeOpacity={0.75}
            >
              <Icon name="x" size={17} color={C.textMuted} />
              <Text style={[styles.actionText, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.dash.decline}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* 58dp Status Action Bottom Sheet Modal */}
      <Modal
        visible={statusModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setStatusModalOpen(false)}
        />
        <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border, borderTopWidth: 1 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {isAdmin ? 'Administrative Actions' : 'Update Status'}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setStatusModalOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionList}>
            {availableActions.map((opt) => (
              <TouchableOpacity
                key={opt.status}
                style={[
                  styles.actionRow58,
                  {
                    backgroundColor: C.surface2,
                    borderColor: C.border,
                  },
                ]}
                onPress={() => {
                  setStatusModalOpen(false);
                  handleStatusUpdate(opt.status);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.iconSlot32}>
                  <Icon name={opt.icon} size={32} color={C.text} />
                </View>
                <View style={styles.actionRowBody}>
                  <Text style={[styles.actionRowTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {opt.label}
                  </Text>
                </View>
                <Icon name="chevR" size={18} color={C.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Full-Screen Staff Assignment Modal for Admin */}
      {isAdmin && (
        <Modal
          visible={assignModalOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setAssignModalOpen(false)}
        >
          <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
            {/* Top Navigation Bar */}
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <TouchableOpacity
                onPress={() => setAssignModalOpen(false)}
                style={styles.modalBackBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="arrow-left" size={20} color={C.text} />
              </TouchableOpacity>
              <View style={styles.modalHeaderTitleBlock}>
                <Text style={[styles.modalHeaderTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
                  {assigneeName ? 'Reassign Staff' : 'Assign Maintenance Staff'}
                </Text>
                <Text style={[styles.modalHeaderSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  {code} · {report.category} · {displayRoom}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModalOpen(false)} style={styles.modalCancelBtn}>
                <Text style={[styles.modalCancelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {t.common.cancel}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Ticket Context Strip */}
            <View style={[styles.contextStrip, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
              <View style={styles.contextStripLeft}>
                <View style={[styles.contextDot, { backgroundColor: C.brand }]} />
                <Text style={[styles.contextTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  Requires {tradeLabel}
                </Text>
              </View>
              <View style={[styles.categoryBadgeTiny, { backgroundColor: C.brand + '15', borderColor: C.brand + '40' }]}>
                <Text style={[styles.categoryBadgeTinyTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {report.category}
                </Text>
              </View>
            </View>

            {/* 58dp Segmented Tab Bar with Native Spring Animation */}
            <View style={styles.tabContainer58}>
              <SegmentedTabs<'trade' | 'all'>
                tabs={assignTabs}
                activeTab={assignTab}
                onTabChange={(id) => setAssignTab(id)}
                size="md"
              />
            </View>

            {/* Staff List Container */}
            <ScrollView
              contentContainerStyle={styles.staffScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {displayedStaff.map((s) => {
                const isMatch = isTradeMatch(s.expertise, report.category);
                const isCurrent = report.assigned_staff_id === s.id;
                const activeCount = activeByStaff[s.id] ?? 0;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.staffCard58,
                      {
                        backgroundColor: isCurrent ? (C.brand + '14') : C.surface,
                        borderColor: isCurrent ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => handleAssignStaff(s.id)}
                    activeOpacity={0.72}
                    disabled={assigningStaff}
                  >
                    <Avatar name={s.full_name} size="sm" />
                    <View style={styles.staffCardBody}>
                      <View style={styles.staffCardTopRow}>
                        <Text style={[styles.staffNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {s.full_name}
                        </Text>
                        {isMatch && (
                          <View style={[styles.matchBadge, { backgroundColor: C.successBg, borderColor: C.success + '40' }]}>
                            <Text style={[styles.matchBadgeTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                              Trade Match
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.staffMetaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {s.expertise ?? s.department ?? 'Maintenance'} · {activeCount === 1 ? '1 active job' : `${activeCount} active jobs`}
                      </Text>
                    </View>
                    {isCurrent ? (
                      <View style={[styles.selectedCheckWrap, { backgroundColor: C.brand }]}>
                        <Icon name="check" size={14} color="#ffffff" />
                      </View>
                    ) : (
                      <Icon name="chevR" size={18} color={C.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Empty State when no specialists found */}
              {assignTab === 'trade' && matchingStaff.length === 0 && (
                <View style={[styles.emptySpecialistCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Icon name="userX" size={28} color={C.textMuted} />
                  <Text style={[styles.emptySpecialistTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    No Registered {tradeLabel}
                  </Text>
                  <Text style={[styles.emptySpecialistSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    No staff members currently have their trade set to {report.category}.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptySpecialistBtn, { backgroundColor: C.brand }]}
                    onPress={() => setAssignTab('all')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.emptySpecialistBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                      View All Campus Staff ({staffList.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  // Standard 58dp Status & Category Header Bar
  statusHeaderBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 14,
    marginTop: 4,
  } as ViewStyle,
  categoryPill32: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  categoryPillTxt: {
    fontSize: 12.5,
  } as TextStyle,
  statusPill32: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexShrink: 0,
  } as ViewStyle,
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  statusText: {
    fontSize: 12,
  } as TextStyle,
  titleBlock: {
    marginBottom: 14,
  } as ViewStyle,
  reportTitle: {
    fontSize: 18,
    lineHeight: 25,
    letterSpacing: -0.2,
  } as TextStyle,
  timeMeta: {
    fontSize: 12,
    marginTop: 4,
  } as TextStyle,

  // Standard 58dp Location Bar - Building & Room sharing equally
  locBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  } as ViewStyle,
  locCol58: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    height: '100%',
  } as ViewStyle,
  locIconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  locColText: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  } as ViewStyle,
  locColLabel: {
    fontSize: 9.5,
    letterSpacing: 0.6,
  } as TextStyle,
  locColValue: {
    fontSize: 14,
    marginTop: 1,
  } as TextStyle,
  locDivider: {
    width: 1,
    height: 28,
  } as ViewStyle,

  descCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  } as ViewStyle,
  desc: {
    fontSize: 14,
    lineHeight: 22,
  } as TextStyle,
  evidencePhoto: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 12,
  } as ImageStyle,

  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  } as ViewStyle,

  personRow: {
    flexDirection: 'row',
    gap: 16,
    padding: 14,
  } as ViewStyle,

  personCol: { flex: 1 } as ViewStyle,

  personHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  } as ViewStyle,

  reassignActionTxt: {
    fontSize: 11,
  } as TextStyle,

  personLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 6,
  } as any,

  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  } as ViewStyle,

  personName: { fontSize: 13 } as any,

  assignQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginTop: 2,
  } as ViewStyle,

  assignQuickTxt: {
    fontSize: 12,
  } as TextStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 9,
    marginLeft: 2,
  } as any,

  // Timeline
  timelineStep: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
  } as ViewStyle,

  timelineTrack: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'stretch',
  } as ViewStyle,

  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  } as ViewStyle,

  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    marginVertical: 3,
  } as ViewStyle,

  timelineBody: { flex: 1 } as ViewStyle,

  timelineLabel: { fontSize: 14 } as any,

  timelineSub: {
    fontSize: 12,
    marginTop: 2,
  } as any,

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  } as ViewStyle,

  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,

  actionText: { fontSize: 14 } as any,

  // 58dp Dropdown Bar Standard
  statusSection: { marginTop: 18 } as ViewStyle,
  dropdownBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  } as ViewStyle,
  dropdownBarBody: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  dropdownBarTitle: {
    fontSize: 14.5,
  } as TextStyle,

  // Bottom Sheet Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  } as ViewStyle,
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 17,
  } as TextStyle,
  closeBtn: {
    padding: 6,
  } as ViewStyle,
  actionList: {
    gap: 8,
  } as ViewStyle,
  actionRow58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  actionRowBody: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  actionRowTitle: {
    fontSize: 15,
  } as TextStyle,
  iconSlot32: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  matchBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  } as ViewStyle,
  matchBadgeTxt: {
    fontSize: 10,
  } as TextStyle,

  tabContainer58: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 8,
  } as ViewStyle,
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    borderBottomWidth: 1,
    gap: 12,
  } as ViewStyle,
  modalBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalHeaderTitleBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  } as ViewStyle,
  modalHeaderTitle: {
    fontSize: 16,
  } as TextStyle,
  modalHeaderSub: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,
  modalCancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  } as ViewStyle,
  modalCancelTxt: {
    fontSize: 13,
  } as TextStyle,
  contextStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 10,
    borderBottomWidth: 1,
  } as ViewStyle,
  contextStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  } as ViewStyle,
  contextDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  } as ViewStyle,
  contextTxt: {
    fontSize: 12.5,
  } as TextStyle,
  categoryBadgeTiny: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  categoryBadgeTinyTxt: {
    fontSize: 11,
  } as TextStyle,
  staffScrollContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 6,
    paddingBottom: 28,
  } as ViewStyle,
  staffCard58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  } as ViewStyle,
  staffCardBody: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  } as ViewStyle,
  staffCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  } as ViewStyle,
  staffNameTxt: {
    fontSize: 14,
    letterSpacing: -0.1,
    flexShrink: 1,
  } as TextStyle,
  staffMetaTxt: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,
  selectedCheckWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptySpecialistCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  } as ViewStyle,
  emptySpecialistTitle: {
    fontSize: 15,
    marginTop: 4,
  } as TextStyle,
  emptySpecialistSub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  } as TextStyle,
  emptySpecialistBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  } as ViewStyle,
  emptySpecialistBtnTxt: {
    fontSize: 13,
  } as TextStyle,
});
