import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Modal,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, BackHandler, type ViewStyle,
} from 'react-native';
import { TactileSwitch } from '../../components/ui/TactileSwitch';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { TopBar, SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchPeople, loadPeople } from '../../services/peopleService';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';

const STUDY_COLOR = SectorColors.study;

// Study RPCs return soft results as json: { ok, error?, ... }.
type RpcResult = { ok?: boolean; error?: string; joinCode?: string } | null;

type Persona = 'notjoined' | 'pendingcreate' | 'member' | 'cr';
type Sub = 'home' | 'browse' | 'manage' | 'semester' | 'intake' | 'section';
type HomeTab = 'courses' | 'archive';
type ManageTab = 'members' | 'settings';

interface SectionRow {
  id: string;
  intake_id: string;
  number: number;
  is_public: boolean;
  join_code: string | null;
  department: string;
  department_id?: string;
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
  summary?: string;
  material_count?: number;
  question_count?: number;
  book_count?: number;
}

interface Dept {
  id: string;
  name: string;
  dept_number?: string | null;
}

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

const SEMESTER_INFO = [
  { num: 1, label: '1st Semester', phase: '1st Year · Freshman Term 1' },
  { num: 2, label: '2nd Semester', phase: '1st Year · Freshman Term 2' },
  { num: 3, label: '3rd Semester', phase: '1st Year · Freshman Term 3' },
  { num: 4, label: '4th Semester', phase: '2nd Year · Sophomore Term 1' },
  { num: 5, label: '5th Semester', phase: '2nd Year · Sophomore Term 2' },
  { num: 6, label: '6th Semester', phase: '2nd Year · Sophomore Term 3' },
  { num: 7, label: '7th Semester', phase: '3rd Year · Junior Term 1' },
  { num: 8, label: '8th Semester', phase: '3rd Year · Junior Term 2' },
  { num: 9, label: '9th Semester', phase: '3rd Year · Junior Term 3' },
  { num: 10, label: '10th Semester', phase: '4th Year · Senior Term 1' },
  { num: 11, label: '11th Semester', phase: '4th Year · Senior Term 2' },
  { num: 12, label: '12th Semester', phase: '4th Year · Capstone & Final' },
];

const shortDept = (name = '') => (name || '').replace(/^Department of\s+/i, '');

const deptCode = (name = '') => {
  const s = shortDept(name);
  const words = s.split(/\s+/).filter(w => /[A-Za-z]/.test(w) && !/^(&|and|of|the|in|for)$/i.test(w));
  return words.length >= 2 ? words.map(w => w[0].toUpperCase()).join('') : s;
};

function resolveStudentDept(
  mySec: SectionRow | null,
  profile: any,
  deptList: Dept[]
): Dept | null {
  if (!deptList || deptList.length === 0) return null;

  // 1. Approved home section
  if (mySec?.department_id) {
    const d = deptList.find(dept => dept.id === mySec.department_id);
    if (d) return d;
  }
  if (mySec?.department) {
    const d = deptList.find(dept => dept.name === mySec.department || shortDept(dept.name) === shortDept(mySec.department));
    if (d) return d;
  }

  // 2. User profile department or program string (e.g. "Bsc In Cse")
  const userDeptStr = (profile?.department || profile?.program || '').trim().toLowerCase();
  if (userDeptStr) {
    const matched = deptList.find(d => {
      const n = d.name.toLowerCase();
      const sn = shortDept(d.name).toLowerCase();
      const c = deptCode(d.name).toLowerCase();
      return n.includes(userDeptStr) || userDeptStr.includes(c) || userDeptStr.includes(sn) || userDeptStr.includes(n);
    });
    if (matched) return matched;
  }

  // 3. Default to CSE (dept_number '27' or name contains 'computer') or first department in list
  return (
    deptList.find(d => d.dept_number === '27') ||
    deptList.find(d => d.name.toLowerCase().includes('computer')) ||
    deptList[0] ||
    null
  );
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
    <View style={[codeStyles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[codeStyles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
          {t.study2.sectionJoinCode}
        </Text>
        <View style={[codeStyles.instantBadge, { backgroundColor: C.successBg }]}>
          <Feather name="zap" size={11} color={C.success} />
          <Text style={[codeStyles.instantTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
            Instant Join
          </Text>
        </View>
      </View>

      <View style={codeStyles.row}>
        <View style={[codeStyles.codeBox, { backgroundColor: C.bg, borderColor: C.border }]}>
          <Text style={[codeStyles.code, { color: C.brand, fontFamily: FontFamily.jakartaExtraBold }]}>
            {code}
          </Text>
        </View>
        <TouchableOpacity
          style={[codeStyles.copyBtn58, { backgroundColor: C.brand }]}
          onPress={onCopy}
          activeOpacity={0.8}
        >
          <Feather name={copied ? 'check' : 'copy'} size={18} color="#fff" />
          <Text style={[codeStyles.copyTxt, { fontFamily: FontFamily.jakartaBold }]}>
            {copied ? t.study2.copied : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[codeStyles.hint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
        {t.study2.codeJoinHint}
      </Text>
    </View>
  );
}
const codeStyles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 12 } as ViewStyle,
  label: { fontSize: 11, letterSpacing: 0.7 } as any,
  instantBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 } as ViewStyle,
  instantTxt: { fontSize: 10.5 } as any,
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 } as ViewStyle,
  codeBox: { flex: 1, height: 58, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  code: { fontSize: 24, letterSpacing: 6 } as any,
  copyBtn58: { height: 58, borderRadius: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 } as ViewStyle,
  copyTxt: { fontSize: 14, color: '#fff' } as any,
  hint: { fontSize: 12, lineHeight: 17, marginTop: 10 } as any,
});

function CourseCard({ course, onPress, C }: { course: Course; onPress: () => void; C: any }) {
  return (
    <TouchableOpacity
      style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '1e' }]}>
        <Feather name="book-open" size={20} color={STUDY_COLOR} />
      </View>
      <View style={cardStyles.body}>
        <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {course.code} · {course.name}
        </Text>
        <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
          {course.summary || 'No materials yet'}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );
}

function SemesterCard({ sem, onPress, C }: { sem: { num: number; label: string; phase: string }; onPress: () => void; C: any }) {
  return (
    <TouchableOpacity
      style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '1e', borderColor: STUDY_COLOR + '30', borderWidth: 1 }]}>
        <Text style={[cardStyles.semNum, { color: STUDY_COLOR, fontFamily: FontFamily.jakartaExtraBold }]}>
          {sem.num}
        </Text>
      </View>
      <View style={cardStyles.body}>
        <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {sem.label}
        </Text>
        <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
          {sem.phase}
        </Text>
      </View>
      <Feather name="arrow-right" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card72: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  } as ViewStyle,
  icon44: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  body: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  title: {
    fontSize: 14.5,
  } as any,
  sub: {
    fontSize: 11.5,
    marginTop: 3,
  } as any,
  semNum: {
    fontSize: 16,
  } as any,
});

function AddCourseSheet({
  visible, C, onClose, onSubmit,
}: {
  visible: boolean; C: any; onClose: () => void; onSubmit: (code: string, name: string) => Promise<boolean | void> | void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ok = code.trim().length > 0 && name.trim().length > 0 && !submitting;

  function reset() { setCode(''); setName(''); }

  const handlePress = async () => {
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await onSubmit(code.trim().toUpperCase(), name.trim());
      if (res !== false) {
        reset();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => { reset(); onClose(); }} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            Add Course
          </Text>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            COURSE CODE
          </Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={code}
            onChangeText={setCode}
            placeholder="e.g. CSE 205"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            editable={!submitting}
          />

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            COURSE NAME
          </Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Data Structures & Algorithms"
            placeholderTextColor={C.textMuted}
            editable={!submitting}
          />

          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: ok ? C.brand : C.surface2, opacity: ok ? 1 : 0.5 }]}
            disabled={!ok}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="plus" size={18} color={ok ? '#fff' : C.textMuted} />
                <Text style={[sheetStyles.submitTxt, { color: ok ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  Add Course
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LeaveSheet({
  visible, isSoleCR, candidates, sectionNumber, C, onClose, onLeave, onHandoverAndLeave,
}: {
  visible: boolean;
  isSoleCR: boolean;
  candidates: { id: string; user_id: string; full_name: string }[];
  sectionNumber: number;
  C: any;
  onClose: () => void;
  onLeave: () => Promise<void> | void;
  onHandoverAndLeave: (newCrUserId: string) => Promise<void> | void;
}) {
  const [selectedUser, setSelectedUser] = useState('');
  const [busy, setBusy] = useState(false);
  const needsHandover = isSoleCR && candidates.length > 0;

  const handleClose = () => {
    setSelectedUser('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface, maxHeight: '82%' }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {needsHandover ? 'Select a new CR before leaving' : `Leave Section ${sectionNumber}?`}
          </Text>
          <Text style={[sheetStyles.hintTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {needsHandover
              ? `As the only Class Representative of Section ${sectionNumber}, you must select an approved classmate to take over as CR before you can leave.`
              : isSoleCR
              ? `You are currently the only member in Section ${sectionNumber}. If you leave, the section will have no active members.`
              : `You will lose access to Section ${sectionNumber} materials. You can join another section afterwards.`}
          </Text>

          {needsHandover && (
            <ScrollView style={{ marginTop: 14, maxHeight: 220 }} keyboardShouldPersistTaps="handled">
              {candidates.map(cd => {
                const isSel = selectedUser === cd.user_id;
                return (
                  <TouchableOpacity
                    key={cd.id}
                    style={[
                      cardStyles.card72,
                      {
                        backgroundColor: isSel ? C.brand + '18' : C.bg,
                        borderColor: isSel ? C.brand : C.border,
                        marginBottom: 8,
                      },
                    ]}
                    onPress={() => setSelectedUser(cd.user_id)}
                    activeOpacity={0.75}
                  >
                    <Avatar name={cd.full_name} size="md" />
                    <View style={cardStyles.body}>
                      <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {cd.full_name}
                      </Text>
                      <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        Classmate · Approved Member
                      </Text>
                    </View>
                    <Feather
                      name={isSel ? 'check-circle' : 'circle'}
                      size={20}
                      color={isSel ? C.brand : C.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[
              sheetStyles.submitBtn,
              {
                backgroundColor: C.danger,
                opacity: (needsHandover && !selectedUser) || busy ? 0.5 : 1,
              },
            ]}
            disabled={(needsHandover && !selectedUser) || busy}
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              try {
                if (needsHandover) {
                  await onHandoverAndLeave(selectedUser);
                } else {
                  await onLeave();
                }
              } finally {
                setBusy(false);
              }
            }}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="log-out" size={18} color="#fff" />
                <Text style={[sheetStyles.submitTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {needsHandover ? 'Transfer CR & Leave' : 'Leave Section'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[sheetStyles.cancelBtn, { borderColor: C.border }]}
            onPress={handleClose}
            disabled={busy}
            activeOpacity={0.75}
          >
            <Text style={[sheetStyles.cancelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
      <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RejectSheet({ visible, C, onClose, onReject }: { visible: boolean; C: any; onClose: () => void; onReject: (note: string) => void }) {
  const t = useT();
  const [note, setNote] = useState('');
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      </KeyboardAvoidingView>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' } as ViewStyle,
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingTop: 10, paddingBottom: 36 } as ViewStyle,
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 } as ViewStyle,
  sheetTitle: { fontSize: 18, letterSpacing: -0.2, lineHeight: 24, includeFontPadding: false, marginBottom: 14 } as any,
  flabel: { fontSize: 11, letterSpacing: 0.7, marginBottom: 7, marginTop: 14, marginLeft: 2 } as any,
  input: { height: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 14.5 } as any,
  textarea: { minHeight: 80, borderRadius: 12, borderWidth: 1, padding: 13, fontSize: 14, textAlignVertical: 'top' } as any,
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 58, borderRadius: 16, marginTop: 20 } as ViewStyle,
  submitTxt: { fontSize: 15 } as any,
  cancelBtn: { alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, borderWidth: 1, marginTop: 10 } as ViewStyle,
  cancelTxt: { fontSize: 14 } as any,
  hintTxt: { fontSize: 13.5, lineHeight: 20 } as any,
});

export function StudyHubScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const toast = useToast();
  const [sub, setSub] = useState<Sub>('home');
  const [persona, setPersona] = useState<Persona>('notjoined');
  const [homeTab, setHomeTab] = useState<HomeTab>('courses');
  const [manageTab, setManageTab] = useState<ManageTab>('members');

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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [browseSearch, setBrowseSearch] = useState('');

  // Modals
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

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
  const [joining, setJoining] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  // Library exploration state (1:1 Web Parity with StudyHubDept, StudyHubSemester, StudyHubIntake, StudyHubSection)
  const [selectedSemester, setSelectedSemester] = useState<{ num: number; label: string; phase: string } | null>(null);
  const [selectedIntake, setSelectedIntake] = useState<{ id: string; number: number; department_id?: string; department_name?: string; years?: string | null } | null>(null);
  const [selectedSection, setSelectedSection] = useState<{ id: string; number: number; intake_number: number; department_name: string; is_public: boolean; cr_name?: string | null } | null>(null);
  const [sectionOrigin, setSectionOrigin] = useState<'intake' | 'browse'>('intake');
  const [semesterIntakes, setSemesterIntakes] = useState<any[]>([]);
  const [intakeSections, setIntakeSections] = useState<any[]>([]);
  const [sectionCourses, setSectionCourses] = useState<Course[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(msg: string) {
    setToastMsg(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMsg(''), 1800);
  }

  useEffect(() => () => {
    if (toastRef.current) clearTimeout(toastRef.current);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

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
      department_id: intake?.department_id ?? dept?.id ?? '',
      intake: intake?.number ?? 0,
      intake_public: intake?.is_public ?? false,
      role,
    };
  }

  const load = useCallback(async () => {
    if (!user) return;
    const cacheKey = `study_my_section_${user.id}`;

    const cachedStudy = await getCache<{ sec: SectionRow | null; persona: Persona; courses: Course[] }>(cacheKey);
    if (cachedStudy) {
      if (cachedStudy.sec) setMySection(cachedStudy.sec);
      setPersona(cachedStudy.persona);
      setCourses(cachedStudy.courses);
    }

    try {
      const { data: mems, error: memErr } = await supabase
        .from('study_section_members')
        .select('role, study_sections(id, intake_id, number, join_code, is_public, study_intakes(number, is_public, department_id, departments(id, name, dept_number)))')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('role', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1);

      if (memErr) {
        if (cachedStudy) setIsOffline(true);
        return;
      }

      setIsOffline(false);
      const mem = mems?.[0];
      const sec = mem ? mapSection(mem.study_sections, mem.role) : null;
      if (sec) {
        setMySection(sec);
        const resolvedPersona: Persona = mem!.role === 'cr' ? 'cr' : 'member';
        setPersona(resolvedPersona);
        const { data: coursesData } = await supabase
          .from('study_courses')
          .select('*, study_materials(id, type, file_kind), study_question_bank(id), study_books(id)')
          .eq('section_id', sec.id)
          .order('code');

        const cList: Course[] = (coursesData ?? []).map((c: any) => {
          const allMaterials = c.study_materials ?? [];
          const notesCount = allMaterials.filter((m: any) => m.type !== 'Lecture Slide' && !['ppt', 'pptx'].includes((m.file_kind ?? '').toLowerCase())).length;
          const slidesCount = allMaterials.filter((m: any) => m.type === 'Lecture Slide' || ['ppt', 'pptx'].includes((m.file_kind ?? '').toLowerCase())).length;
          const qbCount = (c.study_question_bank ?? []).length;
          const booksCount = (c.study_books ?? []).length;

          const parts: string[] = [];
          if (notesCount > 0) parts.push(`${notesCount} note${notesCount === 1 ? '' : 's'}`);
          if (slidesCount > 0) parts.push(`${slidesCount} slide${slidesCount === 1 ? '' : 's'}`);
          if (qbCount > 0) parts.push(`${qbCount} question${qbCount === 1 ? '' : 's'}`);
          if (booksCount > 0) parts.push(`${booksCount} book${booksCount === 1 ? '' : 's'}`);
          const summary = parts.length > 0 ? parts.join(' · ') : 'No materials yet';

          return {
            id: c.id,
            code: c.code,
            name: c.name,
            summary,
            material_count: allMaterials.length,
            question_count: qbCount,
            book_count: booksCount,
          };
        });

        setCourses(cList);
        setCache(cacheKey, { sec, persona: resolvedPersona, courses: cList });
      } else {
        const { data: req } = await supabase
          .from('study_section_requests')
          .select('id')
          .eq('requester_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();
        const resolvedPersona: Persona = req ? 'pendingcreate' : 'notjoined';
        setPersona(resolvedPersona);
        setCourses([]);
        setCache(cacheKey, { sec: null, persona: resolvedPersona, courses: [] });
      }
    } catch {
      if (cachedStudy) setIsOffline(true);
    }
  }, [user]);

  async function loadAdminQueue() {
    const { data, error } = await supabase
      .from('study_section_requests')
      .select('*, departments:department_id(name)')
      .eq('status', 'pending')
      .order('created_at');
    if (error) { console.warn('loadAdminQueue:', error.message); return; }
    if (data) {
      const requesterIds = (data as any[]).map(r => r.requester_id).filter(Boolean);
      const people = await fetchPeople(requesterIds);
      setAdminReqs(data.map((r: any) => {
        const prof = people[r.requester_id];
        const dept = one<any>(r.departments);
        const name = (prof?.full_name ?? 'Unknown').trim();
        return {
          id: r.id,
          full_name: name,
          initials: name.split(/\s+/).slice(0, 2).map((w: string) => w[0] || '').join(''),
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
    const cached = await getCache<SectionRow[]>(CacheKeys.STUDY_COURSES);
    if (cached && cached.length) setSections(cached);
    try {
      const { data, error } = await supabase
        .from('study_sections')
        .select('id, intake_id, number, join_code, is_public, study_intakes(number, is_public, departments(name))')
        .eq('is_public', true)
        .order('created_at');
      if (error) { console.warn('loadPublicSections:', error.message); return; }
      if (data) {
        const rows = data.map((r: any) => mapSection(r)).filter(Boolean) as SectionRow[];
        setSections(rows);
        setCache(CacheKeys.STUDY_COURSES, rows);
      }
    } catch {
      // offline fallback
    }
  }

  async function loadJoinReqs() {
    if (!mySection) return;
    const { data, error } = await supabase
      .from('study_section_members')
      .select('*')
      .eq('section_id', mySection.id)
      .eq('status', 'pending');
    if (error) { console.warn('loadJoinReqs:', error.message); return; }
    if (data) {
      const people = await fetchPeople((data as any[]).map(r => r.user_id));
      setJoinReqs(data.map((r: any) => {
        const name = (people[r.user_id]?.full_name ?? 'Unknown').trim();
        return {
          id: r.id,
          user_id: r.user_id,
          full_name: name,
          initials: name.split(/\s+/).slice(0, 2).map((w: string) => w[0] || '').join(''),
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
        .select('section_id, user_id')
        .in('section_id', secs.map(x => x.id))
        .eq('role', 'cr')
        .eq('status', 'approved');
      const people = await fetchPeople((crs ?? []).map((r: any) => r.user_id));
      const crMap: Record<string, string> = {};
      (crs ?? []).forEach((r: any) => { crMap[r.section_id] = people[r.user_id]?.full_name ?? null; });
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
    const { error: demoteErr } = await supabase
      .from('study_section_members')
      .update({ role: 'member' })
      .eq('section_id', sectionId).eq('role', 'cr').neq('user_id', userId);
    if (demoteErr) {
      toast({ type: 'error', title: 'Error', message: demoteErr.message });
      return;
    }
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
    const people = await loadPeople();
    setStudents(
      Object.values(people)
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .slice(0, 100)
        .map(p => ({ id: p.id, full_name: p.full_name })),
    );
  }

  async function loadSecMembers() {
    if (!mySection) return;
    const { data } = await supabase
      .from('study_section_members')
      .select('id, user_id, role')
      .eq('section_id', mySection.id)
      .eq('status', 'approved');
    if (data) {
      const people = await fetchPeople((data as any[]).map(r => r.user_id));
      setSecMembers((data as any[]).map(r => ({
        id: r.id, user_id: r.user_id, role: r.role,
        full_name: people[r.user_id]?.full_name ?? 'Student',
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

  async function loadVote(intakeId: string) {
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
    const hoursLeft = v.closes_at ? Math.max(0, Math.round((new Date(v.closes_at).getTime() - Date.now()) / 3600000)) : 0;
    setVote({
      id: v.id,
      proposal: v.proposal as Vote['proposal'],
      yes,
      no,
      closes_in_h: hoursLeft,
      status: v.status as Vote['status'],
      myBallot: mine as Vote['myBallot'],
    });
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    getCache<Dept[]>(CacheKeys.STUDY_DEPTS).then(c => { if (c && c.length) setDepartments(c); });
    supabase.from('departments').select('id, name, dept_number').order('name')
      .then(({ data }) => {
        if (data) {
          setDepartments(data as Dept[]);
          setCache(CacheKeys.STUDY_DEPTS, data);
        }
      });
  }, []);

  useEffect(() => {
    if (isAdmin && sub === 'home') loadAdminQueue();
  }, [isAdmin, sub]);

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
    if (sub === 'home' && mySection) {
      loadPins();
      loadSecMembers();
    }
  }, [sub, mySection]);

  const handleBack = useCallback((): boolean => {
    if (addCourseOpen) { setAddCourseOpen(false); return true; }
    if (leaveOpen) { setLeaveOpen(false); return true; }
    if (createOpen) { setCreateOpen(false); return true; }
    if (startVoteOpen) { setStartVoteOpen(false); return true; }
    if (rejectId) { setRejectId(null); return true; }
    if (addIntakeOpen) { setAddIntakeOpen(false); return true; }
    if (addSectionFor) { setAddSectionFor(null); return true; }
    if (setCrFor) { setSetCrFor(null); return true; }

    if (sub === 'section') {
      setSelectedSection(null);
      if (sectionOrigin === 'intake' && selectedIntake) {
        setSub('intake');
      } else {
        setSub('browse');
      }
      return true;
    }
    if (sub === 'intake') {
      setSelectedIntake(null);
      if (selectedSemester) {
        setSub('semester');
      } else {
        setSub('home');
      }
      return true;
    }
    if (sub === 'semester') {
      setSelectedSemester(null);
      setSub('home');
      return true;
    }
    if (sub !== 'home') {
      setSub('home');
      return true;
    }
    if (homeTab !== 'courses') {
      setHomeTab('courses');
      return true;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }
    return false;
  }, [
    addCourseOpen, leaveOpen, createOpen, startVoteOpen, rejectId,
    addIntakeOpen, addSectionFor, setCrFor,
    sub, selectedIntake, selectedSemester, sectionOrigin, homeTab, navigation,
  ]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        return handleBack();
      });
      return () => subscription.remove();
    }, [handleBack])
  );

  async function openSemester(sem: { num: number; label: string; phase: string }) {
    setSelectedSemester(sem);
    setSub('semester');
    setDrillLoading(true);
    try {
      let deptList = departments;
      if (!deptList || deptList.length === 0) {
        const { data: dData } = await supabase.from('departments').select('id, name, dept_number').order('name');
        if (dData && dData.length > 0) {
          deptList = dData as Dept[];
          setDepartments(deptList);
        }
      }
      const activeDept = resolveStudentDept(mySection, profile, deptList);
      const deptId = activeDept?.id || mySection?.department_id || catDept || (deptList.length > 0 ? deptList[0].id : null);
      if (!deptId) {
        setSemesterIntakes([]);
        return;
      }
      const { data: intakes } = await supabase
        .from('study_intakes')
        .select('id, number, years, is_public, department_id, departments(name)')
        .eq('department_id', deptId)
        .order('number', { ascending: false });

      if (intakes && intakes.length > 0) {
        const maxIntake = Math.max(...intakes.map((i: any) => i.number));
        const intakeIds = intakes.map((i: any) => i.id);

        const { data: secs } = await supabase
          .from('study_sections')
          .select('id, intake_id')
          .in('intake_id', intakeIds);

        const secCountMap: Record<string, number> = {};
        (secs ?? []).forEach((s: any) => {
          secCountMap[s.intake_id] = (secCountMap[s.intake_id] || 0) + 1;
        });

        const enriched = intakes.map((i: any) => {
          const currentSem = Math.max(1, (maxIntake - i.number) + 1);
          const isCompleted = currentSem > sem.num;
          const isCurrent = currentSem === sem.num;
          const isGraduated = currentSem > 12;
          const dept = one<any>(i.departments);
          return {
            id: i.id,
            number: i.number,
            years: i.years,
            department_id: i.department_id,
            department_name: dept?.name ?? activeDept?.name ?? mySection?.department ?? '',
            currentSem,
            isCompleted,
            isCurrent,
            isGraduated,
            sectionsCount: secCountMap[i.id] || 0,
          };
        }).filter((i: any) => i.isCompleted || i.isCurrent);
        setSemesterIntakes(enriched);
      } else {
        setSemesterIntakes([]);
      }
    } catch (err) {
      console.warn('openSemester error:', err);
    } finally {
      setDrillLoading(false);
    }
  }

  async function openSectionsForIntake(intake: { id: string; number: number; department_id?: string; department_name?: string; years?: string | null }) {
    setSelectedIntake(intake as any);
    setSub('intake');
    setDrillLoading(true);
    try {
      const { data: secs } = await supabase
        .from('study_sections')
        .select('id, number, is_public, intake_id, study_intakes(number, department_id, departments(name))')
        .eq('intake_id', intake.id)
        .order('number', { ascending: true });

      if (secs && secs.length > 0) {
        const secIds = secs.map(s => s.id);
        const [crsRes, coursesRes] = await Promise.all([
          supabase
            .from('study_section_members')
            .select('section_id, user_id')
            .in('section_id', secIds)
            .eq('role', 'cr')
            .eq('status', 'approved'),
          supabase
            .from('study_courses')
            .select('id, section_id')
            .in('section_id', secIds),
        ]);

        const crMap: Record<string, string> = {};
        if (crsRes.data && crsRes.data.length > 0) {
          const people = await fetchPeople(crsRes.data.map(c => c.user_id));
          crsRes.data.forEach(c => {
            crMap[c.section_id] = people[c.user_id]?.full_name ?? 'Class Representative';
          });
        }

        const courses = coursesRes.data ?? [];
        const courseIds = courses.map(c => c.id);
        const matCountBySec: Record<string, number> = {};

        if (courseIds.length > 0) {
          const [matsRes, qbRes, booksRes] = await Promise.all([
            supabase.from('study_materials').select('course_id').in('course_id', courseIds),
            supabase.from('study_question_bank').select('course_id').in('course_id', courseIds),
            supabase.from('study_books').select('course_id').in('course_id', courseIds),
          ]);
          const secByCourse: Record<string, string> = {};
          courses.forEach(c => { secByCourse[c.id] = c.section_id; });

          (matsRes.data ?? []).forEach(m => {
            if (m.course_id) {
              const sId = secByCourse[m.course_id];
              if (sId) matCountBySec[sId] = (matCountBySec[sId] || 0) + 1;
            }
          });
          (qbRes.data ?? []).forEach(q => {
            if (q.course_id) {
              const sId = secByCourse[q.course_id];
              if (sId) matCountBySec[sId] = (matCountBySec[sId] || 0) + 1;
            }
          });
          (booksRes.data ?? []).forEach(b => {
            if (b.course_id) {
              const sId = secByCourse[b.course_id];
              if (sId) matCountBySec[sId] = (matCountBySec[sId] || 0) + 1;
            }
          });
        }

        const mapped = secs.map(s => {
          const inData = one<any>(s.study_intakes);
          const dept = one<any>(inData?.departments);
          return {
            id: s.id,
            number: s.number,
            is_public: s.is_public,
            intake_number: inData?.number ?? intake.number,
            department_name: dept?.name ?? intake.department_name ?? mySection?.department ?? '',
            cr_name: crMap[s.id] ?? null,
            material_count: matCountBySec[s.id] || 0,
          };
        });
        setIntakeSections(mapped);
      } else {
        setIntakeSections([]);
      }
    } catch (err) {
      console.warn('openSectionsForIntake error:', err);
    } finally {
      setDrillLoading(false);
    }
  }

  async function openSectionRoom(section: any, origin: 'intake' | 'browse' = 'intake') {
    setSectionOrigin(origin);
    setSelectedSection(section);
    setSub('section');
    setDrillLoading(true);
    try {
      const { data: cList } = await supabase
        .from('study_courses')
        .select('id, code, name')
        .eq('section_id', section.id)
        .order('code');

      if (cList && cList.length > 0) {
        const cIds = cList.map(c => c.id);
        const [matsRes, qbRes, booksRes] = await Promise.all([
          supabase.from('study_materials').select('course_id, type, file_kind').in('course_id', cIds),
          supabase.from('study_question_bank').select('course_id').in('course_id', cIds),
          supabase.from('study_books').select('course_id').in('course_id', cIds),
        ]);

        const mats = matsRes.data ?? [];
        const qbs = qbRes.data ?? [];
        const bks = booksRes.data ?? [];

        const enriched: Course[] = cList.map(c => {
          const cMats = mats.filter(m => m.course_id === c.id);
          const noteCount = cMats.filter(m => m.type !== 'Lecture Slide' && !['ppt', 'pptx'].includes((m.file_kind ?? '').toLowerCase())).length;
          const slideCount = cMats.filter(m => m.type === 'Lecture Slide' || ['ppt', 'pptx'].includes((m.file_kind ?? '').toLowerCase())).length;
          const qbCount = qbs.filter(q => q.course_id === c.id).length;
          const bkCount = bks.filter(b => b.course_id === c.id).length;

          const parts: string[] = [];
          if (noteCount > 0) parts.push(`${noteCount} note${noteCount === 1 ? '' : 's'}`);
          if (slideCount > 0) parts.push(`${slideCount} slide${slideCount === 1 ? '' : 's'}`);
          if (qbCount > 0) parts.push(`${qbCount} question${qbCount === 1 ? '' : 's'}`);
          if (bkCount > 0) parts.push(`${bkCount} book${bkCount === 1 ? '' : 's'}`);
          const summary = parts.length > 0 ? parts.join(' · ') : 'No materials yet';

          return {
            id: c.id,
            code: c.code,
            name: c.name,
            summary,
            material_count: noteCount + slideCount,
            question_count: qbCount,
            book_count: bkCount,
          };
        });
        setSectionCourses(enriched);
      } else {
        setSectionCourses([]);
      }
    } catch (err) {
      console.warn('openSectionRoom error:', err);
    } finally {
      setDrillLoading(false);
    }
  }

  async function openMyIntakeSections() {
    if (!mySection) return;
    setSelectedSemester(null);
    await openSectionsForIntake({
      id: mySection.intake_id,
      number: mySection.intake,
      department_name: mySection.department,
    });
  }

  async function copyCode() {
    if (!mySection?.join_code) return;
    await Clipboard.setStringAsync(mySection.join_code);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1400);
    flash('Copied!');
  }

  async function joinByCode() {
    if (codeInput.trim().length < 4 || !user || joining) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to join section.' });
      return;
    }
    setJoining(true);
    try {
      const code = codeInput.trim().toUpperCase();
      const { data, error } = await supabase.rpc('join_section_by_code', { p_code: code });
      const res = data as RpcResult;
      if (error || !res?.ok) {
        toast({ type: 'error', title: 'Could not join', message: error?.message ?? res?.error ?? 'Invalid join code.' });
        return;
      }
      const cacheKey = `study_my_section_${user.id}`;
      await setCache(cacheKey, null);
      setCodeInput('');
      flash('Joined section!');
      load();
    } finally {
      setJoining(false);
    }
  }

  async function requestJoin(sectionId: string) {
    if (!user) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to request section join.' });
      return;
    }
    const { error } = await supabase
      .from('study_section_members')
      .insert({ section_id: sectionId, user_id: user.id, role: 'member', status: 'pending' });
    if (error) {
      if (error.code === '23505') {
        toast({ type: 'info', title: 'Already Requested', message: 'You have already requested to join this section.' });
      } else {
        toast({ type: 'error', title: 'Error', message: error.message });
      }
      return;
    }
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

  async function rejectJoin(id: string) {
    if (!user) return;
    const { error } = await supabase
      .from('study_section_members')
      .delete()
      .eq('id', id);
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setJoinReqs(j => j.filter(x => x.id !== id));
    flash('Join request rejected');
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
      intake_number: parseInt(intake, 10),
      section_number: parseInt(section, 10),
      reason: reason || null,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ type: 'info', title: 'Pending Request', message: 'You already have a pending section request under review.' });
      } else {
        toast({ type: 'error', title: 'Error', message: error.message });
      }
      return;
    }
    setCreateOpen(false);
    setPersona('pendingcreate');
    flash('Request submitted');
  }

  async function approveAdminReq(id: string) {
    const { data, error } = await supabase.rpc('approve_section_request', { p_request_id: id });
    const res = data as RpcResult;
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    if (res && res.ok === false) { toast({ type: 'error', title: 'Error', message: res.error ?? 'Could not approve' }); return; }
    setAdminReqs(r => r.filter(x => x.id !== id));
    flash(`Approved - join code ${res?.joinCode ?? 'generated'}`);
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
    const res = data as RpcResult;
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    if (res && res.ok === false) { toast({ type: 'error', title: 'Could not start vote', message: res.error ?? 'Unknown error' }); return; }
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
    const res = data as RpcResult;
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    if (res && res.ok === false) { toast({ type: 'error', title: 'Could not vote', message: res.error ?? 'Unknown error' }); return; }
    flash('Vote recorded');
    loadVote(mySection.intake_id);
    load();
  }

  async function handleAddCourse(code: string, name: string): Promise<boolean> {
    if (!mySection || !user) return false;
    const { error } = await supabase.from('study_courses').insert({
      section_id: mySection.id,
      code,
      name,
      created_by: user.id,
    });
    if (error) {
      toast({ type: 'error', title: 'Error', message: error.message });
      return false;
    }
    setAddCourseOpen(false);
    flash(`Course ${code} added`);
    load();
    return true;
  }

  async function handleLeaveSection() {
    if (!mySection || !user) return;
    const cacheKey = `study_my_section_${user.id}`;
    const { error } = await supabase
      .from('study_section_members')
      .delete()
      .eq('section_id', mySection.id)
      .eq('user_id', user.id);
    if (error) {
      toast({ type: 'error', title: 'Error', message: error.message });
      return;
    }
    await setCache(cacheKey, null);
    setMySection(null);
    setPersona('notjoined');
    setCourses([]);
    setLeaveOpen(false);
    flash('Left section');
    load();
  }

  async function handleHandoverAndLeave(newCrUserId: string) {
    if (!mySection || !user) return;
    const cacheKey = `study_my_section_${user.id}`;
    const { data, error } = await supabase.rpc('study_handover_cr_and_leave', {
      p_section_id: mySection.id,
      p_new_cr_id: newCrUserId,
    });
    const res = data as RpcResult;
    if (error || !res?.ok) {
      toast({ type: 'error', title: 'Error', message: error?.message ?? res?.error ?? 'Could not transfer CR role.' });
      return;
    }
    await setCache(cacheKey, null);
    setMySection(null);
    setPersona('notjoined');
    setCourses([]);
    setLeaveOpen(false);
    flash('CR role transferred. You left the section.');
    load();
  }

  function timeAgo(iso: string): string {
    const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  }

  const otherCRs = useMemo(
    () => secMembers.filter(m => m.role === 'cr' && m.user_id !== user?.id),
    [secMembers, user?.id]
  );
  const isSoleCR = persona === 'cr' && otherCRs.length === 0;
  const eligibleCandidates = useMemo(
    () => secMembers.filter(m => m.user_id !== user?.id),
    [secMembers, user?.id]
  );
  const canAddCourse = persona === 'cr' || mySection?.role === 'editor' || isAdmin;

  const homeTabs: TabItem<HomeTab>[] = useMemo(() => [
    { id: 'courses', label: 'Courses', icon: 'book-open', count: courses.length },
    { id: 'archive', label: '12 Semesters', icon: 'layers' },
  ], [courses.length]);

  const manageTabs: TabItem<ManageTab>[] = useMemo(() => [
    { id: 'members', label: 'Members', icon: 'users', count: joinReqs.length + secMembers.length },
    { id: 'settings', label: 'Settings', icon: 'sliders' },
  ], [joinReqs.length, secMembers.length]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses;
    const cleanQ = q.replace(/[\s-_]/g, '');
    return courses.filter(c => {
      const codeClean = (c.code || '').toLowerCase().replace(/[\s-_]/g, '');
      const nameLower = (c.name || '').toLowerCase();
      return codeClean.includes(cleanQ) || nameLower.includes(q);
    });
  }, [courses, searchQuery]);

  const filteredBrowseSections = useMemo(() => {
    const q = browseSearch.trim().toLowerCase();
    const pub = sections.filter(sec => sec.is_public);
    if (!q) return pub;
    return pub.filter(s =>
      (s.department || '').toLowerCase().includes(q) ||
      String(s.intake).includes(q) ||
      String(s.number).includes(q)
    );
  }, [sections, browseSearch]);

  function renderNotJoined() {
    return (
      <View>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, padding: 18 }]}>
          <Text style={[s.joinTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.study2.joinAStudySection}
          </Text>
          <Text style={[s.joinSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            Enter the 6-character code provided by your Class Representative to join your section instantly.
          </Text>
          <TextInput
            style={[
              s.codeInput58,
              { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaExtraBold },
            ]}
            value={codeInput}
            onChangeText={t => setCodeInput(t.toUpperCase().slice(0, 8))}
            placeholder="ENTER CODE"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[
              s.joinBtn58,
              {
                backgroundColor: codeInput.trim().length >= 4 && !joining ? C.brand : C.surface2,
                opacity: codeInput.trim().length >= 4 && !joining ? 1 : 0.6,
              },
            ]}
            disabled={codeInput.trim().length < 4 || joining}
            onPress={joinByCode}
            activeOpacity={0.8}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="log-in" size={18} color={codeInput.trim().length >= 4 ? '#fff' : C.textMuted} />
                <Text
                  style={[
                    s.joinBtnTxt,
                    { color: codeInput.trim().length >= 4 ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {t.study2.join} Section
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.study2.dontHaveCode}
        </Text>

        <TouchableOpacity
          style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => { setSub('browse'); loadPublicSections(); }}
          activeOpacity={0.75}
        >
          <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '1e' }]}>
            <Icon name="study" size={20} color={STUDY_COLOR} />
          </View>
          <View style={cardStyles.body}>
            <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.study2.browsePublicSections}
            </Text>
            <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Explore open courses, notes, and questions across your department
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.75}
        >
          <View style={[cardStyles.icon44, { backgroundColor: C.brand + '1e' }]}>
            <Feather name="plus-circle" size={20} color={C.brand} />
          </View>
          <View style={cardStyles.body}>
            <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.study2.requestToCreateSection}
            </Text>
            <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Apply to become Class Representative and set up your section
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={C.textMuted} />
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
        <Text style={[s.pendingTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.study2.requestUnderReview}
        </Text>
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
        {/* Hero Section Card (72 dp) */}
        <View style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 12 }]}>
          <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '1e' }]}>
            <Icon name="study" size={22} color={STUDY_COLOR} />
          </View>
          <View style={cardStyles.body}>
            <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
              {mySection.department}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Text style={[cardStyles.sub, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
                Intake {mySection.intake} · Sec {mySection.number}
              </Text>
              <View style={[s.visPill, { backgroundColor: mySection.is_public ? C.successBg : C.surface2 }]}>
                <View style={[s.visDot, { backgroundColor: mySection.is_public ? C.success : C.textMuted }]} />
                <Text style={[s.visTxt, { color: mySection.is_public ? C.success : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {mySection.is_public ? t.study2.public : t.study2.private}
                </Text>
              </View>
              {isCr && (
                <View style={[s.crPill, { backgroundColor: C.infoBg }]}>
                  <Text style={[s.crTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>CR</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* CR code card & Manage button */}
        {isCr && (
          <View style={{ marginBottom: 12 }}>
            <CodeCard code={mySection.join_code ?? '-'} copied={copied} onCopy={copyCode} C={C} />
            <TouchableOpacity
              style={[s.ctrlBtn58, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, marginTop: 10 }]}
              onPress={() => { setSub('manage'); loadJoinReqs(); }}
              activeOpacity={0.75}
            >
              <Feather name="sliders" size={17} color={C.text} />
              <Text style={[s.ctrlBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold, flex: 1 }]}>
                {t.study2.manageSection}
              </Text>
              {joinReqs.length > 0 && (
                <View style={[s.badge, { backgroundColor: C.danger }]}>
                  <Text style={[s.badgeTxt, { fontFamily: FontFamily.jakartaBold }]}>{joinReqs.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Pinned Notices */}
        {pins.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.study2.pinned} · {pins.length}
            </Text>
            {pins.map(p => (
              <View
                key={p.id}
                style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
              >
                <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '1e' }]}>
                  <Feather name="bookmark" size={18} color={STUDY_COLOR} />
                </View>
                <View style={cardStyles.body}>
                  <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={2}>
                    {p.message}
                  </Text>
                  <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {timeAgo(p.created_at)}
                  </Text>
                </View>
                {isCr && (
                  <TouchableOpacity onPress={() => deletePin(p.id)} hitSlop={8} activeOpacity={0.7} style={{ padding: 6 }}>
                    <Feather name="x" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 58 dp Switcher Tabs: Courses vs 12 Semesters */}
        <SegmentedTabs
          tabs={homeTabs}
          activeTab={homeTab}
          onTabChange={setHomeTab}
          style={{ marginBottom: 12 }}
        />

        {homeTab === 'courses' ? (
          <View>
            {/* Action Row */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {canAddCourse && (
                <TouchableOpacity
                  style={[s.ctrlBtn58, { backgroundColor: C.brand, flex: 1 }]}
                  onPress={() => setAddCourseOpen(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={[s.ctrlBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    Add Course
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  s.ctrlBtn58,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    borderWidth: 1,
                    flex: canAddCourse ? 1 : undefined,
                    width: canAddCourse ? undefined : '100%',
                  },
                ]}
                onPress={openMyIntakeSections}
                activeOpacity={0.75}
              >
                <Feather name="compass" size={16} color={C.text} />
                <Text style={[s.ctrlBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Other Sections
                </Text>
              </TouchableOpacity>
            </View>

            {/* 58dp Leave Section Bar below Other Sections */}
            <TouchableOpacity
              style={[
                s.leaveBar58,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fecaca',
                  borderWidth: 1,
                  marginBottom: 12,
                },
              ]}
              onPress={() => setLeaveOpen(true)}
              activeOpacity={0.75}
            >
              <Feather name="log-out" size={16} color={C.danger} />
              <Text style={[s.leaveBarTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                Leave Section
              </Text>
            </TouchableOpacity>

            {/* Search Bar if courses > 2 */}
            {courses.length > 2 && (
              <View style={[s.searchBar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 12 }]}>
                <Feather name="search" size={18} color={C.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={[s.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search courses…"
                  placeholderTextColor={C.textMuted}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Feather name="x" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {courses.length === 0 ? (
              <View style={s.empty}>
                <Feather name="book-open" size={32} color={C.textMuted} />
                <Text style={[s.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.study2.noCoursesYet}
                </Text>
                <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {canAddCourse
                    ? 'Add courses to your section so classmates can upload study notes, CT questions and books.'
                    : 'Your Class Representative will add courses here.'}
                </Text>
                {canAddCourse && (
                  <TouchableOpacity
                    style={[s.ctrlBtn58, { backgroundColor: C.brand, paddingHorizontal: 24, marginTop: 14 }]}
                    onPress={() => setAddCourseOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={[s.ctrlBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      Add Course
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : filteredCourses.length === 0 ? (
              <View style={s.empty}>
                <Feather name="search" size={30} color={C.textMuted} />
                <Text style={[s.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  No matching courses
                </Text>
                <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Try searching with another course code or title.
                </Text>
              </View>
            ) : (
              filteredCourses.map(c => (
                <CourseCard
                  key={c.id}
                  course={c}
                  C={C}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
                />
              ))
            )}
          </View>
        ) : (
          /* 12-Semester Academic Archive */
          <View>
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 4 }]}>
              ACADEMIC SEMESTERS (1 - 12)
            </Text>
            {SEMESTER_INFO.map(sem => (
              <SemesterCard
                key={sem.num}
                sem={sem}
                C={C}
                onPress={() => openSemester(sem)}
              />
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderBrowse() {
    return (
      <View>
        <View style={[s.searchBar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 12 }]}>
          <Feather name="search" size={18} color={C.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[s.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={browseSearch}
            onChangeText={setBrowseSearch}
            placeholder="Search public sections…"
            placeholderTextColor={C.textMuted}
          />
          {browseSearch.length > 0 && (
            <TouchableOpacity onPress={() => setBrowseSearch('')} hitSlop={8}>
              <Feather name="x" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 4 }]}>
          {t.study2.publicSections} · {filteredBrowseSections.length}
        </Text>

        {filteredBrowseSections.length === 0 ? (
          <View style={s.empty}>
            <Icon name="study" size={28} color={C.textMuted} />
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.study2.noPublicSections}
            </Text>
          </View>
        ) : (
          filteredBrowseSections.map(sec => (
            <TouchableOpacity
              key={sec.id}
              style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => openSectionRoom({
                id: sec.id,
                number: sec.number,
                intake_number: sec.intake,
                department_name: sec.department,
                is_public: sec.is_public,
              }, 'browse')}
              activeOpacity={0.75}
            >
              <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '1e' }]}>
                <Icon name="study" size={20} color={STUDY_COLOR} />
              </View>
              <View style={cardStyles.body}>
                <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {sec.department} · Intake {sec.intake} · Sec {sec.number}
                </Text>
                <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {sec.intake_public ? t.study2.openToOtherIntakes : 'Intake-only section'} · Tap to view
                </Text>
              </View>
              <TouchableOpacity
                style={[s.joinPillBtn, { backgroundColor: C.brand }]}
                onPress={() => requestJoin(sec.id)}
                activeOpacity={0.8}
              >
                <Feather name="user-plus" size={13} color="#fff" />
                <Text style={[s.joinPillTxt, { fontFamily: FontFamily.jakartaBold }]}>
                  Join
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  }

  function renderManage() {
    if (!mySection) return null;
    return (
      <View>
        <SegmentedTabs
          tabs={manageTabs}
          activeTab={manageTab}
          onTabChange={setManageTab}
          style={{ marginBottom: 14 }}
        />

        {manageTab === 'members' ? (
          <View>
            {/* Join Requests */}
            {joinReqs.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {t.study2.joinRequestsCount(joinReqs.length)}
                </Text>
                {joinReqs.map(j => (
                  <View
                    key={j.id}
                    style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
                  >
                    <Avatar name={j.full_name} size="md" />
                    <View style={cardStyles.body}>
                      <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {j.full_name}
                      </Text>
                      <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {timeAgo(j.created_at)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={[s.actionBtnSm, { backgroundColor: C.successBg }]}
                        onPress={() => approveJoin(j.id)}
                        activeOpacity={0.75}
                      >
                        <Feather name="check" size={13} color={C.success} />
                        <Text style={[s.actionTxtSm, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                          Approve
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtnSm, { backgroundColor: C.dangerBg }]}
                        onPress={() => rejectJoin(j.id)}
                        activeOpacity={0.75}
                      >
                        <Feather name="x" size={13} color={C.danger} />
                        <Text style={[s.actionTxtSm, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Members */}
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.study2.membersCount(secMembers.length)}
            </Text>
            {secMembers.map(m => {
              const isMe = m.user_id === user?.id;
              const isCrRow = m.role === 'cr';
              return (
                <View
                  key={m.id}
                  style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
                >
                  <Avatar name={m.full_name} size="md" />
                  <View style={cardStyles.body}>
                    <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {m.full_name}{isMe ? t.study2.you : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <View
                        style={[
                          s.rolePill,
                          {
                            backgroundColor: isCrRow ? C.infoBg : m.role === 'editor' ? C.brand50 : C.surface2,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.roleTxt,
                            {
                              color: isCrRow ? C.info : m.role === 'editor' ? C.brand : C.textMuted,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          {isCrRow ? t.study2.cr : m.role === 'editor' ? t.study2.editor : t.study2.member}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {!isCrRow && !isMe && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={[s.actionBtnSm, { backgroundColor: C.surface2 }]}
                        onPress={() => setMemberRole(m.id, m.role === 'editor' ? 'member' : 'editor')}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.actionTxtSm, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                          {m.role === 'editor' ? t.study2.demote : t.study2.makeEditor}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeMember(m)}
                        hitSlop={8}
                        activeOpacity={0.7}
                        style={{ padding: 6 }}
                      >
                        <Feather name="user-minus" size={16} color={C.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Pin Notice Composer */}
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.study2.pinANotice}
            </Text>
            <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, padding: 14 }]}>
              <TextInput
                style={[
                  s.pinInput,
                  { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
                ]}
                value={pinText}
                onChangeText={setPinText}
                placeholder={t.study2.pinPlaceholder}
                placeholderTextColor={C.textMuted}
                multiline
              />
              <TouchableOpacity
                style={[
                  s.ctrlBtn58,
                  {
                    backgroundColor: pinText.trim() ? C.brand : C.surface2,
                    opacity: pinText.trim() ? 1 : 0.6,
                    marginTop: 10,
                  },
                ]}
                onPress={addPin}
                disabled={!pinText.trim()}
                activeOpacity={0.75}
              >
                <Feather name="bookmark" size={16} color={pinText.trim() ? '#fff' : C.textMuted} />
                <Text
                  style={[
                    s.ctrlBtnTxt,
                    { color: pinText.trim() ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {t.study2.pinToSection}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            {/* Join Code */}
            <CodeCard code={mySection.join_code ?? '-'} copied={copied} onCopy={copyCode} C={C} />

            {/* Section Visibility */}
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.study2.sectionVisibility}
            </Text>
            <View style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[cardStyles.icon44, { backgroundColor: mySection.is_public ? C.successBg : C.surface2 }]}>
                <Feather
                  name={mySection.is_public ? 'globe' : 'shield'}
                  size={20}
                  color={mySection.is_public ? C.success : C.textMuted}
                />
              </View>
              <View style={cardStyles.body}>
                <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {mySection.is_public ? t.study2.public : t.study2.private}
                </Text>
                <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {mySection.is_public ? t.study2.publicVisHint : t.study2.privateVisHint}
                </Text>
              </View>
              <TactileSwitch value={mySection.is_public} onValueChange={toggleVisibility} />
            </View>

            {/* Intake Visibility Vote */}
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.study2.intakeVisibility}
            </Text>
            <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, padding: 14 }]}>
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
                      <TouchableOpacity
                        style={[s.voteBtn58, { backgroundColor: C.successBg }]}
                        onPress={() => castVote('yes')}
                        activeOpacity={0.75}
                      >
                        <Feather name="check" size={16} color={C.success} />
                        <Text style={[s.voteBtnTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                          {t.study2.voteYes}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.voteBtn58, { backgroundColor: C.surface }]}
                        onPress={() => castVote('no')}
                        activeOpacity={0.75}
                      >
                        <Feather name="x" size={16} color={C.text2} />
                        <Text style={[s.voteBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                          {t.study2.voteNo}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.ctrlBtn58, { backgroundColor: C.bg, borderColor: C.border, borderWidth: 1, marginTop: 12 }]}
                  onPress={() => setStartVoteOpen(true)}
                  activeOpacity={0.75}
                >
                  <Feather name="bar-chart-2" size={16} color={C.text} />
                  <Text style={[s.ctrlBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.study2.startAVote}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Danger Zone: Leave Section */}
            <Text style={[s.sectionLabel, { color: C.danger, fontFamily: FontFamily.jakartaExtraBold, marginTop: 22 }]}>
              DANGER ZONE
            </Text>
            <TouchableOpacity
              style={[
                s.leaveBar58,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fecaca',
                  borderWidth: 1,
                  marginTop: 4,
                  marginBottom: 12,
                },
              ]}
              onPress={() => setLeaveOpen(true)}
              activeOpacity={0.75}
            >
              <Feather name="log-out" size={16} color={C.danger} />
              <Text style={[s.leaveBarTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                Leave Section
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function renderAdminQueue() {
    return (
      <View>
        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 4 }]}>
          {t.study2.pendingRequestsCount(adminReqs.length)}
        </Text>
        {adminReqs.length === 0 ? (
          <View style={s.empty}>
            <Icon name="check" size={28} color={C.textMuted} />
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.study2.allClear}</Text>
          </View>
        ) : (
          <View style={{ gap: 11 }}>
            {adminReqs.map(r => (
              <View key={r.id} style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border, flexDirection: 'column', alignItems: 'stretch', minHeight: 88 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <Avatar name={r.full_name} size="md" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>{r.full_name}</Text>
                    <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
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
          style={[s.ctrlBtn58, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, marginTop: 10 }]}
          onPress={() => { setNumInput(''); setYearsInput(''); setAddIntakeOpen(true); }}
          activeOpacity={0.75}
        >
          <Icon name="plus" size={16} color={C.text} />
          <Text style={[s.ctrlBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.addIntake}</Text>
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
                <View key={ik.id} style={[s.card, { backgroundColor: C.surface, borderColor: C.border, padding: 14 }]}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    onPress={() => {
                      if (open) { setCatExpanded(null); return; }
                      setCatExpanded(ik.id);
                      if (!catSections[ik.id]) loadCatSections(ik.id);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '20' }]}>
                      <Icon name="study" size={18} color={STUDY_COLOR} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Intake {ik.number}</Text>
                      <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {ik.years ?? '-'} · {ik.is_public ? t.study2.public : t.study2.private}
                      </Text>
                    </View>
                    <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
                  </TouchableOpacity>

                  {open && (
                    <View style={{ marginTop: 12, gap: 8 }}>
                      {secs.map(sec => (
                        <View key={sec.id} style={[s.catSecRow, { backgroundColor: C.bg, borderColor: C.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Sec {sec.number}</Text>
                            <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                              Code {sec.join_code ?? '-'} · CR {sec.cr_name ?? 'none'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[s.actionBtnSm, { backgroundColor: C.infoBg }]}
                            onPress={() => { setCrSearch(''); setSetCrFor(sec.id); }}
                            activeOpacity={0.75}
                          >
                            <Feather name="user-check" size={13} color={C.info} />
                            <Text style={[s.actionTxtSm, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>{t.study2.setCr}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[s.ctrlBtn58, { backgroundColor: C.bg, borderColor: C.border, borderWidth: 1 }]}
                        onPress={() => { setNumInput(''); setAddSectionFor(ik.id); }}
                        activeOpacity={0.75}
                      >
                        <Icon name="plus" size={15} color={C.text} />
                        <Text style={[s.ctrlBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.study2.addSection}</Text>
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

  function renderSemesterIntakes() {
    const activeDept = resolveStudentDept(mySection, profile, departments);
    const deptName = shortDept(activeDept?.name || mySection?.department || 'Computer Science & Engineering');

    return (
      <View>
        {selectedSemester && (
          <View style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 14 }]}>
            <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '1e', borderColor: STUDY_COLOR + '30', borderWidth: 1 }]}>
              <Text style={[cardStyles.semNum, { color: STUDY_COLOR, fontFamily: FontFamily.jakartaExtraBold }]}>
                {selectedSemester.num}
              </Text>
            </View>
            <View style={cardStyles.body}>
              <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {selectedSemester.label} · {deptName}
              </Text>
              <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={2}>
                Intakes that completed or are currently in {selectedSemester.label}. Pick an intake to see its sections.
              </Text>
            </View>
          </View>
        )}

        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          AVAILABLE INTAKES ({semesterIntakes.length})
        </Text>

        {drillLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={STUDY_COLOR} />
          </View>
        ) : semesterIntakes.length === 0 ? (
          <View style={s.empty}>
            <Feather name="folder" size={32} color={C.textMuted} />
            <Text style={[s.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              No intakes found
            </Text>
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              No senior or current intakes have completed or reached {selectedSemester?.label ?? 'this semester'} in {deptName} yet.
            </Text>
          </View>
        ) : (
          semesterIntakes.map(item => {
            const isGraduated = item.isGraduated;
            const isCompleted = item.isCompleted && !isGraduated;
            const isCurrent = item.isCurrent;

            return (
              <TouchableOpacity
                key={item.id}
                style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => openSectionsForIntake(item)}
                activeOpacity={0.75}
              >
                <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '18' }]}>
                  <Feather name="users" size={20} color={STUDY_COLOR} />
                </View>
                <View style={cardStyles.body}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      Intake {item.number}
                    </Text>
                    {isGraduated && (
                      <View style={[s.visPill, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : '#f3e8ff', paddingHorizontal: 7, paddingVertical: 2 }]}>
                        <Text style={[s.visTxt, { color: isDark ? '#c084fc' : '#7e22ce', fontSize: 10, fontFamily: FontFamily.jakartaBold }]}>
                          Graduated
                        </Text>
                      </View>
                    )}
                    {isCompleted && (
                      <View style={[s.visPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', paddingHorizontal: 7, paddingVertical: 2 }]}>
                        <Text style={[s.visTxt, { color: isDark ? '#34d399' : '#047857', fontSize: 10, fontFamily: FontFamily.jakartaBold }]}>
                          Completed · Now Sem {item.currentSem}
                        </Text>
                      </View>
                    )}
                    {isCurrent && (
                      <View style={[s.visPill, { backgroundColor: isDark ? 'rgba(20, 184, 166, 0.15)' : '#f0fdfa', paddingHorizontal: 7, paddingVertical: 2 }]}>
                        <Text style={[s.visTxt, { color: isDark ? '#2dd4bf' : '#0f766e', fontSize: 10, fontFamily: FontFamily.jakartaBold }]}>
                          Current Intake
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {item.years ? `${item.years} · ` : ''}{item.sectionsCount} section{item.sectionsCount === 1 ? '' : 's'}
                  </Text>
                </View>
                <Feather name="arrow-right" size={18} color={C.textMuted} />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  }

  function renderIntakeSections() {
    const activeDept = resolveStudentDept(mySection, profile, departments);
    const deptName = shortDept(selectedIntake?.department_name || activeDept?.name || mySection?.department || 'Computer Science & Engineering');

    return (
      <View>
        {selectedIntake && (
          <View style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 14 }]}>
            <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '18' }]}>
              <Feather name="users" size={20} color={STUDY_COLOR} />
            </View>
            <View style={cardStyles.body}>
              <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                Intake {selectedIntake.number} Sections
              </Text>
              <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                {deptName}{selectedSemester ? ` · ${selectedSemester.label}` : ''} — browse section study rooms
              </Text>
            </View>
          </View>
        )}

        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          SECTIONS ({intakeSections.length})
        </Text>

        {drillLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={STUDY_COLOR} />
          </View>
        ) : intakeSections.length === 0 ? (
          <View style={s.empty}>
            <Feather name="inbox" size={32} color={C.textMuted} />
            <Text style={[s.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              No sections created yet
            </Text>
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Section rooms for Intake {selectedIntake?.number} haven't been created on Study Hub yet.
            </Text>
          </View>
        ) : (
          intakeSections.map(sec => {
            const isMine = sec.id === mySection?.id;
            return (
              <TouchableOpacity
                key={sec.id}
                style={[
                  cardStyles.card72,
                  {
                    backgroundColor: C.surface,
                    borderColor: isMine ? (isDark ? 'rgba(45, 212, 191, 0.4)' : '#5eead4') : C.border,
                  },
                ]}
                onPress={() => openSectionRoom(sec, 'intake')}
                activeOpacity={0.75}
              >
                <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '18' }]}>
                  <Icon name="study" size={20} color={STUDY_COLOR} />
                </View>
                <View style={cardStyles.body}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      Section {sec.number}
                    </Text>
                    {isMine && (
                      <View style={[s.visPill, { backgroundColor: isDark ? 'rgba(20, 184, 166, 0.15)' : '#f0fdfa', paddingHorizontal: 7, paddingVertical: 2 }]}>
                        <Text style={[s.visTxt, { color: isDark ? '#2dd4bf' : '#0f766e', fontSize: 10, fontFamily: FontFamily.jakartaBold }]}>
                          You
                        </Text>
                      </View>
                    )}
                    {!sec.is_public && (
                      <View style={[s.visPill, { backgroundColor: C.surface2, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                        <Feather name="lock" size={9} color={C.textMuted} />
                        <Text style={[s.visTxt, { color: C.textMuted, fontSize: 10, fontFamily: FontFamily.jakartaBold }]}>
                          Private
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[cardStyles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {sec.cr_name ? `CR: ${sec.cr_name}` : 'No CR yet'}
                    {sec.material_count != null ? ` · ${sec.material_count} material${sec.material_count === 1 ? '' : 's'}` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: isMine ? STUDY_COLOR : C.textMuted, fontFamily: FontFamily.jakartaBold }}>
                    {isMine ? 'Open' : 'Browse'}
                  </Text>
                  <Feather name="arrow-right" size={16} color={isMine ? STUDY_COLOR : C.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  }

  function renderSectionRoom() {
    return (
      <View>
        {selectedSection && (
          <View style={[cardStyles.card72, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 14 }]}>
            <View style={[cardStyles.icon44, { backgroundColor: STUDY_COLOR + '1e' }]}>
              <Icon name="study" size={22} color={STUDY_COLOR} />
            </View>
            <View style={cardStyles.body}>
              <Text style={[cardStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {selectedSection.department_name}
              </Text>
              <Text style={[cardStyles.sub, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 2 }]} numberOfLines={1}>
                Intake {selectedSection.intake_number} · Section {selectedSection.number}
              </Text>
            </View>
            <View style={[s.visPill, { backgroundColor: C.surface2, paddingHorizontal: 8, paddingVertical: 4 }]}>
              <Text style={[s.visTxt, { color: C.textMuted, fontSize: 11, fontFamily: FontFamily.jakartaBold }]}>
                {selectedSection.id === mySection?.id ? 'Your Section' : 'Open Library'}
              </Text>
            </View>
          </View>
        )}

        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          CURRICULUM COURSES ({sectionCourses.length})
        </Text>

        {drillLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={STUDY_COLOR} />
          </View>
        ) : sectionCourses.length === 0 ? (
          <View style={s.empty}>
            <Feather name="book-open" size={32} color={C.textMuted} />
            <Text style={[s.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              No courses in this section
            </Text>
            <Text style={[s.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              This section has not added any course subjects yet.
            </Text>
          </View>
        ) : (
          sectionCourses.map(c => (
            <CourseCard
              key={c.id}
              course={c}
              C={C}
              onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
            />
          ))
        )}
      </View>
    );
  }

  const barTitle = isAdmin
    ? t.study2.adminStudyHub
    : sub === 'manage' ? t.study2.manageSectionTitle
    : sub === 'browse' ? t.study2.browseSections
    : sub === 'semester' ? (selectedSemester ? selectedSemester.label : 'Semester Archive')
    : sub === 'intake' ? (selectedIntake ? `Intake ${selectedIntake.number} Sections` : 'Sections')
    : sub === 'section' ? (selectedSection ? `Sec ${selectedSection.number} · Intake ${selectedSection.intake_number}` : 'Section Room')
    : t.study2.studyHub;

  const isRootTab = sub === 'home';

  return (
    <View style={[s.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      {isRootTab ? (
        <TopBar title={barTitle} />
      ) : (
        <SubBar title={barTitle} onBack={handleBack} />
      )}
      <OfflineBanner
        visible={isOffline}
        message="Showing cached study hub courses and materials."
        style={{ marginHorizontal: Layout.screenPadding }}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isAdmin
          ? renderAdminQueue()
          : sub === 'browse'
            ? renderBrowse()
            : sub === 'manage'
              ? renderManage()
              : sub === 'semester'
                ? renderSemesterIntakes()
                : sub === 'intake'
                  ? renderIntakeSections()
                  : sub === 'section'
                    ? renderSectionRoom()
                    : persona === 'notjoined'
                      ? renderNotJoined()
                      : persona === 'pendingcreate'
                        ? renderPending()
                        : renderMemberHome()
        }
        <View style={{ height: 28 }} />
      </ScrollView>

      <Toast msg={toastMsg} C={C} />

      <AddCourseSheet
        visible={addCourseOpen}
        C={C}
        onClose={() => setAddCourseOpen(false)}
        onSubmit={handleAddCourse}
      />

      <LeaveSheet
        visible={leaveOpen}
        isSoleCR={isSoleCR}
        candidates={eligibleCandidates}
        sectionNumber={mySection?.number ?? 1}
        C={C}
        onClose={() => setLeaveOpen(false)}
        onLeave={handleLeaveSection}
        onHandoverAndLeave={handleHandoverAndLeave}
      />

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
        <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              value={yearsInput} onChangeText={setYearsInput} placeholder="2023-2024" placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity style={[sheetStyles.submitBtn, { backgroundColor: C.brand }]} onPress={addIntake} activeOpacity={0.8}>
              <Icon name="plus" size={17} color="#fff" />
              <Text style={[sheetStyles.submitTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.study2.addIntake}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Admin: add section */}
      <Modal visible={!!addSectionFor} animationType="slide" transparent onRequestClose={() => setAddSectionFor(null)}>
        <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Admin: assign CR */}
      <Modal visible={!!setCrFor} animationType="slide" transparent onRequestClose={() => setSetCrFor(null)}>
        <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  card: { borderRadius: 16, borderWidth: 1 } as ViewStyle,

  sectionLabel: {
    fontSize: 11, letterSpacing: 0.7,
    marginTop: 18, marginBottom: 8, marginLeft: 2,
  } as any,

  searchBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    height: '100%',
  } as any,

  ctrlBtn58: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  } as ViewStyle,
  ctrlBtnTxt: {
    fontSize: 14.5,
  } as any,

  leaveBar58: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    width: '100%',
  } as ViewStyle,
  leaveBarTxt: {
    fontSize: 14.5,
  } as any,

  deptChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
  catSecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,

  visPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999,
  } as ViewStyle,
  visDot: { width: 5, height: 5, borderRadius: 3 } as ViewStyle,
  visTxt: { fontSize: 10.5 } as any,

  crPill: {
    paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999,
  } as ViewStyle,
  crTxt: { fontSize: 10.5 } as any,

  rolePill: {
    paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999,
  } as ViewStyle,
  roleTxt: { fontSize: 10.5 } as any,

  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  } as ViewStyle,
  badgeTxt: { fontSize: 11, color: '#fff' } as any,

  joinTitle: { fontSize: 17, letterSpacing: -0.2, marginBottom: 4 } as any,
  joinSub: { fontSize: 13, lineHeight: 18, marginBottom: 14 } as any,
  codeInput58: {
    height: 58, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, fontSize: 18, letterSpacing: 6, textAlign: 'center',
  } as any,
  joinBtn58: {
    height: 58, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 12,
  } as ViewStyle,
  joinBtnTxt: { fontSize: 15 } as any,

  joinPillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  } as ViewStyle,
  joinPillTxt: { fontSize: 12.5, color: '#fff' } as any,

  actionBtnSm: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  } as ViewStyle,
  actionTxtSm: { fontSize: 12.5 } as any,

  pendingCard: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 } as ViewStyle,
  pendingIcon: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  } as ViewStyle,
  pendingTitle: { fontSize: 17, letterSpacing: -0.2 } as any,
  pendingSub: { fontSize: 13.5, marginTop: 6, textAlign: 'center', lineHeight: 20 } as any,

  pinInput: { minHeight: 64, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 14, textAlignVertical: 'top' } as any,
  reqAgo: { fontSize: 11.5 } as any,
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 10,
  } as ViewStyle,
  approveTxt: { fontSize: 13 } as any,

  intakeInfo: { fontSize: 14, lineHeight: 20 } as any,

  voteBox: { borderRadius: 14, padding: 14, marginTop: 12 } as ViewStyle,
  voteTitle: { fontSize: 13.5 } as any,
  voteSub: { fontSize: 12.5, marginTop: 5 } as any,
  voteActions: { flexDirection: 'row', gap: 8, marginTop: 12 } as ViewStyle,
  voteBtn58: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 44, borderRadius: 12,
  } as ViewStyle,
  voteBtnTxt: { fontSize: 13.5 } as any,

  reasonTxt: { fontSize: 12.5, marginTop: 9, fontStyle: 'italic', lineHeight: 18 } as any,
  adminActions: { flexDirection: 'row', gap: 8, marginTop: 12 } as ViewStyle,

  empty: { alignItems: 'center', paddingTop: 40, paddingBottom: 20, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptyTxt: { fontSize: 13.5, textAlign: 'center', lineHeight: 20, maxWidth: 300 } as any,
});
