// Club member management — president/VP only. Add students by search, change
// member roles (vp / editor / member), remove members. Presidency itself is
// transferred from the Manage screen.
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Alert, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

interface Member {
  id: string;
  user_id: string;
  role: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

const ROLE_RANK: Record<string, number> = { president: 0, vp: 1, editor: 2, member: 3 };
const ASSIGNABLE = ['vp', 'editor', 'member'];

export function ClubMembersScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const clubId: string = route.params?.clubId;
  const [members, setMembers] = useState<Member[]>([]);
  // Latest members for the search exclusion, without making the search effect
  // re-run (and refetch) every time the member list mutates.
  const membersRef = useRef<Member[]>([]);
  membersRef.current = members;
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; full_name: string; avatar_url: string | null }[]>([]);
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('club_members')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq('club_id', clubId);
    if (data) {
      setMembers((data as Member[]).sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9)));
    }
  }, [clubId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Student search for the add sheet — exclude existing members client-side.
  useEffect(() => {
    const q = query.trim();
    if (!addOpen || q.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${q}%`)
        .eq('role', 'student')
        .limit(12);
      if (data) {
        const memberIds = new Set(membersRef.current.map(m => m.user_id));
        setResults((data as any[]).filter(p => !memberIds.has(p.id)));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, addOpen]);

  async function addMember(userId: string) {
    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: clubId, user_id: userId, role: 'member', added_by: user?.id });
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setQuery('');
    await load();
  }

  async function setRole(m: Member, role: string) {
    const { error } = await supabase.from('club_members').update({ role }).eq('id', m.id);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setRoleTarget(null);
    await load();
  }

  function removeMember(m: Member) {
    Alert.alert(t.clubs.removeMemberTitle, m.profiles?.full_name ?? '', [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('club_members').delete().eq('id', m.id);
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
          load();
        },
      },
    ]);
  }

  const myRole = members.find(m => m.user_id === user?.id)?.role ?? null;
  const canManage = myRole === 'president' || myRole === 'vp' || profile?.role === 'admin';
  // RLS: VPs can add/remove members but only presidents/admins can change roles.
  const canSetRole = myRole === 'president' || profile?.role === 'admin';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.clubs.members}
        onBack={() => navigation.goBack()}
        rightSlot={canManage ? (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: C.brand }]}
            onPress={() => setAddOpen(true)}
            activeOpacity={0.8}
          >
            <Feather name="user-plus" size={13} color={C.white} />
            <Text style={[styles.addBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs.addMembers}
            </Text>
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {members.map((m, i) => {
            const isLead = m.role === 'president' || m.role === 'vp';
            const canTouch = canManage && m.role !== 'president' && m.user_id !== user?.id;
            const canRole = canSetRole && m.role !== 'president' && m.user_id !== user?.id;
            return (
              <View key={m.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={styles.row}>
                  <Avatar uri={m.profiles?.avatar_url} name={m.profiles?.full_name} size="sm" />
                  <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold, flex: 1 }]} numberOfLines={1}>
                    {m.profiles?.full_name ?? 'Member'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.rolePill, isLead ? { backgroundColor: C.infoBg } : { backgroundColor: C.surface2 }]}
                    onPress={canRole ? () => setRoleTarget(m) : undefined}
                    activeOpacity={canRole ? 0.7 : 1}
                  >
                    <Text style={[styles.roleTxt, { color: isLead ? C.info : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {t.clubs.roleLabels[m.role] ?? m.role}
                    </Text>
                    {canRole && <Feather name="chevron-down" size={12} color={isLead ? C.info : C.textMuted} />}
                  </TouchableOpacity>
                  {canTouch && (
                    <TouchableOpacity onPress={() => removeMember(m)} hitSlop={8} activeOpacity={0.7}>
                      <Feather name="user-minus" size={16} color={C.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Add member sheet */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAddOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.clubs.addMembers}
          </Text>
          <View style={[styles.searchBar, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Icon name="search" size={16} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
              placeholder={t.common.search + '...'}
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {results.map(r => (
              <TouchableOpacity key={r.id} style={styles.resultRow} onPress={() => addMember(r.id)} activeOpacity={0.7}>
                <Avatar uri={r.avatar_url} name={r.full_name} size="sm" />
                <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold, flex: 1 }]} numberOfLines={1}>
                  {r.full_name}
                </Text>
                <Feather name="plus" size={17} color={C.brand} />
              </TouchableOpacity>
            ))}
            {query.trim().length >= 2 && results.length === 0 && (
              <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.common.noResults}
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Role picker sheet */}
      <Modal visible={!!roleTarget} transparent animationType="slide" onRequestClose={() => setRoleTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setRoleTarget(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {roleTarget?.profiles?.full_name ?? ''}
          </Text>
          {ASSIGNABLE.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleOption, { borderColor: C.border, backgroundColor: roleTarget?.role === r ? C.surface2 : 'transparent' }]}
              onPress={() => roleTarget && setRole(roleTarget, r)}
              activeOpacity={0.75}
            >
              <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.clubs.roleLabels[r] ?? r}
              </Text>
              {roleTarget?.role === r && <Feather name="check" size={16} color={C.brand} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 } as ViewStyle,
  addBtnTxt: { fontSize: 12 } as TextStyle,

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, paddingHorizontal: 14 } as ViewStyle,
  name: { fontSize: 14 } as TextStyle,
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 } as ViewStyle,
  roleTxt: { fontSize: 11 } as TextStyle,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 34,
  } as ViewStyle,
  sheetTitle: { fontSize: 17, marginBottom: 12 } as TextStyle,
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 11 } as TextStyle,
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 } as ViewStyle,
  emptyTxt: { fontSize: 13, textAlign: 'center', paddingVertical: 18 } as TextStyle,
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
});
