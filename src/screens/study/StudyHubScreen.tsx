import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Switch, Modal,
  StyleSheet, Alert, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout , SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';

const STUDY_COLOR = SectorColors.study;

type Persona = 'notjoined' | 'pendingcreate' | 'member' | 'cr';
type Sub = 'home' | 'browse' | 'manage';

// study_sections(intake_id, number, join_code, is_public)
// → study_intakes(number, is_public, department_id) → departments(name).
// department/intake/intake_public are flattened from the joins for display.
interface SectionRow {
  id: string;
  intake_id: string;
  number: number;
  is_public: boolean;
  join_code: string | null;
  department: string;
  intake: number;
  intake_public: boolean;
  role?: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  initials: string;
  full_name: string;
  created_at: string;
}

interface AdminRequest {
  id: string;
  initials: string;
  full_name: string;
  department: string;
  intake: number;
  section_label: string;
  reason?: string;
  created_at: string;
}

interface Vote {
  id: string;
  proposal: 'public' | 'private';
  yes: number;
  no: number;
  closes_in_h: number;
  status: 'open' | 'closed';
  myBallot: 'yes' | 'no' | null;
}

interface Course {
  id: string;
  code: string;
  name: string;
  material_count?: number;
  question_count?: number;
  book_count?: number;
}

interface Dept {
  id: string;
  name: string;
}

// Admin catalogue rows
interface IntakeRow {
  id: string;
  number: number;
  years: string | null;
  is_public: boolean;
}

interface CatSection {
  id: string;
  number: number;
  join_code: string | null;
  is_public: boolean;
  cr_name: string | null;
}

function Toast({ msg, C }: { msg: string; C: any }) {
  if (!msg) return null;
  return (
    <View style={[toastStyles.wrap, { backgroundColor: C.text }]}>
      <Text style={[toastStyles.txt, { color: C.bg, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
        {msg}
      </Text>
    </View>
  );
}
const toastStyles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, maxWidth: '90%' } as ViewStyle,
  txt: { fontSize: 13 } as any,
});

function CodeCard({ code, copied, onCopy, C }: { code: string; copied: boolean; onCopy: () => void; C: any }) {
  const t = useT();
  return (
    <View style={[codeStyles.card, { backgroundColor: C.brand50, borderColor: C.brand + '40' }]}>
      <Text style={[codeStyles.label, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>{t.study2.sectionJoinCode}</Text>
      <View style={codeStyles.row}>
        <Text style={[codeStyles.code, { color: C.brand, fontFamily: FontFamily.jakartaExtraBold }]}>{code}</Text>
        <TouchableOpacity
          style={[codeStyles.copyBtn, { backgroundColor: C.brand }]}
          onPress={onCopy}
          activeOpacity={0.8}
        >
          <Icon name={copied ? 'check' : 'copy'} size={14} color="#fff" />
          <Text style={[codeStyles.copyTxt, { fontFamily: FontFamily.jakartaBold }]}>
            {copied ? t.study2.copied : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[codeStyles.hint, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
        {t.study2.codeJoinHint}
      </Text>
    </View>
  );
}
const codeStyles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 12 } as ViewStyle,
  label: { fontSize: 11.5, letterSpacing: 0.3 } as any,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 } as ViewStyle,
  code: { flex: 1, fontSize: 26, letterSpacing: 6 } as any,
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 } as ViewStyle,
  copyTxt: { fontSize: 13, color: '#fff' } as any,
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 } as any,
});

function CourseRow({ c, C, onPress }: { c: Course; C: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={[rowStyles.row]} onPress={onPress} activeOpacity={0.75}>
      <View style={[rowStyles.thumb, { backgroundColor: STUDY_COLOR + '20' }]}>
        <Icon name="study" size={20} color={STUDY_COLOR} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.code, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {c.code} · {c.name}
        </Text>
      </View>
      <Icon name="chevR" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );
}
const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, paddingHorizontal: 15 } as ViewStyle,
  thumb: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  code: { fontSize: 14 } as any,
  sub: { fontSize: 12, marginTop: 2 } as any,
});

function CreateSheet({ visible, C, depts, onClose, onSubmit }: { visible: boolean; C: any; depts: Dept[]; onClose: () => void; onSubmit: (deptId: string, intake: string, section: string, reason: string) => void }) {
  const t = useT();
  const [deptId, setDeptId] = useState('');
  const [intake, setIntake] = useState('');
  const [section, setSection] = useState('');
  const [reason, setReason] = useState('');
  const ok = deptId.length > 0 && intake.trim().length > 0 && section.trim().length > 0;

  function reset() { setDeptId(''); setIntake(''); setSection(''); setReason(''); }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => { reset(); onClose(); }} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.requestASection}</Text>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.department}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {depts.map(d => {
              const sel = d.id === deptId;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
                    backgroundColor: sel ? C.brand : C.bg,
                    borderColor: sel ? C.brand : C.border,
                  }}
                  onPress={() => setDeptId(d.id)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 12.5, color: sel ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold }}>
                    {d.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.intake}</Text>
              <TextInput
                style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={intake} onChangeText={t => setIntake(t.replace(/\D/g, ''))} keyboardType="numeric" placeholder="52" placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.sectionNo}</Text>
              <TextInput
                style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={section} onChangeText={t => setSection(t.replace(/\D/g, '').slice(0, 2))} keyboardType="numeric" placeholder="1" placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.reasonOptional}</Text>
          <TextInput
            style={[sheetStyles.textarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={reason} onChangeText={setReason} placeholder={t.study2.reasonPlaceholder} placeholderTextColor={C.textMuted}
            multiline numberOfLines={3}
          />

          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: ok ? C.brand : C.surface2, opacity: ok ? 1 : 0.5 }]}
            disabled={!ok}
            onPress={() => { onSubmit(deptId, intake, section, reason); reset(); }}
            activeOpacity={0.8}
          >
            <Icon name="check" size={18} color={ok ? '#fff' : C.textMuted} />
            <Text style={[sheetStyles.submitTxt, { color: ok ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.submitRequest}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function RejectSheet({ visible, C, onClose, onReject }: { visible: boolean; C: any; onClose: () => void; onReject: (note: string) => void }) {
  const t = useT();
  const [note, setNote] = useState('');
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.rejectRequest}</Text>
          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.reasonShownToStudent}</Text>
          <TextInput
            style={[sheetStyles.textarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={note} onChangeText={setNote} placeholder={t.study2.rejectReasonPlaceholder} placeholderTextColor={C.textMuted}
            multiline numberOfLines={3}
          />
          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: C.danger }]}
            onPress={() => { onReject(note); setNote(''); }}
            activeOpacity={0.8}
          >
            <Feather name="x" size={18} color="#fff" />
            <Text style={[sheetStyles.submitTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.study2.rejectRequest}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function VoteSheet({ visible, C, onClose, onStart }: { visible: boolean; C: any; onClose: () => void; onStart: (proposal: 'public' | 'private') => void }) {
  const t = useT();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.startAnIntakeVote}</Text>
          <Text style={[sheetStyles.hintTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.study2.intakeVoteHint}
          </Text>
          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: C.brand, marginTop: 20 }]}
            onPress={() => onStart('public')} activeOpacity={0.8}
          >
            <Text style={[sheetStyles.submitTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.study2.proposeMakePublic}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: C.surface2, marginTop: 10 }]}
            onPress={() => onStart('private')} activeOpacity={0.8}
          >
            <Text style={[sheetStyles.submitTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.proposeMakePrivate}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' } as ViewStyle,
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingTop: 10, paddingBottom: 36 } as ViewStyle,
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 } as ViewStyle,
  sheetTitle: { fontSize: 18, letterSpacing: -0.3, marginBottom: 16 } as any,
  flabel: { fontSize: 11, letterSpacing: 0.7, marginBottom: 7, marginTop: 12, marginLeft: 2 } as any,
  input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 } as any,
  textarea: { minHeight: 80, borderRadius: 12, borderWidth: 1, padding: 13, fontSize: 14, textAlignVertical: 'top' } as any,
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginTop: 22 } as ViewStyle,
  submitTxt: { fontSize: 15 } as any,
  hintTxt: { fontSize: 13.5, lineHeight: 20 } as any,
});

export function StudyHubScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const toast = useToast();
  const [sub, setSub] = useState<Sub>('home');
  const [persona, setPersona] = useState<Persona>('notjoined');
  const [mySection, setMySection] = useState<SectionRow | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [joinReqs, setJoinReqs] = useState<JoinRequest[]>([]);
  const [secMembers, setSecMembers] = useState<{ id: string; user_id: string; role: string; full_name: string }[]>([]);
  const [pins, setPins] = useState<{ id: string; message: string | null; created_at: string }[]>([]);
  const [pinText, setPinText] = useState('');
  const [adminReqs, setAdminReqs] = useState<AdminRequest[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [vote, setVote] = useState<Vote | null>(null);

  // Admin catalogue state
  const [catDept, setCatDept] = useState<string | null>(null);
  const [catIntakes, setCatIntakes] = useState<IntakeRow[]>([]);
  const [catExpanded, setCatExpanded] = useState<string | null>(null);
  const [catSections, setCatSections] = useState<Record<string, CatSection[]>>({});
  const [addIntakeOpen, setAddIntakeOpen] = useState(false);
  const [addSectionFor, setAddSectionFor] = useState<string | null>(null);
  const [setCrFor, setSetCrFor] = useState<string | null>(null);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [crSearch, setCrSearch] = useState('');
  const [numInput, setNumInput] = useState('');
  const [yearsInput, setYearsInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [startVoteOpen, setStartVoteOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(msg: string) {
    setToastMsg(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMsg(''), 1800);
  }

  // Flatten the nested join rows (supabase returns object or 1-elem array).
  function one<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
  }

  function mapSection(raw: any, role?: string): SectionRow | null {
    const sec = one<any>(raw);
    if (!sec) return null;
    const intake = one<any>(sec.study_intakes);
    const dept = one<any>(intake?.departments);
    return {
      id: sec.id,
      intake_id: sec.intake_id,
      number: sec.number,
      is_public: sec.is_public,
      join_code: sec.join_code ?? null,
      department: dept?.name ?? '',
      intake: intake?.number ?? 0,
      intake_public: intake?.is_public ?? false,
      role,
    };
  }

  const load = useCallback(async () => {
    if (!user) return;
    // Fetch my approved section membership (joined to intake + department for display)
    const { data: mems, error: memErr } = await supabase
      .from('study_section_members')
      .select('role, study_sections(id, intake_id, number, join_code, is_public, study_intakes(number, is_public, departments(name)))')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('role', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1);

    if (memErr) { console.warn('load membership:', memErr.message); }

    const mem = mems?.[0];
    const sec = mem ? mapSection(mem.study_sections, mem.role) : null;
    if (sec) {
      setMySection(sec);
      setPersona(mem!.role === 'cr' ? 'cr' : 'member');
      const { data: coursesData, error: coursesErr } = await supabase
        .from('study_courses').select('*').eq('section_id', sec.id).order('code');
      if (coursesErr) { console.warn('load courses:', coursesErr.message); }
      setCourses((coursesData ?? []) as Course[]);
    } else {
      // check pending section-creation request
      const { data: req } = await supabase
        .from('study_section_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      setPersona(req ? 'pendingcreate' : 'notjoined');
      setCourses([]);
    }
  }, [user]);

  async function loadAdminQueue() {
    const { data, error } = await supabase
      .from('study_section_requests')
      .select('*, profiles:requester_id(full_name), departments:department_id(name)')
      .eq('status', 'pending')
      .order('created_at');
    if (error) { console.warn('loadAdminQueue:', error.message); return; }
    if (data) {
      setAdminReqs(data.map((r: any) => {
        const prof = one<any>(r.profiles);
        const dept = one<any>(r.departments);
        return {
          id: r.id,
          full_name: prof?.full_name ?? 'Unknown',
          initials: (prof?.full_name ?? '??').split(' ').slice(0, 2).map((w: string) => w[0]).join(''),
          department: dept?.name ?? '',
          intake: r.intake_number,
          section_label: String(r.section_number),
          reason: r.reason,
          created_at: r.created_at,
        };
      }));
    }
  }

  async function loadPublicSections() {
    const { data, error } = await supabase
      .from('study_sections')
      .select('id, intake_id, number, join_code, is_public, study_intakes(number, is_public, departments(name))')
      .eq('is_public', true)
      .order('created_at');
    if (error) { console.warn('loadPublicSections:', error.message); return; }
    if (data) setSections(data.map((r: any) => mapSection(r)).filter(Boolean) as SectionRow[]);
  }

  async function loadJoinReqs() {
    if (!mySection) return;
    const { data, error } = await supabase
      .from('study_section_members')
      .select('*, profiles:user_id(full_name)')
      .eq('section_id', mySection.id)
      .eq('status', 'pending');
    if (error) { console.warn('loadJoinReqs:', error.message); return; }
    if (data) {
      setJoinReqs(data.map((r: any) => {
        const prof = one<any>(r.profiles);
        return {
          id: r.id,
          user_id: r.user_id,
          full_name: prof?.full_name ?? 'Unknown',
          initials: (prof?.full_name ?? '??').split(' ').slice(0, 2).map((w: string) => w[0]).join(''),
          created_at: r.created_at,
        };
      }));
    }
  }

  async function loadCatIntakes(deptId: string) {
    const { data, error } = await supabase
      .from('study_intakes')
      .select('id, number, years, is_public')
      .eq('department_id', deptId)
      .order('number', { ascending: false });
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setCatIntakes((data ?? []) as IntakeRow[]);
  }

  async function loadCatSections(intakeId: string) {
    const { data, error } = await supabase
      .from('study_sections')
      .select('id, number, join_code, is_public')
      .eq('intake_id', intakeId)
      .order('number');
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    const secs = (data ?? []) as CatSection[];
    if (secs.length) {
      const { data: crs } = await supabase
        .from('study_section_members')
        .select('section_id, profiles:user_id(full_name)')
        .in('section_id', secs.map(x => x.id))
        .eq('role', 'cr')
        .eq('status', 'approved');
      const crMap: Record<string, string> = {};
      (crs ?? []).forEach((r: any) => { crMap[r.section_id] = one<any>(r.profiles)?.full_name ?? null; });
      secs.forEach(x => { x.cr_name = crMap[x.id] ?? null; });
    }
    setCatSections(prev => ({ ...prev, [intakeId]: secs }));
  }

  async function addIntake() {
    if (!catDept) return;
    const n = parseInt(numInput, 10);
    if (!Number.isInteger(n) || n <= 0) { toast({ type: 'error', title: 'Invalid', message: 'Enter a valid intake number.' }); return; }
    const { error } = await supabase
      .from('study_intakes')
      .insert({ department_id: catDept, number: n, years: yearsInput.trim() || null });
    if (error) { toast({ type: 'error', title: 'Error', message: error.code === '23505' ? 'That intake already exists.' : error.message }); return; }
    setAddIntakeOpen(false); setNumInput(''); setYearsInput('');
    flash(`Intake ${n} added`);
    loadCatIntakes(catDept);
  }

  async function addCatSection() {
    if (!addSectionFor) return;
    const n = parseInt(numInput, 10);
    if (!Number.isInteger(n) || n <= 0) { toast({ type: 'error', title: 'Invalid', message: 'Enter a valid section number.' }); return; }
    const { error } = await supabase
      .from('study_sections')
      .insert({ intake_id: addSectionFor, number: n });
    if (error) { toast({ type: 'error', title: 'Error', message: error.code === '23505' ? 'That section already exists.' : error.message }); return; }
    const intakeId = addSectionFor;
    setAddSectionFor(null); setNumInput('');
    flash(`Section ${n} added`);
    loadCatSections(intakeId);
  }

  async function assignCR(sectionId: string, userId: string) {
    const { error } = await supabase
      .from('study_section_members')
      .upsert(
        { section_id: sectionId, user_id: userId, role: 'cr', status: 'approved' },
        { onConflict: 'section_id,user_id' },
      );
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setSetCrFor(null); setCrSearch('');
    flash('CR assigned');
    if (catExpanded) loadCatSections(catExpanded);
  }

  async function loadStudents() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name')
      .limit(100);
    if (data) setStudents(data as { id: string; full_name: string }[]);
  }

  async function loadSecMembers() {
    if (!mySection) return;
    const { data } = await supabase
      .from('study_section_members')
      .select('id, user_id, role, profiles:user_id(full_name)')
      .eq('section_id', mySection.id)
      .eq('status', 'approved');
    if (data) {
      setSecMembers((data as any[]).map(r => ({
        id: r.id, user_id: r.user_id, role: r.role,
        full_name: one<any>(r.profiles)?.full_name ?? 'Student',
      })).sort((a, b) => (a.role === 'cr' ? -1 : 1) - (b.role === 'cr' ? -1 : 1)));
    }
  }

  async function loadPins() {
    if (!mySection) return;
    const { data } = await supabase
      .from('study_pins')
      .select('id, message, created_at')
      .eq('section_id', mySection.id)
      .order('created_at', { ascending: false });
    if (data) setPins(data as any[]);
  }

  async function addPin() {
    if (!mySection || !user || pinText.trim().length === 0) return;
    const { error } = await supabase.from('study_pins').insert({
      section_id: mySection.id,
      kind: 'text',
      message: pinText.trim(),
      pinned_by: user.id,
    });
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setPinText('');
    loadPins();
  }

  async function deletePin(id: string) {
    const { error } = await supabase.from('study_pins').delete().eq('id', id);
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setPins(prev => prev.filter(p => p.id !== id));
  }

  async function setMemberRole(memberId: string, role: 'editor' | 'member') {
    const { error } = await supabase.from('study_section_members').update({ role }).eq('id', memberId);
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    loadSecMembers();
  }

  function removeMember(m: { id: string; full_name: string }) {
    Alert.alert('Remove member?', m.full_name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('study_section_members').delete().eq('id', m.id);
          if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
          loadSecMembers();
        },
      },
    ]);
  }

  // Open intake-visibility vote for my intake (+ ballot counts and my own ballot)
  async function loadVote(intakeId: string) {
    // Close any expired vote first so results apply.
    await supabase.rpc('check_expired_intake_votes', { p_intake_id: intakeId }).then(() => {}, () => {});
    const { data: v } = await supabase
      .from('study_intake_votes')
      .select('*')
      .eq('intake_id', intakeId)
      .eq('status', 'open')
      .maybeSingle();
    if (!v) { setVote(null); return; }
    const { data: ballots } = await supabase
      .from('study_intake_vote_ballots')
      .select('ballot, cr_id')
      .eq('vote_id', v.id);
    const yes = ballots?.filter(b => b.ballot === 'yes').length ?? 0;
    const no = ballots?.filter(b => b.ballot === 'no').length ?? 0;
    const mine = ballots?.find(b => b.cr_id === user?.id)?.ballot ?? null;
    const hoursLeft = Math.max(0, Math.round((new Date(v.closes_at).getTime() - Date.now()) / 3600000));
    setVote({
      id: v.id,
      proposal: v.proposal,
      yes,
      no,
      closes_in_h: hoursLeft,
      status: v.status,
      myBallot: mine as Vote['myBallot'],
    });
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    supabase.from('departments').select('id, name').order('name')
      .then(({ data }) => { if (data) setDepartments(data as Dept[]); });
  }, []);

  useEffect(() => {
    if (isAdmin && sub === 'home') loadAdminQueue();
  }, [isAdmin, sub]);

  // Admin catalogue: default to first department, load intakes on change
  useEffect(() => {
    if (isAdmin && !catDept && departments.length) setCatDept(departments[0].id);
  }, [isAdmin, departments, catDept]);

  useEffect(() => {
    if (isAdmin && catDept) { setCatExpanded(null); loadCatIntakes(catDept); }
  }, [isAdmin, catDept]);

  useEffect(() => {
    if (setCrFor && students.length === 0) loadStudents();
  }, [setCrFor]);

  useEffect(() => {
    if (sub === 'browse') loadPublicSections();
    if (sub === 'manage' && mySection) {
      loadJoinReqs();
      loadSecMembers();
      loadVote(mySection.intake_id);
    }
    if (sub === 'home' && mySection) loadPins();
  }, [sub, mySection]);

  function handleBack() {
    if (sub !== 'home') { setSub('home'); return; }
    navigation.goBack();
  }

  async function copyCode() {
    if (!mySection) return;
    await Clipboard.setStringAsync(mySection.join_code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
    flash('Copied!');
  }

  async function joinByCode() {
    if (codeInput.trim().length < 4 || !user) return;
    const code = codeInput.trim().toUpperCase();
    const { data, error } = await supabase.rpc('join_section_by_code', { p_code: code });
    if (error || !data?.ok) {
      toast({ type: 'error', title: 'Could not join', message: error?.message ?? data?.error ?? 'Invalid join code.' });
      return;
    }
    setCodeInput('');
    flash('Joined section!');
    load();
  }

  async function requestJoin(sectionId: string) {
    if (!user) return;
    const { error } = await supabase
      .from('study_section_members')
      .insert({ section_id: sectionId, user_id: user.id, role: 'member', status: 'pending' });
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    flash('Join request sent to CR');
  }

  async function approveJoin(id: string) {
    if (!user) return;
    const { error } = await supabase
      .from('study_section_members')
      .update({ status: 'approved', decided_by: user.id, decided_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setJoinReqs(j => j.filter(x => x.id !== id));
    flash('Member approved');
  }

  async function toggleVisibility() {
    if (!mySection) return;
    const next = !mySection.is_public;
    const { error } = await supabase.from('study_sections').update({ is_public: next }).eq('id', mySection.id);
    if (error) { flash(t.common.error); return; }
    setMySection(s => s ? { ...s, is_public: next } : s);
    flash('Visibility updated');
  }

  async function submitCreateRequest(deptId: string, intake: string, section: string, reason: string) {
    if (!user) return;
    const { error } = await supabase.from('study_section_requests').insert({
      requester_id: user.id,
      department_id: deptId,
      intake_number: parseInt(intake),
      section_number: parseInt(section),
      reason: reason || null,
    });
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setCreateOpen(false);
    setPersona('pendingcreate');
    flash('Request submitted');
  }

  async function approveAdminReq(id: string) {
    // RPC creates intake + section, generates join code and assigns requester as CR
    const { data, error } = await supabase.rpc('approve_section_request', { p_request_id: id });
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    if (data && data.ok === false) { toast({ type: 'error', title: 'Error', message: data.error ?? 'Could not approve' }); return; }
    setAdminReqs(r => r.filter(x => x.id !== id));
    flash(`Approved — join code ${data?.joinCode ?? 'generated'}`);
  }

  async function rejectAdminReq(note: string) {
    if (!rejectId) return;
    const { error } = await supabase.rpc('reject_section_request', { p_request_id: rejectId, p_note: note });
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setAdminReqs(r => r.filter(x => x.id !== rejectId));
    setRejectId(null);
    flash('Request rejected');
  }

  async function startVote(proposal: 'public' | 'private') {
    if (!mySection) return;
    const { data, error } = await supabase.rpc('initiate_intake_vote', {
      p_intake_id: mySection.intake_id,
      p_proposal: proposal,
    });
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    if (data && data.ok === false) { toast({ type: 'error', title: 'Could not start vote', message: data.error ?? 'Unknown error' }); return; }
    setStartVoteOpen(false);
    flash('Vote started');
    loadVote(mySection.intake_id);
  }

  async function castVote(ballot: 'yes' | 'no') {
    if (!vote || !mySection) return;
    const { data, error } = await supabase.rpc('cast_intake_vote', {
      p_vote_id: vote.id,
      p_ballot: ballot,
    });
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    if (data && data.ok === false) { toast({ type: 'error', title: 'Could not vote', message: data.error ?? 'Unknown error' }); return; }
    flash('Vote recorded');
    loadVote(mySection.intake_id);
    load(); // intake visibility may have flipped if the vote closed
  }

  function timeAgo(iso: string): string {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  }

  function renderNotJoined() {
    return (
      <View>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.joinTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.study2.joinAStudySection}
          </Text>
          <View style={s.codeRow}>
            <TextInput
              style={[s.codeInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={codeInput}
              onChangeText={t => setCodeInput(t.toUpperCase().slice(0, 6))}
              placeholder={t.study2.enterCode}
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[s.joinBtn, { backgroundColor: codeInput.trim().length >= 4 ? C.brand : C.surface2 }]}
              disabled={codeInput.trim().length < 4}
              onPress={joinByCode}
              activeOpacity={0.8}
            >
              <Text style={[s.joinBtnTxt, { color: codeInput.trim().length >= 4 ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.join}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.dontHaveCode}</Text>
        <TouchableOpacity
          style={[s.outlineBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => { setSub('browse'); loadPublicSections(); }}
          activeOpacity={0.75}
        >
          <Icon name="study" size={17} color={C.text} />
          <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.browsePublicSections}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.outlineBtn, { backgroundColor: C.surface, borderColor: C.border, marginTop: 8 }]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.75}
        >
          <Icon name="plus" size={17} color={C.text} />
          <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.requestToCreateSection}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderPending() {
    return (
      <View style={[s.card, s.pendingCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[s.pendingIcon, { backgroundColor: C.warnBg }]}>
          <Feather name="clock" size={28} color={C.warn} />
        </View>
        <Text style={[s.pendingTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.requestUnderReview}</Text>
        <Text style={[s.pendingSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {t.study2.adminReviewHint}
        </Text>
      </View>
    );
  }

  function renderMemberHome() {
    const isCr = persona === 'cr';
    if (!mySection) return null;
    return (
      <View>
        {/* Section header */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 13 }]}>
          <View style={[s.sectionThumb, { backgroundColor: STUDY_COLOR + '20' }]}>
            <Icon name="study" size={22} color={STUDY_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.sectionName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {mySection.department} · Intake {mySection.intake} · Sec {mySection.number}
            </Text>
            <View style={[s.visPill, { backgroundColor: mySection.is_public ? C.successBg : C.surface2 }]}>
              <View style={[s.visDot, { backgroundColor: mySection.is_public ? C.success : C.textMuted }]} />
              <Text style={[s.visTxt, { color: mySection.is_public ? C.success : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {mySection.is_public ? t.study2.public : t.study2.private}
              </Text>
            </View>
          </View>
          {isCr && (
            <View style={[s.crPill, { backgroundColor: C.infoBg }]}>
              <View style={[s.crDot, { backgroundColor: C.info }]} />
              <Text style={[s.crTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>CR</Text>
            </View>
          )}
        </View>

        {/* CR code card */}
        {isCr && <CodeCard code={mySection.join_code ?? '—'} copied={copied} onCopy={copyCode} C={C} />}

        {/* Manage section button (CR only) */}
        {isCr && (
          <TouchableOpacity
            style={[s.outlineBtn, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}
            onPress={() => { setSub('manage'); loadJoinReqs(); }}
            activeOpacity={0.75}
          >
            <Icon name="sliders" size={17} color={C.text} />
            <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.manageSection}</Text>
            {joinReqs.length > 0 && (
              <View style={[s.badge, { backgroundColor: C.danger }]}>
                <Text style={[s.badgeTxt, { fontFamily: FontFamily.jakartaBold }]}>{joinReqs.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Pinboard (CR posts notices for the section) */}
        {pins.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.pinned}</Text>
            <View style={[s.courseCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              {pins.map((p, i) => (
                <View key={p.id}>
                  {i > 0 && <View style={[s.divider, { backgroundColor: C.border }]} />}
                  <View style={s.pinRow}>
                    <Feather name="bookmark" size={14} color={STUDY_COLOR} style={{ marginTop: 2 }} />
                    <Text style={[s.pinTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                      {p.message}
                    </Text>
                    {isCr && (
                      <TouchableOpacity onPress={() => deletePin(p.id)} hitSlop={8} activeOpacity={0.7}>
                        <Feather name="x" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Courses */}
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.courses}</Text>
        <View style={[s.courseCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {courses.length === 0 ? (
            <View style={s.emptyInner}>
              <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.study2.noCoursesYet}</Text>
            </View>
          ) : courses.map((c, i) => (
            <View key={c.id}>
              {i > 0 && <View style={[s.divider, { backgroundColor: C.border }]} />}
              <CourseRow c={c} C={C} onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderBrowse() {
    const pub = sections.filter(sec => sec.is_public);
    return (
      <View>
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 4 }]}>{t.study2.publicSections}</Text>
        {pub.length === 0 ? (
          <View style={s.empty}>
            <Icon name="study" size={28} color={C.textMuted} />
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.study2.noPublicSections}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {pub.map(sec => (
              <View key={sec.id} style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <View style={[s.sectionThumb, { backgroundColor: STUDY_COLOR + '20', width: 44, height: 44 }]}>
                    <Icon name="study" size={20} color={STUDY_COLOR} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.sectionName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {sec.department} · Intake {sec.intake} · Sec {sec.number}
                    </Text>
                  </View>
                </View>
                {sec.intake_public && (
                  <View style={[s.intakePill, { backgroundColor: C.infoBg }]}>
                    <Text style={[s.intakeTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>{t.study2.openToOtherIntakes}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[s.joinSecBtn, { backgroundColor: C.brand }]}
                  onPress={() => requestJoin(sec.id)}
                  activeOpacity={0.8}
                >
                  <Feather name="user-plus" size={14} color="#fff" />
                  <Text style={[s.joinSecBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>{t.study2.requestToJoin}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderManage() {
    if (!mySection) return null;
    return (
      <View>
        {/* Code card */}
        <CodeCard code={mySection.join_code ?? '—'} copied={copied} onCopy={copyCode} C={C} />

        {/* Join requests */}
        {joinReqs.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              JOIN REQUESTS · {joinReqs.length}
            </Text>
            <View style={[s.courseCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              {joinReqs.map((j, i) => (
                <View key={j.id}>
                  {i > 0 && <View style={[s.divider, { backgroundColor: C.border }]} />}
                  <View style={s.reqRow}>
                    <Avatar name={j.full_name} size="sm" />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.reqName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{j.full_name}</Text>
                      <Text style={[s.reqTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{timeAgo(j.created_at)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[s.approveBtn, { backgroundColor: C.successBg }]}
                      onPress={() => approveJoin(j.id)}
                      activeOpacity={0.75}
                    >
                      <Icon name="check" size={14} color={C.success} />
                      <Text style={[s.approveTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Members — promote to editor, demote, remove */}
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          MEMBERS · {secMembers.length}
        </Text>
        <View style={[s.courseCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {secMembers.map((m, i) => {
            const isMe = m.user_id === user?.id;
            const isCrRow = m.role === 'cr';
            return (
              <View key={m.id}>
                {i > 0 && <View style={[s.divider, { backgroundColor: C.border }]} />}
                <View style={s.reqRow}>
                  <Avatar name={m.full_name} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.reqName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {m.full_name}{isMe ? t.study2.you : ''}
                    </Text>
                    <Text style={[s.reqTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {isCrRow ? t.study2.cr : m.role === 'editor' ? t.study2.editor : t.study2.member}
                    </Text>
                  </View>
                  {!isCrRow && !isMe && (
                    <>
                      <TouchableOpacity
                        style={[s.approveBtn, { backgroundColor: C.surface2 }]}
                        onPress={() => setMemberRole(m.id, m.role === 'editor' ? 'member' : 'editor')}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.approveTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                          {m.role === 'editor' ? t.study2.demote : t.study2.makeEditor}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeMember(m)} hitSlop={8} activeOpacity={0.7} style={{ marginLeft: 8 }}>
                        <Feather name="user-minus" size={16} color={C.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Pinboard composer */}
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.pinANotice}</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TextInput
            style={[s.pinInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={pinText}
            onChangeText={setPinText}
            placeholder={t.study2.pinPlaceholder}
            placeholderTextColor={C.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[s.outlineBtn, { backgroundColor: C.bg, borderColor: C.border, marginTop: 10, opacity: pinText.trim() ? 1 : 0.5 }]}
            onPress={addPin}
            disabled={!pinText.trim()}
            activeOpacity={0.75}
          >
            <Feather name="bookmark" size={15} color={C.text} />
            <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.pinToSection}</Text>
          </TouchableOpacity>
        </View>

        {/* Section visibility */}
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.sectionVisibility}</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.settingRow}>
            <View style={[s.settingIcon, { backgroundColor: mySection.is_public ? C.successBg : C.surface2 }]}>
              <Feather name={mySection.is_public ? 'globe' : 'shield'} size={18} color={mySection.is_public ? C.success : C.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {mySection.is_public ? t.study2.public : t.study2.private}
              </Text>
              <Text style={[s.settingSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {mySection.is_public ? 'Other sections in this intake can browse' : 'Only your approved members can access'}
              </Text>
            </View>
            <Switch
              value={mySection.is_public}
              onValueChange={toggleVisibility}
              trackColor={{ false: C.border, true: C.brand + '88' }}
              thumbColor={mySection.is_public ? C.brand : C.surface2}
            />
          </View>
        </View>

        {/* Intake visibility vote */}
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.intakeVisibility}</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.intakeInfo, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {t.study2.intakeInfo(mySection.intake, mySection.department, mySection.intake_public ? t.study2.public : t.study2.private)}
          </Text>
          {vote && vote.status === 'open' ? (
            <View style={[s.voteBox, { backgroundColor: C.surface2 }]}>
              <Text style={[s.voteTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.study2.openVote(vote.proposal)}
              </Text>
              <Text style={[s.voteSub, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.study2.voteTally(vote.yes, vote.no, vote.closes_in_h)}
              </Text>
              {vote.myBallot ? (
                <Text style={[s.voteSub, { color: C.text, fontFamily: FontFamily.jakartaBold, marginTop: 8 }]}>
                  {t.study2.youVoted(vote.myBallot)}
                </Text>
              ) : (
                <View style={s.voteActions}>
                  <TouchableOpacity style={[s.voteBtn, { backgroundColor: C.successBg }]} onPress={() => castVote('yes')} activeOpacity={0.75}>
                    <Icon name="check" size={14} color={C.success} />
                    <Text style={[s.voteBtnTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>{t.study2.voteYes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.voteBtn, { backgroundColor: C.surface }]} onPress={() => castVote('no')} activeOpacity={0.75}>
                    <Feather name="x" size={14} color={C.text2} />
                    <Text style={[s.voteBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.study2.voteNo}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[s.outlineBtn, { backgroundColor: C.bg, borderColor: C.border, marginTop: 12 }]}
              onPress={() => setStartVoteOpen(true)}
              activeOpacity={0.75}
            >
              <Feather name="bar-chart-2" size={16} color={C.text} />
              <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.startAVote}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  function renderAdminQueue() {
    return (
      <View>
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 4 }]}>
          PENDING REQUESTS · {adminReqs.length}
        </Text>
        {adminReqs.length === 0 ? (
          <View style={s.empty}>
            <Icon name="check" size={28} color={C.textMuted} />
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.study2.allClear}</Text>
          </View>
        ) : (
          <View style={{ gap: 11 }}>
            {adminReqs.map(r => (
              <View key={r.id} style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <Avatar name={r.full_name} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.reqName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{r.full_name}</Text>
                    <Text style={[s.reqTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {r.department} · Intake {r.intake} · Sec {r.section_label}
                    </Text>
                  </View>
                  <Text style={[s.reqAgo, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{timeAgo(r.created_at)}</Text>
                </View>
                {r.reason && (
                  <Text style={[s.reasonTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    "{r.reason}"
                  </Text>
                )}
                <View style={s.adminActions}>
                  <TouchableOpacity
                    style={[s.approveBtn, { backgroundColor: C.successBg, flex: 1 }]}
                    onPress={() => approveAdminReq(r.id)}
                    activeOpacity={0.75}
                  >
                    <Icon name="check" size={14} color={C.success} />
                    <Text style={[s.approveTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.approveBtn, { backgroundColor: C.dangerBg, flex: 1 }]}
                    onPress={() => setRejectId(r.id)}
                    activeOpacity={0.75}
                  >
                    <Feather name="x" size={14} color={C.danger} />
                    <Text style={[s.approveTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Catalogue: departments → intakes → sections */}
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.catalogue}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 4 }}>
          {departments.map(d => {
            const sel = d.id === catDept;
            return (
              <TouchableOpacity
                key={d.id}
                style={[s.deptChip, { backgroundColor: sel ? C.brand : C.surface, borderColor: sel ? C.brand : C.border }]}
                onPress={() => setCatDept(d.id)}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 12, color: sel ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold }}>
                  {d.name.replace(/^Department of\s+/i, '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[s.outlineBtn, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10 }]}
          onPress={() => { setNumInput(''); setYearsInput(''); setAddIntakeOpen(true); }}
          activeOpacity={0.75}
        >
          <Icon name="plus" size={16} color={C.text} />
          <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.addIntake}</Text>
        </TouchableOpacity>

        {catIntakes.length === 0 ? (
          <View style={s.empty}>
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.study2.noIntakesForDept}</Text>
          </View>
        ) : (
          <View style={{ gap: 9, marginTop: 12 }}>
            {catIntakes.map(ik => {
              const open = catExpanded === ik.id;
              const secs = catSections[ik.id] ?? [];
              return (
                <View key={ik.id} style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    onPress={() => {
                      if (open) { setCatExpanded(null); return; }
                      setCatExpanded(ik.id);
                      if (!catSections[ik.id]) loadCatSections(ik.id);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[s.sectionThumb, { backgroundColor: STUDY_COLOR + '20', width: 38, height: 38 }]}>
                      <Icon name="study" size={17} color={STUDY_COLOR} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.reqName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Intake {ik.number}</Text>
                      <Text style={[s.reqTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {ik.years ?? '—'} · {ik.is_public ? t.study2.public : t.study2.private}
                      </Text>
                    </View>
                    <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
                  </TouchableOpacity>

                  {open && (
                    <View style={{ marginTop: 10, gap: 8 }}>
                      {secs.map(sec => (
                        <View key={sec.id} style={[s.catSecRow, { backgroundColor: C.bg, borderColor: C.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.reqName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Sec {sec.number}</Text>
                            <Text style={[s.reqTime, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                              Code {sec.join_code ?? '—'} · CR {sec.cr_name ?? 'none'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[s.approveBtn, { backgroundColor: C.infoBg }]}
                            onPress={() => { setCrSearch(''); setSetCrFor(sec.id); }}
                            activeOpacity={0.75}
                          >
                            <Feather name="user-check" size={13} color={C.info} />
                            <Text style={[s.approveTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>{t.study2.setCr}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[s.outlineBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                        onPress={() => { setNumInput(''); setAddSectionFor(ik.id); }}
                        activeOpacity={0.75}
                      >
                        <Icon name="plus" size={15} color={C.text} />
                        <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.addSection}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  const barTitle = isAdmin
    ? t.study2.adminStudyHub
    : sub === 'manage' ? t.study2.manageSectionTitle
    : sub === 'browse' ? t.study2.browseSections
    : t.study2.studyHub;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <SubBar title={barTitle} onBack={handleBack} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isAdmin
          ? renderAdminQueue()
          : sub === 'browse'
            ? renderBrowse()
            : sub === 'manage'
              ? renderManage()
              : persona === 'notjoined'
                ? renderNotJoined()
                : persona === 'pendingcreate'
                  ? renderPending()
                  : renderMemberHome()
        }
        <View style={{ height: 20 }} />
      </ScrollView>

      <Toast msg={toastMsg} C={C} />

      <CreateSheet
        visible={createOpen}
        C={C}
        depts={departments}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitCreateRequest}
      />

      <RejectSheet
        visible={!!rejectId}
        C={C}
        onClose={() => setRejectId(null)}
        onReject={rejectAdminReq}
      />

      <VoteSheet
        visible={startVoteOpen}
        C={C}
        onClose={() => setStartVoteOpen(false)}
        onStart={startVote}
      />

      {/* Admin: add intake */}
      <Modal visible={addIntakeOpen} animationType="slide" transparent onRequestClose={() => setAddIntakeOpen(false)}>
        <View style={sheetStyles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAddIntakeOpen(false)} />
          <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
            <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
            <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.addIntake}</Text>
            <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.intakeNumber}</Text>
            <TextInput
              style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={numInput} onChangeText={t => setNumInput(t.replace(/\D/g, ''))} keyboardType="numeric" placeholder="52" placeholderTextColor={C.textMuted}
            />
            <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.yearsOptional}</Text>
            <TextInput
              style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={yearsInput} onChangeText={setYearsInput} placeholder="2023–2024" placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity style={[sheetStyles.submitBtn, { backgroundColor: C.brand }]} onPress={addIntake} activeOpacity={0.8}>
              <Icon name="plus" size={17} color="#fff" />
              <Text style={[sheetStyles.submitTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.study2.addIntake}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin: add section */}
      <Modal visible={!!addSectionFor} animationType="slide" transparent onRequestClose={() => setAddSectionFor(null)}>
        <View style={sheetStyles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAddSectionFor(null)} />
          <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
            <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
            <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.addSection}</Text>
            <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.sectionNumber}</Text>
            <TextInput
              style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={numInput} onChangeText={t => setNumInput(t.replace(/\D/g, ''))} keyboardType="numeric" placeholder="1" placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity style={[sheetStyles.submitBtn, { backgroundColor: C.brand }]} onPress={addCatSection} activeOpacity={0.8}>
              <Icon name="plus" size={17} color="#fff" />
              <Text style={[sheetStyles.submitTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.study2.addSection}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin: assign CR */}
      <Modal visible={!!setCrFor} animationType="slide" transparent onRequestClose={() => setSetCrFor(null)}>
        <View style={sheetStyles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSetCrFor(null)} />
          <View style={[sheetStyles.sheet, { backgroundColor: C.surface, maxHeight: '70%' }]}>
            <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
            <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.study2.assignCr}</Text>
            <TextInput
              style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={crSearch} onChangeText={setCrSearch} placeholder={t.study2.searchStudents} placeholderTextColor={C.textMuted}
            />
            <ScrollView style={{ marginTop: 10 }} keyboardShouldPersistTaps="handled">
              {students
                .filter(st => st.full_name?.toLowerCase().includes(crSearch.toLowerCase()))
                .slice(0, 30)
                .map(st => (
                  <TouchableOpacity
                    key={st.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }}
                    onPress={() => setCrFor && assignCR(setCrFor, st.id)}
                    activeOpacity={0.75}
                  >
                    <Avatar name={st.full_name} size="sm" />
                    <Text style={{ flex: 1, fontSize: 14, color: C.text, fontFamily: FontFamily.jakartaBold }}>{st.full_name}</Text>
                    <Feather name="user-check" size={16} color={C.brand} />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  card: { padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  sectionLabel: {
    fontSize: 11, letterSpacing: 0.7,
    marginTop: 20, marginBottom: 8, marginLeft: 2,
  } as any,

  sectionThumb: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  } as ViewStyle,

  sectionName: { fontSize: 15 } as any,
  secMeta: { fontSize: 12, marginTop: 2 } as any,

  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
  catSecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,

  visPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    alignSelf: 'flex-start', marginTop: 6,
  } as ViewStyle,
  visDot: { width: 5, height: 5, borderRadius: 3 } as ViewStyle,
  visTxt: { fontSize: 11 } as any,

  crPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, flexShrink: 0,
  } as ViewStyle,
  crDot: { width: 5, height: 5, borderRadius: 3 } as ViewStyle,
  crTxt: { fontSize: 11 } as any,

  courseCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,

  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1,
  } as ViewStyle,
  outlineBtnTxt: { fontSize: 14, flex: 1 } as any,

  badge: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
  badgeTxt: { fontSize: 11, color: '#fff' } as any,

  joinTitle: { fontSize: 16, letterSpacing: -0.2, marginBottom: 12 } as any,
  codeRow: { flexDirection: 'row', gap: 8 } as ViewStyle,
  codeInput: {
    flex: 1, height: 46, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, fontSize: 16, letterSpacing: 4,
  } as any,
  joinBtn: { height: 46, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  joinBtnTxt: { fontSize: 14 } as any,

  pendingCard: { alignItems: 'center', paddingVertical: 34 } as ViewStyle,
  pendingIcon: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  } as ViewStyle,
  pendingTitle: { fontSize: 16, letterSpacing: -0.2 } as any,
  pendingSub: { fontSize: 13, marginTop: 4, textAlign: 'center', lineHeight: 19 } as any,

  // Browse
  intakePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: 9 } as ViewStyle,
  intakeTxt: { fontSize: 11 } as any,
  joinSecBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, height: 40, borderRadius: 12, marginTop: 12,
  } as ViewStyle,
  joinSecBtnTxt: { fontSize: 13, color: '#fff' } as any,

  // Manage
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, paddingHorizontal: 14 } as ViewStyle,
  pinRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, paddingHorizontal: 14 } as ViewStyle,
  pinTxt: { flex: 1, fontSize: 13, lineHeight: 19 } as any,
  pinInput: { minHeight: 64, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingTop: 10, fontSize: 13.5, textAlignVertical: 'top' } as any,
  reqName: { fontSize: 13.5 } as any,
  reqTime: { fontSize: 11.5, marginTop: 1 } as any,
  reqAgo: { fontSize: 11.5 } as any,
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  } as ViewStyle,
  approveTxt: { fontSize: 13 } as any,

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 13 } as ViewStyle,
  settingIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  settingTitle: { fontSize: 14 } as any,
  settingSub: { fontSize: 12, marginTop: 2, lineHeight: 16 } as any,

  intakeInfo: { fontSize: 13.5 } as any,

  voteBox: { borderRadius: 12, padding: 13, marginTop: 12 } as ViewStyle,
  voteTitle: { fontSize: 13 } as any,
  voteSub: { fontSize: 12.5, marginTop: 5 } as any,
  voteActions: { flexDirection: 'row', gap: 8, marginTop: 11 } as ViewStyle,
  voteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 38, borderRadius: 10,
  } as ViewStyle,
  voteBtnTxt: { fontSize: 13 } as any,

  // Admin
  reasonTxt: { fontSize: 12.5, marginTop: 9, fontStyle: 'italic', lineHeight: 18 } as any,
  adminActions: { flexDirection: 'row', gap: 8, marginTop: 11 } as ViewStyle,

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyInner: { alignItems: 'center', padding: 24 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as any,
});
