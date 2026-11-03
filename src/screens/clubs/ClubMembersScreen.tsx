// Club member management - president/VP only. Add students by search, change
// member roles (vp / editor / member), remove members. Presidency itself is
// transferred from the Manage screen.
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Alert, KeyboardAvoidingView, Platform, type ViewStyle, type TextStyle,
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
import { fetchPeople, loadPeople } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

interface Member {
  id: string;
  user_id: string;
  role: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

interface JoinReq {
  id: string;
  user_id: string;
  message: string | null;
  created_at: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

const ROLE_RANK: Record<string, number> = { president: 0, vp: 1, editor: 2, member: 3 };
const ASSIGNABLE = ['vp', 'editor', 'member'];

export function ClubMembersScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const clubId: string = route.params?.clubId;
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinReq[]>([]);
  const membersRef = useRef<Member[]>([]);
  membersRef.current = members;
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
      (m.profiles?.full_name?.toLowerCase().includes(q)) ||
      (m.role.toLowerCase().includes(q))
    );
  }, [members, searchQuery]);
  const toast = useToast();

  const load = useCallback(async () => {
    const [memRes, reqRes] = await Promise.all([
      supabase.from('club_members').select('*').eq('club_id', clubId),
      supabase.from('club_join_requests')
        .select('id, user_id, message, created_at')
        .eq('club_id', clubId).eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ]);

    const rows = [...((memRes.data as any[]) ?? []), ...((reqRes.data as any[]) ?? [])];
    const people = await fetchPeople(rows.map(r => r.user_id));
    const hydrate = (r: any) => ({
      ...r,
      profiles: people[r.user_id]
        ? { full_name: people[r.user_id].full_name, avatar_url: people[r.user_id].avatar_url }
        : null,
    });
    if (memRes.data) {
      setMembers((memRes.data as any[]).map(hydrate)
        .sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9)) as Member[]);
    }
    setRequests(((reqRes.data as any[]) ?? []).map(hydrate) as JoinReq[]);
  }, [clubId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));



  async function setRole(m: Member, role: string) {
    const { error } = await supabase.from('club_members').update({ role }).eq('id', m.id);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setRoleTarget(null);
    toast({ type: 'success', title: 'Role Updated', message: `Role changed to ${role}.` });
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

  async function decide(req: JoinReq, approve: boolean) {
    if (approve) {
      const { error: memErr } = await supabase.from('club_members')
        .insert({ club_id: clubId, user_id: req.user_id, role: 'member', added_by: user?.id });
      if (memErr && memErr.code !== '23505') {
        toast({ type: 'error', title: t.common.error, message: memErr.message }); return;
      }
    }
    const { data: rows, error } = await supabase.from('club_join_requests')
      .update({ status: approve ? 'approved' : 'denied', decided_by: user?.id, decided_at: new Date().toISOString() })
      .eq('id', req.id)
      .select('id');
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    if (!rows || rows.length === 0) { toast({ type: 'error', title: t.common.error }); return; }
    setRequests(prev => prev.filter(r => r.id !== req.id));
    toast({ type: approve ? 'success' : 'info', title: approve ? 'Request Approved' : 'Request Declined' });
    load();
  }

  const myRole = members.find(m => m.user_id === user?.id)?.role ?? null;
  const canManage = myRole === 'president' || myRole === 'vp';
  const canSetRole = myRole === 'president';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.clubs.members}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Universal 58dp Search Bar */}
        <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 14 }]}>
          <Icon name="search" size={20} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder="Search members by name or role..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} activeOpacity={0.7}>
              <Feather name="x-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {requests.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs.joinRequests} · {requests.length}
            </Text>
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              {requests.map((r, i) => (
                <View key={r.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                  <View style={styles.row}>
                    <Avatar uri={r.profiles?.avatar_url} name={r.profiles?.full_name} size="sm" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {r.profiles?.full_name ?? 'Student'}
                      </Text>
                      {r.message ? (
                        <Text style={[styles.reqMsg, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={2}>
                          {r.message}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity style={[styles.reqBtn, { backgroundColor: C.brand }]} onPress={() => decide(r, true)} activeOpacity={0.8}>
                      <Feather name="check" size={15} color={C.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.reqBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]} onPress={() => decide(r, false)} activeOpacity={0.8}>
                      <Feather name="x" size={15} color={C.text2} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ marginBottom: 8, paddingHorizontal: 2 }}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            MEMBERS · {filteredMembers.length}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {filteredMembers.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 13 }}>
                {searchQuery ? `No members match "${searchQuery}"` : 'No members yet'}
              </Text>
            </View>
          ) : (
            filteredMembers.map((m, i) => {
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
            })
          )}
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>



      {/* Role Picker Sheet (Universal 58dp Option Bars) */}
      <Modal visible={!!roleTarget} transparent animationType="slide" onRequestClose={() => setRoleTarget(null)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setRoleTarget(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {roleTarget?.profiles?.full_name ?? 'Set Member Role'}
            </Text>
            <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Assign club executive permissions
            </Text>

            <View style={{ gap: 8, marginTop: 12 }}>
              {ASSIGNABLE.map(r => {
                const isSelected = roleTarget?.role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        borderColor: isSelected ? C.brand : C.border,
                        backgroundColor: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff') : C.bg,
                      },
                    ]}
                    onPress={() => roleTarget && setRole(roleTarget, r)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.name,
                        {
                          color: C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          textTransform: 'capitalize',
                        },
                      ]}
                    >
                      {t.clubs.roleLabels[r] ?? r}
                    </Text>
                    {isSelected && <Feather name="check" size={18} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  } as ViewStyle,
  addBtnTxt: { fontSize: 12 } as TextStyle,

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, paddingHorizontal: 14 } as ViewStyle,
  sectionLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 } as TextStyle,
  reqMsg: { fontSize: 12, marginTop: 2, lineHeight: 16 } as TextStyle,
  reqBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  name: { fontSize: 14 } as TextStyle,
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 } as ViewStyle,
  roleTxt: { fontSize: 11 } as TextStyle,

  // Universal 58dp Bar Standard
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,
  barTitle: {
    fontSize: 14,
    flexShrink: 1,
  } as TextStyle,
  dropdownBar: {
    justifyContent: 'space-between',
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
    marginLeft: 8,
  } as TextStyle,

  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 36,
  } as ViewStyle,
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#888',
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: { fontSize: 18 } as TextStyle,
  sheetSub: { fontSize: 13, marginTop: 2 } as TextStyle,

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  } as ViewStyle,
  addPillTxt: { fontSize: 12 } as TextStyle,
  emptyTxt: { fontSize: 13, textAlign: 'center', paddingVertical: 24 } as TextStyle,
});
