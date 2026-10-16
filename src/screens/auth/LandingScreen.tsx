import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { Icon } from '../../components/ui/Icon';
import { LogoMark } from '../../components/ui/Logo';
import { GoogleButton, OrDivider } from '../../components/ui/GoogleButton';
import { signInWithGoogle } from '../../lib/googleAuth';
import { FontFamily, Layout, darken } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Landing'>;

// Shared Brand component - CampusOne logo mark.
export function Brand({ size = 56 }: { size?: number }) {
  return <LogoMark size={size} />;
}

export function LandingScreen({ navigation }: Props) {
  const { C, isDark } = useTheme();
  const t = useT();

  const [busyG, setBusyG] = useState(false);
  const [err, setErr] = useState('');

  async function handleGoogle() {
    if (busyG) return;
    setBusyG(true);
    setErr('');
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setErr(e?.message ?? t.landing.googleFailed);
    } finally {
      setBusyG(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Hero - compact brand gradient positioned higher up */}
      <LinearGradient
        colors={[C.brand, isDark ? '#0a1738' : darken(C.brand)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <View style={styles.heroContent}>
            <LogoMark size={58} shadow />
            <Text style={[styles.appName, { color: C.white, fontFamily: FontFamily.jakartaExtraBold }]}>
              CampusOne
            </Text>
            <Text style={[styles.tagline, { color: 'rgba(255,255,255,0.9)', fontFamily: FontFamily.jakartaMedium }]}>
              Bangladesh University of Business & Technology
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Card - auth options, positioned higher with preserved top curve */}
      <View style={[styles.card, { backgroundColor: C.bg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent' }]}>
        <ScrollView
          contentContainerStyle={[styles.cardContent, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
        >
          <Text style={[styles.welcome, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.landing.welcome}
          </Text>
          <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            Sign in with your university credentials to continue
          </Text>

          {/* Error */}
          {!!err && (
            <View style={[styles.errBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#fee2e2', borderColor: C.danger }]}>
              <Icon name="close" size={16} color={C.danger} />
              <Text style={[styles.errText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
                {err}
              </Text>
            </View>
          )}

          {/* Google - primary 58dp action */}
          <View style={{ marginTop: 16 }}>
            <GoogleButton label={t.landing.continueGoogle} onPress={handleGoogle} busy={busyG} />
          </View>

          {/* Divider */}
          <OrDivider label={t.landing.orLabel} />

          {/* Sign in with email - 58dp */}
          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.82}
          >
            <View style={styles.btnActionLeft}>
              <View style={[styles.btnIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Icon name="mail" size={18} color={C.brand} />
              </View>
              <Text style={[styles.btnActionText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.landing.emailSignIn}
              </Text>
            </View>
            <Icon name="chevR" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* Create account - 58dp */}
          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10 }]}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.82}
          >
            <View style={styles.btnActionLeft}>
              <View style={[styles.btnIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Icon name="userPlus" size={18} color={C.brand} />
              </View>
              <Text style={[styles.btnActionText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Create Account
              </Text>
            </View>
            <Icon name="chevR" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* Footer */}
          <Text style={[styles.footer, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 } as ViewStyle,

  hero: {
    flex: 0.28,
    minHeight: 180,
  } as ViewStyle,

  heroSafe: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  } as ViewStyle,

  appName: {
    fontSize: 27,
    letterSpacing: -0.6,
    marginTop: 8,
    includeFontPadding: false,
  } as any,

  tagline: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    textAlign: 'center',
    includeFontPadding: false,
  } as any,

  card: {
    flex: 0.72,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 12,
  } as ViewStyle,

  cardContent: {
    paddingTop: 22,
    paddingBottom: 24,
  } as ViewStyle,

  welcome: {
    fontSize: 24,
    letterSpacing: -0.4,
    includeFontPadding: false,
  } as any,

  subtitle: {
    fontSize: 13.5,
    marginTop: 4,
    lineHeight: 19,
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
    marginTop: 12,
  } as ViewStyle,

  errText: {
    fontSize: 13,
    flex: 1,
    includeFontPadding: false,
  } as any,

  btnAction: {
    height: Layout.controlHeight, // exactly 58dp
    borderRadius: Layout.controlRadius, // exactly 16dp
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  } as ViewStyle,

  btnActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,

  btnIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnActionText: {
    fontSize: 15.5,
    includeFontPadding: false,
  } as any,

  footer: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 18,
    includeFontPadding: false,
  } as any,
});
