import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, FlatList, StyleSheet,
  Modal, Alert, RefreshControl, ActivityIndicator, KeyboardAvoidingView,
  Platform, BackHandler, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  student_id?: string | null;
}

type DrillLevel = 'intakes' | 'sections' | 'section_room';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function getDeptIcon(name: string): keyof typeof Feather.glyphMap {
  const s = (name ?? '').toLowerCase();
  if (s.includes('computer') || s.includes('cse') || s.includes('data')) return 'cpu';
  if (s.includes('electrical') || s.includes('eee') || s.includes('electronic')) return 'zap';
  if (s.includes('business') || s.includes('bba') || s.includes('accounting') || s.includes('management') || s.includes('marketing') || s.includes('finance')) return 'briefcase';
  if (s.includes('civil')) return 'tool';
  if (s.includes('textile')) return 'layers';
  if (s.includes('english')) return 'book-open';
  if (s.includes('law') || s.includes('justice')) return 'shield';
  if (s.includes('economics')) return 'trending-up';
  if (s.includes('math') || s.includes('statistic')) return 'grid';
  return 'award';
}

const shortDept = (name = '') => name.replace(/^Department of\s+/i, '');

export function ManageStudyHubScreen({ navigation }: any) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'catalogue' | 'pending'>('catalogue');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string>('');
  const [deptPickerVisible, setDeptPickerVisible] = useState(false);
  const [intakes, setIntakes] = useState<Intake[]>([]);

  // Multi-Page Drill-Down State Machine
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('intakes');
  const [selectedIntake, setSelectedIntake] = useState<Intake | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  const [sectionsByIntake, setSectionsByIntake] = useState<Record<string, Section[]>>({});
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});
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

  // Full-Page Assign CR
  const [assignTargetSection, setAssignTargetSection] = useState<{ id: string; number: number; intakeNum: number } | null>(null);
  const [crSearch, setCrSearch] = useState('');
  const [studentResults, setStudentResults] = useState<StudentOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Reject request sheet
  const [rejectTarget, setRejectTarget] = useState<SectionRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const activeDept = useMemo(() => departments.find(d => d.id === activeDeptId), [departments, activeDeptId]);
  const targetIntakeForSection = useMemo(() => intakes.find(i => i.id === addSectionIntakeId) ?? selectedIntake, [intakes, addSectionIntakeId, selectedIntake]);

  // Keep selectedSection synchronized when sectionsByIntake updates
  useEffect(() => {
    if (selectedSection && selectedIntake) {
      const currentList = sectionsByIntake[selectedIntake.id];
      if (currentList) {
        const fresh = currentList.find(s => s.id === selectedSection.id);
        if (fresh) setSelectedSection(fresh);
      }
    }
  }, [sectionsByIntake, selectedIntake]);

  // Hardware Back Button Handler for seamless Android navigation
  useEffect(() => {
    const backAction = () => {
      if (assignTargetSection) {
        setAssignTargetSection(null);
        return true;
      }
      if (drillLevel === 'section_room') {
        setDrillLevel('sections');
        return true;
      }
      if (drillLevel === 'sections') {
        setDrillLevel('intakes');
        setSelectedIntake(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [assignTargetSection, drillLevel]);

  // Load Departments without activeDeptId in dependency array to break re-render loops
  const loadDepartments = useCallback(async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name, dept_number')
      .order('name');
    if (data && data.length > 0) {
      setDepartments(data as Department[]);
      setActiveDeptId(prev => prev || data[0].id);
    }
  }, []);

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
    setLoadingSections(prev => ({ ...prev, [intakeId]: true }));
    try {
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
    } finally {
      setLoadingSections(prev => ({ ...prev, [intakeId]: false }));
    }
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
      setDrillLevel('intakes');
      setSelectedIntake(null);
      setSelectedSection(null);
      loadIntakes(activeDeptId);
    }
  }, [activeDeptId, loadIntakes]);

  // Scoped student search for CR assignment (strictly filtered to target intake, zero cross-intake dump)
  useEffect(() => {
    if (!assignTargetSection) {
      setStudentResults([]);
      setSearchLoading(false);
      return;
    }
    const q = crSearch.trim();
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      let queryBuilder = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, department, intake, student_id')
        .eq('role', 'student')
        .eq('intake', String(assignTargetSection.intakeNum));

      if (q.length > 0) {
        queryBuilder = queryBuilder.or(`full_name.ilike.%${q}%,student_id.ilike.%${q}%`);
      }

      const { data } = await queryBuilder.order('full_name').limit(25);
      setStudentResults((data ?? []) as StudentOption[]);
      setSearchLoading(false);
    }, q.length > 0 ? 250 : 0);

    return () => clearTimeout(timer);
  }, [crSearch, assignTargetSection]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      loadDepartments(),
      activeDeptId ? loadIntakes(activeDeptId) : Promise.resolve(),
      loadPendingRequests(),
    ]);
    if (selectedIntake) {
      await loadSections(selectedIntake.id);
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
    const targetIntakeId = addSectionIntakeId || selectedIntake?.id;
    if (!targetIntakeId) return;
    const num = parseInt(secNumInput, 10);
    if (!Number.isInteger(num) || num <= 0) {
      toast({ type: 'error', title: 'Invalid', message: 'Enter a valid section number.' });
      return;
    }

    setSubmittingSection(true);
    try {
      const code = generateJoinCode();
      const { error } = await supabase
        .from('study_sections')
        .insert({
          intake_id: targetIntakeId,
          number: num,
          is_public: true,
          join_code: code,
        })
        .select('id, intake_id, number');

      if (error) {
        toast({
          type: 'error',
          title: 'Error',
          message: error.code === '23505' ? `Section ${num} already exists in this intake.` : (error.message || 'Failed to create section'),
        });
        return;
      }
      toast({ type: 'success', title: 'Section added', message: `Section ${num}` });
      setAddSectionIntakeId(null);
      setSecNumInput('');
      await loadSections(targetIntakeId);
    } finally {
      setSubmittingSection(false);
    }
  }

  function confirmDeleteIntake(intakeId: string, intakeNum: number) {
    Alert.alert(
      `Delete Intake ${intakeNum}?`,
      'This will permanently delete this intake and all associated sections and class materials.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('study_intakes')
              .delete()
              .eq('id', intakeId);

            if (error) {
              toast({ type: 'error', title: 'Error', message: error.message });
              return;
            }
            toast({ type: 'success', title: 'Intake deleted', message: `Intake ${intakeNum}` });
            setIntakes(prev => prev.filter(i => i.id !== intakeId));
            setSectionsByIntake(prev => {
              const next = { ...prev };
              delete next[intakeId];
              return next;
            });
            if (selectedIntake?.id === intakeId) {
              setSelectedIntake(null);
              setSelectedSection(null);
              setDrillLevel('intakes');
            }
          },
        },
      ]
    );
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
    if (selectedIntake) {
      await loadSections(selectedIntake.id);
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
            if (selectedIntake) {
              await loadSections(selectedIntake.id);
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
            toast({ type: 'success', title: 'Section deleted', message: `Section ${secNum}` });
            if (selectedIntake) {
              setSectionsByIntake(prev => ({
                ...prev,
                [selectedIntake.id]: (prev[selectedIntake.id] ?? []).filter(s => s.id !== secId),
              }));
              await loadSections(selectedIntake.id);
            }
            if (selectedSection?.id === secId) {
              setSelectedSection(null);
              setDrillLevel('sections');
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

      if (activeDeptId === req.department_id) {
        await loadIntakes(activeDeptId);
        if (selectedIntake) {
          await loadSections(selectedIntake.id);
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

  // ---------------------------------------------------------------------------
  // PAGE 3: INSIDE SECTION ROOM (Strict 58dp Bars & Clean Title Architecture)
  // ---------------------------------------------------------------------------
  if (drillLevel === 'section_room' && selectedIntake && selectedSection) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar
          title={`Section ${selectedSection.number}`}
          onBack={() => {
            setSelectedSection(null);
            setDrillLevel('sections');
          }}
          right={
            <TouchableOpacity
              onPress={() => confirmDeleteSection(selectedSection.id, selectedSection.number)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={18} color={C.textMuted} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. 58dp Join Code Bar with 1-Tap Copy */}
          <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
            <View style={styles.iconSlot32}>
              <Feather name="key" size={32} color={C.text} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                Join Code: {selectedSection.join_code ?? 'None'}
              </Text>
            </View>
            {selectedSection.join_code ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => copyJoinCode(selectedSection.join_code)}
                activeOpacity={0.75}
              >
                <Feather name="copy" size={14} color={C.text} />
                <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Copy
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 2. Active CR Bars (58dp each with avatar & remove button) */}
          {selectedSection.crs.length === 0 ? (
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
              <View style={styles.iconSlot32}>
                <Feather name="user" size={32} color={C.textMuted} />
              </View>
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <Text style={[styles.barTitleTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  No CR Assigned
                </Text>
              </View>
            </View>
          ) : (
            selectedSection.crs.map(cr => (
              <View key={cr.id} style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
                <Avatar name={cr.full_name} uri={cr.avatar_url} size="sm" />
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', marginLeft: 10 }}>
                  <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {cr.full_name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => confirmRemoveCr(cr, selectedSection.number)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* 3. Add CR Bar (58dp - opens Page 4 Full Page) */}
          <TouchableOpacity
            style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}
            onPress={() => {
              setCrSearch('');
              setAssignTargetSection({
                id: selectedSection.id,
                number: selectedSection.number,
                intakeNum: selectedIntake.number,
              });
            }}
            activeOpacity={0.75}
          >
            <View style={styles.iconSlot32}>
              <Feather name="user-plus" size={32} color={C.text} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {selectedSection.crs.length > 0 ? '+ Add Co-CR' : '+ Assign Class Representative'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* 4. Delete Section Bar (58dp) */}
          <TouchableOpacity
            style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => confirmDeleteSection(selectedSection.id, selectedSection.number)}
            activeOpacity={0.75}
          >
            <View style={styles.iconSlot32}>
              <Feather name="trash-2" size={32} color={C.textMuted} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                Delete Section {selectedSection.number}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </ScrollView>

        {/* Dedicated Full Page Assign CR Modal */}
        {renderAssignCrModal()}
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // PAGE 2: INTAKE SECTIONS FULL PAGE (Top 58dp "+ Add Section" & 58dp Section Bars)
  // ---------------------------------------------------------------------------
  if (drillLevel === 'sections' && selectedIntake) {
    const sections = sectionsByIntake[selectedIntake.id] ?? [];
    const isSectionsLoading = loadingSections[selectedIntake.id];

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar
          title={`Intake ${selectedIntake.number}`}
          onBack={() => {
            setSelectedIntake(null);
            setDrillLevel('intakes');
          }}
          right={
            <TouchableOpacity
              onPress={() => confirmDeleteIntake(selectedIntake.id, selectedIntake.number)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={18} color={C.textMuted} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadSections(selectedIntake.id);
                setRefreshing(false);
              }}
              tintColor={C.textMuted}
              colors={[C.textMuted]}
            />
          }
        >
          {/* TOP BUTTON BAR 58 SIZE: SAYS "ADD SECTION" */}
          <TouchableOpacity
            style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, justifyContent: 'center', marginBottom: 10 }]}
            onPress={() => {
              const currentList = sectionsByIntake[selectedIntake.id] ?? [];
              const nextNum = currentList.length > 0 ? Math.max(...currentList.map(s => s.number)) + 1 : 1;
              setSecNumInput(String(nextNum));
              setAddSectionIntakeId(selectedIntake.id);
            }}
            activeOpacity={0.75}
          >
            <View style={styles.iconSlot32}>
              <Feather name="plus" size={22} color={C.text} />
            </View>
            <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Add Section to Intake {selectedIntake.number}
            </Text>
          </TouchableOpacity>

          {isSectionsLoading && sections.length === 0 ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={C.text} />
            </View>
          ) : sections.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: C.surface, borderColor: C.border, marginTop: 4 }]}>
              <Icon name="study" size={32} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                No sections in Intake {selectedIntake.number}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {sections.map(sec => {
                return (
                  <TouchableOpacity
                    key={sec.id}
                    style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => {
                      setSelectedSection(sec);
                      setDrillLevel('section_room');
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconSlot32}>
                      <Feather name="grid" size={32} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        Section {sec.number}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Add Section Sheet */}
        {renderAddSectionModal()}

        {/* Dedicated Full Page Assign CR Modal */}
        {renderAssignCrModal()}
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // PAGE 1: INTAKES LIST (Strict 58dp Bars & Clean Title Architecture)
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.dash?.manageStudyHub ?? 'Study Hub'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textMuted} colors={[C.textMuted]} />}
      >
        <View style={{ marginTop: 6, marginBottom: 12 }}>
          <SegmentedTabs
            size="md"
            tabs={[
              { id: 'catalogue', label: t.study2?.catalogue ?? 'Catalogue' },
              { id: 'pending', label: 'Pending Requests', count: pendingRequests.length },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </View>
        {activeTab === 'catalogue' ? (
          <>
            {/* 58dp Department Dropdown Bar */}
            <TouchableOpacity
              style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}
              onPress={() => setDeptPickerVisible(true)}
              activeOpacity={0.75}
            >
              <View style={styles.iconSlot32}>
                <Feather name={getDeptIcon(activeDept?.name ?? '')} size={32} color={C.text} />
              </View>
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {activeDept ? shortDept(activeDept.name) : (t.faculty2?.selectDepartment ?? 'Select Department')}
                </Text>
              </View>
              <Feather name="chevron-down" size={18} color={C.textMuted} />
            </TouchableOpacity>

            {/* 58dp Add Intake Bar */}
            <TouchableOpacity
              style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, justifyContent: 'center', gap: 8, marginBottom: 10 }]}
              onPress={() => {
                setIntakeNumInput('');
                setIntakeYearsInput('');
                setAddIntakeOpen(true);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.iconSlot32}>
                <Feather name="plus" size={22} color={C.text} />
              </View>
              <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.study2?.addIntake ?? 'Add Intake'}
              </Text>
            </TouchableOpacity>

            {loading && intakes.length === 0 ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={C.text} />
              </View>
            ) : intakes.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Icon name="study" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.study2?.noIntakesForDept ?? 'No intakes for this department'}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {intakes.map(ik => {
                  const secCount = sectionsByIntake[ik.id]?.length;
                  return (
                    <TouchableOpacity
                      key={ik.id}
                      style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={() => {
                        setSelectedIntake(ik);
                        setDrillLevel('sections');
                        loadSections(ik.id);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.iconSlot32}>
                        <Icon name="study" size={32} color={C.text} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                        <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          Intake {ik.number}
                        </Text>
                      </View>
                      {secCount !== undefined ? (
                        <View style={[styles.countPill, { backgroundColor: C.surface2, borderColor: C.border }]}>
                          <Text style={[styles.countPillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                            {secCount} {secCount === 1 ? 'Sec' : 'Secs'}
                          </Text>
                        </View>
                      ) : null}
                      <Feather name="chevron-right" size={18} color={C.textMuted} />
                    </TouchableOpacity>
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
                <Feather name="check-circle" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.study2?.allClear ?? 'All Clear'}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 6 }}>
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
                          <Text style={[styles.reasonTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                            "{req.reason}"
                          </Text>
                        </View>
                      ) : null}

                      {/* Actions */}
                      <View style={styles.reqActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { flex: 1, height: 42, backgroundColor: C.surface2, borderColor: C.border }]}
                          onPress={() => setRejectTarget(req)}
                          disabled={isBusy}
                          activeOpacity={0.75}
                        >
                          <Feather name="x" size={16} color={C.text} />
                          <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {t.study2?.reject ?? 'Reject'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { flex: 1, height: 42, backgroundColor: C.surface2, borderColor: C.border }]}
                          onPress={() => handleApproveRequest(req)}
                          disabled={isBusy}
                          activeOpacity={0.8}
                        >
                          {isBusy ? (
                            <ActivityIndicator size="small" color={C.text} />
                          ) : (
                            <>
                              <Feather name="check" size={16} color={C.text} />
                              <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
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

      {/* Add Intake Modal Sheet */}
      <Modal
        visible={addIntakeOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddIntakeOpen(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAddIntakeOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '85%' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 0 }]}>
                {t.study2?.addIntake ?? 'Add Intake'}
              </Text>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setAddIntakeOpen(false)}
                activeOpacity={0.75}
              >
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 12, 24) }}
            >
              <Text style={[styles.modalFieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                INTAKE NUMBER
              </Text>
              <View style={[styles.bar58, { backgroundColor: C.surface2, borderColor: C.border, marginBottom: 12 }]}>
                <View style={styles.iconSlot32}>
                  <Feather name="hash" size={24} color={C.text} />
                </View>
                <TextInput
                  style={[styles.inputBarTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                  value={intakeNumInput}
                  onChangeText={val => setIntakeNumInput(val.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  placeholder="Intake number"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <Text style={[styles.modalFieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                YEARS (OPTIONAL)
              </Text>
              <View style={[styles.bar58, { backgroundColor: C.surface2, borderColor: C.border, marginBottom: 12 }]}>
                <View style={styles.iconSlot32}>
                  <Feather name="calendar" size={24} color={C.text} />
                </View>
                <TextInput
                  style={[styles.inputBarTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={intakeYearsInput}
                  onChangeText={setIntakeYearsInput}
                  placeholder="2023 - 2027"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.bar58,
                  {
                    backgroundColor: C.surface2,
                    borderColor: C.border,
                    justifyContent: 'center',
                    marginTop: 8,
                    opacity: intakeNumInput.trim() && !submittingIntake ? 1 : 0.6,
                  },
                ]}
                onPress={handleAddIntake}
                disabled={!intakeNumInput.trim() || submittingIntake}
                activeOpacity={0.8}
              >
                {submittingIntake ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <>
                    <Feather name="plus" size={20} color={C.text} />
                    <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {t.study2?.addIntake ?? 'Add Intake'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Section Sheet */}
      {renderAddSectionModal()}

      {/* Dedicated Full Page Assign CR Modal */}
      {renderAssignCrModal()}

      {/* Reject Request Sheet */}
      <Modal
        visible={!!rejectTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectTarget(null)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setRejectTarget(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '85%' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 0 }]}>
                Reject Section Request
              </Text>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setRejectTarget(null)}
                activeOpacity={0.75}
              >
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 12, 24) }}
            >
              <Text style={[styles.modalFieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                NOTE FOR STUDENT (OPTIONAL)
              </Text>
              <View style={[styles.rejectNoteBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <TextInput
                  style={[styles.rejectNoteTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={rejectNote}
                  onChangeText={setRejectNote}
                  placeholder="Reason for rejection"
                  placeholderTextColor={C.textMuted}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.bar58, { backgroundColor: C.surface2, borderColor: C.border, justifyContent: 'center', marginTop: 14 }]}
                onPress={handleRejectRequest}
                disabled={processingId === rejectTarget?.id}
                activeOpacity={0.8}
              >
                {processingId === rejectTarget?.id ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <>
                    <Feather name="x" size={18} color={C.text} />
                    <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Confirm Rejection
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Department Picker Bottom Sheet */}
      <Modal
        visible={deptPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setDeptPickerVisible(false)}
          />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '80%' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.faculty2?.selectDepartment ?? 'Select Department'}
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 16, gap: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {departments.map((d) => {
                const isSelected = activeDeptId === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.bar58,
                      {
                        backgroundColor: isSelected ? C.surface2 : C.surface,
                        borderColor: isSelected ? C.text : C.border,
                      },
                    ]}
                    onPress={() => {
                      setActiveDeptId(d.id);
                      setDeptPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconSlot32}>
                      <Feather name={getDeptIcon(d.name)} size={32} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text
                        style={[
                          styles.barTitleTxt,
                          {
                            color: C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {shortDept(d.name)}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Feather name="check" size={18} color={C.text} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );

  // ---------------------------------------------------------------------------
  // HELPER MODAL: ADD SECTION MODAL (Strict 58dp Bars & Pre-Filled Next Number)
  // ---------------------------------------------------------------------------
  function renderAddSectionModal() {
    return (
      <Modal
        visible={!!addSectionIntakeId}
        animationType="slide"
        transparent
        onRequestClose={() => setAddSectionIntakeId(null)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAddSectionIntakeId(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '85%' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 0 }]}>
                {t.study2?.addSection ?? 'Add Section'}
              </Text>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setAddSectionIntakeId(null)}
                activeOpacity={0.75}
              >
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 12, 24) }}
            >
              <Text style={[styles.modalFieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                SECTION NUMBER
              </Text>
              <View style={[styles.bar58, { backgroundColor: C.surface2, borderColor: C.border, marginBottom: 12 }]}>
                <View style={styles.iconSlot32}>
                  <Feather name="hash" size={24} color={C.text} />
                </View>
                <TextInput
                  style={[styles.inputBarTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                  value={secNumInput}
                  onChangeText={val => setSecNumInput(val.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  placeholder="Section number"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.bar58,
                  {
                    backgroundColor: C.surface2,
                    borderColor: C.border,
                    justifyContent: 'center',
                    marginTop: 8,
                    opacity: secNumInput.trim() && !submittingSection ? 1 : 0.6,
                  },
                ]}
                onPress={handleAddSection}
                disabled={!secNumInput.trim() || submittingSection}
                activeOpacity={0.8}
              >
                {submittingSection ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <>
                    <Feather name="plus" size={20} color={C.text} />
                    <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {t.study2?.addSection ?? 'Add Section'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ---------------------------------------------------------------------------
  // HELPER MODAL: DEDICATED FULL-PAGE ASSIGN CR (PAGE 4 - Strict 58dp Standard)
  // ---------------------------------------------------------------------------
  function renderAssignCrModal() {
    return (
      <Modal
        visible={!!assignTargetSection}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAssignTargetSection(null)}
        statusBarTranslucent
      >
        <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
          <SubBar
            title="Assign CR"
            onBack={() => setAssignTargetSection(null)}
          />

          {/* Search Bar strictly 58dp */}
          <View style={{ paddingHorizontal: Layout.screenPadding, marginTop: 6, marginBottom: 10 }}>
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.iconSlot32}>
                <Feather name="search" size={24} color={C.textMuted} />
              </View>
              <TextInput
                style={[styles.inputBarTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={crSearch}
                onChangeText={setCrSearch}
                placeholder={assignTargetSection ? `Search student in Intake ${assignTargetSection.intakeNum}…` : 'Search students…'}
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
              />
              {crSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCrSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Student Candidate List */}
          {searchLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={C.text} />
            </View>
          ) : studentResults.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: C.surface, borderColor: C.border, marginHorizontal: Layout.screenPadding, marginTop: 4 }]}>
              <Feather name="users" size={32} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                No students found in Intake {assignTargetSection?.intakeNum}
              </Text>
            </View>
          ) : (
            <FlatList
              data={studentResults}
              keyExtractor={(st) => st.id}
              contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item: st }) => (
                <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Avatar uri={st.avatar_url} name={st.full_name} size="sm" />
                  <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', marginLeft: 10 }}>
                    <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {st.full_name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                    onPress={() => handleAssignCr(st)}
                    activeOpacity={0.8}
                  >
                    <Feather name="check" size={14} color={C.text} />
                    <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Assign
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 28 } as ViewStyle,
  centerBox: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Universal 58dp Bar Standard (Strict Fixed Height 58dp with Centered Titles)
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  } as ViewStyle,

  barTitleTxt: {
    fontSize: 14.5,
  } as any,

  inputBarTxt: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  } as any,

  iconSlot32: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  countPillTxt: {
    fontSize: 11,
  } as any,

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  actionBtnTxt: {
    fontSize: 12,
  } as any,

  modalFieldLabel: {
    fontSize: 10.5,
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 2,
  } as any,

  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 8,
  } as ViewStyle,
  emptyTitle: { fontSize: 14.5, textAlign: 'center' } as any,

  /* Sheets & Modals */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
  } as ViewStyle,
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  } as ViewStyle,
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 16.5,
  } as any,
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  rejectNoteBox: {
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as ViewStyle,
  rejectNoteTxt: {
    flex: 1,
    fontSize: 13,
    textAlignVertical: 'top',
  } as any,

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
  reqMeta: { fontSize: 11.5, marginTop: 1.5 } as any,
  reqTime: { fontSize: 10.5 } as any,
  reasonBox: {
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  reasonTxt: { fontSize: 12, fontStyle: 'italic' } as any,
  reqActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  } as ViewStyle,
});
