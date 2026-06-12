// Toast system (web parity: ui.jsx ToastProvider) — non-blocking feedback
// instead of Alert.alert. Bottom-anchored, auto-dismisses, type-tinted.
// Usage: const toast = useToast(); toast({ type: 'success', title: 'Saved' });
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily } from '../../theme';

export interface ToastOptions {
  type?: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

type PushFn = (opts: ToastOptions) => void;

const ToastContext = createContext<PushFn | null>(null);

export function useToast(): PushFn {
  const push = useContext(ToastContext);
  // Soft-fail so a screen rendered outside the provider never crashes.
  return push ?? (() => {});
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((opts: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(opts);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, opts.duration ?? 3000);
  }, [opacity]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {toast && <ToastItem toast={toast} opacity={opacity} />}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, opacity }: { toast: ToastOptions; opacity: Animated.Value }) {
  const { C } = useTheme();
  const tone =
    toast.type === 'error' ? { icon: 'x-circle' as const, fg: C.danger } :
    toast.type === 'info' ? { icon: 'info' as const, fg: C.info } :
    { icon: 'check-circle' as const, fg: C.success };
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity }]}
    >
      <View style={[styles.toast, { backgroundColor: C.surface, borderColor: C.border, shadowColor: C.text }]}>
        <Feather name={tone.icon} size={18} color={tone.fg} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text style={[styles.msg, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={2}>
              {toast.message}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    alignItems: 'center',
  } as ViewStyle,
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 420,
    width: '100%',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 7,
  } as ViewStyle,
  title: { fontSize: 13.5 } as any,
  msg: { fontSize: 12, marginTop: 1 } as any,
});
