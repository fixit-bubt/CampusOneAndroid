// Staff & Admins — admin-only management screen with two tabs.
// Staff tab: staff count + list + Add Staff (role locked to staff, trade picker).
// Admin tab: admin count + list + Add Admin (role locked to admin).
// Students are managed separately in ManageUsers.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet,
  RefreshControl, Alert, Modal, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { createUserAsAdmin } from '../../services/adminService';
import type { Profile } from '../../types/database';
import { useT } from '../../i18n';

type Tab = 'staff' | 'admin';

// Staff trades — values MUST match Report.category exactly so assignment can match by trade
const TRADES = ['Electrical', 'Plumbing', 'Cleanliness', 'IT / Network', 'Furniture', 'Safety / Security', 'Other'] as const;

export function ManageStaffScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile, user } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>('staff');
  const [staff, setStaff] = useState<Profile[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Add-account sheet (role comes from the active tab)
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trade, setTrade] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['staff', 'admin'])
      .order('full_name');
    if (data) {
      setStaff((data as Profile[]).filter(u => u.role === 'staff'));
      setAdmins((data as Profile[]).filter(u => u.role === 'admin'));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function resetForm() {
    setName(''); setEmail(''); setPassword(''); setTrade(null);
  }

  async function submitAdd() {
    if (creating) return;
    setCreating(true);
    const res = await createUserAsAdmin({
      name,
      email,
      password,
      role: tab,
      expertise: tab === 'staff' ? trade : null,
    });
    setCreating(false);
    if (!res.ok) { Alert.alert(t.manage.couldNotCreateAccount, res.error); return; }
    setAddOpen(false);
    resetForm();
    await load();
  }

  function demote(u: Profile) {
    if (u.id === user?.id) { Alert.alert(t.manage.notAllowed, t.manage.cannotDemoteSelf); return; }
    Alert.alert(
      'Remove ' + (tab === 'staff' ? 'staff' : 'admin'),
      `Demote ${u.full_name} back to student?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('profiles').update({ role: 'student', expertise: null }).eq('id', u.id);
            if (error) { Alert.alert('Error', error.message); return; }
            load();
          },
        },
      ],
    );
  }

  const formOk = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Staff & Admins" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  const list = tab === 'staff' ? staff : admins;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Staff & Admins" onBack={() => navigation.goBack()} />

      {/* Tabs with counts */}
      <View style={[styles.tabs, { paddingHorizontal: Layout.screenPadding }]}>
        {([['staff', t.manage.staff, staff.length], ['admin', t.manage.admins, admins.length]] as const).map(([id, label, count]) => {
          const on = tab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.tabBtn, on ? { backgroundColor: C.brand, borderColor: C.brand } : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setTab(id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>{label}</Text>
              <View style={[styles.countPill, { backgroundColor: on ? 'rgba(255,255,255,0.22)' : C.surface2 }]}>
                <Text style={[styles.countTxt, { color: on ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Add button */}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.brand }]}
          onPress={() => { resetForm(); setAddOpen(true); }}
          activeOpacity={0.85}
        >
          <Feather name="user-plus" size={16} color={C.white} />
          <Text style={[styles.addBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
            {tab === 'staff' ? 'Add Staff' : 'Add Admin'}
          </Text>
        </TouchableOpacity>

        {/* List */}
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {tab === 'staff' ? t.manage.noStaffYet : t.manage.noAdminsYet}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            {list.map((u, i) => {
              const roleHex = tab === 'staff' ? C.roleStaff : C.roleAdmin;
              return (
                <View key={u.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                  <View style={styles.row}>
                    <Avatar uri={u.avatar_url} name={u.full_name} size="sm" />
                    <View style={styles.body}>
                      <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {u.full_name}
                      </Text>
                      <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {u.email}
                      </Text>
                      {tab === 'staff' && (
                        <View style={[styles.tradePill, { backgroundColor: C.surface2 }]}>
                          <View style={[styles.dot, { backgroundColor: u.expertise ? C.success : C.textMuted }]} />
                          <Text style={[styles.tradeTxt, { color: u.expertise ? C.text2 : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                            {u.expertise ?? t.manage.noTrade}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.rolePill, { backgroundColor: `${roleHex}1e` }]}>
                      <View style={[styles.dot, { backgroundColor: roleHex }]} />
                      <Text style={[styles.roleTxt, { color: roleHex, fontFamily: FontFamily.jakartaBold }]}>
                        {tab === 'staff' ? t.manage.staff : t.manage.admin}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => demote(u)} hitSlop={8} activeOpacity={0.7}>
                      <Feather name="user-minus" size={17} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Add sheet — role locked to the active tab */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAddOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {tab === 'staff' ? 'Add Staff' : 'Add Admin'}
          </Text>
          <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {tab === 'staff'
              ? 'Creates a staff account — they sign in and land on the Staff Dashboard.'
              : 'Creates an admin account with full management access.'}
          </Text>

          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.fullNameLabel}</Text>
          <TextInput
            style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={name} onChangeText={setName} placeholder={t.manage.fullNamePlaceholder} placeholderTextColor={C.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>EMAIL</Text>
          <TextInput
            style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={email} onChangeText={setEmail} placeholder="name@university.edu" placeholderTextColor={C.textMuted}
            autoCapitalize="none" keyboardType="email-address"
          />

          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.passwordMin6Label}</Text>
          <TextInput
            style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={password} onChangeText={setPassword} placeholder="••••••" placeholderTextColor={C.textMuted}
            secureTextEntry autoCapitalize="none"
          />

          {tab === 'staff' && (
            <>
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.manage.tradeOptionalLabel}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {TRADES.map(t => {
                  const sel = trade === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, { backgroundColor: sel ? C.brand : C.bg, borderColor: sel ? C.brand : C.border }]}
                      onPress={() => setTrade(sel ? null : t)}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 12, color: sel ? C.white : C.text, fontFamily: FontFamily.jakartaBold }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: formOk ? C.brand : C.surface2, opacity: formOk ? 1 : 0.55 }]}
            disabled={!formOk || creating}
            onPress={submitAdd}
            activeOpacity={0.8}
          >
            {creating
              ? <ActivityIndicator color={C.white} size="small" />
              : <Feather name="user-plus" size={16} color={formOk ? C.white : C.textMuted} />}
            <Text style={[styles.createBtnTxt, { color: formOk ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {tab === 'staff' ? t.manage.createStaffAccount : t.manage.createAdminAccount}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,

  tabs: { flexDirection: 'row', gap: 8, paddingVertical: 10 } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  tabTxt: { fontSize: 13.5 } as any,
  countPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 } as ViewStyle,
  countTxt: { fontSize: 11.5 } as any,

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 13,
    marginBottom: 12,
  } as ViewStyle,
  addBtnTxt: { fontSize: 14 } as any,

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as ViewStyle,
  body: { flex: 1, minWidth: 0 } as ViewStyle,
  name: { fontSize: 14 } as any,
  meta: { fontSize: 12, marginTop: 1 } as any,

  tradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 5,
  } as ViewStyle,
  tradeTxt: { fontSize: 11 } as any,

  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  } as ViewStyle,
  roleTxt: { fontSize: 11.5 } as any,
  dot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,

  empty: { alignItems: 'center', paddingTop: 50, gap: 8 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as any,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 34,
  } as ViewStyle,
  sheetTitle: { fontSize: 17 } as any,
  sheetSub: { fontSize: 12.5, marginTop: 3 } as any,
  fieldLabel: { fontSize: 11, letterSpacing: 0.7, marginTop: 13, marginBottom: 6, marginLeft: 2 } as any,
  field: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 } as any,
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 20,
  } as ViewStyle,
  createBtnTxt: { fontSize: 15 } as any,
});
