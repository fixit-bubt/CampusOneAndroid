// Matches design screens-f.jsx — ManageUsers (Admin)
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

const ROLE_TOKEN = { student: 'roleStudent', staff: 'roleStaff', admin: 'roleAdmin' } as const;
const ROLE_NEXT: Record<string, Profile['role']> = { student: 'staff', staff: 'admin', admin: 'student' };

// Staff trades — values MUST match Report.category exactly so assignment can match by trade
const TRADES = ['Electrical', 'Plumbing', 'Cleanliness', 'IT / Network', 'Furniture', 'Safety / Security', 'Other'] as const;

export function ManageUsersScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(false);
  const [expertiseTarget, setExpertiseTarget] = useState<Profile | null>(null);

  // Create-account sheet
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cRole, setCRole] = useState<Profile['role']>('staff');
  const [cTrade, setCTrade] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    if (data) setUsers(data as Profile[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function cycleRole(u: Profile) {
    const next = ROLE_NEXT[u.role] ?? 'student';
    Alert.alert(
      'Change Role',
      `Change ${u.full_name} from ${u.role} → ${next}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: next } : x));
            await supabase.from('profiles').update({ role: next }).eq('id', u.id);
            setToast(true);
            setTimeout(() => setToast(false), 1500);
          },
        },
      ]
    );
  }

  async function setExpertise(u: Profile, value: string | null) {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, expertise: value } : x));
    setExpertiseTarget(null);
    const { error } = await supabase.from('profiles').update({ expertise: value }).eq('id', u.id);
    if (error) { Alert.alert('Error', error.message); await load(); return; }
    setToast(true);
    setTimeout(() => setToast(false), 1500);
  }

  function resetCreateForm() {
    setCName(''); setCEmail(''); setCPassword(''); setCRole('staff'); setCTrade(null);
  }

  async function submitCreate() {
    if (creating) return;
    setCreating(true);
    const res = await createUserAsAdmin({
      name: cName,
      email: cEmail,
      password: cPassword,
      role: cRole,
      expertise: cRole === 'staff' ? cTrade : null,
    });
    setCreating(false);
    if (!res.ok) { Alert.alert('Could not create account', res.error); return; }
    setCreateOpen(false);
    resetCreateForm();
    setToast(true);
    setTimeout(() => setToast(false), 1500);
    await load();
  }

  const createOk = cName.trim().length > 1 && /\S+@\S+\.\S+/.test(cEmail) && cPassword.length >= 6;

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Manage Users" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18, marginBottom: 8 }}>Access Denied</Text>
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 14, textAlign: 'center' }}>
            Only admins can manage users.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Manage Users"
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: C.brand }]}
            onPress={() => setCreateOpen(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={[styles.newBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>New</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <Text style={[styles.hint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          Tap a role pill to cycle: Student → Staff → Admin. Tap a staff member's trade chip to set their specialty.
        </Text>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {users.map((u, i) => {
            const roleHex = C[ROLE_TOKEN[u.role as keyof typeof ROLE_TOKEN]] ?? C.textMuted;
            return (
              <View key={u.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={styles.row}>
                  <Avatar uri={u.avatar_url} name={u.full_name} size="sm" />
                  <View style={styles.body}>
                    <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {u.full_name}
                    </Text>
                    <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {u.department ?? '—'}{u.intake ? ` · Intake ${u.intake}` : ''}
                    </Text>
                    {u.role === 'staff' && (
                      <TouchableOpacity
                        style={[styles.tradeChip, { borderColor: C.border, backgroundColor: C.bg }]}
                        onPress={() => setExpertiseTarget(u)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.pilldot, { backgroundColor: u.expertise ? C.success : C.textMuted }]} />
                        <Text style={[styles.tradeChipTxt, { color: u.expertise ? C.text2 : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          {u.expertise ?? 'Set trade'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.rolePill, { backgroundColor: roleHex + (isDark ? '36' : '1e') }]}
                    onPress={() => cycleRole(u)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.pilldot, { backgroundColor: roleHex }]} />
                    <Text style={[styles.pillTxt, { color: roleHex, fontFamily: FontFamily.jakartaBold }]}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Expertise picker */}
      <Modal visible={!!expertiseTarget} transparent animationType="slide" onRequestClose={() => setExpertiseTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setExpertiseTarget(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            Set trade · {expertiseTarget?.full_name}
          </Text>
          <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            Reports of the matching category will surface this staff member first when assigning.
          </Text>
          {TRADES.map((t, i) => {
            const on = expertiseTarget?.expertise === t;
            return (
              <View key={t}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <TouchableOpacity style={styles.optRow} onPress={() => expertiseTarget && setExpertise(expertiseTarget, t)} activeOpacity={0.75}>
                  <View style={[styles.pilldot, { backgroundColor: on ? C.success : C.border }]} />
                  <Text style={[styles.optTxt, { color: on ? C.success : C.text, fontFamily: FontFamily.jakartaBold }]}>{t}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <TouchableOpacity style={styles.optRow} onPress={() => expertiseTarget && setExpertise(expertiseTarget, null)} activeOpacity={0.75}>
            <View style={[styles.pilldot, { backgroundColor: C.textMuted }]} />
            <Text style={[styles.optTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>None (no trade)</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Create account sheet */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { setCreateOpen(false); resetCreateForm(); }} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            Create account
          </Text>
          <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            The account is created with the role you pick — staff and admins sign in with these credentials.
          </Text>

          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>FULL NAME</Text>
          <TextInput
            style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={cName} onChangeText={setCName} placeholder="e.g. Karim Rahman" placeholderTextColor={C.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>EMAIL</Text>
          <TextInput
            style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={cEmail} onChangeText={setCEmail} placeholder="name@university.edu" placeholderTextColor={C.textMuted}
            autoCapitalize="none" keyboardType="email-address"
          />

          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>PASSWORD (MIN 6)</Text>
          <TextInput
            style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={cPassword} onChangeText={setCPassword} placeholder="••••••" placeholderTextColor={C.textMuted}
            secureTextEntry autoCapitalize="none"
          />

          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>ROLE</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['student', 'staff', 'admin'] as const).map(r => {
              const sel = cRole === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, { backgroundColor: sel ? C.brand : C.bg, borderColor: sel ? C.brand : C.border }]}
                  onPress={() => setCRole(r)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 13, color: sel ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold }}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {cRole === 'staff' && (
            <>
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>TRADE (OPTIONAL)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {TRADES.map(t => {
                  const sel = cTrade === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.roleChip, { backgroundColor: sel ? C.brand : C.bg, borderColor: sel ? C.brand : C.border }]}
                      onPress={() => setCTrade(sel ? null : t)}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 12, color: sel ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: createOk ? C.brand : C.surface2, opacity: createOk ? 1 : 0.55 }]}
            disabled={!createOk || creating}
            onPress={submitCreate}
            activeOpacity={0.8}
          >
            {creating
              ? <ActivityIndicator color="#fff" size="small" />
              : <Feather name="user-plus" size={16} color={createOk ? '#fff' : C.textMuted} />}
            <Text style={[styles.createBtnTxt, { color: createOk ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: C.text }]} pointerEvents="none">
          <Text style={[styles.toastTxt, { color: C.bg, fontFamily: FontFamily.jakartaBold }]}>✓ Saved</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,

  hint: {
    fontSize: 12.5,
    marginBottom: 12,
    marginLeft: 2,
  } as any,

  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,

  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  } as ViewStyle,

  body: { flex: 1, minWidth: 0 } as ViewStyle,

  name: { fontSize: 14 } as any,
  meta: { fontSize: 12, marginTop: 1 } as any,

  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  } as ViewStyle,

  pilldot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,

  pillTxt: { fontSize: 12 } as any,

  tradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
  } as ViewStyle,
  tradeChipTxt: { fontSize: 11.5 } as any,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  } as ViewStyle,
  sheetTitle: { fontSize: 17, marginBottom: 4 } as any,
  sheetSub: { fontSize: 12.5, marginBottom: 12 } as any,
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 } as ViewStyle,
  optTxt: { fontSize: 14.5 } as any,

  toast: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  } as ViewStyle,

  toastTxt: {
    
    fontSize: 13.5,
  } as any,

  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  } as ViewStyle,
  newBtnTxt: { color: '#fff', fontSize: 12.5 } as any,

  fieldLabel: { fontSize: 11, letterSpacing: 0.7, marginTop: 13, marginBottom: 6, marginLeft: 2 } as any,
  field: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 } as any,
  roleChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
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
