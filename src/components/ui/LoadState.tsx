// Loading + failure states shared by the list screens.
// SkeletonList shows pulsing placeholder rows on first load; LoadError shows
// a message with a retry button when the fetch failed and there's nothing
// cached to render.
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { FontFamily } from '../../theme';

function Pulse({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  const { C } = useTheme();
  return (
    <Pulse>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.thumb, { backgroundColor: C.surface2 }]} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.line, { backgroundColor: C.surface2, width: '72%' }]} />
            <View style={[styles.line, { backgroundColor: C.surface2, width: '46%' }]} />
          </View>
        </View>
      ))}
    </Pulse>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { C } = useTheme();
  const t = useT();
  return (
    <View style={styles.errWrap}>
      <View style={[styles.errIcon, { backgroundColor: C.surface2 }]}>
        <Feather name="wifi-off" size={24} color={C.textMuted} />
      </View>
      <Text style={[styles.errTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
        {t.common.loadingError}
      </Text>
      <TouchableOpacity
        style={[styles.retryBtn, { backgroundColor: C.brand }]}
        onPress={onRetry}
        activeOpacity={0.85}
      >
        <Text style={[styles.retryTxt, { fontFamily: FontFamily.jakartaBold }]}>{t.common.retry}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10,
  } as ViewStyle,
  thumb: { width: 44, height: 44, borderRadius: 12 } as ViewStyle,
  line: { height: 11, borderRadius: 6 } as ViewStyle,
  errWrap: { alignItems: 'center', paddingVertical: 48, gap: 14 } as ViewStyle,
  errIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  errTxt: { fontSize: 13.5 } as any,
  retryBtn: { paddingHorizontal: 22, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  retryTxt: { fontSize: 13.5, color: '#fff' } as any,
});
