import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';
import { FontFamily, FontSize } from '../../theme';

type TabId = 'home' | 'explore' | 'alerts' | 'profile';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'home',    icon: 'home',  label: 'Home' },
  { id: 'explore', icon: 'grid',  label: 'Explore' },
  { id: 'alerts',  icon: 'bell',  label: 'Alerts' },
  { id: 'profile', icon: 'user',  label: 'Profile' },
];

interface BottomNavProps {
  tab: TabId;
  onTab: (id: TabId) => void;
  unread?: number;
}

export function BottomNav({ tab, onTab, unread = 0 }: BottomNavProps) {
  const { C } = useTheme();

  return (
    <View style={[styles.outer, { backgroundColor: C.bg }]}>
      <View style={[styles.inner, { backgroundColor: C.surface, borderColor: C.border }]}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, active && { backgroundColor: C.brand50 }]}
              onPress={() => onTab(t.id)}
              activeOpacity={0.75}
            >
              <View style={{ position: 'relative' }}>
                <Icon
                  name={t.icon}
                  size={22}
                  color={active ? C.brand : C.textMuted}
                />
                {t.id === 'alerts' && unread > 0 && (
                  <View style={[styles.dot, { backgroundColor: C.danger }]} />
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: active ? C.brand : C.textMuted,
                    fontFamily: active ? FontFamily.jakartaSemiBold : FontFamily.jakartaRegular,
                  },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  } as ViewStyle,
  inner: {
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: 1,
    padding: 7,
  } as ViewStyle,
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    gap: 3,
  } as ViewStyle,
  label: { fontSize: 10 } as any,
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
});
