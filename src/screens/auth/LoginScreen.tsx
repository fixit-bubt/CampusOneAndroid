import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { Icon } from '../../components/ui/Icon';
import { LogoMark } from '../../components/ui/Logo';
import { GoogleButton, OrDivider } from '../../components/ui/GoogleButton';
import { signInWithGoogle } from '../../lib/googleAuth';
import { FontFamily, Layout } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { C, isDark } = useTheme();
  const { signIn } = useAuth();
  const t = useT();

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPassFocused, setIsPassFocused] = useState(false);

  const [busy, setBusy] = useState(false);
  const [busyG, setBusyG] = useState(false);
  const busyRef = useRef(false);
  const [err, setErr] = useState('');

  const ok = email.trim().length > 0 && pass.trim().length > 0;

  function handleQuickDomain(domain: string) {
    const raw = email.trim();
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

  function handleForgotPassword() {
    navigation.navigate('ResetPassword', { email: email.trim() || undefined });
  }

  async function handleContinue() {
    if (!ok || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setErr('');
    try {
      await signIn(email.trim(), pass);
    } catch (e: any) {
      if (/not confirmed/i.test(e?.message ?? '')) {
        navigation.navigate('VerifyEmail', { email: email.trim() });
        return;
      }
      setErr(e?.message ?? t.auth.loginFailed);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 58dp Standardized SubBar */}
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
          {t.auth.signIn}
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
              Welcome Back
            </Text>
            <Text style={[styles.subheading, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Sign in with your university credentials
            </Text>
          </View>

          {/* Email Label */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            CAMPUS EMAIL
          </Text>

          {/* 58dp Email Input */}
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: C.surface,
                borderColor: isEmailFocused ? C.brand : C.border,
              },
            ]}
          >
            <View style={styles.inputLeadingIcon}>
              <Icon name="mail" size={19} color={isEmailFocused ? C.brand : C.textMuted} />
            </View>
            <TextInput
              style={[styles.inputField, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="student@std.bubt.edu.bd"
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* Quick-fill domain pills */}
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
            <TouchableOpacity
              onPress={() => handleQuickDomain('@bubt.edu.bd')}
              style={[styles.chipPill, { backgroundColor: C.surface2, borderColor: C.border }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                + @bubt.edu.bd
              </Text>
            </TouchableOpacity>
          </View>

          {/* Password Label */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 18 }]}>
            {t.auth.password.toUpperCase()}
          </Text>

          {/* 58dp Password Input */}
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: C.surface,
                borderColor: isPassFocused ? C.brand : C.border,
              },
            ]}
          >
            <View style={styles.inputLeadingIcon}>
              <Icon name="lock" size={19} color={isPassFocused ? C.brand : C.textMuted} />
            </View>
            <TextInput
              style={[styles.inputField, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={pass}
              onChangeText={setPass}
              onFocus={() => setIsPassFocused(true)}
              onBlur={() => setIsPassFocused(false)}
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

          {/* Forgot password */}
          <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={styles.forgotRow} disabled={busy}>
            <Text style={[styles.forgotTxt, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]}>
              {t.auth.forgotPassword}
            </Text>
          </TouchableOpacity>

          {/* Error Message */}
          {!!err && (
            <View style={[styles.errBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#fee2e2', borderColor: C.danger }]}>
              <Icon name="close" size={16} color={C.danger} />
              <Text style={[styles.errText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
                {err}
              </Text>
            </View>
          )}

          {/* 58dp Primary Sign In Button */}
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
                  {t.auth.signIn}
                </Text>
                <Icon name="chevR" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Google - 58dp */}
          <OrDivider label={t.landing.orLabel} />
          <GoogleButton label={t.landing.continueGoogle} onPress={handleGoogle} busy={busyG} />

          {/* Switch to Register */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              {t.auth.noAccount}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.replace('Register')}>
              <Text style={[styles.switchLink, { color: C.brand, fontFamily: FontFamily.jakartaExtraBold }]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  subbar: {
    height: Layout.controlHeight, // exactly 58dp
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
    paddingTop: 26,
    paddingBottom: 40,
  } as ViewStyle,

  headerBox: {
    marginBottom: 26,
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

  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 4,
  } as ViewStyle,

  forgotTxt: {
    fontSize: 13,
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
});
