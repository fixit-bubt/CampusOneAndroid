// TopBar (home header) + SubBar (back header)
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/Logo';
import { FontFamily, FontSize, Layout } from '../../theme';
import type { Profile } from '../../types/database';

// Home TopBar
interface TopBarProps {
  profile?: Profile | null;
  title?: string;
  unread?: number;
  onBell?: () => void;
  onAvatar?: () => void;
  right?: React.ReactNode;
}

export function TopBar({ profile, title, unread = 0, onBell, right }: TopBarProps) {
  const { C, isDark } = useTheme();
  const t = useT();

  if (title) {
    return (
      <View style={[styles.topbar, { backgroundColor: C.surface, borderBottomColor: C.border, paddingHorizontal: Layout.screenPadding }]}>
        <LogoMark size={30} shadow={false} />
        <Text style={[styles.dashTitle, { flex: 1, color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{title}</Text>
        {right ?? null}
      </View>
    );
  }

  const role = profile?.role;
  const subtitle =
    role === 'admin'
      ? (t.topbar?.adminSubtitle ?? 'Campus Administration')
      : role === 'staff'
      ? (t.topbar?.staffSubtitle ?? 'Staff Workspace')
      : (t.topbar?.tagline ?? 'Full campus in one app');

  const roleBadge =
    role === 'admin'
      ? {
          label: 'ADMIN',
          color: isDark ? '#34d399' : '#059669',
          bg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#e6f7ef',
          border: isDark ? 'rgba(52, 211, 153, 0.3)' : '#a7f3d0',
        }
      : role === 'staff'
      ? {
          label: 'STAFF',
          color: isDark ? '#fbbf24' : '#b45309',
          bg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7',
          border: isDark ? 'rgba(251, 191, 36, 0.3)' : '#fde68a',
        }
      : null;

  return (
    <View style={[styles.topbar, { backgroundColor: C.surface, borderBottomColor: C.border, paddingHorizontal: Layout.screenPadding }]}>
      <View style={styles.brandGroup}>
        <LogoMark size={32} shadow={false} />
        <View style={styles.brandTextCol}>
          <View style={styles.brandRow}>
            <Text style={[styles.brandCampus, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Campus
            </Text>
            <Text style={[styles.brandOne, { color: isDark ? '#34d399' : '#059669', fontFamily: FontFamily.jakartaExtraBold }]}>
              One
            </Text>
            {roleBadge && (
              <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg, borderColor: roleBadge.border }]}>
                <Text style={[styles.roleBadgeTxt, { color: roleBadge.color, fontFamily: FontFamily.jakartaBold }]}>
                  {roleBadge.label}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.brandSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      {right ? (
        right
      ) : onBell ? (
        <TouchableOpacity
          onPress={onBell}
          style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          activeOpacity={0.75}
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          accessibilityRole="button"
          hitSlop={4}
        >
          <Icon name="bell" size={19} color={C.text2} />
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: C.danger }]}>
              <Text style={styles.badgeTxt}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// SubBar (back navigation)
interface SubBarProps {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function SubBar({ title, onBack, right, rightSlot }: SubBarProps) {
  const { C } = useTheme();
  return (
    <View style={[styles.subbar, { backgroundColor: C.surface, borderBottomColor: C.border, paddingHorizontal: Layout.screenPadding }]}>
      <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]} hitSlop={8}>
        <Icon name="arrowL" size={20} color={C.text} />
      </TouchableOpacity>
      <Text style={[styles.subbarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>
        {rightSlot ?? right ?? <LogoMark size={28} shadow={false} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  } as ViewStyle,
  brandTextCol: {
    justifyContent: 'center',
  } as ViewStyle,
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  brandCampus: {
    fontSize: 18,
    letterSpacing: -0.4,
    lineHeight: 22,
  } as any,
  brandOne: {
    fontSize: 18,
    letterSpacing: -0.4,
    lineHeight: 22,
  } as any,
  brandSub: {
    fontSize: 10.5,
    letterSpacing: 0.15,
    lineHeight: 14,
    marginTop: 1,
  } as any,
  roleBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
  } as ViewStyle,
  roleBadgeTxt: {
    fontSize: 9,
    letterSpacing: 0.5,
    lineHeight: 11,
  } as any,
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  dashTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
  } as any,
  subbar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  subbarTitle: {
    flex: 1,
    fontSize: FontSize.md,
    textAlign: 'center',
  } as any,
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  } as ViewStyle,
  badgeTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  } as any,
});
