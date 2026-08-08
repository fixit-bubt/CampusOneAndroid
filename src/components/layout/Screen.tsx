import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Layout } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAvoid?: boolean;
  noPadding?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, scrollable = false, keyboardAvoid = false, noPadding = false, style }: ScreenProps) {
  const { C } = useTheme();

  const bg: ViewStyle = { flex: 1, backgroundColor: C.bg };
  const padding: ViewStyle = noPadding ? {} : { paddingHorizontal: Layout.screenPadding };

  const inner = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padding, { paddingBottom: Layout.bottomPadding }, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padding, style]}>{children}</View>
  );

  const body = keyboardAvoid ? (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );

  return (
    <SafeAreaView style={bg} edges={['top', 'left', 'right']}>
      {body}
    </SafeAreaView>
  );
}
