import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Modal, FlatList, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/ui/Icon';
import { LogoMark } from '../../components/ui/Logo';
import { GoogleButton, OrDivider } from '../../components/ui/GoogleButton';
import { signInWithGoogle } from '../../lib/googleAuth';
import { FontFamily, Layout } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Register'>;

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

export function RegisterScreen({ navigation }: Props) {
  const { C, isDark } = useTheme();
  const { signUp } = useAuth();
  const t = useT();

  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [intake, setIntake] = useState('');
  const [section, setSection] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [deptModalOpen, setDeptModalOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [busyG, setBusyG] = useState(false);
  const busyRef = useRef(false);
  const [err, setErr] = useState('');

  const isPassValid = pass.length >= 6;
  const ok =
    name.trim().length > 0 &&
    studentId.trim().length > 0 &&
    department.trim().length > 0 &&
    intake.trim().length > 0 &&
    section.trim().length > 0 &&
    email.trim().length > 0 &&
    isPassValid;

  function handleQuickDomain(domain: string) {
    const sid = studentId.trim();
    const raw = email.trim();
    if (!raw && sid) {
      setEmail(sid + domain);
      return;
    }
    if (!raw) {
      setEmail(domain);
      return;
    }
    const userPart = raw.split('@')[0];
    setEmail(userPart + domain);
  }

  async function handleGoogle() {
    if (busyG) return;
    setBusyG(true);
    setErr('');
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setErr(e?.message ?? 'Google sign-in failed.');
    } finally {
      setBusyG(false);
    }
  }

  async function handleContinue() {
    if (!ok || busyRef.current) return;
    const emailVal = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setErr(t.auth.invalidEmail);
      return;
    }
    if (pass.length < 6) {
      setErr(t.auth.passwordTooShort);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setErr('');
    try {
      const { data: taken } = await supabase.rpc('email_is_registered', { p_email: emailVal });
      if (taken) {
        setErr(t.auth.emailTaken);
        return;
      }
      const { needsVerification } = await signUp(
        emailVal,
        pass,
        name.trim(),
        {
          studentId: studentId.trim(),
          department: department.trim(),
          intake: intake.trim(),
          section: section.trim(),
        },
      );
      if (needsVerification) {
        navigation.navigate('VerifyEmail', { email: emailVal });
      }
    } catch (e: any) {
      setErr(e?.message ?? t.auth.registerFailed);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 58dp SubBar */}
      <View style={[styles.subbar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          hitSlop={8}
          activeOpacity={0.75}
        >
          <Icon name="arrowL" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.subbarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          Create Account
        </Text>
        <View style={styles.subbarRightBox}>
          <LogoMark size={28} shadow={false} />
        </View>
      </View>

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
          {/* Header */}
          <View style={styles.headerBox}>
            <Text style={[styles.heading, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Create Account
            </Text>
            <Text style={[styles.subheading, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Join your department and campus community
            </Text>
          </View>

          {/* Full Name */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            FULL NAME
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: C.surface,
                borderColor: focusedField === 'name' ? C.brand : C.border,
              },
            ]}
          >
            <View style={styles.inputLeadingIcon}>
              <Icon name="user" size={19} color={focusedField === 'name' ? C.brand : C.textMuted} />
            </View>
            <TextInput
              style={[styles.inputField, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Farhan Ahmed"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Student ID */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 16 }]}>
            STUDENT ID
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: C.surface,
                borderColor: focusedField === 'studentId' ? C.brand : C.border,
              },
            ]}
          >
            <View style={styles.inputLeadingIcon}>
              <Icon name="idcard" size={19} color={focusedField === 'studentId' ? C.brand : C.textMuted} />
            </View>
            <TextInput
              style={[styles.inputField, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={studentId}
              onChangeText={setStudentId}
              onFocus={() => setFocusedField('studentId')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. 20214103001"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
            />
          </View>

          {/* Department Selector */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 16 }]}>
            DEPARTMENT
          </Text>
          <TouchableOpacity
            style={[
              styles.inputWrap,
              {
                backgroundColor: C.surface,
                borderColor: department ? C.brand : C.border,
              },
            ]}
            onPress={() => setDeptModalOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.inputLeadingIcon}>
              <Icon name="study" size={19} color={department ? C.brand : C.textMuted} />
            </View>
            <Text
              style={[
                styles.inputField,
                {
                  color: department ? C.text : C.textMuted,
                  fontFamily: department ? FontFamily.jakartaSemiBold : FontFamily.jakartaRegular,
                  lineHeight: 54,
                },
              ]}
              numberOfLines={1}
            >
              {department || 'Select Department'}
            </Text>
            <Icon name="chevD" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* Side-by-side: Intake & Section */}
          <View style={styles.intakeSectionRow}>
            {/* Intake */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 16 }]}>
                INTAKE
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: C.surface,
                    borderColor: focusedField === 'intake' ? C.brand : C.border,
                  },
                ]}
              >
                <View style={styles.inputLeadingIcon}>
                  <Icon name="flag" size={18} color={focusedField === 'intake' ? C.brand : C.textMuted} />
                </View>
                <TextInput
                  style={[styles.inputField, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
                  value={intake}
                  onChangeText={setIntake}
                  onFocus={() => setFocusedField('intake')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. 50"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Section */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 16 }]}>
                SECTION
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: C.surface,
                    borderColor: focusedField === 'section' ? C.brand : C.border,
                  },
                ]}
              >
                <View style={styles.inputLeadingIcon}>
                  <Icon name="layers" size={18} color={focusedField === 'section' ? C.brand : C.textMuted} />
                </View>
                <TextInput
                  style={[styles.inputField, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
                  value={section}
                  onChangeText={setSection}
                  onFocus={() => setFocusedField('section')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. 02"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* Student Email */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 16 }]}>
            STUDENT EMAIL
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: C.surface,
                borderColor: focusedField === 'email' ? C.brand : C.border,
              },
            ]}
          >
            <View style={styles.inputLeadingIcon}>
              <Icon name="mail" size={19} color={focusedField === 'email' ? C.brand : C.textMuted} />
            </View>
            <TextInput
              style={[styles.inputField, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="your-id@std.bubt.edu.bd"
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* Quick-fill student pill */}
          <View style={styles.domainChipsRow}>
            <Text style={[styles.chipHint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Quick-fill:
            </Text>
            <TouchableOpacity
              onPress={() => handleQuickDomain('@std.bubt.edu.bd')}
              style={[styles.chipPill, { backgroundColor: C.surface2, borderColor: C.border }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                + @std.bubt.edu.bd
              </Text>
            </TouchableOpacity>
          </View>

          {/* Password */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 16 }]}>
            PASSWORD
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: C.surface,
                borderColor: focusedField === 'pass' ? C.brand : C.border,
              },
            ]}
          >
            <View style={styles.inputLeadingIcon}>
              <Icon name="lock" size={19} color={focusedField === 'pass' ? C.brand : C.textMuted} />
            </View>
            <TextInput
              style={[styles.inputField, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={pass}
              onChangeText={setPass}
              onFocus={() => setFocusedField('pass')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showPass}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity
              onPress={() => setShowPass(v => !v)}
              style={styles.eyeBtn}
              hitSlop={8}
              accessibilityLabel={showPass ? t.auth.hidePassword : t.auth.showPassword}
            >
              <Icon name={showPass ? 'eyeOff' : 'eye'} size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Password Validation Hint */}
          <View style={styles.passHintRow}>
            <Icon
              name={isPassValid ? 'check' : 'shield'}
              size={14}
              color={isPassValid ? C.success : C.textMuted}
            />
            <Text
              style={[
                styles.passHintText,
                {
                  color: isPassValid ? C.success : C.textMuted,
                  fontFamily: FontFamily.jakartaMedium,
                },
              ]}
            >
              Minimum 6 characters
            </Text>
          </View>

          {/* Error Message */}
          {!!err && (
            <View style={[styles.errBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#fee2e2', borderColor: C.danger }]}>
              <Icon name="close" size={16} color={C.danger} />
              <Text style={[styles.errText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
                {err}
              </Text>
            </View>
          )}

          {/* 58dp Primary Create Account Button */}
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: C.brand, opacity: ok ? 1 : 0.5, marginTop: 22 }]}
            onPress={handleContinue}
            disabled={!ok || busy}
            activeOpacity={0.82}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={[styles.btnText, { fontFamily: FontFamily.jakartaBold }]}>
                  Create Account
                </Text>
                <Icon name="chevR" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Google - 58dp */}
          <OrDivider label={t.landing.orLabel} />
          <GoogleButton label={t.landing.continueGoogle} onPress={handleGoogle} busy={busyG} />

          {/* Switch to Login */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              {t.auth.alreadyHaveAccount}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={[styles.switchLink, { color: C.brand, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.auth.signIn}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms & Privacy */}
          <Text style={[styles.termsText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
            {t.landing.termsPrefix}
            <Text
              style={{ color: C.brand, fontFamily: FontFamily.jakartaSemiBold }}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              {t.landing.privacy}
            </Text>
            {t.landing.termsAnd}
            <Text
              style={{ color: C.brand, fontFamily: FontFamily.jakartaSemiBold }}
              onPress={() => navigation.navigate('TermsOfService')}
            >
              {t.landing.terms}
            </Text>
            {t.landing.termsSuffix}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Department Picker Bottom Sheet Modal */}
      <Modal
        visible={deptModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeptModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeptModalOpen(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Department
              </Text>
              <TouchableOpacity
                onPress={() => setDeptModalOpen(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Icon name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={BUBT_DEPARTMENTS}
              keyExtractor={item => item.code}
              renderItem={({ item }) => {
                const isSelected = department === item.name;
                return (
                  <TouchableOpacity
                    style={[
                      styles.deptItem,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(39, 94, 254, 0.14)' : '#eef2ff')
                          : C.surface,
                        borderColor: isSelected ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setDepartment(item.name);
                      setDeptModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deptItemLeft}>
                      <View
                        style={[
                          styles.deptIconBox,
                          {
                            backgroundColor: C.surface2,
                            borderColor: C.border,
                          },
                        ]}
                      >
                        <Icon
                          name={item.icon}
                          size={18}
                          color={isSelected ? C.brand : C.text}
                        />
                      </View>
                      <Text
                        style={[
                          styles.deptNameText,
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
              style={{ maxHeight: 420 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  subbar: {
    height: Layout.controlHeight, // 58dp
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,

  subbarTitle: {
    flex: 1,
    fontSize: 16.5,
    textAlign: 'center',
    includeFontPadding: false,
  } as any,

  subbarRightBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  content: {
    paddingTop: 24,
    paddingBottom: 40,
  } as ViewStyle,

  headerBox: {
    marginBottom: 24,
  } as ViewStyle,

  heading: {
    fontSize: 26,
    letterSpacing: -0.5,
    includeFontPadding: false,
  } as any,

  subheading: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
    includeFontPadding: false,
  } as any,

  fieldLabel: {
    fontSize: 11.5,
    letterSpacing: 0.6,
    marginBottom: 8,
    includeFontPadding: false,
  } as any,

  inputWrap: {
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  } as ViewStyle,

  inputLeadingIcon: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  } as ViewStyle,

  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    includeFontPadding: false,
  } as any,

  eyeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  intakeSectionRow: {
    flexDirection: 'row',
    gap: 12,
  } as ViewStyle,

  domainChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  } as ViewStyle,

  chipHint: {
    fontSize: 12,
    includeFontPadding: false,
  } as any,

  chipPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,

  chipText: {
    fontSize: 12,
    includeFontPadding: false,
  } as any,

  passHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  } as ViewStyle,

  passHintText: {
    fontSize: 12,
    includeFontPadding: false,
  } as any,

  errBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  } as ViewStyle,

  errText: {
    fontSize: 13,
    flex: 1,
    includeFontPadding: false,
  } as any,

  btnPrimary: {
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  btnText: {
    color: '#fff',
    fontSize: 16,
    includeFontPadding: false,
  } as any,

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  } as ViewStyle,

  switchText: {
    fontSize: 14,
    includeFontPadding: false,
  } as any,

  switchLink: {
    fontSize: 14,
    includeFontPadding: false,
  } as any,

  termsText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 24,
    includeFontPadding: false,
  } as any,

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  } as ViewStyle,

  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  } as ViewStyle,

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  } as ViewStyle,

  modalTitle: {
    fontSize: 18,
    includeFontPadding: false,
  } as any,

  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  deptItem: {
    height: Layout.controlHeight, // exactly 58dp
    borderRadius: Layout.controlRadius, // exactly 16dp
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  } as ViewStyle,

  deptItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  } as ViewStyle,

  deptIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  deptNameText: {
    fontSize: 14,
    flexShrink: 1,
    includeFontPadding: false,
  } as any,
});
