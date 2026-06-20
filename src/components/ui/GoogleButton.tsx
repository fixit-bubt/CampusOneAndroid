import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily } from '../../theme';

// "Continue with Google" button. The G mark is drawn with text so we need no asset.
export function GoogleButton({ label, onPress, busy, disabled }: {
  label: string; onPress: () => void; busy?: boolean; disabled?: boolean;
}) {
  const { C } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: C.surface, borderColor: C.border, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={busy || disabled}
      activeOpacity={0.85}
    >
      {busy ? (
        <ActivityIndicator color={C.text} />
      ) : (
        <View style={styles.row}>
          <View style={styles.gWrap}>
            <Text style={styles.g}>G</Text>
          </View>
          <Text style={[styles.txt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function OrDivider({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <View style={styles.orRow}>
      <View style={[styles.line, { backgroundColor: C.border }]} />
      <Text style={[styles.orTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>{label}</Text>
      <View style={[styles.line, { backgroundColor: C.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 52, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  gWrap: { width: 22, height: 22, borderRadius: 4, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dadce0' } as ViewStyle,
  g: { fontSize: 15, fontWeight: '800', color: '#4285F4' } as any,
  txt: { fontSize: 15 } as any,
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 } as ViewStyle,
  line: { flex: 1, height: StyleSheet.hairlineWidth } as ViewStyle,
  orTxt: { fontSize: 12 } as any,
});
