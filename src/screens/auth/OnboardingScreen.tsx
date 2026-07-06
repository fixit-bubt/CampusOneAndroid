import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal, FlatList, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { updateProfile } from '../../services/profileService';
import { Icon } from '../../components/ui/Icon';
import { Brand } from './LandingScreen';
import { FontFamily, Layout, Radius, Spacing } from '../../theme';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function OnboardingScreen() {
  const { C } = useTheme();
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [studentId, setStudentId] = useState(profile?.student_id ?? '');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [program, setProgram] = useState(profile?.program ?? '');
  const [intake, setIntake] = useState(profile?.intake ?? '');
  const [section, setSection] = useState(profile?.section ?? '');
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? profile?.whatsapp ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [deptModal, setDeptModal] = useState(false);
  const [bloodModal, setBloodModal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name');
      setDepartments((data ?? []) as { id: string; name: string }[]);
    })();
  }, []);

  const ok = studentId.trim() && department.trim() && intake.trim() && section.trim();

  async function handleSave() {
    if (!ok || busy || !user) return;
    setBusy(true);
    setErr('');
    const res = await updateProfile(user.id, {
      student_id: studentId.trim(),
      department: department.trim(),
      program: program.trim() || null,
      intake: intake.trim(),
      section: section.trim(),
      blood_group: bloodGroup.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    });
    if (!res.ok) {
      setErr(res.error ?? 'Could not save. Please try again.');
      setBusy(false);
      return;
    }
    await refreshProfile();
    // RootNavigator re-evaluates: student_id now set -> onboarding gate clears.
    // If the profile refetch failed (flaky network) the gate stays, so reset
    // busy here or the button spins forever with no way to retry.
    setBusy(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 20 }}><Brand size={44} /></View>

          <Text style={[styles.h1, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            Complete your profile
          </Text>
          <Text style={[styles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            A few details so classmates and staff can find you. You can edit these later in Settings.
          </Text>

          <Field C={C} label="Student ID" required value={studentId} onChange={setStudentId}
            placeholder="e.g. 20234208032" keyboardType="number-pad" />

          <PickerField C={C} label="Department" required value={department}
            placeholder="Select department" onPress={() => setDeptModal(true)} />

          <Field C={C} label="Program" value={program} onChange={setProgram} placeholder="e.g. B.Sc. in CSE" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field C={C} label="Intake" required value={intake} onChange={setIntake} placeholder="e.g. 50" />
            </View>
            <View style={{ flex: 1 }}>
              <Field C={C} label="Section" required value={section} onChange={setSection} placeholder="e.g. 1" />
            </View>
          </View>

          <PickerField C={C} label="Blood Group" value={bloodGroup}
            placeholder="Select blood group" onPress={() => setBloodModal(true)} />

          <Field C={C} label="Phone" value={phone} onChange={setPhone}
            placeholder="e.g. 01XXXXXXXXX" keyboardType="phone-pad" />

          <Field C={C} label="Present Address" value={address} onChange={setAddress}
            placeholder="e.g. Mirpur, Dhaka" />

          {!!err && (
            <Text style={[styles.err, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>{err}</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: C.brand, opacity: ok ? 1 : 0.5, marginTop: 22 }]}
            onPress={handleSave} disabled={!ok || busy} activeOpacity={0.85}
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.btnRow}>
                <Text style={[styles.btnTxt, { fontFamily: FontFamily.jakartaBold }]}>Save & Continue</Text>
                <Icon name="chevR" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => signOut()} style={{ alignSelf: 'center', marginTop: 16 }} hitSlop={8}>
            <Text style={[styles.signout, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerSheet visible={deptModal} title="Select Department" C={C} onClose={() => setDeptModal(false)}
        data={departments.map(d => d.name)}
        onPick={(v) => { setDepartment(v); setDeptModal(false); }} />

      <PickerSheet visible={bloodModal} title="Select Blood Group" C={C} onClose={() => setBloodModal(false)}
        data={BLOOD_GROUPS}
        onPick={(v) => { setBloodGroup(v); setBloodModal(false); }} />
    </SafeAreaView>
  );
}

function Field({ C, label, required, value, onChange, placeholder, keyboardType }: {
  C: any; label: string; required?: boolean; value: string;
  onChange: (v: string) => void; placeholder: string; keyboardType?: any;
}) {
  return (
    <>
      <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={C.textMuted} keyboardType={keyboardType} autoCapitalize="words"
      />
    </>
  );
}

function PickerField({ C, label, required, value, placeholder, onPress }: {
  C: any; label: string; required?: boolean; value: string; placeholder: string; onPress: () => void;
}) {
  return (
    <>
      <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
        {label}{required ? ' *' : ''}
      </Text>
      <TouchableOpacity
        style={[styles.input, styles.pickRow, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={onPress} activeOpacity={0.7}
      >
        <Text style={{ color: value ? C.text : C.textMuted, fontFamily: FontFamily.jakartaRegular, fontSize: 15 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Icon name="chevD" size={18} color={C.textMuted} />
      </TouchableOpacity>
    </>
  );
}

function PickerSheet({ visible, title, C, data, onPick, onClose }: {
  visible: boolean; title: string; C: any; data: string[]; onPick: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <View style={styles.handle}><View style={[styles.handleBar, { backgroundColor: C.border }]} /></View>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{title}</Text>
          <FlatList data={data} keyExtractor={(i) => i} style={{ maxHeight: 360 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.listRow, { borderBottomColor: C.border }]} onPress={() => onPick(item)} activeOpacity={0.7}>
                <Text style={{ color: C.text, fontFamily: FontFamily.jakartaMedium, fontSize: 15 }}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 24 }}>None found</Text>}
          />
          <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border }]} onPress={onClose}>
            <Text style={[styles.closeTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 32, paddingBottom: 48 } as ViewStyle,
  h1: { fontSize: 22, marginBottom: 6 } as any,
  sub: { fontSize: 13.5, lineHeight: 19, marginBottom: 12 } as any,
  label: { fontSize: 13, marginBottom: 6, marginTop: 14 } as any,
  input: { height: 50, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15 } as any,
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
  row: { flexDirection: 'row', gap: 12 } as ViewStyle,
  err: { fontSize: 13, marginTop: 10 } as any,
  btn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  btnTxt: { fontSize: 15, color: '#fff' } as any,
  signout: { fontSize: 13 } as any,
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' } as ViewStyle,
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.screenPadding, maxHeight: '80%' } as ViewStyle,
  handle: { alignItems: 'center', paddingVertical: Spacing[3] } as ViewStyle,
  handleBar: { width: 36, height: 4, borderRadius: 2 } as ViewStyle,
  sheetTitle: { fontSize: 18, textAlign: 'center', marginBottom: Spacing[3] } as any,
  listRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth } as ViewStyle,
  closeBtn: { height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: Spacing[3] } as ViewStyle,
  closeTxt: { fontSize: 15 } as any,
});
