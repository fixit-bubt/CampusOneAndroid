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
import { LogoMark } from '../../components/ui/Logo';
import { FontFamily, Layout, Accent } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'VerifyEmail'>;

export function VerifyEmailScreen({ route, navigation }: Props) {
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
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) { setErr(t.auth.verifyCodeInvalid); return; }

      // If user metadata had student credentials, ensure profiles row is updated
      if (data.session?.user) {
        const meta = data.session.user.user_metadata;
        if (meta?.student_id) {
          try {
            await supabase
              .from('profiles')
              .update({
                student_id: meta.student_id,
                department: meta.department,
                intake: meta.intake,
                section: meta.section,
                updated_at: new Date().toISOString(),
              })
              .eq('id', data.session.user.id);
          } catch {}
        }
      }
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
          {t.auth.verifyTitle}
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
        >
          <Text style={[styles.h1, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.auth.verifyTitle}
          </Text>
          <Text style={[styles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.auth.verifySub(email)}
          </Text>

          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {t.auth.resetCodeLabel.toUpperCase()}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.codeInput,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                color: C.text,
                fontFamily: FontFamily.jakartaBold,
              },
            ]}
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

          {/* 58dp Primary CTA */}
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: C.brand, marginTop: 22, opacity: code.length === 6 ? 1 : 0.6 }]}
            onPress={verify}
            disabled={busy || code.length < 6}
            activeOpacity={0.82}
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
    paddingTop: 32,
    paddingBottom: 40,
  } as ViewStyle,

  h1: {
    fontSize: 24,
    marginBottom: 6,
    includeFontPadding: false,
  } as any,

  sub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    includeFontPadding: false,
  } as any,

  label: {
    fontSize: 11.5,
    letterSpacing: 0.6,
    marginBottom: 8,
    includeFontPadding: false,
  } as any,

  input: {
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 16,
  } as any,

  codeInput: {
    letterSpacing: 6,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontSize: 24,
  } as any,

  msg: {
    fontSize: 13,
    marginTop: 10,
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
    fontSize: 16,
    color: '#fff',
    includeFontPadding: false,
  } as any,

  resendRow: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 4,
  } as ViewStyle,

  resendTxt: {
    fontSize: 13,
    includeFontPadding: false,
  } as any,
});
