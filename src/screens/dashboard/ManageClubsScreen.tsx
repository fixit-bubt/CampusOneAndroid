// Admin-only. Create clubs, deactivate / reactivate, and assign a president
// via the club_set_president RPC, which atomically demotes the previous one.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, RefreshControl, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

const CATEGORIES = ['Tech', 'Cultural', 'Sports', 'Professional', 'Social'];

const CL_CATS: Record<string, string> = {
  Tech: Accent.purple, Cultural: Accent.pink, Sports: Accent.teal,
  Professional: Accent.blue, Social: Accent.amber, other: Accent.slate,
};

interface ClubRow {
  id: string;
  name: string;
  tagline: string | null;
  category: string;
  is_active: boolean;
  president_name?: string | null;
  member_count?: number;
}

export function ManageClubsScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Create sheet
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState('Tech');
  const [creating, setCreating] = useState(false);

  // Assign-president sheet
  const [presTarget, setPresTarget] = useState<ClubRow | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; full_name: string; avatar_url: string | null }[]>([]);

  const load = useCallback(async () => {
    const [clubsRes, membersRes] = await Promise.all([
      supabase.from('clubs').select('*').order('name'),
      supabase.from('club_members').select('club_id, role, profiles:profiles!user_id(full_name)'),
    ]);
    if (clubsRes.data) {
      const members = (membersRes.data ?? []) as any[];
      setClubs((clubsRes.data as any[]).map(c => ({
        ...c,
        member_count: members.filter(m => m.club_id === c.id).length,
        president_name: members.find(m => m.club_id === c.id && m.role === 'president')?.profiles?.full_name ?? null,
      })));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const q = query.trim();
    if (!presTarget || q.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${q}%`)
        .eq('role', 'student')
        .limit(12);
      if (data) setResults(data as any[]);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, presTarget]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function createClub() {
    if (!name.trim() || creating) return;
    setCreating(true);
    const { error } = await supabase.from('clubs').insert({
      name: name.trim(),
      tagline: tagline.trim() || null,
      category,
      is_active: true,
      created_by: user?.id,
    });
    setCreating(false);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setCreateOpen(false);
    setName(''); setTagline(''); setCategory('Tech');
    await load();
  }

  async function toggleActive(c: ClubRow) {
    const { error } = await supabase.from('clubs').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setClubs(prev => prev.map(x => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
  }

  async function assignPresident(userId: string) {
    if (!presTarget) return;
    const { error } = await supabase.rpc('club_set_president', {
      p_club_id: presTarget.id,
      p_user_id: userId,
    });
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setPresTarget(null);
    setQuery('');
    await load();
  }

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.clubs.manageClubs} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>{t.manage.accessDenied}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.clubs.manageClubs}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: C.brand }]}
            onPress={() => setCreateOpen(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={13} color={C.white} />
            <Text style={[styles.newBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs.newClub}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {clubs.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.clubs.noClubs}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {clubs.map(c => {
              const fg = CL_CATS[c.category] ?? Accent.slate;
              return (
                <View key={c.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, opacity: c.is_active ? 1 : 0.65 }]}>
                  <TouchableOpacity
                    style={styles.cardTop}
                    onPress={() => navigation.navigate('ClubDetail', { clubId: c.id })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.thumb, { backgroundColor: `${fg}1a` }]}>
                      <Icon name="clubs" size={20} color={fg} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {c.member_count ?? 0} {t.clubs.members.toLowerCase()}
                        {c.president_name ? ` · ${t.clubs.roleLabels.president}: ${c.president_name}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.statePill, { backgroundColor: c.is_active ? C.successBg : C.surface2 }]}>
                      <Text style={[styles.stateTxt, { color: c.is_active ? C.success : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                        {c.is_active ? t.clubs.active : t.clubs.inactive}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.cardFoot, { borderTopColor: C.border }]}>
                    <TouchableOpacity
                      style={[styles.footBtn, { backgroundColor: C.surface2 }]}
                      onPress={() => setPresTarget(c)}
                      activeOpacity={0.75}
                    >
                      <Feather name="user-check" size={13} color={C.text2} />
                      <Text style={[styles.footBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {t.clubs.assignPresident}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.footBtn, { backgroundColor: c.is_active ? C.dangerBg : C.successBg }]}
                      onPress={() => toggleActive(c)}
                      activeOpacity={0.75}
                    >
                      <Feather name="power" size={13} color={c.is_active ? C.danger : C.success} />
                      <Text style={[styles.footBtnTxt, { color: c.is_active ? C.danger : C.success, fontFamily: FontFamily.jakartaBold }]}>
                        {c.is_active ? t.clubs.deactivate : t.clubs.reactivate}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Create club sheet */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setCreateOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.clubs.newClub}
          </Text>
          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.clubs.clubName}</Text>
          <TextInput
            style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={name} onChangeText={setName} placeholder={t.manage.clubNamePlaceholder} placeholderTextColor={C.textMuted}
          />
          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.clubs.tagline}</Text>
          <TextInput
            style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={tagline} onChangeText={setTagline} placeholder={t.manage.taglinePlaceholder} placeholderTextColor={C.textMuted}
          />
          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.clubs.category}</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map(c => {
              const on = category === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, on
                    ? { backgroundColor: C.brand, borderColor: C.brand }
                    : { backgroundColor: C.bg, borderColor: C.border }]}
                  onPress={() => setCategory(c)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catChipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: C.brand, opacity: name.trim() && !creating ? 1 : 0.55 }]}
            onPress={createClub}
            disabled={!name.trim() || creating}
            activeOpacity={0.8}
          >
            {creating
              ? <ActivityIndicator color={C.white} size="small" />
              : (
                <Text style={[styles.createBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.clubs.newClub}
                </Text>
              )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Assign president sheet */}
      <Modal visible={!!presTarget} transparent animationType="slide" onRequestClose={() => setPresTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPresTarget(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.clubs.assignPresident} - {presTarget?.name}
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
              <TouchableOpacity key={r.id} style={styles.resultRow} onPress={() => assignPresident(r.id)} activeOpacity={0.7}>
                <Avatar uri={r.avatar_url} name={r.full_name} size="sm" />
                <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold, flex: 1 }]} numberOfLines={1}>
                  {r.full_name}
                </Text>
                <Feather name="user-check" size={16} color={C.brand} />
              </TouchableOpacity>
            ))}
            {query.trim().length >= 2 && results.length === 0 && (
              <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, textAlign: 'center', paddingVertical: 18 }]}>
                {t.common.noResults}
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 50 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 } as ViewStyle,
  newBtnTxt: { fontSize: 12 } as TextStyle,

  card: { borderRadius: 16, borderWidth: 1, padding: 13 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 } as ViewStyle,
  thumb: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  name: { fontSize: 14 } as TextStyle,
  meta: { fontSize: 11.5, marginTop: 2 } as TextStyle,
  statePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  stateTxt: { fontSize: 10.5 } as TextStyle,

  cardFoot: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
  } as ViewStyle,
  footBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 } as ViewStyle,
  footBtnTxt: { fontSize: 11.5 } as TextStyle,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 34,
  } as ViewStyle,
  sheetTitle: { fontSize: 17, marginBottom: 8 } as TextStyle,
  fieldLabel: { fontSize: 11, letterSpacing: 0.7, marginTop: 12, marginBottom: 6 } as TextStyle,
  field: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 } as TextStyle,
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 } as ViewStyle,
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  catChipTxt: { fontSize: 12 } as TextStyle,
  createBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 18 } as ViewStyle,
  createBtnTxt: { fontSize: 15 } as TextStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, marginTop: 6 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 11 } as TextStyle,
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 } as ViewStyle,
  emptyTxt: { fontSize: 13 } as TextStyle,
});
