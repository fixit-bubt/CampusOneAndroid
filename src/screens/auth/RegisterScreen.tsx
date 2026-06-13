// Matches design screens-auth.jsx — Register mode
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
import { Brand } from './LandingScreen';
import { FontFamily, Layout } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { C } = useTheme();
  const { signUp } = useAuth();
  const t = useT();

  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy]   = useState(false);
  const busyRef = useRef(false);
  const [err, setErr]     = useState('');

  const ok = name.trim().length > 0 && email.trim().length > 0 && pass.trim().length > 0;

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
      await signUp(emailVal, pass, name.trim());
    } catch (e: any) {
      setErr(e?.message ?? t.auth.registerFailed);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* SubBar */}
      <View style={[styles.subbar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          hitSlop={8}
        >
          <Icon name="arrowL" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.subbarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          {t.auth.register}
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
          {/* Brand */}
          <View style={{ marginBottom: 28 }}>
            <Brand size={48} />
          </View>

          {/* Full Name */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {t.auth.fullName}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={name}
            onChangeText={setName}
            placeholder={t.auth.fullNamePlaceholder}
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
          />

          {/* Email */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {t.auth.email}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@std.bubt.edu.bd"
            placeholderTextColor={C.textMuted}
          />

          {/* Password */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {t.auth.password}
          </Text>
          <View style={styles.passWrap}>
            <TextInput
              style={[styles.input, styles.passInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={pass}
              onChangeText={setPass}
              secureTextEntry={!showPass}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity
              onPress={() => setShowPass(s => !s)}
              style={styles.eyeBtn}
              hitSlop={8}
              accessibilityLabel={showPass ? t.auth.hidePassword : t.auth.showPassword}
            >
              <Icon name={showPass ? 'eyeOff' : 'eye'} size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {!!err && (
            <Text style={[styles.errText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
              {err}
            </Text>
          )}

          {/* Continue button */}
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: C.brand, opacity: ok ? 1 : 0.5, marginTop: 22 }]}
            onPress={handleContinue}
            disabled={!ok || busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={[styles.btnText, { fontFamily: FontFamily.jakartaBold }]}>
                  {t.auth.continueBtn}
                </Text>
                <Icon name="chevR" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

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

  subbarTitle: {
    flex: 1,
    fontSize: 15,
    textAlign: 'center',
  } as any,

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  content: {
    paddingTop: 32,
    paddingBottom: 40,
  } as ViewStyle,

  label: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 14,
  } as any,

  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  } as any,

  passWrap: {
    justifyContent: 'center',
  } as ViewStyle,

  passInput: {
    paddingRight: 48,
  } as any,

  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 50,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  errText: {
    fontSize: 13,
    marginTop: 8,
  } as any,

  btnPrimary: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,

  btnText: {
    fontSize: 15,
    color: '#fff',
  } as any,

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  } as ViewStyle,

  switchText: { fontSize: 13.5 } as any,
  switchLink: { fontSize: 13.5 } as any,
});
