// Matches design screens-e.jsx — ReportDetail
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  RefreshControl, Alert, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Radius , Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import type { Report, ReportEvent } from '../../types/database';

const CAT_MAP: Record<string, { icon: string; fg: string }> = {
  'Electrical':       { icon: 'bolt',    fg: Accent.gold },
  'Plumbing':         { icon: 'droplets',fg: Accent.sky },
  'Cleanliness':      { icon: 'sparkles',fg: Accent.green },
  'IT / Network':     { icon: 'wifi',    fg: Accent.purple },
  'Furniture':        { icon: 'chair',   fg: Accent.amber },
  'Safety / Security':{ icon: 'shield',  fg: Accent.red },
  'Other':            { icon: 'wrench',  fg: Accent.slate },
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

const STATUS_OPTIONS: Report['status'][] = ['Open', 'In Progress', 'Resolved', 'Rejected', 'Closed'];

export function ReportDetailScreen({ route, navigation }: any) {
  const { reportId: paramReportId, report: initReport } = route.params as { reportId?: string; report?: Report };
  const { C } = useTheme();
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

  const reportId = report?.id ?? paramReportId ?? '';

  const code = report ? ((report as any).code ?? ('RPT-' + report.id.replace(/\D/g, '').padStart(4, '0').slice(-4))) : '…';
  const cat = report ? (CAT_MAP[report.category] ?? { icon: 'wrench', fg: Accent.slate }) : { icon: 'wrench', fg: Accent.slate };
  const statusStyle = report ? (statusTone(C, report.status)) : { text: Accent.slate, bg: Accent.grayBg };
  const isMine = report?.reporter_id === user?.id;
  // Web parity: admin moderates any report; staff can only work reports
  // assigned to them, and only advance forward (no reject/close).
  const isAdmin = profile?.role === 'admin';
  const isAssignedStaff = profile?.role === 'staff' && !!report?.assigned_staff_id && report.assigned_staff_id === user?.id;
  const canUpdateStatus = isAdmin || isAssignedStaff;
  // Staff may only advance forward, one step at a time (DB guard enforces
  // Open->In Progress and In Progress->Resolved only).
  const staffChoices: Report['status'][] =
    report?.status === 'Open' ? ['In Progress'] :
    report?.status === 'In Progress' ? ['Resolved'] : [];
  const statusChoices: Report['status'][] = isAdmin ? STATUS_OPTIONS : staffChoices;

  const load = useCallback(async () => {
    if (!reportId) return;
    const [evRes, rptData] = await Promise.all([
      supabase.from('report_events').select('*').eq('report_id', reportId).order('created_at', { ascending: true }),
      supabase.from('reports').select('*').eq('id', reportId).single(),
    ]);
    if (evRes.data) setEvents(evRes.data as ReportEvent[]);
    if (rptData.data) setReport(rptData.data as Report);
    setLoadingReport(false);

    const currentReport = rptData.data;
    if (currentReport?.reporter_id) {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', currentReport.reporter_id).single();
      if (data) setReporterName((data as any).full_name);
    }
    if (currentReport?.assigned_staff_id) {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', currentReport.assigned_staff_id).single();
      if (data) setAssigneeName(data.full_name);
    }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
  }

  async function handleDelete() {
    if (!report) return;
    Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('reports').update({ deleted_at: new Date().toISOString() }).eq('id', report.id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (loadingReport || !report) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.reports2.report} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.brand} />
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={code} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Header: icon + title + status */}
        <View style={styles.header}>
          <View style={[styles.catIcon, { backgroundColor: cat.fg + '1e' }]}>
            <Icon name={cat.icon} size={26} color={cat.fg} />
          </View>
          <View style={styles.headerBody}>
            <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={3}>
              {report.description.split('\n')[0]}
            </Text>
            <View style={styles.locRow}>
              <Icon name="pin" size={12} color={C.textMuted} />
              <Text style={[styles.loc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {report.building}{report.room ? ` · ${t.reports2.room(report.room)}` : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text, fontFamily: FontFamily.jakartaBold }]}>
              {report.status}
            </Text>
          </View>
        </View>

        {/* Description */}
        {report.description.includes('\n') && (
          <Text style={[styles.desc, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {report.description}
          </Text>
        )}

        {report.photo_url ? (
          <Image source={{ uri: report.photo_url }} style={{ width: '100%', height: 200, borderRadius: 14, marginTop: 14, marginBottom: 4 }} resizeMode="cover" />
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
            {assigneeName && (
              <View style={styles.personCol}>
                <Text style={[styles.personLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Assigned to
                </Text>
                <View style={styles.personInfo}>
                  <Avatar name={assigneeName} size="xs" />
                  <Text style={[styles.personName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {assigneeName}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Timeline */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          TIMELINE
        </Text>
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, paddingVertical: 14, paddingHorizontal: 16 }]}>
          {timelineSteps.map((step, i) => (
            <View key={i} style={styles.timelineStep}>
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

        {/* Category */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          CATEGORY
        </Text>
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }]}>
          <View style={[styles.catIcon, { backgroundColor: cat.fg + '1e', width: 36, height: 36, borderRadius: 10 }]}>
            <Icon name={cat.icon} size={20} color={cat.fg} />
          </View>
          <Text style={[{ color: C.text, fontFamily: FontFamily.jakartaBold, fontSize: 14.5 }]}>
            {report.category}
          </Text>
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

        {/* Status update — admin: any status; staff: forward-only on own assigned */}
        {canUpdateStatus && (
          <View style={styles.statusSection}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              UPDATE STATUS
            </Text>
            <View style={styles.statusBtns}>
              {statusChoices.map(s => {
                const tone = statusTone(C, s);
                const isActive = report.status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOptBtn,
                      { backgroundColor: isActive ? tone.bg : C.surface, borderColor: isActive ? tone.text : C.border },
                    ]}
                    onPress={() => !isActive && handleStatusUpdate(s)}
                    activeOpacity={isActive ? 1 : 0.75}
                    disabled={updatingStatus}
                  >
                    {updatingStatus && isActive ? (
                      <ActivityIndicator size="small" color={tone.text} />
                    ) : (
                      <Text style={[styles.statusOptTxt, { color: isActive ? tone.text : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {s}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    marginBottom: 14,
  } as ViewStyle,

  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  headerBody: { flex: 1 } as ViewStyle,

  title: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  } as any,

  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  } as ViewStyle,

  loc: { fontSize: 12 } as any,

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  } as ViewStyle,

  statusText: { fontSize: 12 } as any,

  desc: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  } as any,

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
    gap: 6,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,

  actionText: { fontSize: 14 } as any,

  statusSection: { marginTop: 18 } as ViewStyle,
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 } as ViewStyle,
  statusOptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  statusOptTxt: { fontSize: 13 } as any,
});
