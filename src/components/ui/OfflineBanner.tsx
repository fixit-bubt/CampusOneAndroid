import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, FontSize, Spacing, Radius } from '../../theme';

interface OfflineBannerProps {
  visible?: boolean;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function OfflineBanner({
  visible = true,
  message = 'Showing saved data · Offline mode',
  onRetry,
  style,
}: OfflineBannerProps) {
  const { C } = useTheme();

  if (!visible) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: C.surface2,
          borderColor: C.border,
        },
        style,
      ]}
    >
      <View style={styles.left}>
        <Feather name="cloud-off" size={13} color={C.warn} style={styles.icon} />
        <Text style={[styles.text, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {message}
        </Text>
      </View>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} hitSlop={8} activeOpacity={0.7} style={styles.retry}>
          <Text style={[styles.retryText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
            Sync
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  icon: {
    marginRight: 2,
  },
  text: {
    fontSize: 12,
    flex: 1,
  },
  retry: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  retryText: {
    fontSize: 12,
  },
});
