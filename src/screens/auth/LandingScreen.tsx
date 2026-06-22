import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../store/appStore';
import { useT } from '../../i18n';
import { Icon } from '../../components/ui/Icon';
import { LogoMark } from '../../components/ui/Logo';
import { GoogleButton, OrDivider } from '../../components/ui/GoogleButton';
import { signInWithGoogle } from '../../lib/googleAuth';
import { FontFamily, Layout, darken } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Landing'>;

// Shared Brand component — CampusOne logo mark (re-exported from Logo).
// Login/Register import this; keep the signature stable.
export function Brand({ size = 56 }: { size?: number }) {
  return <LogoMark size={size} />;
}

export function LandingScreen({ navigation }: Props) {
  const { C, isDark } = useTheme();
  const { lang, toggleLang, toggleTheme } = useApp();
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
    <View style={[styles.root, { backgroundColor: C.brand }]}>
      {/* Hero — brand gradient, logo + name + tagline */}
      <LinearGradient
        colors={[C.brand, darken(C.brand)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          {/* Top-right: lang toggle + theme btn */}
          <View style={styles.topbar}>
            <TouchableOpacity
              style={[styles.langPill, { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.14)' }]}
              onPress={toggleLang}
              activeOpacity={0.75}
            >
              <Text style={[styles.langItem, {
                color: C.white,
                opacity: lang === 'en' ? 1 : 0.6,
                fontFamily: lang === 'en' ? FontFamily.jakartaBold : FontFamily.jakartaRegular,
              }]}>EN</Text>
              <Text style={[styles.langItem, {
                color: C.white,
                opacity: lang === 'bn' ? 1 : 0.6,
                fontFamily: lang === 'bn' ? FontFamily.jakartaBold : FontFamily.jakartaRegular,
              }]}>বাং</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.4)' }]}
              onPress={toggleTheme}
              activeOpacity={0.75}
            >
              <Icon name={isDark ? 'sun' : 'moon'} size={18} color={C.white} />
            </TouchableOpacity>
          </View>

          {/* Centered hero content */}
          <View style={styles.heroContent}>
            <View style={styles.heroLogo}>
              <MaterialCommunityIcons name="school" size={42} color={C.brand} />
            </View>
            <Text style={[styles.appName, { color: C.white, fontFamily: FontFamily.jakartaExtraBold }]}>
              CampusOne
            </Text>
            <Text style={[styles.tagline, { color: 'rgba(255,255,255,0.85)', fontFamily: FontFamily.jakartaMedium }]}>
              {t.landing.tagline}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Card — auth options */}
      <View style={[styles.card, { backgroundColor: C.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.cardContent, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.welcome, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.landing.welcome}
          </Text>
          <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.landing.subtitle}
          </Text>

          {/* Error */}
          {!!err && (
            <Text style={[styles.errText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
              {err}
            </Text>
          )}

          {/* Google — primary */}
          <View style={{ marginTop: 22 }}>
            <GoogleButton label={t.landing.continueGoogle} onPress={handleGoogle} busy={busyG} />
          </View>

          {/* Divider */}
          <OrDivider label={t.landing.orLabel} />

          {/* Sign in with email */}
          <TouchableOpacity
            style={[styles.btnSecondary, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.landing.emailSignIn}
            </Text>
          </TouchableOpacity>

          {/* Create account */}
          <TouchableOpacity
            style={[styles.btnSecondary, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10 }]}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.landing.getStarted}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={[styles.footer, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
            {t.landing.termsPrefix}
            <Text style={{ color: C.brand, fontFamily: FontFamily.jakartaSemiBold }}>{t.landing.privacy}</Text>
            {t.landing.termsAnd}
            <Text style={{ color: C.brand, fontFamily: FontFamily.jakartaSemiBold }}>{t.landing.terms}</Text>
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
    flex: 0.42,
    minHeight: 280,
  } as ViewStyle,

  heroSafe: { flex: 1 } as ViewStyle,

  topbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  } as ViewStyle,

  langPill: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 2,
  } as ViewStyle,

  langItem: {
    fontSize: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 14,
  } as any,

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
  } as ViewStyle,

  heroLogo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  } as ViewStyle,

  appName: {
    fontSize: 32,
    letterSpacing: -1,
    marginTop: 18,
  } as any,

  tagline: {
    fontSize: 14.5,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 300,
    textAlign: 'center',
  } as any,

  card: {
    flex: 0.58,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 12,
  } as ViewStyle,

  cardContent: {
    paddingTop: 30,
    paddingBottom: 32,
  } as ViewStyle,

  welcome: {
    fontSize: 26,
    letterSpacing: -0.5,
  } as any,

  subtitle: {
    fontSize: 14,
    marginTop: 4,
  } as any,

  errText: {
    fontSize: 13,
    marginTop: 12,
  } as any,

  btnSecondary: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnSecondaryText: {
    fontSize: 15,
  } as any,

  footer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 24,
  } as any,
});
