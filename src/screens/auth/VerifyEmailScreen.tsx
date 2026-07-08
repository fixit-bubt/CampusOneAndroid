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
import { Brand } from './LandingScreen';
import { FontFamily, Layout, Accent } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'VerifyEmail'>;

// Email verification at signup. Only reached when "Confirm email" is enabled
// in the dashboard (signUp then returns no session). verifyOtp with the
// emailed code opens the session; authStore routes into onboarding from there.
export function VerifyEmailScreen({ route }: Props) {
  const { C } = useTheme();
  const t = useT();
  const email = route.params?.email ?? '';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const busyRef = useRef(false);

  async function verify() {
    const token = code.trim();
    if (token.length < 6) { setErr(t.auth.verifyCodeInvalid); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setErr('');
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) { setErr(t.auth.verifyCodeInvalid); return; }
      // Session is open now; onAuthStateChange routes into the app.
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function resend() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setErr('');
    setNote('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) setErr(error.message);
      else setNote(t.auth.verifyCodeSent);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
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
            {t.auth.verifyTitle}
          </Text>
          <Text style={[styles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.auth.verifySub(email)}
          </Text>

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

          <TouchableOpacity onPress={resend} activeOpacity={0.7} style={styles.resendRow} disabled={busy}>
            <Text style={[styles.resendTxt, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]}>
              {t.auth.resetResend}
            </Text>
          </TouchableOpacity>

          {!!note && !err && (
            <Text style={[styles.msg, { color: Accent.teal, fontFamily: FontFamily.jakartaMedium }]}>{note}</Text>
          )}
          {!!err && (
            <Text style={[styles.msg, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>{err}</Text>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: C.brand, marginTop: 22 }]}
            onPress={verify}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={[styles.btnText, { fontFamily: FontFamily.jakartaBold }]}>{t.auth.verifyBtn}</Text>
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
  content: { paddingTop: 48, paddingBottom: 40 } as ViewStyle,
  h1: { fontSize: 22, marginBottom: 6 } as any,
  sub: { fontSize: 13.5, lineHeight: 19, marginBottom: 6 } as any,
  label: { fontSize: 13, marginBottom: 6, marginTop: 14 } as any,
  input: { height: 50, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15 } as any,
  codeInput: { letterSpacing: 3, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, fontSize: 22 } as any,
  msg: { fontSize: 13, marginTop: 10 } as any,
  btnPrimary: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  btnText: { fontSize: 15, color: '#fff' } as any,
  resendRow: { alignSelf: 'flex-end', marginTop: 10 } as ViewStyle,
  resendTxt: { fontSize: 13 } as any,
});
