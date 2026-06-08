// Matches design screens-h.jsx — Study Hub redesign with CR codes, sections, votes
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Switch, Modal,
  StyleSheet, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';

const STUDY_COLOR = '#2ba0c9';

type Persona = 'notjoined' | 'pendingcreate' | 'member' | 'cr';
type Sub = 'home' | 'browse' | 'manage';

interface SectionRow {
  id: string;
  department: string;
  intake: number;
  label: string;
  is_public: boolean;
  intake_public: boolean;
  join_code: string;
  member_count: number;
  course_count: number;
  role?: string;
}

interface JoinRequest {
  id: string;
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
  intake: number;
  dept: string;
  proposal: 'public' | 'private';
  yes: number;
  no: number;
  pending: number;
  closes_in_h: number;
  status: 'open' | 'closed';
}

interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  material_count: number;
  question_count: number;
  book_count: number;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
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

// ── CodeCard ──────────────────────────────────────────────────────────────────
function CodeCard({ code, copied, onCopy, C }: { code: string; copied: boolean; onCopy: () => void; C: any }) {
  return (
    <View style={[codeStyles.card, { backgroundColor: C.brand50 ?? '#eef3ff', borderColor: C.brand + '40' }]}>
      <Text style={[codeStyles.label, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>Section join code</Text>
      <View style={codeStyles.row}>
        <Text style={[codeStyles.code, { color: C.brand, fontFamily: FontFamily.jakartaExtraBold }]}>{code}</Text>
        <TouchableOpacity
          style={[codeStyles.copyBtn, { backgroundColor: C.brand }]}
          onPress={onCopy}
          activeOpacity={0.8}
        >
          <Icon name={copied ? 'check' : 'copy'} size={14} color="#fff" />
          <Text style={[codeStyles.copyTxt, { fontFamily: FontFamily.jakartaBold }]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[codeStyles.hint, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
        Students with this code join instantly — no approval needed.
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

// ── CourseRow ─────────────────────────────────────────────────────────────────
function CourseRow({ c, C, onPress }: { c: Course; C: any; onPress: () => void }) {
  const total = (c.material_count ?? 0) + (c.question_count ?? 0) + (c.book_count ?? 0);
  return (
    <TouchableOpacity style={[rowStyles.row]} onPress={onPress} activeOpacity={0.75}>
      <View style={[rowStyles.thumb, { backgroundColor: STUDY_COLOR + '20' }]}>
        <Icon name="study" size={20} color={STUDY_COLOR} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.code, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {c.code} · {c.title}
        </Text>
        <Text style={[rowStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {total} files
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

// ── CreateSheet (Modal) ───────────────────────────────────────────────────────
function CreateSheet({ visible, C, onClose, onSubmit }: { visible: boolean; C: any; onClose: () => void; onSubmit: (dept: string, intake: string, label: string, reason: string) => void }) {
  const [dept, setDept] = useState('CSE');
  const [intake, setIntake] = useState('');
  const [label, setLabel] = useState('');
  const [reason, setReason] = useState('');
  const ok = intake.trim().length > 0 && label.trim().length > 0;

  function reset() { setDept('CSE'); setIntake(''); setLabel(''); setReason(''); }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => { reset(); onClose(); }} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Request a section</Text>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DEPARTMENT</Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={dept} onChangeText={setDept} placeholder="CSE" placeholderTextColor={C.textMuted}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>INTAKE</Text>
              <TextInput
                style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={intake} onChangeText={t => setIntake(t.replace(/\D/g, ''))} keyboardType="numeric" placeholder="52" placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>SECTION</Text>
              <TextInput
                style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={label} onChangeText={t => setLabel(t.toUpperCase().slice(0, 2))} autoCapitalize="characters" placeholder="A" placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>REASON (OPTIONAL)</Text>
          <TextInput
            style={[sheetStyles.textarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={reason} onChangeText={setReason} placeholder="e.g. CR for our batch" placeholderTextColor={C.textMuted}
            multiline numberOfLines={3}
          />

          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: ok ? C.brand : C.surface2, opacity: ok ? 1 : 0.5 }]}
            disabled={!ok}
            onPress={() => { onSubmit(dept, intake, label, reason); reset(); }}
            activeOpacity={0.8}
          >
            <Icon name="check" size={18} color={ok ? '#fff' : C.textMuted} />
            <Text style={[sheetStyles.submitTxt, { color: ok ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>Submit request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── RejectSheet (Modal) ───────────────────────────────────────────────────────
function RejectSheet({ visible, C, onClose, onReject }: { visible: boolean; C: any; onClose: () => void; onReject: (note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Reject request</Text>
          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>REASON (SHOWN TO STUDENT)</Text>
          <TextInput
            style={[sheetStyles.textarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={note} onChangeText={setNote} placeholder="e.g. Section already exists" placeholderTextColor={C.textMuted}
            multiline numberOfLines={3}
          />
          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: '#e2483d' }]}
            onPress={() => { onReject(note); setNote(''); }}
            activeOpacity={0.8}
          >
            <Feather name="x" size={18} color="#fff" />
            <Text style={[sheetStyles.submitTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>Reject request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── VoteSheet (Modal) ─────────────────────────────────────────────────────────
function VoteSheet({ visible, C, onClose, onStart }: { visible: boolean; C: any; onClose: () => void; onStart: (proposal: 'public' | 'private') => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Start an intake vote</Text>
          <Text style={[sheetStyles.hintTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            All CRs in this intake vote. Closes in 48 hours or when everyone has voted.
          </Text>
          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: C.brand, marginTop: 20 }]}
            onPress={() => onStart('public')} activeOpacity={0.8}
          >
            <Text style={[sheetStyles.submitTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>Propose: make Public</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: C.surface2, marginTop: 10 }]}
            onPress={() => onStart('private')} activeOpacity={0.8}
          >
            <Text style={[sheetStyles.submitTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Propose: make Private</Text>
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

// ── StudyHubScreen ────────────────────────────────────────────────────────────
export function StudyHubScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [sub, setSub] = useState<Sub>('home');
  const [persona, setPersona] = useState<Persona>('notjoined');
  const [mySection, setMySection] = useState<SectionRow | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [joinReqs, setJoinReqs] = useState<JoinRequest[]>([]);
  const [adminReqs, setAdminReqs] = useState<AdminRequest[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [vote, setVote] = useState<Vote | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [startVoteOpen, setStartVoteOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(msg: string) {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 1800);
  }

  const load = useCallback(async () => {
    if (!user) return;
    // Fetch my section membership
    const { data: mem } = await supabase
      .from('study_members')
      .select('*, study_sections(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    const rawSec = Array.isArray(mem?.study_sections) ? mem.study_sections[0] : mem?.study_sections;
    if (rawSec) {
      const sec = rawSec as SectionRow;
      setMySection({ ...sec, role: mem.role });
      setPersona(mem.role === 'cr' ? 'cr' : 'member');
    } else {
      // check pending request
      const { data: req } = await supabase
        .from('study_section_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      setPersona(req ? 'pendingcreate' : 'notjoined');
    }

    // Fetch courses (based on section or globally)
    const { data: coursesData } = await supabase.from('study_courses').select('*').order('code');
    if (coursesData) setCourses(coursesData as Course[]);
  }, [user]);

  async function loadAdminQueue() {
    const { data } = await supabase
      .from('study_section_requests')
      .select('*, profiles:user_id(full_name)')
      .eq('status', 'pending')
      .order('created_at');
    if (data) {
      setAdminReqs(data.map((r: any) => ({
        id: r.id,
        full_name: r.profiles?.full_name ?? 'Unknown',
        initials: (r.profiles?.full_name ?? '??').split(' ').slice(0, 2).map((w: string) => w[0]).join(''),
        department: r.department,
        intake: r.intake,
        section_label: r.section_label,
        reason: r.reason,
        created_at: r.created_at,
      })));
    }
  }

  async function loadPublicSections() {
    const { data } = await supabase
      .from('study_sections')
      .select('*')
      .eq('is_public', true)
      .order('created_at');
    if (data) setSections(data as SectionRow[]);
  }

  async function loadJoinReqs() {
    if (!mySection) return;
    const { data } = await supabase
      .from('study_join_requests')
      .select('*, profiles:user_id(full_name)')
      .eq('section_id', mySection.id)
      .eq('status', 'pending');
    if (data) {
      setJoinReqs(data.map((r: any) => ({
        id: r.id,
        full_name: r.profiles?.full_name ?? 'Unknown',
        initials: (r.profiles?.full_name ?? '??').split(' ').slice(0, 2).map((w: string) => w[0]).join(''),
        created_at: r.created_at,
      })));
    }
  }

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isAdmin && sub === 'home') loadAdminQueue();
  }, [isAdmin, sub]);

  useEffect(() => {
    if (sub === 'browse') loadPublicSections();
    if (sub === 'manage' && mySection) loadJoinReqs();
  }, [sub, mySection]);

  function handleBack() {
    if (sub !== 'home') { setSub('home'); return; }
    navigation.goBack();
  }

  function copyCode() {
    if (!mySection) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
    flash('Copied!');
  }

  async function joinByCode() {
    if (codeInput.trim().length < 4 || !user) return;
    const code = codeInput.trim().toUpperCase();
    const { data: sec } = await supabase
      .from('study_sections')
      .select('*')
      .eq('join_code', code)
      .maybeSingle();
    if (!sec) { Alert.alert('Invalid code', 'No section found with that code.'); return; }
    await supabase.from('study_members').insert({ section_id: sec.id, user_id: user.id, role: 'member' });
    setMySection({ ...(sec as SectionRow), role: 'member' });
    setPersona('member');
    setCodeInput('');
    flash('Joined section!');
  }

  async function requestJoin(sectionId: string) {
    if (!user) return;
    await supabase.from('study_join_requests').insert({ section_id: sectionId, user_id: user.id, status: 'pending' });
    flash('Join request sent to CR');
  }

  async function approveJoin(id: string) {
    await supabase.from('study_join_requests').update({ status: 'approved' }).eq('id', id);
    setJoinReqs(j => j.filter(x => x.id !== id));
    flash('Member approved');
  }

  async function toggleVisibility() {
    if (!mySection) return;
    const next = !mySection.is_public;
    await supabase.from('study_sections').update({ is_public: next }).eq('id', mySection.id);
    setMySection(s => s ? { ...s, is_public: next } : s);
    flash('Visibility updated');
  }

  async function submitCreateRequest(dept: string, intake: string, label: string, reason: string) {
    if (!user) return;
    await supabase.from('study_section_requests').insert({
      user_id: user.id, department: dept, intake: parseInt(intake), section_label: label, reason, status: 'pending',
    });
    setCreateOpen(false);
    setPersona('pendingcreate');
    flash('Request submitted');
  }

  async function approveAdminReq(id: string) {
    await supabase.from('study_section_requests').update({ status: 'approved' }).eq('id', id);
    setAdminReqs(r => r.filter(x => x.id !== id));
    flash('Approved — CR assigned & code generated');
  }

  async function rejectAdminReq(note: string) {
    if (!rejectId) return;
    await supabase.from('study_section_requests').update({ status: 'rejected', reject_note: note }).eq('id', rejectId);
    setAdminReqs(r => r.filter(x => x.id !== rejectId));
    setRejectId(null);
    flash('Request rejected');
  }

  function startVote(proposal: 'public' | 'private') {
    setVote({
      intake: mySection?.intake ?? 0,
      dept: mySection?.department ?? '',
      proposal,
      yes: 0, no: 0, pending: 3,
      closes_in_h: 48,
      status: 'open',
    });
    setStartVoteOpen(false);
    flash('Vote started');
  }

  function castVote(ballot: 'yes' | 'no') {
    if (!vote) return;
    setVote(v => {
      if (!v) return v;
      const yes = v.yes + (ballot === 'yes' ? 1 : 0);
      const no  = v.no  + (ballot === 'no'  ? 1 : 0);
      const pending = v.pending - 1;
      if (pending <= 0) {
        const passed = yes > no;
        flash(passed ? 'Vote passed — intake updated' : 'Vote failed — no change');
        return { ...v, yes, no, pending: 0, status: 'closed' };
      }
      flash('Vote recorded');
      return { ...v, yes, no, pending };
    });
  }

  function timeAgo(iso: string): string {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  }

  // ── Render sub-views ──────────────────────────────────────────────────────

  function renderNotJoined() {
    return (
      <View>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.joinTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            Join a study section
          </Text>
          <View style={s.codeRow}>
            <TextInput
              style={[s.codeInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={codeInput}
              onChangeText={t => setCodeInput(t.toUpperCase().slice(0, 6))}
              placeholder="Enter code"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[s.joinBtn, { backgroundColor: codeInput.trim().length >= 4 ? C.brand : C.surface2 }]}
              disabled={codeInput.trim().length < 4}
              onPress={joinByCode}
              activeOpacity={0.8}
            >
              <Text style={[s.joinBtnTxt, { color: codeInput.trim().length >= 4 ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>DON'T HAVE A CODE?</Text>
        <TouchableOpacity
          style={[s.outlineBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => { setSub('browse'); loadPublicSections(); }}
          activeOpacity={0.75}
        >
          <Icon name="study" size={17} color={C.text} />
          <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Browse public sections</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.outlineBtn, { backgroundColor: C.surface, borderColor: C.border, marginTop: 8 }]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.75}
        >
          <Icon name="plus" size={17} color={C.text} />
          <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Request to create a section</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderPending() {
    return (
      <View style={[s.card, s.pendingCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[s.pendingIcon, { backgroundColor: '#fbefdb' }]}>
          <Feather name="clock" size={28} color="#b9760a" />
        </View>
        <Text style={[s.pendingTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Request under review</Text>
        <Text style={[s.pendingSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          Admin will review within 24 hours.
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
              {mySection.department} · Intake {mySection.intake} · Sec {mySection.label}
            </Text>
            <View style={[s.visPill, { backgroundColor: mySection.is_public ? '#e8f8f0' : C.surface2 }]}>
              <View style={[s.visDot, { backgroundColor: mySection.is_public ? '#12915e' : C.textMuted }]} />
              <Text style={[s.visTxt, { color: mySection.is_public ? '#12915e' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {mySection.is_public ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>
          {isCr && (
            <View style={[s.crPill, { backgroundColor: '#eef3ff' }]}>
              <View style={[s.crDot, { backgroundColor: '#2b5be3' }]} />
              <Text style={[s.crTxt, { color: '#2b5be3', fontFamily: FontFamily.jakartaBold }]}>CR</Text>
            </View>
          )}
        </View>

        {/* CR code card */}
        {isCr && <CodeCard code={mySection.join_code ?? 'ABCD12'} copied={copied} onCopy={copyCode} C={C} />}

        {/* Manage section button (CR only) */}
        {isCr && (
          <TouchableOpacity
            style={[s.outlineBtn, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}
            onPress={() => { setSub('manage'); loadJoinReqs(); }}
            activeOpacity={0.75}
          >
            <Icon name="sliders" size={17} color={C.text} />
            <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Manage section</Text>
            {joinReqs.length > 0 && (
              <View style={[s.badge, { backgroundColor: '#e2483d' }]}>
                <Text style={[s.badgeTxt, { fontFamily: FontFamily.jakartaBold }]}>{joinReqs.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Courses */}
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>COURSES</Text>
        <View style={[s.courseCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {courses.length === 0 ? (
            <View style={s.emptyInner}>
              <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>No courses yet</Text>
            </View>
          ) : courses.map((c, i) => (
            <View key={c.id}>
              {i > 0 && <View style={[s.divider, { backgroundColor: C.border }]} />}
              <CourseRow c={c} C={C} onPress={() => navigation.navigate('CourseDetail', { id: c.id })} />
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
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 4 }]}>PUBLIC SECTIONS</Text>
        {pub.length === 0 ? (
          <View style={s.empty}>
            <Icon name="study" size={28} color={C.textMuted} />
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>No public sections</Text>
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
                      {sec.department} · Intake {sec.intake} · Sec {sec.label}
                    </Text>
                    <Text style={[s.secMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {sec.member_count ?? 0} members · {sec.course_count ?? 0} courses
                    </Text>
                  </View>
                </View>
                {sec.intake_public && (
                  <View style={[s.intakePill, { backgroundColor: '#eef3ff' }]}>
                    <Text style={[s.intakeTxt, { color: '#2b5be3', fontFamily: FontFamily.jakartaBold }]}>Open to other intakes</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[s.joinSecBtn, { backgroundColor: C.brand }]}
                  onPress={() => requestJoin(sec.id)}
                  activeOpacity={0.8}
                >
                  <Feather name="user-plus" size={14} color="#fff" />
                  <Text style={[s.joinSecBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>Request to join</Text>
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
        <CodeCard code={mySection.join_code ?? 'ABCD12'} copied={copied} onCopy={copyCode} C={C} />

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
                      style={[s.approveBtn, { backgroundColor: '#e8f8f0' }]}
                      onPress={() => approveJoin(j.id)}
                      activeOpacity={0.75}
                    >
                      <Icon name="check" size={14} color="#12915e" />
                      <Text style={[s.approveTxt, { color: '#12915e', fontFamily: FontFamily.jakartaBold }]}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Section visibility */}
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>SECTION VISIBILITY</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.settingRow}>
            <View style={[s.settingIcon, { backgroundColor: mySection.is_public ? '#e8f8f0' : C.surface2 }]}>
              <Feather name={mySection.is_public ? 'globe' : 'shield'} size={18} color={mySection.is_public ? '#12915e' : C.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {mySection.is_public ? 'Public' : 'Private'}
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
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>INTAKE VISIBILITY</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.intakeInfo, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            Intake {mySection.intake} {mySection.department} — currently {mySection.intake_public ? 'Public' : 'Private'}
          </Text>
          {vote && vote.status === 'open' ? (
            <View style={[s.voteBox, { backgroundColor: C.surface2 }]}>
              <Text style={[s.voteTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Open vote: make intake {vote.proposal}
              </Text>
              <Text style={[s.voteSub, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {vote.yes} yes · {vote.no} no · {vote.pending} left · closes in {vote.closes_in_h}h
              </Text>
              <View style={s.voteActions}>
                <TouchableOpacity style={[s.voteBtn, { backgroundColor: '#e8f8f0' }]} onPress={() => castVote('yes')} activeOpacity={0.75}>
                  <Icon name="check" size={14} color="#12915e" />
                  <Text style={[s.voteBtnTxt, { color: '#12915e', fontFamily: FontFamily.jakartaBold }]}>Vote Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.voteBtn, { backgroundColor: C.surface }]} onPress={() => castVote('no')} activeOpacity={0.75}>
                  <Feather name="x" size={14} color={C.text2} />
                  <Text style={[s.voteBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>Vote No</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.outlineBtn, { backgroundColor: C.bg, borderColor: C.border, marginTop: 12 }]}
              onPress={() => setStartVoteOpen(true)}
              activeOpacity={0.75}
            >
              <Feather name="bar-chart-2" size={16} color={C.text} />
              <Text style={[s.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Start a vote</Text>
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
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>All clear</Text>
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
                    style={[s.approveBtn, { backgroundColor: '#e8f8f0', flex: 1 }]}
                    onPress={() => approveAdminReq(r.id)}
                    activeOpacity={0.75}
                  >
                    <Icon name="check" size={14} color="#12915e" />
                    <Text style={[s.approveTxt, { color: '#12915e', fontFamily: FontFamily.jakartaBold }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.approveBtn, { backgroundColor: '#fbe7e5', flex: 1 }]}
                    onPress={() => setRejectId(r.id)}
                    activeOpacity={0.75}
                  >
                    <Feather name="x" size={14} color="#e2483d" />
                    <Text style={[s.approveTxt, { color: '#e2483d', fontFamily: FontFamily.jakartaBold }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  const barTitle = isAdmin
    ? 'Admin · Study Hub'
    : sub === 'manage' ? 'Manage Section'
    : sub === 'browse' ? 'Browse Sections'
    : 'Study Hub';

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

      <Toast msg={toast} C={C} />

      <CreateSheet
        visible={createOpen}
        C={C}
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
