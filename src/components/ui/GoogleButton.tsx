import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, Layout } from '../../theme';

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

export function GoogleButton({ label = 'Continue with Google', onPress, busy, disabled }: {
  label?: string; onPress: () => void; busy?: boolean; disabled?: boolean;
}) {
  const { C } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={busy || disabled}
      activeOpacity={0.82}
    >
      {busy ? (
        <ActivityIndicator color={C.text} />
      ) : (
        <View style={styles.row}>
          <View style={styles.gWrap}>
            <GoogleLogo size={20} />
          </View>
          <Text style={[styles.txt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function OrDivider({ label = 'or' }: { label?: string }) {
  const { C } = useTheme();
  return (
    <View style={styles.orRow}>
      <View style={[styles.line, { backgroundColor: C.border }]} />
      <View style={[styles.pill, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.orTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
          {label}
        </Text>
      </View>
      <View style={[styles.line, { backgroundColor: C.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: Layout.controlHeight, // 58dp
    borderRadius: Layout.controlRadius, // 16dp
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  } as ViewStyle,
  gWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  txt: {
    fontSize: 15.5,
    includeFontPadding: false,
  } as any,
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  } as ViewStyle,
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  } as ViewStyle,
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  orTxt: {
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    includeFontPadding: false,
  } as any,
});
