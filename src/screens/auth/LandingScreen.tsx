// Matches design screens-auth.jsx — Landing mode
import {
  View, Text, TouchableOpacity, StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import type { AuthStackParams } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Landing'>;

// Shared Brand component — gradient box with bell icon
export function Brand({ size = 56 }: { size?: number }) {
  return (
    <LinearGradient
      colors={['#2b5be3', '#1f47c4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.brandBox,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
        },
      ]}
    >
      <Icon name="bell" size={size * 0.5} color="#ffffff" />
    </LinearGradient>
  );
}

export function LandingScreen({ navigation }: Props) {
  const { C, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Top-right: lang toggle + theme btn */}
      <View style={styles.topbar}>
        <TouchableOpacity style={[styles.langPill, { borderColor: C.border, backgroundColor: C.surface }]}>
          <Text style={[styles.langItem, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>EN</Text>
          <Text style={[styles.langItem, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>বাং</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
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
          Your campus, all in one place. Reports, events, clubs, and more.
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: C.brand }]}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnPrimaryText, { fontFamily: FontFamily.jakartaBold }]}>
              Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              I already have an account
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

  brandBox: {
    alignItems: 'center',
    justifyContent: 'center',
    // shadow
    shadowColor: '#2b5be3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 11,
    elevation: 8,
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
