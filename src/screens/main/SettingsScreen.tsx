import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Switch, ActivityIndicator, Share, Linking, AppState, type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { FontFamily, Layout } from '../../theme';
import { useApp } from '../../store/appStore';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import {
  getAppCacheSize,
  clearAppCache,
  formatBytes,
  openSystemAppSettings,
} from '../../services/storageService';

const ROLE_TOKEN = { student: 'roleStudent', staff: 'roleStaff', admin: 'roleAdmin' } as const;

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

interface SettingCardProps {
  icon: string;
  iconColor?: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  C: any;
}

function SettingCard({ icon, iconColor, label, sub, right, onPress, C }: SettingCardProps) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.cardIconWrap, { backgroundColor: (iconColor ?? C.brand) + '18' }]}>
        <Icon name={icon as any} size={18} color={iconColor ?? C.brand} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardLabel, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.cardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={18} color={C.textMuted} /> : null)}
    </Wrapper>
  );
}

export function SettingsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { profile, signOut, deleteAccount } = useAuth();
  const { isDark: appDark, toggleTheme, lang, toggleLang } = useApp();

  const role = profile?.role ?? 'student';
  const roleHex = C[ROLE_TOKEN[role as keyof typeof ROLE_TOKEN] ?? 'roleStudent'];
  const roleBg = hexAlpha(roleHex, isDark ? 0.2 : 0.12);
  const ROLE_LABEL: Record<string, string> = {
    student: t.mainx.roleStudent, staff: t.mainx.roleStaff, admin: t.mainx.roleAdmin,
  };

  const [optSync, setOptSync] = useState(true);
  const [dataCacheOpen, setDataCacheOpen] = useState(false);
  const [cacheBytes, setCacheBytes] = useState(0);
  const [clearingCache, setClearingCache] = useState(false);
  const [notifDisabled, setNotifDisabled] = useState(false);

  const [aboutOpen, setAboutOpen] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const checkNotifPerm = useCallback(async () => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      const isAllowed = perm.granted || perm.status === 'granted';
      setNotifDisabled(!isAllowed);
    } catch {
      setNotifDisabled(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkNotifPerm();
    }, [checkNotifPerm])
  );

  useEffect(() => {
    checkNotifPerm();
    const handleAppState = (s: string) => {
      if (s === 'active') {
        checkNotifPerm();
        const t1 = setTimeout(checkNotifPerm, 300);
        const t2 = setTimeout(checkNotifPerm, 800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [checkNotifPerm]);

  useEffect(() => {
    AsyncStorage.getItem('app.optSync')
      .then(v => {
        if (v !== null) setOptSync(v === 'true');
      })
      .catch(() => {});
  }, []);

  const handleToggleOptSync = (v: boolean) => {
    setOptSync(v);
    AsyncStorage.setItem('app.optSync', String(v)).catch(() => {});
  };

  const refreshCacheSize = useCallback(async () => {
    const bytes = await getAppCacheSize();
    setCacheBytes(bytes);
  }, []);

  useEffect(() => {
    if (dataCacheOpen) {
      refreshCacheSize();
    }
  }, [dataCacheOpen, refreshCacheSize]);

  const handleClearCache = async () => {
    if (clearingCache) return;
    setClearingCache(true);
    await clearAppCache();
    await refreshCacheSize();
    setClearingCache(false);
    toast({ type: 'success', title: t.mainx.done, message: t.mainx.cacheCleared });
  };

  const handleCheckUpdates = () => {
    toast({
      type: 'info',
      title: t.mainx.upToDateTitle,
      message: t.mainx.upToDateMsg,
    });
  };

  const handleDeleteAccount = useCallback(async () => {
    if (delBusy) return;
    setDelBusy(true);
    try {
      await deleteAccount();
      setDelOpen(false);
      toast({ type: 'success', title: t.mainx.done, message: t.mainx.accountDeleted });
    } catch (err: any) {
      setDelBusy(false);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not delete account' });
    }
  }, [delBusy, deleteAccount, t, toast]);

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
    toast({ type: 'success', title: t.mainx.done, message: t.mainx.passwordUpdated });
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
        {/* Profile Card */}
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

        {/* Role Workspace Quick Access (Staff / Admin) */}
        {role === 'admin' && (
          <SettingCard
            icon="sliders"
            iconColor={roleHex}
            label="Admin Dashboard"
            sub="Manage users, staff, reports, and campus modules"
            C={C}
            onPress={() => navigation.navigate('AdminDashboard')}
          />
        )}

        {role === 'staff' && (
          <SettingCard
            icon="wrench"
            iconColor={roleHex}
            label="Staff Workspace"
            sub="View assigned maintenance tasks and reports"
            C={C}
            onPress={() => navigation.navigate('StaffDashboard')}
          />
        )}

        {/* Section: APP SETTINGS */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.mainx.appSettingsSection}
        </Text>

        <SettingCard
          icon="bell"
          iconColor={notifDisabled ? '#f59e0b' : C.brand}
          label="Notifications"
          sub={notifDisabled ? 'Notifications disabled in phone settings' : t.mainx.notificationsSub}
          right={
            notifDisabled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="alert-triangle" size={16} color="#f59e0b" />
                <Feather name="chevron-right" size={18} color={C.textMuted} />
              </View>
            ) : undefined
          }
          C={C}
          onPress={() => navigation.navigate('NotifSettings')}
        />

        <SettingCard
          icon="refreshCw"
          iconColor="#8b5cf6"
          label={t.mainx.optSync}
          sub={t.mainx.optSyncSub}
          C={C}
          right={
            <Switch
              value={optSync}
              onValueChange={handleToggleOptSync}
              trackColor={{ false: C.surface3, true: C.brand + '66' }}
              thumbColor={optSync ? C.brand : C.white}
            />
          }
        />

        <SettingCard
          icon="database"
          iconColor="#0284c7"
          label={t.mainx.dataAndCache}
          sub={t.mainx.dataAndCacheSub}
          C={C}
          onPress={() => setDataCacheOpen(true)}
        />

        <SettingCard
          icon="moon"
          iconColor="#6366f1"
          label="Dark Mode"
          sub={t.mainx.darkModeSub(appDark)}
          C={C}
          right={
            <Switch
              value={appDark}
              onValueChange={toggleTheme}
              trackColor={{ false: C.surface3, true: C.brand + '66' }}
              thumbColor={appDark ? C.brand : C.white}
            />
          }
        />

        <SettingCard
          icon="globe"
          iconColor="#10b981"
          label="Language"
          sub={t.mainx.languageSub(lang === 'bn')}
          C={C}
          right={
            <Switch
              value={lang === 'bn'}
              onValueChange={toggleLang}
              trackColor={{ false: C.surface3, true: C.brand + '66' }}
              thumbColor={lang === 'bn' ? C.brand : C.white}
            />
          }
        />

        <SettingCard
          icon="downloadCloud"
          iconColor="#f59e0b"
          label={t.mainx.checkForUpdates}
          sub={t.mainx.checkForUpdatesSub}
          C={C}
          onPress={handleCheckUpdates}
        />

        {/* Section: SUPPORT & LEGAL */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.mainx.supportSection}
        </Text>

        <SettingCard
          icon="share"
          iconColor="#3b82f6"
          label="Share App"
          sub="Share CampusOne with your friends"
          C={C}
          onPress={() => Share.share({ message: 'Check out CampusOne - BUBT campus companion app!' })}
        />

        <SettingCard
          icon="shield"
          iconColor={C.brand}
          label={t.mainx.privacyPolicy}
          sub={t.mainx.privacyPolicySub}
          C={C}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />

        <SettingCard
          icon="fileText"
          iconColor={C.brand}
          label={t.mainx.termsOfService}
          sub={t.mainx.termsOfServiceSub}
          C={C}
          onPress={() => navigation.navigate('TermsOfService')}
        />

        <SettingCard
          icon="info"
          iconColor="#8b5cf6"
          label={t.mainx.aboutApp}
          sub={t.mainx.aboutAppSub}
          C={C}
          onPress={() => setAboutOpen(true)}
        />

        <SettingCard
          icon="mail"
          iconColor={C.brand}
          label={t.mainx.contactSupport}
          sub={t.mainx.contactSupportSub}
          C={C}
          onPress={() => Linking.openURL('mailto:campusone.bubt@gmail.com?subject=CampusOne%20Support')}
        />

        {/* Section: ACCOUNT */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          ACCOUNT
        </Text>

        <SettingCard
          icon="key"
          iconColor={C.text2}
          label={t.mainx.changePassword}
          sub="Update your login password"
          C={C}
          onPress={() => setPwOpen(true)}
        />

        <SettingCard
          icon="logout"
          iconColor={C.text2}
          label={t.mainx.signOut}
          sub="Log out of this device"
          C={C}
          onPress={signOut}
        />

        <SettingCard
          icon="trash"
          iconColor={C.danger}
          label={t.mainx.deleteAccount}
          sub={t.mainx.deleteAccountSub}
          C={C}
          onPress={() => setDelOpen(true)}
        />

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Data & Cache Sheet Modal */}
      <Modal visible={dataCacheOpen} transparent animationType="slide" onRequestClose={() => setDataCacheOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setDataCacheOpen(false)} />
        <View style={[styles.sheetContent, { backgroundColor: C.surface }]}>
          <View style={styles.sheetHeaderRow}>
            <View style={[styles.sheetIconWrap, { backgroundColor: '#0284c718' }]}>
              <Icon name="database" size={22} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.mainx.dataAndCache}
              </Text>
              <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.mainx.dataAndCacheSub}
              </Text>
            </View>
          </View>

          <View style={[styles.cacheInfoBox, { backgroundColor: C.bg, borderColor: C.border }]}>
            <View style={styles.cacheInfoRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cacheInfoLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.mainx.cacheSize}
                </Text>
                <Text style={[styles.cacheInfoDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.mainx.clearCacheSub}
                </Text>
              </View>
              <View style={[styles.sizeBadge, { backgroundColor: C.surface2 }]}>
                <Text style={[styles.sizeBadgeTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {formatBytes(cacheBytes)}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: C.brand, opacity: clearingCache ? 0.7 : 1 }]}
            onPress={handleClearCache}
            disabled={clearingCache}
            activeOpacity={0.8}
          >
            {clearingCache ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <View style={styles.btnRow}>
                <Feather name="trash-2" size={17} color={C.white} />
                <Text style={[styles.btnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.mainx.clearCache}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: C.border }]}
            onPress={openSystemAppSettings}
            activeOpacity={0.7}
          >
            <View style={styles.btnRow}>
              <Feather name="external-link" size={16} color={C.text} />
              <Text style={[styles.outlineBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.mainx.systemStorage}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: C.border }]}
            onPress={() => setDataCacheOpen(false)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              {t.mainx.cancel}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* About CampusOne Modal */}
      <Modal visible={aboutOpen} transparent animationType="slide" onRequestClose={() => setAboutOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setAboutOpen(false)} />
        <View style={[styles.sheetContent, { backgroundColor: C.surface }]}>
          <View style={[styles.aboutIconWrap, { backgroundColor: C.brand + '18' }]}>
            <Icon name="award" size={28} color={C.brand} />
          </View>
          <Text style={[styles.aboutTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            CampusOne
          </Text>
          <Text style={[styles.aboutVersion, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
            Version 1.0.0 (Release Build 1)
          </Text>
          <Text style={[styles.aboutDesc, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.mainx.aboutAppDesc}
          </Text>

          <View style={[styles.aboutMetaBox, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Text style={[styles.aboutMetaLine, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              Institution: Bangladesh University of Business & Technology
            </Text>
            <Text style={[styles.aboutMetaLine, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              Department: Computer Science & Engineering (CSE)
            </Text>
            <Text style={[styles.aboutMetaLine, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              Capstone Thesis Project
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: C.brand, marginTop: 16 }]}
            onPress={() => setAboutOpen(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {t.common.done ?? 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Change password sheet */}
      <Modal visible={pwOpen} transparent animationType="slide" onRequestClose={() => setPwOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setPwOpen(false)} />
        <View style={[styles.sheetContent, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.mainx.changePassword}
          </Text>
          <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, marginBottom: 14 }]}>
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
            style={[styles.primaryBtn, { backgroundColor: C.brand, opacity: pwBusy ? 0.6 : 1, marginTop: 8 }]}
            onPress={changePassword}
            disabled={pwBusy}
            activeOpacity={0.8}
          >
            {pwBusy
              ? <ActivityIndicator color={C.white} size="small" />
              : (
                <Text style={[styles.btnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.mainx.updatePassword}
                </Text>
              )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: C.border }]}
            onPress={() => setPwOpen(false)}
            disabled={pwBusy}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              {t.mainx.cancel}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete account confirmation sheet */}
      <Modal visible={delOpen} transparent animationType="slide" onRequestClose={() => !delBusy && setDelOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => !delBusy && setDelOpen(false)} />
        <View style={[styles.sheetContent, { backgroundColor: C.surface }]}>
          <View style={[styles.delIconWrap, { backgroundColor: C.danger + '18' }]}>
            <Feather name="trash-2" size={24} color={C.danger} />
          </View>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginTop: 12, textAlign: 'center' }]}>
            {t.mainx.deleteAccountTitle}
          </Text>
          <Text style={[styles.delWarningText, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            {t.mainx.deleteAccountWarning}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: C.danger, opacity: delBusy ? 0.6 : 1 }]}
            onPress={handleDeleteAccount}
            disabled={delBusy}
            activeOpacity={0.8}
          >
            {delBusy
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <Text style={[styles.btnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.mainx.deleteAccountConfirmBtn}
                </Text>
              )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: C.border }]}
            onPress={() => setDelOpen(false)}
            disabled={delBusy}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
              {t.mainx.cancel}
            </Text>
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

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 22, marginBottom: 10, marginLeft: 4 } as any,

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardLabel: { fontSize: 14.5 } as any,
  cardSub: { fontSize: 11.5, marginTop: 2 } as any,

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' } as ViewStyle,
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 34,
  } as ViewStyle,
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  } as ViewStyle,
  sheetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  sheetTitle: { fontSize: 17 } as any,
  sheetSub: { fontSize: 12.5, marginTop: 3 } as any,

  cacheInfoBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  } as ViewStyle,
  cacheInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  cacheInfoLabel: { fontSize: 14 } as any,
  cacheInfoDesc: { fontSize: 12, marginTop: 2 } as any,
  sizeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  } as ViewStyle,
  sizeBadgeTxt: { fontSize: 13 } as any,

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  } as ViewStyle,
  btnTxt: { fontSize: 14.5 } as any,

  outlineBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  } as ViewStyle,
  outlineBtnTxt: { fontSize: 14 } as any,

  cancelBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cancelBtnTxt: { fontSize: 14 } as any,

  aboutIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,
  aboutTitle: { fontSize: 20, textAlign: 'center' } as any,
  aboutVersion: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 12 } as any,
  aboutDesc: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 16 } as any,
  aboutMetaBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  } as ViewStyle,
  aboutMetaLine: { fontSize: 12 } as any,

  pwField: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 14,
    marginBottom: 10,
  } as any,

  delIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  } as ViewStyle,
  delWarningText: {
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  } as any,
});
