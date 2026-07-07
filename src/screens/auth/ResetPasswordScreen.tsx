import { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/ui/Icon';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Brand } from './LandingScreen';
import { FontFamily, Layout, Accent } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'ResetPassword'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password reset by 6-digit email code (Supabase recovery OTP), not a link —
// magic links can't return to the app in a standalone APK. Flow:
//   resetPasswordForEmail -> email code -> verifyOtp(type:'recovery') -> updateUser.
// verifyOtp opens a session, so a successful reset also signs the user in;
// authStore's onAuthStateChange then swaps to the app navigator.
export function ResetPasswordScreen({ route, navigation }: Props) {
  const { C } = useTheme();
  const t = useT();

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode]   = useState('');
  const [pass, setPass]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const [note, setNote]   = useState('');
  const busyRef = useRef(false);

  async function sendCode() {
    const addr = email.trim();
    if (!EMAIL_RE.test(addr)) { setErr(t.auth.invalidEmail); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setErr('');
    setNote('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(addr);
      // Don't leak whether the email exists — always advance to the code step.
      if (error && !/rate|limit/i.test(error.message)) {
        setErr(error.message);
      } else if (error) {
        setErr(t.auth.resetTooMany);
      } else {
        setStep('verify');
        setNote(t.auth.resetCodeSent);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function verifyAndSet() {
    const token = code.trim();
    if (token.length < 6) { setErr(t.auth.resetCodeInvalid); return; }
    if (pass.length < 6)  { setErr(t.auth.passwordTooShort); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setErr('');
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'recovery',
      });
      if (vErr) { setErr(t.auth.resetCodeInvalid); return; }
      // Session is now active; set the new password on the recovered account.
      const { error: uErr } = await supabase.auth.updateUser({ password: pass });
      if (uErr) { setErr(uErr.message); return; }
      // onAuthStateChange in authStore picks up the session and routes into the
      // app — no manual navigation needed.
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const requesting = step === 'request';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.subbar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => (requesting ? navigation.goBack() : setStep('request'))}
          style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          hitSlop={8}
        >
          <Icon name="arrowL" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.subbarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          {t.auth.resetTitle}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: 24 }}>
            <Brand size={44} />
          </View>

          <Text style={[styles.h1, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.auth.resetTitle}
          </Text>
          <Text style={[styles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {requesting ? t.auth.resetRequestSub : t.auth.resetVerifySub(email.trim())}
          </Text>

          {requesting ? (
            <>
              <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.auth.email}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                placeholder="you@std.bubt.edu.bd"
                placeholderTextColor={C.textMuted}
              />
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.auth.resetCodeLabel}
              </Text>
              <TextInput
                style={[styles.input, styles.codeInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaBold }]}
                value={code}
                onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoFocus
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.auth.resetNewPassword}
              </Text>
              <PasswordInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
                value={pass}
                onChangeText={setPass}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
              />

              <TouchableOpacity onPress={sendCode} activeOpacity={0.7} style={styles.resendRow} disabled={busy}>
                <Text style={[styles.resendTxt, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]}>
                  {t.auth.resetResend}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {!!note && !err && (
            <Text style={[styles.msg, { color: Accent.teal, fontFamily: FontFamily.jakartaMedium }]}>
              {note}
            </Text>
          )}
          {!!err && (
            <Text style={[styles.msg, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
              {err}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: C.brand, marginTop: 22 }]}
            onPress={requesting ? sendCode : verifyAndSet}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={[styles.btnText, { fontFamily: FontFamily.jakartaBold }]}>
                  {requesting ? t.auth.resetSendCode : t.auth.resetConfirm}
                </Text>
                <Icon name="chevR" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  subbar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  subbarTitle: { flex: 1, fontSize: 15, textAlign: 'center' } as any,
  iconBtn: {
    width: 40, height: 40, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
  content: { paddingTop: 32, paddingBottom: 40 } as ViewStyle,
  h1: { fontSize: 22, marginBottom: 6 } as any,
  sub: { fontSize: 13.5, lineHeight: 19, marginBottom: 6 } as any,
  label: { fontSize: 13, marginBottom: 6, marginTop: 14 } as any,
  input: { height: 50, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15 } as any,
  codeInput: { letterSpacing: 8, textAlign: 'center', fontSize: 20 } as any,
  msg: { fontSize: 13, marginTop: 10 } as any,
  btnPrimary: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  btnText: { fontSize: 15, color: '#fff' } as any,
  resendRow: { alignSelf: 'flex-end', marginTop: 10 } as ViewStyle,
  resendTxt: { fontSize: 13 } as any,
});
