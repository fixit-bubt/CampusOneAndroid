import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet,
  Modal, Alert, RefreshControl, ActivityIndicator, KeyboardAvoidingView,
  Platform, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

interface Department {
  id: string;
  name: string;
  dept_number?: string | null;
}

interface Intake {
  id: string;
  department_id: string;
  number: number;
  years: string | null;
  is_public: boolean;
}

interface CrMember {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Section {
  id: string;
  intake_id: string;
  number: number;
  join_code: string | null;
  is_public: boolean;
  crs: CrMember[];
}

interface SectionRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_avatar: string | null;
  department_name: string;
  department_id: string;
  intake_number: number;
  section_number: number;
  reason: string | null;
  created_at: string;
}

interface StudentOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department?: string | null;
  intake?: string | number | null;
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const shortDept = (name = '') => name.replace(/^Department of\s+/i, '');

export function ManageStudyHubScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'catalogue' | 'pending'>('catalogue');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string>('');
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [expandedIntakeId, setExpandedIntakeId] = useState<string | null>(null);
  const [sectionsByIntake, setSectionsByIntake] = useState<Record<string, Section[]>>({});
  const [pendingRequests, setPendingRequests] = useState<SectionRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add intake sheet
  const [addIntakeOpen, setAddIntakeOpen] = useState(false);
  const [intakeNumInput, setIntakeNumInput] = useState('');
  const [intakeYearsInput, setIntakeYearsInput] = useState('');
  const [submittingIntake, setSubmittingIntake] = useState(false);

  // Add section sheet
  const [addSectionIntakeId, setAddSectionIntakeId] = useState<string | null>(null);
  const [secNumInput, setSecNumInput] = useState('');
  const [submittingSection, setSubmittingSection] = useState(false);

  // Assign CR sheet
  const [assignTargetSection, setAssignTargetSection] = useState<{ id: string; number: number; intakeNum: number } | null>(null);
  const [crSearch, setCrSearch] = useState('');
  const [studentResults, setStudentResults] = useState<StudentOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Reject request sheet
  const [rejectTarget, setRejectTarget] = useState<SectionRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name, dept_number')
      .order('name');
    if (data && data.length > 0) {
      setDepartments(data as Department[]);
      if (!activeDeptId) {
        setActiveDeptId(data[0].id);
      }
    }
  }, [activeDeptId]);

  const loadIntakes = useCallback(async (deptId: string) => {
    if (!deptId) return;
    const { data } = await supabase
      .from('study_intakes')
      .select('id, department_id, number, years, is_public')
      .eq('department_id', deptId)
      .order('number', { ascending: false });
    setIntakes((data ?? []) as Intake[]);
  }, []);

  const loadSections = useCallback(async (intakeId: string) => {
    const { data: secsData } = await supabase
      .from('study_sections')
      .select('id, intake_id, number, join_code, is_public')
      .eq('intake_id', intakeId)
      .order('number');

    if (!secsData || secsData.length === 0) {
      setSectionsByIntake(prev => ({ ...prev, [intakeId]: [] }));
      return;
    }

    const secIds = secsData.map(s => s.id);
    const { data: memsData } = await supabase
      .from('study_section_members')
      .select('id, section_id, user_id, profiles:profiles!user_id(full_name, avatar_url)')
      .in('section_id', secIds)
      .eq('role', 'cr')
      .eq('status', 'approved');

    const crMap: Record<string, CrMember[]> = {};
    secIds.forEach(id => { crMap[id] = []; });

    (memsData ?? []).forEach((m: any) => {
      if (crMap[m.section_id]) {
        crMap[m.section_id].push({
          id: m.id,
          user_id: m.user_id,
          full_name: m.profiles?.full_name ?? 'Unknown',
          avatar_url: m.profiles?.avatar_url ?? null,
        });
      }
    });

    const populated: Section[] = secsData.map(s => ({
      ...s,
      crs: crMap[s.id] ?? [],
    }));

    setSectionsByIntake(prev => ({ ...prev, [intakeId]: populated }));
  }, []);

  const loadPendingRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_section_requests')
      .select('id, requester_id, department_id, intake_number, section_number, reason, created_at, departments:department_id(name), profiles:profiles!requester_id(full_name, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !data) return;

    setPendingRequests(data.map((r: any) => ({
      id: r.id,
      requester_id: r.requester_id,
      requester_name: r.profiles?.full_name ?? 'Student',
      requester_avatar: r.profiles?.avatar_url ?? null,
      department_name: r.departments?.name ?? 'Department',
      department_id: r.department_id,
      intake_number: r.intake_number,
      section_number: r.section_number,
      reason: r.reason,
      created_at: r.created_at,
    })));
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([
        loadDepartments(),
        loadPendingRequests(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadDepartments, loadPendingRequests]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  useEffect(() => {
    if (activeDeptId) {
      setExpandedIntakeId(null);
      loadIntakes(activeDeptId);
    }
  }, [activeDeptId, loadIntakes]);

  // Debounced student search for CR assignment
  useEffect(() => {
    if (!assignTargetSection) {
      setStudentResults([]);
      return;
    }
    const q = crSearch.trim();
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      let queryBuilder = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, department, intake')
        .eq('role', 'student');

      if (q.length >= 2) {
        queryBuilder = queryBuilder.ilike('full_name', `%${q}%`);
      }

      const { data } = await queryBuilder.order('full_name').limit(15);
      setStudentResults((data ?? []) as StudentOption[]);
      setSearchLoading(false);
    }, q.length >= 2 ? 250 : 0);

    return () => clearTimeout(timer);
  }, [crSearch, assignTargetSection]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      loadDepartments(),
      activeDeptId ? loadIntakes(activeDeptId) : Promise.resolve(),
      loadPendingRequests(),
    ]);
    if (expandedIntakeId) {
      await loadSections(expandedIntakeId);
    }
    setRefreshing(false);
  }

  async function copyJoinCode(code: string | null) {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    toast({ type: 'info', title: 'Copied', message: `Join code ${code} copied.` });
  }

  async function handleAddIntake() {
    const num = parseInt(intakeNumInput, 10);
    if (!Number.isInteger(num) || num <= 0) {
      toast({ type: 'error', title: 'Invalid', message: 'Enter a valid intake number.' });
      return;
    }
    if (!activeDeptId) return;

    setSubmittingIntake(true);
    try {
      const { error } = await supabase.from('study_intakes').insert({
        department_id: activeDeptId,
        number: num,
        years: intakeYearsInput.trim() || null,
      });
      if (error) {
        toast({
          type: 'error',
          title: 'Error',
          message: error.code === '23505' ? 'That intake already exists.' : error.message,
        });
        return;
      }
      toast({ type: 'success', title: 'Intake added', message: `Intake ${num}` });
      setAddIntakeOpen(false);
      setIntakeNumInput('');
      setIntakeYearsInput('');
      await loadIntakes(activeDeptId);
    } finally {
      setSubmittingIntake(false);
    }
  }

  async function handleAddSection() {
    if (!addSectionIntakeId) return;
    const num = parseInt(secNumInput, 10);
    if (!Number.isInteger(num) || num <= 0) {
      toast({ type: 'error', title: 'Invalid', message: 'Enter a valid section number.' });
      return;
    }

    setSubmittingSection(true);
    try {
      const { error } = await supabase.from('study_sections').insert({
        intake_id: addSectionIntakeId,
        number: num,
      });
      if (error) {
        toast({
          type: 'error',
          title: 'Error',
          message: error.code === '23505' ? 'That section already exists.' : error.message,
        });
        return;
      }
      toast({ type: 'success', title: 'Section added', message: `Section ${num}` });
      const currentIntake = addSectionIntakeId;
      setAddSectionIntakeId(null);
      setSecNumInput('');
      await loadSections(currentIntake);
    } finally {
      setSubmittingSection(false);
    }
  }

  async function handleAssignCr(student: StudentOption) {
    if (!assignTargetSection) return;
    const secId = assignTargetSection.id;

    // Single section constraint: remove existing memberships in other sections
    await supabase
      .from('study_section_members')
      .delete()
      .eq('user_id', student.id)
      .neq('section_id', secId);

    const { error } = await supabase
      .from('study_section_members')
      .upsert(
        { section_id: secId, user_id: student.id, role: 'cr', status: 'approved' },
        { onConflict: 'section_id,user_id' }
      );

    if (error) {
      toast({ type: 'error', title: 'Error', message: error.message });
      return;
    }

    toast({ type: 'success', title: 'CR assigned', message: student.full_name });
    setAssignTargetSection(null);
    setCrSearch('');
    if (expandedIntakeId) {
      await loadSections(expandedIntakeId);
    }
  }

  function confirmRemoveCr(cr: CrMember, secNum: number) {
    Alert.alert(
      'Remove CR Role?',
      `Remove ${cr.full_name} as CR of Section ${secNum}? They will stay as an approved member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove CR',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('study_section_members')
              .update({ role: 'member' })
              .eq('id', cr.id);

            if (error) {
              toast({ type: 'error', title: 'Error', message: error.message });
              return;
            }
            toast({ type: 'success', title: 'CR removed', message: cr.full_name });
            if (expandedIntakeId) {
              await loadSections(expandedIntakeId);
            }
          },
        },
      ]
    );
  }

  function confirmDeleteSection(secId: string, secNum: number) {
    Alert.alert(
      `Delete Section ${secNum}?`,
      'This will permanently delete this section and all associated memberships.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('study_sections')
              .delete()
              .eq('id', secId);

            if (error) {
              toast({ type: 'error', title: 'Error', message: error.message });
              return;
            }
            toast({ type: 'success', title: 'Section deleted' });
            if (expandedIntakeId) {
              await loadSections(expandedIntakeId);
            }
          },
        },
      ]
    );
  }

  async function handleApproveRequest(req: SectionRequest) {
    setProcessingId(req.id);
    try {
      const { data, error } = await supabase.rpc('approve_section_request', {
        p_request_id: req.id,
      });
      const res = data as { ok?: boolean; error?: string; joinCode?: string } | null;
      if (error) {
        toast({ type: 'error', title: 'Error', message: error.message });
        return;
      }
      if (res && res.ok === false) {
        toast({ type: 'error', title: 'Error', message: res.error ?? 'Approval failed' });
        return;
      }

      toast({
        type: 'success',
        title: 'Section approved',
        message: `Section ${req.section_number} ready. Join code: ${res?.joinCode ?? 'created'}`,
      });

      setPendingRequests(prev => prev.filter(r => r.id !== req.id));

      if (activeDeptId) {
        await loadIntakes(activeDeptId);
        if (expandedIntakeId) {
          await loadSections(expandedIntakeId);
        }
      }
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectRequest() {
    if (!rejectTarget) return;
    const reqId = rejectTarget.id;
    setProcessingId(reqId);
    try {
      const { data, error } = await supabase.rpc('reject_section_request', {
        p_request_id: reqId,
        p_note: rejectNote.trim() || '',
      });
      const res = data as { ok?: boolean; error?: string } | null;
      if (error) {
        toast({ type: 'error', title: 'Error', message: error.message });
        return;
      }
      if (res && res.ok === false) {
        toast({ type: 'error', title: 'Error', message: res.error ?? 'Rejection failed' });
        return;
      }

      toast({ type: 'success', title: 'Request rejected' });
      setPendingRequests(prev => prev.filter(r => r.id !== reqId));
      setRejectTarget(null);
      setRejectNote('');
    } finally {
      setProcessingId(null);
    }
  }

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Study Hub" onBack={() => navigation.goBack()} />
        <View style={styles.centerBox}>
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>
            {t.manage?.accessDenied ?? 'Admin access required'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.dash?.manageStudyHub ?? 'Study Hub'}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: C.brand }]}
            onPress={() => {
              setIntakeNumInput('');
              setIntakeYearsInput('');
              setAddIntakeOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={13} color="#fff" />
            <Text style={[styles.newBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {t.study2?.addIntake ?? 'Add Intake'}
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: Layout.screenPadding, marginTop: 6, marginBottom: 10 }}>
        <SegmentedTabs
          size="sm"
          tabs={[
            { id: 'catalogue', label: t.study2?.catalogue ?? 'Catalogue', icon: 'book' },
            { id: 'pending', label: 'Pending Requests', icon: 'clock', count: pendingRequests.length },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} colors={[C.brand]} />}
      >
        {activeTab === 'catalogue' ? (
          <>
            {/* Department chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.deptScroll}
            >
              {departments.map(d => {
                const isSelected = d.id === activeDeptId;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.deptChip,
                      {
                        backgroundColor: isSelected ? C.brand : C.surface,
                        borderColor: isSelected ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => setActiveDeptId(d.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.deptChipTxt,
                        {
                          color: isSelected ? '#fff' : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {shortDept(d.name)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loading && intakes.length === 0 ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={C.brand} />
              </View>
            ) : intakes.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Icon name="study" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.study2?.noIntakesForDept ?? 'No intakes for this department'}
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Tap "+ Add Intake" above to set up the first intake.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 4 }}>
                {intakes.map(ik => {
                  const isOpen = expandedIntakeId === ik.id;
                  const sections = sectionsByIntake[ik.id] ?? [];

                  return (
                    <View key={ik.id} style={[styles.intakeCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                      {/* 72dp Intake Bar */}
                      <TouchableOpacity
                        style={styles.intakeBar72}
                        onPress={() => {
                          if (isOpen) {
                            setExpandedIntakeId(null);
                          } else {
                            setExpandedIntakeId(ik.id);
                            if (!sectionsByIntake[ik.id]) {
                              loadSections(ik.id);
                            }
                          }
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={styles.iconSlot32}>
                          <Icon name="study" size={32} color={C.text} />
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <Text style={[styles.intakeTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            Intake {ik.number}
                          </Text>
                          <Text style={[styles.intakeSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                            {ik.years ?? 'No year set'} · {ik.is_public ? (t.study2?.public ?? 'Public') : (t.study2?.private ?? 'Private')}
                          </Text>
                        </View>
                        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
                      </TouchableOpacity>

                      {/* Expanded Section List */}
                      {isOpen && (
                        <View style={[styles.sectionArea, { borderTopColor: C.border }]}>
                          {sections.length === 0 ? (
                            <Text style={[styles.noSectionsTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                              No sections added yet in Intake {ik.number}.
                            </Text>
                          ) : (
                            sections.map(sec => (
                              <View key={sec.id} style={[styles.secRow, { backgroundColor: C.bg, borderColor: C.border }]}>
                                {/* Top info: Sec Number + Join Code + Delete */}
                                <View style={styles.secHeader}>
                                  <Text style={[styles.secTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                                    Section {sec.number}
                                  </Text>
                                  {sec.join_code && (
                                    <TouchableOpacity
                                      style={[styles.codePill, { backgroundColor: C.surface2, borderColor: C.border }]}
                                      onPress={() => copyJoinCode(sec.join_code)}
                                      activeOpacity={0.75}
                                    >
                                      <Text style={[styles.codeTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                                        {sec.join_code}
                                      </Text>
                                      <Feather name="copy" size={11} color={C.textMuted} />
                                    </TouchableOpacity>
                                  )}
                                  <TouchableOpacity
                                    style={styles.trashBtn}
                                    onPress={() => confirmDeleteSection(sec.id, sec.number)}
                                    activeOpacity={0.75}
                                  >
                                    <Feather name="trash-2" size={15} color={C.danger} />
                                  </TouchableOpacity>
                                </View>

                                {/* CRs line */}
                                <View style={styles.crWrap}>
                                  <Text style={[styles.crLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                                    CR:
                                  </Text>
                                  {sec.crs.length === 0 ? (
                                    <Text style={[styles.noCrTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                                      None assigned
                                    </Text>
                                  ) : (
                                    sec.crs.map(cr => (
                                      <View key={cr.id} style={[styles.crBadge, { backgroundColor: C.surface, borderColor: C.border }]}>
                                        <Avatar name={cr.full_name} uri={cr.avatar_url} size="xs" />
                                        <Text style={[styles.crBadgeTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                                          {cr.full_name}
                                        </Text>
                                        <TouchableOpacity
                                          onPress={() => confirmRemoveCr(cr, sec.number)}
                                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                        >
                                          <Feather name="x" size={12} color={C.danger} />
                                        </TouchableOpacity>
                                      </View>
                                    ))
                                  )}

                                  <TouchableOpacity
                                    style={[styles.assignCrBtn, { backgroundColor: C.infoBg }]}
                                    onPress={() => {
                                      setCrSearch('');
                                      setAssignTargetSection({ id: sec.id, number: sec.number, intakeNum: ik.number });
                                    }}
                                    activeOpacity={0.75}
                                  >
                                    <Feather name="user-plus" size={12} color={C.info} />
                                    <Text style={[styles.assignCrBtnTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>
                                      {sec.crs.length > 0 ? '+ Add CR' : '+ Assign CR'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))
                          )}

                          {/* Add section button */}
                          <TouchableOpacity
                            style={[styles.addSecBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                            onPress={() => {
                              setSecNumInput('');
                              setAddSectionIntakeId(ik.id);
                            }}
                            activeOpacity={0.75}
                          >
                            <Feather name="plus" size={14} color={C.text} />
                            <Text style={[styles.addSecBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                              Add Section to Intake {ik.number}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          /* Pending Requests Tab */
          <View>
            {pendingRequests.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
                <Feather name="check-circle" size={32} color={C.success} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.study2?.allClear ?? 'All Clear'}
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  No pending section creation requests from students.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 11, marginTop: 6 }}>
                {pendingRequests.map(req => {
                  const isBusy = processingId === req.id;
                  return (
                    <View key={req.id} style={[styles.requestCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                      {/* Top Header */}
                      <View style={styles.reqTopRow}>
                        <Avatar uri={req.requester_avatar} name={req.requester_name} size="md" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.reqName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {req.requester_name}
                          </Text>
                          <Text style={[styles.reqMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                            {shortDept(req.department_name)} · Intake {req.intake_number} · Sec {req.section_number}
                          </Text>
                        </View>
                        <Text style={[styles.reqTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {timeAgo(req.created_at)}
                        </Text>
                      </View>

                      {/* Optional reason */}
                      {req.reason ? (
                        <View style={[styles.reasonBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
                          <Text style={[styles.reasonTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                            "{req.reason}"
                          </Text>
                        </View>
                      ) : null}

                      {/* Actions */}
                      <View style={styles.reqActions}>
                        <TouchableOpacity
                          style={[styles.rejectBtn, { backgroundColor: C.dangerBg }]}
                          onPress={() => setRejectTarget(req)}
                          disabled={isBusy}
                          activeOpacity={0.75}
                        >
                          <Feather name="x" size={14} color={C.danger} />
                          <Text style={[styles.rejectBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                            {t.study2?.reject ?? 'Reject'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.approveBtn, { backgroundColor: C.brand }]}
                          onPress={() => handleApproveRequest(req)}
                          disabled={isBusy}
                          activeOpacity={0.8}
                        >
                          {isBusy ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Feather name="check" size={14} color="#fff" />
                              <Text style={[styles.approveBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                                {t.study2?.approve ?? 'Approve'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Add Intake Sheet */}
      <Modal visible={addIntakeOpen} animationType="slide" transparent onRequestClose={() => setAddIntakeOpen(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAddIntakeOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.study2?.addIntake ?? 'Add Intake'}
            </Text>

            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.study2?.intakeNumber ?? 'INTAKE NUMBER'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={intakeNumInput}
              onChangeText={val => setIntakeNumInput(val.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="e.g. 52"
              placeholderTextColor={C.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.study2?.yearsOptional ?? 'YEARS (OPTIONAL)'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={intakeYearsInput}
              onChangeText={setIntakeYearsInput}
              placeholder="e.g. 2023-2024"
              placeholderTextColor={C.textMuted}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: C.brand }]}
              onPress={handleAddIntake}
              disabled={submittingIntake}
              activeOpacity={0.8}
            >
              {submittingIntake ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={[styles.submitBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.study2?.addIntake ?? 'Add Intake'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Section Sheet */}
      <Modal visible={!!addSectionIntakeId} animationType="slide" transparent onRequestClose={() => setAddSectionIntakeId(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAddSectionIntakeId(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.study2?.addSection ?? 'Add Section'}
            </Text>

            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.study2?.sectionNumber ?? 'SECTION NUMBER'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={secNumInput}
              onChangeText={val => setSecNumInput(val.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="e.g. 1"
              placeholderTextColor={C.textMuted}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: C.brand }]}
              onPress={handleAddSection}
              disabled={submittingSection}
              activeOpacity={0.8}
            >
              {submittingSection ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={[styles.submitBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.study2?.addSection ?? 'Add Section'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Assign CR Sheet */}
      <Modal visible={!!assignTargetSection} animationType="slide" transparent onRequestClose={() => setAssignTargetSection(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAssignTargetSection(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '80%' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {assignTargetSection ? `Assign CR — Intake ${assignTargetSection.intakeNum} · Sec ${assignTargetSection.number}` : 'Assign CR'}
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={crSearch}
              onChangeText={setCrSearch}
              placeholder={t.study2?.searchStudents ?? 'Search students…'}
              placeholderTextColor={C.textMuted}
            />

            {searchLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.brand} />
              </View>
            ) : studentResults.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 13 }}>
                  No students found.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
                {studentResults.map(st => (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.studentRow, { borderBottomColor: C.border }]}
                    onPress={() => handleAssignCr(st)}
                    activeOpacity={0.75}
                  >
                    <Avatar uri={st.avatar_url} name={st.full_name} size="sm" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.studentName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {st.full_name}
                      </Text>
                      <Text style={[styles.studentMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {st.department ?? 'Student'}{st.intake ? ` · Intake ${st.intake}` : ''}
                      </Text>
                    </View>
                    <Feather name="user-check" size={17} color={C.brand} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject Request Sheet */}
      <Modal visible={!!rejectTarget} animationType="slide" transparent onRequestClose={() => setRejectTarget(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setRejectTarget(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.sheetTitle, { color: C.danger, fontFamily: FontFamily.jakartaExtraBold }]}>
              Reject Section Request
            </Text>
            {rejectTarget && (
              <Text style={[styles.rejectTargetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {rejectTarget.requester_name} — Intake {rejectTarget.intake_number} · Section {rejectTarget.section_number}
              </Text>
            )}

            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              NOTE FOR STUDENT (OPTIONAL)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: C.bg,
                  borderColor: C.border,
                  color: C.text,
                  fontFamily: FontFamily.jakartaMedium,
                  height: 72,
                  textAlignVertical: 'top',
                  paddingTop: 10,
                },
              ]}
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder="e.g. This section already exists in the catalogue."
              placeholderTextColor={C.textMuted}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: C.danger }]}
              onPress={handleRejectRequest}
              disabled={processingId === rejectTarget?.id}
              activeOpacity={0.8}
            >
              {processingId === rejectTarget?.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.submitBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  Confirm Rejection
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 24 } as ViewStyle,
  centerBox: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
  } as ViewStyle,
  newBtnTxt: { fontSize: 12.5 } as any,

  deptScroll: {
    gap: 8,
    paddingBottom: 8,
  } as ViewStyle,
  deptChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,
  deptChipTxt: { fontSize: 12.5 } as any,

  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  } as ViewStyle,
  emptyTitle: { fontSize: 15, textAlign: 'center' } as any,
  emptySub: { fontSize: 12.5, textAlign: 'center' } as any,

  intakeCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,

  intakeBar72: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 13,
  } as ViewStyle,
  iconSlot32: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  intakeTitle: { fontSize: 15.5, lineHeight: 21 } as any,
  intakeSub: { fontSize: 12, marginTop: 2 } as any,

  sectionArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 9,
  } as ViewStyle,
  noSectionsTxt: { fontSize: 12.5, paddingVertical: 6 } as any,

  secRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 9,
  } as ViewStyle,
  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  secTitle: { fontSize: 14.5, flex: 1 } as any,
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  codeTxt: { fontSize: 11, letterSpacing: 0.5 } as any,
  trashBtn: {
    padding: 5,
  } as ViewStyle,

  crWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  crLabel: { fontSize: 11 } as any,
  noCrTxt: { fontSize: 12, fontStyle: 'italic' } as any,
  crBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: '75%',
  } as ViewStyle,
  crBadgeTxt: { fontSize: 11.5 } as any,
  assignCrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  assignCrBtnTxt: { fontSize: 11 } as any,

  addSecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  } as ViewStyle,
  addSecBtnTxt: { fontSize: 13 } as any,

  /* Pending requests */
  requestCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  } as ViewStyle,
  reqTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  } as ViewStyle,
  reqName: { fontSize: 14.5 } as any,
  reqMeta: { fontSize: 12, marginTop: 2 } as any,
  reqTime: { fontSize: 11, flexShrink: 0 } as any,
  reasonBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  reasonTxt: { fontSize: 12, lineHeight: 17 } as any,
  reqActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 4,
  } as ViewStyle,
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  } as ViewStyle,
  rejectBtnTxt: { fontSize: 13 } as any,
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  } as ViewStyle,
  approveBtnTxt: { fontSize: 13 } as any,

  /* Sheets & Modals */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 36,
  } as ViewStyle,
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 17,
    marginBottom: 14,
  } as any,
  rejectTargetSub: {
    fontSize: 12.5,
    marginBottom: 12,
  } as any,
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 6,
  } as any,
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 14,
    marginBottom: 14,
  } as any,
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 48,
    borderRadius: 12,
    marginTop: 4,
  } as ViewStyle,
  submitBtnTxt: { fontSize: 14 } as any,

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  studentName: { fontSize: 14 } as any,
  studentMeta: { fontSize: 12, marginTop: 2 } as any,
});
