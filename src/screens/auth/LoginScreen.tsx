// Matches design screens-auth.jsx — Login mode
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/ui/Icon';
import { Brand } from './LandingScreen';
import { FontFamily, Layout } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { C } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const [resetSent, setResetSent] = useState(false);

  const ok = email.trim().length > 0 && pass.trim().length > 0;

  async function handleForgotPassword() {
    const addr = email.trim();
    if (!addr) {
      setErr('Enter your email above, then tap Forgot password.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(addr);
    setBusy(false);
    if (error) {
      setErr(error.message);
    } else {
      setResetSent(true);
      setErr('');
    }
  }

  async function handleContinue() {
    if (!ok || busy) return;
    setBusy(true);
    setErr('');
    try {
      await signIn(email.trim(), pass);
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed. Check your credentials.');
    } finally {
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
          Sign In
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={{ marginBottom: 28 }}>
            <Brand size={48} />
          </View>

          {/* Email */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Email
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@std.bubt.edu.bd"
            placeholderTextColor={C.textMuted}
          />

          {/* Password */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Password
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={pass}
            onChangeText={setPass}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={C.textMuted}
          />

          {/* Forgot password */}
          <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={styles.forgotRow}>
            <Text style={[styles.forgotTxt, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Error / reset confirmation */}
          {resetSent ? (
            <Text style={[styles.errText, { color: '#0e9c8a', fontFamily: FontFamily.jakartaMedium }]}>
              Reset link sent — check your email.
            </Text>
          ) : !!err && (
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
                  Continue
                </Text>
                <Icon name="chevR" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Switch to Register */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.replace('Register')}>
              <Text style={[styles.switchLink, { color: C.brand, fontFamily: FontFamily.jakartaExtraBold }]}>
                Register
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
  forgotRow: { alignSelf: 'flex-end', marginTop: 8 } as ViewStyle,
  forgotTxt: { fontSize: 13 } as any,
});
