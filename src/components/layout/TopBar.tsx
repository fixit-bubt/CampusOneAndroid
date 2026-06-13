// Matches design chrome.jsx — TopBar (home header) + SubBar (back header)
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../store/appStore';
import { useT } from '../../i18n';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/Logo';
import { FontFamily, FontSize, Layout } from '../../theme';
import type { Profile } from '../../types/database';

// ── Home TopBar ──────────────────────────────────────────────────────────────
interface TopBarProps {
  profile?: Profile | null;
  title?: string;
  unread?: number;
  onAvatar?: () => void;
  onBell?: () => void;
  right?: React.ReactNode;
}

export function TopBar({ profile, title, unread = 0, onAvatar, onBell, right }: TopBarProps) {
  const { C } = useTheme();
  const { isDark, toggleTheme, toggleLang } = useApp();
  const t = useT();
  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  if (title) {
    return (
      <View style={[styles.topbar, { backgroundColor: C.surface, paddingHorizontal: Layout.screenPadding }]}>
        <LogoMark size={30} shadow={false} />
        <Text style={[styles.dashTitle, { flex: 1, color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{title}</Text>
        {right ?? null}
      </View>
    );
  }

  const greeting = t.topbar.greeting;
  const langLabel = t.topbar.langLabel;

  return (
    <View style={[styles.topbar, { backgroundColor: C.surface, paddingHorizontal: Layout.screenPadding }]}>
      <TouchableOpacity onPress={onAvatar} activeOpacity={0.8}>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="md" />
      </TouchableOpacity>

      <LogoMark size={32} shadow={false} />

      <View style={styles.titleBlock}>
        <Text style={[styles.eyebrow, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
          {greeting}
        </Text>
        <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {firstName}
        </Text>
      </View>

      {/* language toggle */}
      <TouchableOpacity onPress={toggleLang} style={styles.textBtn} activeOpacity={0.7}>
        <Text style={[styles.langTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
          {langLabel}
        </Text>
      </TouchableOpacity>

      {/* theme toggle */}
      <TouchableOpacity onPress={toggleTheme} style={styles.textBtn} activeOpacity={0.7}>
        <Icon name={isDark ? 'sun' : 'moon'} size={19} color={C.textMuted} />
      </TouchableOpacity>

      {/* notification bell */}
      <TouchableOpacity onPress={onBell} style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]} activeOpacity={0.75}>
        <Icon name="bell" size={20} color={C.text2} />
        {unread > 0 && (
          <View style={[styles.badge, { backgroundColor: C.danger }]}>
            <Text style={styles.badgeTxt}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── SubBar (back navigation) ─────────────────────────────────────────────────
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
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  titleBlock: { flex: 1 } as ViewStyle,
  eyebrow: { fontSize: 11, letterSpacing: 0.3 } as any,
  name: { fontSize: 15, lineHeight: 20 } as any,
  dashTitle: { fontSize: 18, letterSpacing: -0.3 } as any,
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
  textBtn: {
    height: 40,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  langTxt: { fontSize: 13 } as any,
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
    top: -4,
    right: -4,
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
