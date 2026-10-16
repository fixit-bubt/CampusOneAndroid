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

const BUBT_DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science & Engineering (CSE)', icon: 'cpu' },
  { code: 'EEE', name: 'Electrical & Electronic Engineering (EEE)', icon: 'zap' },
  { code: 'BBA', name: 'Business Administration (BBA)', icon: 'briefcase' },
  { code: 'ENG', name: 'English', icon: 'book' },
  { code: 'LAW', name: 'Law & Justice', icon: 'shield' },
  { code: 'CIVIL', name: 'Civil Engineering', icon: 'tool' },
  { code: 'TEX', name: 'Textile Engineering', icon: 'layers' },
  { code: 'ECO', name: 'Economics', icon: 'pie-chart' },
  { code: 'MATH', name: 'Mathematics & Statistics', icon: 'grid' },
];

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

  const [deptModal, setDeptModal] = useState(false);
  const [bloodModal, setBloodModal] = useState(false);

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
          keyboardDismissMode="on-drag"
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

          <Field C={C} label="STUDENT ID" required value={studentId} onChange={setStudentId}
            placeholder="e.g. 20234208032" keyboardType="number-pad" />

          <PickerField C={C} label="DEPARTMENT" required value={department}
            placeholder="Select department" onPress={() => setDeptModal(true)} />

          <Field C={C} label="PROGRAM" value={program} onChange={setProgram} placeholder="e.g. B.Sc. in CSE" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field C={C} label="INTAKE" required value={intake} onChange={setIntake} placeholder="e.g. 50" />
            </View>
            <View style={{ flex: 1 }}>
              <Field C={C} label="SECTION" required value={section} onChange={setSection} placeholder="e.g. 1" />
            </View>
          </View>

          <PickerField C={C} label="BLOOD GROUP" value={bloodGroup}
            placeholder="Select blood group" onPress={() => setBloodModal(true)} />

          <Field C={C} label="PHONE" value={phone} onChange={setPhone}
            placeholder="e.g. 01XXXXXXXXX" keyboardType="phone-pad" />

          <Field C={C} label="PRESENT ADDRESS" value={address} onChange={setAddress}
            placeholder="e.g. Mirpur, Dhaka" />

          {!!err && (
            <Text style={[styles.err, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>{err}</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: C.brand, opacity: ok ? 1 : 0.5, marginTop: 22 }]}
            onPress={handleSave} disabled={!ok || busy} activeOpacity={0.82}
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

      {/* 58dp Department Picker Modal */}
      <DeptPickerSheet
        visible={deptModal}
        C={C}
        selectedValue={department}
        onPick={v => { setDepartment(v); setDeptModal(false); }}
        onClose={() => setDeptModal(false)}
      />

      {/* 58dp Blood Group Picker Modal */}
      <BloodPickerSheet
        visible={bloodModal}
        C={C}
        selectedValue={bloodGroup}
        onPick={v => { setBloodGroup(v); setBloodModal(false); }}
        onClose={() => setBloodModal(false)}
      />
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

function DeptPickerSheet({
  visible,
  C,
  selectedValue,
  onPick,
  onClose,
}: {
  visible: boolean;
  C: any;
  selectedValue: string;
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <View style={styles.handle}><View style={[styles.handleBar, { backgroundColor: C.border }]} /></View>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Select Department</Text>
          <FlatList
            data={BUBT_DEPARTMENTS}
            keyExtractor={item => item.code}
            style={{ maxHeight: 420 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedValue === item.name;
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItemRow,
                    {
                      backgroundColor: isSelected ? 'rgba(39, 94, 254, 0.14)' : C.surface,
                      borderColor: isSelected ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => onPick(item.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemLeft}>
                    <View style={[styles.modalItemIconBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
                      <Icon name={item.icon} size={18} color={isSelected ? C.brand : C.text} />
                    </View>
                    <Text
                      style={[
                        styles.modalItemText,
                        {
                          color: isSelected ? C.brand : C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Icon name="check" size={18} color={C.brand} />
                  ) : (
                    <Icon name="chevR" size={16} color={C.textMuted} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border, backgroundColor: C.surface2 }]} onPress={onClose}>
            <Text style={[styles.closeTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function BloodPickerSheet({
  visible,
  C,
  selectedValue,
  onPick,
  onClose,
}: {
  visible: boolean;
  C: any;
  selectedValue: string;
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <View style={styles.handle}><View style={[styles.handleBar, { backgroundColor: C.border }]} /></View>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Select Blood Group</Text>
          <FlatList
            data={BLOOD_GROUPS}
            keyExtractor={item => item}
            style={{ maxHeight: 360 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedValue === item;
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItemRow,
                    {
                      backgroundColor: isSelected ? 'rgba(39, 94, 254, 0.14)' : C.surface,
                      borderColor: isSelected ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => onPick(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemLeft}>
                    <View style={[styles.modalItemIconBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
                      <Icon name="droplet" size={18} color={isSelected ? C.brand : C.text} />
                    </View>
                    <Text
                      style={[
                        styles.modalItemText,
                        {
                          color: isSelected ? C.brand : C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Icon name="check" size={18} color={C.brand} />
                  ) : (
                    <Icon name="chevR" size={16} color={C.textMuted} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border, backgroundColor: C.surface2 }]} onPress={onClose}>
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
  h1: { fontSize: 24, marginBottom: 6, includeFontPadding: false } as any,
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 12, includeFontPadding: false } as any,
  label: { fontSize: 11.5, letterSpacing: 0.6, marginBottom: 8, marginTop: 14, includeFontPadding: false } as any,
  input: { height: Layout.controlHeight, borderRadius: Layout.controlRadius, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15, includeFontPadding: false } as any,
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
  row: { flexDirection: 'row', gap: 12 } as ViewStyle,
  err: { fontSize: 13, marginTop: 10, includeFontPadding: false } as any,
  btn: { height: Layout.controlHeight, borderRadius: Layout.controlRadius, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  btnTxt: { fontSize: 16, color: '#fff', includeFontPadding: false } as any,
  signout: { fontSize: 13, includeFontPadding: false } as any,
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' } as ViewStyle,
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.screenPadding, maxHeight: '80%' } as ViewStyle,
  handle: { alignItems: 'center', paddingVertical: Spacing[3] } as ViewStyle,
  handleBar: { width: 36, height: 4, borderRadius: 2 } as ViewStyle,
  sheetTitle: { fontSize: 18, textAlign: 'center', marginBottom: Spacing[3], includeFontPadding: false } as any,

  modalItemRow: {
    height: Layout.controlHeight, // exactly 58dp
    borderRadius: Layout.controlRadius, // exactly 16dp
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  } as ViewStyle,

  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  } as ViewStyle,

  modalItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  modalItemText: {
    fontSize: 14,
    flexShrink: 1,
    includeFontPadding: false,
  } as any,

  closeBtn: { height: Layout.controlHeight, borderRadius: Layout.controlRadius, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: Spacing[3] } as ViewStyle,
  closeTxt: { fontSize: 15, includeFontPadding: false } as any,
});
