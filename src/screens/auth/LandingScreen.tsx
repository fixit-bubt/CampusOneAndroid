// Matches design screens-auth.jsx — Landing mode
import {
  View, Text, TouchableOpacity, StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../store/appStore';
import { useT } from '../../i18n';
import { Icon } from '../../components/ui/Icon';
import { LogoMark } from '../../components/ui/Logo';
import { FontFamily, Layout } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Landing'>;

// Shared Brand component — CampusOne logo mark (re-exported from Logo)
export function Brand({ size = 56 }: { size?: number }) {
  return <LogoMark size={size} />;
}

export function LandingScreen({ navigation }: Props) {
  const { C, isDark } = useTheme();
  const { lang, toggleLang, toggleTheme } = useApp();
  const t = useT();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Top-right: lang toggle + theme btn */}
      <View style={styles.topbar}>
        <TouchableOpacity
          style={[styles.langPill, { borderColor: C.border, backgroundColor: C.surface }]}
          onPress={toggleLang}
          activeOpacity={0.75}
        >
          <Text style={[styles.langItem, {
            color: lang === 'en' ? C.brand : C.textMuted,
            fontFamily: lang === 'en' ? FontFamily.jakartaBold : FontFamily.jakartaRegular,
          }]}>EN</Text>
          <Text style={[styles.langItem, {
            color: lang === 'bn' ? C.brand : C.textMuted,
            fontFamily: lang === 'bn' ? FontFamily.jakartaBold : FontFamily.jakartaRegular,
          }]}>বাং</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          onPress={toggleTheme}
          activeOpacity={0.75}
        >
          <Icon name={isDark ? 'sun' : 'moon'} size={18} color={C.text2} />
        </TouchableOpacity>
      </View>

      {/* Content: centered, grows to fill */}
      <View style={[styles.content, { paddingHorizontal: Layout.screenPadding }]}>
        <Brand size={64} />

        <Text
          style={[
            styles.appName,
            { color: C.text, fontFamily: FontFamily.jakartaExtraBold },
          ]}
        >
          CampusOne
        </Text>

        <Text
          style={[
            styles.tagline,
            { color: C.text2, fontFamily: FontFamily.jakartaMedium },
          ]}
        >
          {t.landing.tagline}
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: C.brand }]}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnPrimaryText, { fontFamily: FontFamily.jakartaBold }]}>
              {t.landing.getStarted}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.landing.haveAccount}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

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

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  } as ViewStyle,

  appName: {
    fontSize: 34,
    letterSpacing: -1,
    marginTop: 22,
  } as any,

  tagline: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    maxWidth: 280,
  } as any,

  buttons: {
    marginTop: 32,
    gap: 10,
  } as ViewStyle,

  btnPrimary: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnPrimaryText: {
    fontSize: 15,
    color: '#fff',
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
});
