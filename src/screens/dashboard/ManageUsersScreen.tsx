// Matches design screens-f.jsx — ManageUsers (Admin)
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';

const ROLE_COLOR = { student: '#2b5be3', staff: '#b9760a', admin: '#12915e' };
const ROLE_NEXT: Record<string, Profile['role']> = { student: 'staff', staff: 'admin', admin: 'student' };

export function ManageUsersScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const [users, setUsers] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(false);

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
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: next } : x));
    await supabase.from('profiles').update({ role: next }).eq('id', u.id);
    setToast(true);
    setTimeout(() => setToast(false), 1500);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Manage Users" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <Text style={[styles.hint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          Tap a role pill to cycle: Student → Staff → Admin
        </Text>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {users.map((u, i) => {
            const roleHex = ROLE_COLOR[u.role] ?? '#5b6b86';
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

      {/* Toast */}
      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={[styles.toastTxt, { fontFamily: FontFamily.jakartaBold }]}>✓ Role updated</Text>
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

  toast: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  } as ViewStyle,

  toastTxt: {
    color: '#fff',
    fontSize: 13.5,
  } as any,
});
