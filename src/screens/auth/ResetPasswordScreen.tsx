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
import { PasswordInput } from '../../components/ui/PasswordInput';
import { FontFamily, Layout, Accent } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'ResetPassword'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ResetPasswordScreen({ route, navigation }: Props) {
  const { C, isDark } = useTheme();
  const t = useT();

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode]   = useState('');
  const [pass, setPass]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const [note, setNote]   = useState('');
  const busyRef = useRef(false);

  function handleQuickDomain(domain: string) {
    const raw = email.trim();
    if (!raw) {
      setEmail(domain);
      return;
    }
    const userPart = raw.split('@')[0];
    setEmail(userPart + domain);
  }

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
      if (error && /rate|limit/i.test(error.message)) {
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
      const { error: uErr } = await supabase.auth.updateUser({ password: pass });
      if (uErr) { setErr(uErr.message); return; }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const requesting = step === 'request';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 58dp SubBar */}
      <View style={[styles.subbar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => (requesting ? navigation.goBack() : setStep('request'))}
          style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          hitSlop={8}
          activeOpacity={0.75}
        >
          <Icon name="arrowL" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.subbarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          {t.auth.resetTitle}
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
            {t.auth.resetTitle}
          </Text>
          <Text style={[styles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {requesting ? t.auth.resetRequestSub : t.auth.resetVerifySub(email.trim())}
          </Text>

          {requesting ? (
            <>
              <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                CAMPUS EMAIL
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    color: C.text,
                    fontFamily: FontFamily.jakartaRegular,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                placeholder="you@std.bubt.edu.bd"
                placeholderTextColor={C.textMuted}
              />
              <View style={styles.domainChipsRow}>
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
            </>
          ) : (
            <>
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

              <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 16 }]}>
                {t.auth.resetNewPassword.toUpperCase()}
              </Text>
              <PasswordInput
                style={[
                  styles.input,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    color: C.text,
                    fontFamily: FontFamily.jakartaRegular,
                  },
                ]}
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
            <View style={[styles.errBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#fee2e2', borderColor: C.danger }]}>
              <Icon name="close" size={16} color={C.danger} />
              <Text style={[styles.errText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
                {err}
              </Text>
            </View>
          )}

          {/* 58dp Primary Button */}
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: C.brand, marginTop: 22 }]}
            onPress={requesting ? sendCode : verifyAndSet}
            disabled={busy}
            activeOpacity={0.82}
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
    marginBottom: 18,
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
    fontSize: 15,
  } as any,

  codeInput: {
    letterSpacing: 6,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontSize: 24,
  } as any,

  domainChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  } as ViewStyle,

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

  msg: {
    fontSize: 13,
    marginTop: 10,
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
