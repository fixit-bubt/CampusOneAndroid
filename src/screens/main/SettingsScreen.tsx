import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Switch, ActivityIndicator, Share, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { useApp } from '../../store/appStore';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';

const ROLE_TOKEN = { student: 'roleStudent', staff: 'roleStaff', admin: 'roleAdmin' } as const;

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

interface SettingRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  C: any;
}

function SettingRow({ icon, iconColor, label, sub, right, onPress, C }: SettingRowProps) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.row, { backgroundColor: C.surface }]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: (iconColor ?? C.brand) + '18' }]}>
        <Icon name={icon as any} size={17} color={iconColor ?? C.brand} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={18} color={C.textMuted} /> : null)}
    </Wrapper>
  );
}

export function SettingsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { profile, user, signOut } = useAuth();
  const { isDark: appDark, toggleTheme, lang, toggleLang } = useApp();

  const role = profile?.role ?? 'student';
  const roleHex = C[ROLE_TOKEN[role as keyof typeof ROLE_TOKEN] ?? 'roleStudent'];
  const roleBg = hexAlpha(roleHex, isDark ? 0.2 : 0.12);
  const ROLE_LABEL: Record<string, string> = {
    student: t.mainx.roleStudent, staff: t.mainx.roleStaff, admin: t.mainx.roleAdmin,
  };

  const [pwOpen, setPwOpen] = useState(false);
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const changePassword = useCallback(async () => {
    if (pwBusy) return;
    if (pwNew.length < 8) { toast({ type: 'error', title: 'Error', message: t.mainx.passwordTooShort }); return; }
    if (pwNew !== pwConfirm) { toast({ type: 'error', title: 'Error', message: t.mainx.passwordsNoMatch }); return; }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    setPwBusy(false);
    if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }
    setPwOpen(false);
    setPwNew(''); setPwConfirm('');
    toast({ type: 'success', title: 'Done', message: t.mainx.passwordUpdated });
  }, [pwNew, pwConfirm, pwBusy, t, toast]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { paddingHorizontal: Layout.screenPadding }]}>
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.tabs.settings}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
      >
        {/* Profile card — tappable */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="lg" />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
              {profile?.full_name ?? t.mainx.campusMember}
            </Text>
            <Text style={[styles.profileMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              {profile?.department ?? '-'}{profile?.intake ? ` · Intake ${profile.intake}` : ''}
            </Text>
            <View style={[styles.rolePill, { backgroundColor: roleBg }]}>
              <View style={[styles.roleDot, { backgroundColor: roleHex }]} />
              <Text style={[styles.roleText, { color: roleHex, fontFamily: FontFamily.jakartaBold }]}>
                {ROLE_LABEL[role] ?? role}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={C.textMuted} />
        </TouchableOpacity>

        {/* General */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          GENERAL
        </Text>
        <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SettingRow
            icon="moon" iconColor={C.text2} label="Dark Mode" C={C}
            right={
              <Switch value={appDark} onValueChange={toggleTheme}
                trackColor={{ false: C.surface3, true: C.brand + '66' }}
                thumbColor={appDark ? C.brand : C.white} />
            }
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            icon="globe" iconColor={C.text2}
            label="Language"
            sub={lang === 'en' ? 'English' : 'বাংলা'}
            C={C}
            right={
              <Switch value={lang === 'bn'} onValueChange={toggleLang}
                trackColor={{ false: C.surface3, true: C.brand + '66' }}
                thumbColor={lang === 'bn' ? C.brand : C.white} />
            }
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            icon="bell" iconColor={C.text2} label="Notifications" C={C}
            onPress={() => navigation.navigate('NotifSettings')}
          />
        </View>

        {/* Tools */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          TOOLS
        </Text>
        <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SettingRow
            icon="fileText" iconColor={SectorColors.coverpage}
            label="Cover Page Generator" C={C}
            onPress={() => navigation.navigate('CoverPageForm')}
          />
        </View>

        {/* More */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          MORE
        </Text>
        <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SettingRow
            icon="handshake" iconColor={C.text2} label="Share App" C={C}
            onPress={() => Share.share({ message: 'Check out CampusOne - your university companion app!' })}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            icon="shield" iconColor={C.text2} label="About" sub="CampusOne v1.1.3" C={C}
          />
        </View>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          ACCOUNT
        </Text>
        <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SettingRow
            icon="key" iconColor={C.text2} label={t.mainx.changePassword} C={C}
            onPress={() => setPwOpen(true)}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <TouchableOpacity
            style={styles.row}
            onPress={signOut}
            activeOpacity={0.65}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: C.danger + '18' }]}>
              <Icon name="logout" size={17} color={C.danger} />
            </View>
            <Text style={[styles.rowLabel, { color: C.danger, fontFamily: FontFamily.jakartaSemiBold, flex: 1 }]}>
              {t.mainx.signOut}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Change password sheet */}
      <Modal visible={pwOpen} transparent animationType="slide" onRequestClose={() => setPwOpen(false)}>
        <TouchableOpacity style={styles.pwOverlay} activeOpacity={1} onPress={() => setPwOpen(false)} />
        <View style={[styles.pwSheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.pwTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.mainx.changePassword}
          </Text>
          <Text style={[styles.pwSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.mainx.pwAtLeast8}
          </Text>
          <PasswordInput
            style={[styles.pwField, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={pwNew} onChangeText={setPwNew}
            placeholder={t.mainx.newPasswordPlaceholder} placeholderTextColor={C.textMuted}
          />
          <PasswordInput
            style={[styles.pwField, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={pwConfirm} onChangeText={setPwConfirm}
            placeholder={t.mainx.confirmNewPasswordPlaceholder} placeholderTextColor={C.textMuted}
          />
          <TouchableOpacity
            style={[styles.pwBtn, { backgroundColor: C.brand, opacity: pwBusy ? 0.6 : 1 }]}
            onPress={changePassword}
            disabled={pwBusy}
            activeOpacity={0.8}
          >
            {pwBusy
              ? <ActivityIndicator color={C.white} size="small" />
              : (
                <Text style={[styles.pwBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.mainx.updatePassword}
                </Text>
              )}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  header: { paddingTop: 8, paddingBottom: 4 } as ViewStyle,
  title: { fontSize: 26, letterSpacing: -0.5 } as any,

  scroll: { paddingBottom: 24 } as ViewStyle,

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 18, borderWidth: 1, marginTop: 12,
  } as ViewStyle,
  profileInfo: { flex: 1 } as ViewStyle,
  profileName: { fontSize: 17, letterSpacing: -0.2 } as any,
  profileMeta: { fontSize: 12, marginTop: 2 } as any,
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
    alignSelf: 'flex-start', marginTop: 6,
  } as ViewStyle,
  roleDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  roleText: { fontSize: 11.5 } as any,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 24, marginBottom: 9, marginLeft: 4 } as any,

  group: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 } as ViewStyle,

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  } as ViewStyle,
  rowIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
  rowBody: { flex: 1 } as ViewStyle,
  rowLabel: { fontSize: 14.5 } as any,
  rowSub: { fontSize: 11.5, marginTop: 1 } as any,

  pwOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' } as ViewStyle,
  pwSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding, paddingTop: 20, paddingBottom: 34,
  } as ViewStyle,
  pwTitle: { fontSize: 17 } as any,
  pwSub: { fontSize: 12.5, marginTop: 3, marginBottom: 14 } as any,
  pwField: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14, marginBottom: 10 } as any,
  pwBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 } as ViewStyle,
  pwBtnTxt: { fontSize: 15 } as any,
});
