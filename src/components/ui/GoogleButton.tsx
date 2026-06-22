import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily } from '../../theme';

function GoogleLogo({ size = 20 }: { size?: number }) {
  const s = size;
  const half = s / 2;
  const bar = s * 0.2;
  return (
    <View style={{ width: s, height: s }}>
      {/* Blue right arc */}
      <View style={{
        position: 'absolute', width: s, height: s, borderRadius: half,
        borderWidth: bar, borderColor: 'transparent', borderRightColor: '#4285F4',
        transform: [{ rotate: '-10deg' }],
      }} />
      {/* Green bottom arc */}
      <View style={{
        position: 'absolute', width: s, height: s, borderRadius: half,
        borderWidth: bar, borderColor: 'transparent', borderBottomColor: '#34A853',
        transform: [{ rotate: '-10deg' }],
      }} />
      {/* Yellow left-bottom arc */}
      <View style={{
        position: 'absolute', width: s, height: s, borderRadius: half,
        borderWidth: bar, borderColor: 'transparent', borderLeftColor: '#FBBC05',
        transform: [{ rotate: '-10deg' }],
      }} />
      {/* Red top arc */}
      <View style={{
        position: 'absolute', width: s, height: s, borderRadius: half,
        borderWidth: bar, borderColor: 'transparent', borderTopColor: '#EA4335',
        transform: [{ rotate: '-10deg' }],
      }} />
      {/* Blue horizontal bar (the dash of the G) */}
      <View style={{
        position: 'absolute',
        right: 0,
        top: half - bar / 2,
        width: half + bar * 0.2,
        height: bar,
        backgroundColor: '#4285F4',
        borderTopRightRadius: bar * 0.3,
        borderBottomRightRadius: bar * 0.3,
      }} />
    </View>
  );
}

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
            <GoogleLogo size={18} />
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
  gWrap: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  txt: { fontSize: 15 } as any,
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 } as ViewStyle,
  line: { flex: 1, height: StyleSheet.hairlineWidth } as ViewStyle,
  orTxt: { fontSize: 12 } as any,
});
