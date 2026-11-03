import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Alert,
  Platform, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

const CATEGORIES = ['All', 'Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const;
type CategoryFilter = typeof CATEGORIES[number];

const CL_CATS: Record<string, string> = {
  Tech: Accent.purple,
  Cultural: Accent.pink,
  Sports: Accent.teal,
  Professional: Accent.blue,
  Social: Accent.amber,
  other: Accent.slate,
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

type StatusFilter = 'all' | 'active' | 'inactive';

const StatCard = memo(function StatCard({
  num,
  label,
  isSelected,
  onPress,
  C,
}: {
  num: number | string;
  label: string;
  isSelected?: boolean;
  onPress?: () => void;
  C: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.statCard,
        {
          backgroundColor: isSelected ? `${C.brand}14` : C.surface,
          borderColor: isSelected ? C.brand : C.border,
          borderWidth: isSelected ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.statNum, { color: isSelected ? C.brand : C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
        {num}
      </Text>
      <Text
        style={[styles.statLabel, { color: isSelected ? C.brand : C.textMuted, fontFamily: FontFamily.jakartaBold }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

export function ManageClubsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');

  // Create Club Sheet state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newCategory, setNewCategory] = useState<'Tech' | 'Cultural' | 'Sports' | 'Professional' | 'Social'>('Tech');
  const [creating, setCreating] = useState(false);

  // Assign President Sheet state
  const [presTarget, setPresTarget] = useState<ClubRow | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<{ id: string; full_name: string; avatar_url: string | null }[]>([]);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    try {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Debounced search for student directory in President Assignment sheet
  useEffect(() => {
    const q = studentQuery.trim();
    if (!presTarget || q.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${q}%`)
        .eq('role', 'student')
        .limit(12);
      if (data) setStudentResults(data as any[]);
    }, 250);
    return () => clearTimeout(timer);
  }, [studentQuery, presTarget]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCreateClub() {
    const trimmedName = newName.trim();
    if (!trimmedName || creating) return;
    setCreating(true);
    const { error } = await supabase.from('clubs').insert({
      name: trimmedName,
      tagline: newTagline.trim() || null,
      category: newCategory,
      is_active: true,
      created_by: user?.id,
    });
    setCreating(false);
    if (error) {
      toast({ type: 'error', title: t.common.error, message: error.message });
      return;
    }
    toast({ type: 'success', title: 'Club Created', message: `${trimmedName} is now active.` });
    setCreateOpen(false);
    setNewName('');
    setNewTagline('');
    setNewCategory('Tech');
    await load();
  }

  function handleToggleActive(c: ClubRow) {
    if (c.is_active) {
      Alert.alert(
        'Deactivate Club?',
        `Are you sure you want to deactivate "${c.name}"? It will be hidden from student browsing. All posts, members, and history will remain safely preserved.`,
        [
          { text: t.common.cancel, style: 'cancel' },
          {
            text: t.clubs.deactivate,
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase.from('clubs').update({ is_active: false }).eq('id', c.id);
              if (error) {
                toast({ type: 'error', title: t.common.error, message: error.message });
                return;
              }
              setClubs(prev => prev.map(x => (x.id === c.id ? { ...x, is_active: false } : x)));
              toast({ type: 'info', title: 'Club Deactivated', message: `${c.name} is now hidden from students.` });
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Reactivate Club?',
        `Make "${c.name}" active and visible to all students in the campus directory?`,
        [
          { text: t.common.cancel, style: 'cancel' },
          {
            text: t.clubs.reactivate,
            onPress: async () => {
              const { error } = await supabase.from('clubs').update({ is_active: true }).eq('id', c.id);
              if (error) {
                toast({ type: 'error', title: t.common.error, message: error.message });
                return;
              }
              setClubs(prev => prev.map(x => (x.id === c.id ? { ...x, is_active: true } : x)));
              toast({ type: 'success', title: 'Club Reactivated', message: `${c.name} is now live.` });
            },
          },
        ]
      );
    }
  }

  function confirmAssignPresident(student: { id: string; full_name: string }) {
    if (!presTarget) return;
    Alert.alert(
      'Appoint President',
      `Appoint ${student.full_name} as President of ${presTarget.name}? The previous president will be atomically reassigned as a member.`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: 'Confirm Handover',
          onPress: () => performAssignPresident(student.id, student.full_name),
        },
      ]
    );
  }

  async function performAssignPresident(userId: string, studentName: string) {
    if (!presTarget || assigning) return;
    setAssigning(true);
    const { error } = await supabase.rpc('club_set_president', {
      p_club_id: presTarget.id,
      p_user_id: userId,
    });
    setAssigning(false);
    if (error) {
      toast({ type: 'error', title: t.common.error, message: error.message });
      return;
    }
    toast({ type: 'success', title: 'President Appointed', message: `${studentName} is now President of ${presTarget.name}.` });
    setPresTarget(null);
    setStudentQuery('');
    await load();
  }

  // Filtered dataset
  const filteredClubs = useMemo(() => {
    let result = clubs;

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(c => c.is_active);
    } else if (statusFilter === 'inactive') {
      result = result.filter(c => !c.is_active);
    }

    // Category filter
    if (categoryFilter !== 'All') {
      result = result.filter(c => c.category === categoryFilter);
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.tagline && c.tagline.toLowerCase().includes(q)) ||
        (c.president_name && c.president_name.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [clubs, statusFilter, categoryFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = clubs.length;
    const active = clubs.filter(c => c.is_active).length;
    const inactive = total - active;
    const totalMembers = clubs.reduce((acc, c) => acc + (c.member_count ?? 0), 0);
    return { total, active, inactive, totalMembers };
  }, [clubs]);

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.clubs.manageClubs} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>
            {t.manage.accessDenied}
          </Text>
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
            <Feather name="plus" size={14} color={C.white} />
            <Text style={[styles.newBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs.newClub}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Top Stats Overview Row */}
        <View style={styles.statsRow}>
          <StatCard
            num={stats.total}
            label="Total"
            isSelected={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
            C={C}
          />
          <StatCard
            num={stats.active}
            label="Active"
            isSelected={statusFilter === 'active'}
            onPress={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
            C={C}
          />
          <StatCard
            num={stats.inactive}
            label="Inactive"
            isSelected={statusFilter === 'inactive'}
            onPress={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
            C={C}
          />
          <StatCard
            num={stats.totalMembers}
            label="Members"
            C={C}
          />
        </View>

        {/* 58dp Search Bar Standard */}
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Icon name="search" size={20} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder="Search clubs, categories, or presidents..."
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

        {/* Category Horizontal Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map(cat => {
            const isSelected = categoryFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterPill,
                  isSelected
                    ? { backgroundColor: C.brand, borderColor: C.brand }
                    : { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => setCategoryFilter(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterPillTxt,
                    {
                      color: isSelected ? C.white : C.text2,
                      fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Club Cards Listing */}
        {loading && clubs.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.brand} size="large" />
          </View>
        ) : filteredClubs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="clubs" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {searchQuery ? 'No clubs match your search' : t.clubs.noClubs}
            </Text>
            {searchQuery ? (
              <TouchableOpacity
                style={[styles.clearSearchBtn, { backgroundColor: C.surface2 }]}
                onPress={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('All'); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.clearSearchTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  Reset Filters
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredClubs.map(c => {
              const catColor = CL_CATS[c.category] ?? Accent.slate;
              return (
                <View
                  key={c.id}
                  style={[
                    styles.clubCard,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                      opacity: c.is_active ? 1 : 0.72,
                    },
                  ]}
                >
                  {/* Card Header & Information */}
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => navigation.navigate('ClubDetail', { clubId: c.id })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.thumb}>
                      <Icon name="clubs" size={32} color={C.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.clubName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: c.is_active ? C.successBg : C.surface2 }]}>
                          <View style={[styles.statusDot, { backgroundColor: c.is_active ? C.success : C.textMuted }]} />
                          <Text style={[styles.statusTxt, { color: c.is_active ? C.success : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                            {c.is_active ? t.clubs.active : t.clubs.inactive}
                          </Text>
                        </View>
                      </View>

                      {c.tagline ? (
                        <Text style={[styles.tagline, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                          {c.tagline}
                        </Text>
                      ) : null}

                      <View style={styles.metaRow}>
                        <View style={[styles.categoryPill, { backgroundColor: isDark ? `${catColor}24` : `${catColor}14` }]}>
                          <Text style={[styles.categoryTxt, { color: catColor, fontFamily: FontFamily.jakartaBold }]}>
                            {c.category}
                          </Text>
                        </View>

                        <Text style={[styles.memberCount, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {c.member_count ?? 0} {t.clubs.members.toLowerCase()}
                        </Text>

                        {c.president_name ? (
                          <View style={styles.presRow}>
                            <Feather name="award" size={12} color={Accent.amber} />
                            <Text style={[styles.presidentTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>
                              {c.president_name}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.noPresTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                            No President
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* 4 Standard Action Buttons */}
                  <View style={[styles.actionRow, { borderTopColor: C.border }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: C.surface2 }]}
                      onPress={() => setPresTarget(c)}
                      activeOpacity={0.75}
                    >
                      <Feather name="user-check" size={13} color={C.brand} />
                      <Text style={[styles.actionBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                        President
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: C.surface2 }]}
                      onPress={() => navigation.navigate('ClubManage', { clubId: c.id })}
                      activeOpacity={0.75}
                    >
                      <Feather name="edit-2" size={13} color={C.text2} />
                      <Text style={[styles.actionBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: C.surface2 }]}
                      onPress={() => navigation.navigate('ClubMembers', { clubId: c.id })}
                      activeOpacity={0.75}
                    >
                      <Feather name="users" size={13} color={C.text2} />
                      <Text style={[styles.actionBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        Roster
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: c.is_active ? C.dangerBg : C.successBg },
                      ]}
                      onPress={() => handleToggleActive(c)}
                      activeOpacity={0.75}
                    >
                      <Feather name="power" size={13} color={c.is_active ? C.danger : C.success} />
                      <Text style={[styles.actionBtnTxt, { color: c.is_active ? C.danger : C.success, fontFamily: FontFamily.jakartaBold }]}>
                        {c.is_active ? t.clubs.deactivate : t.clubs.reactivate}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modern 58dp Create Club Sheet */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCreateOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.clubs.newClub}
            </Text>

            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs.clubName}
            </Text>
            <TextInput
              style={[styles.input58, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. BUBT IT Club"
              placeholderTextColor={C.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs.tagline}
            </Text>
            <TextInput
              style={[styles.input58, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={newTagline}
              onChangeText={setNewTagline}
              placeholder="One-line summary for students"
              placeholderTextColor={C.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs.category}
            </Text>
            <View style={styles.catChipsRow}>
              {(['Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const).map(cat => {
                const on = newCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.modalCatChip,
                      on
                        ? { backgroundColor: C.brand, borderColor: C.brand }
                        : { backgroundColor: C.bg, borderColor: C.border },
                    ]}
                    onPress={() => setNewCategory(cat)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.modalCatChipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn58, { backgroundColor: C.brand, opacity: newName.trim() && !creating ? 1 : 0.55 }]}
              onPress={handleCreateClub}
              disabled={!newName.trim() || creating}
              activeOpacity={0.8}
            >
              {creating ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={[styles.submitBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  Create Club
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modern 58dp Assign President Sheet */}
      <Modal visible={!!presTarget} transparent animationType="slide" onRequestClose={() => setPresTarget(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setPresTarget(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '80%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Appoint President
            </Text>
            <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {presTarget?.name}
            </Text>

            <View style={[styles.searchBar, { backgroundColor: C.bg, borderColor: C.border, marginTop: 12 }]}>
              <Icon name="search" size={20} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder="Search registered students..."
                placeholderTextColor={C.textMuted}
                value={studentQuery}
                onChangeText={setStudentQuery}
                autoFocus
              />
              {studentQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStudentQuery('')} hitSlop={8} activeOpacity={0.7}>
                  <Feather name="x-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 300, marginTop: 8 }} keyboardShouldPersistTaps="handled">
              {assigning ? (
                <ActivityIndicator color={C.brand} style={{ paddingVertical: 24 }} />
              ) : studentResults.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.studentResultCard, { backgroundColor: C.bg, borderColor: C.border }]}
                  onPress={() => confirmAssignPresident(r)}
                  activeOpacity={0.7}
                >
                  <Avatar uri={r.avatar_url} name={r.full_name} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.studentResultName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {r.full_name}
                    </Text>
                  </View>
                  <View style={[styles.appointPill, { backgroundColor: C.brand }]}>
                    <Text style={[styles.appointTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                      Appoint
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {studentQuery.trim().length >= 2 && studentResults.length === 0 && (
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, textAlign: 'center', paddingVertical: 24 }]}>
                  {t.common.noResults}
                </Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 24 } as ViewStyle,

  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 12 } as ViewStyle,
  newBtnTxt: { fontSize: 13 } as TextStyle,

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 } as ViewStyle,
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  statNum: { fontSize: 16 } as TextStyle,
  statLabel: { fontSize: 11, marginTop: 2 } as TextStyle,

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 } as TextStyle,

  catScroll: { gap: 8, paddingBottom: 12 } as ViewStyle,
  filterPill: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  filterPillTxt: { fontSize: 12.5 } as TextStyle,

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: 10 } as ViewStyle,
  emptyTitle: { fontSize: 15 } as TextStyle,
  clearSearchBtn: { paddingHorizontal: 16, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 } as ViewStyle,
  clearSearchTxt: { fontSize: 13 } as TextStyle,

  clubCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  cardHeader: { flexDirection: 'row', gap: 12, padding: 14 } as ViewStyle,
  thumb: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 } as ViewStyle,
  clubName: { fontSize: 15, flex: 1 } as TextStyle,
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as TextStyle,
  tagline: { fontSize: 12.5, marginTop: 3 } as TextStyle,
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 } as ViewStyle,
  categoryPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 } as ViewStyle,
  categoryTxt: { fontSize: 11 } as TextStyle,
  memberCount: { fontSize: 12 } as TextStyle,
  presRow: { flexDirection: 'row', alignItems: 'center', gap: 4 } as ViewStyle,
  presidentTxt: { fontSize: 12 } as TextStyle,
  noPresTxt: { fontSize: 12, fontStyle: 'italic' } as TextStyle,

  actionRow: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as ViewStyle,
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 38,
    borderRadius: 10,
  } as ViewStyle,
  actionBtnTxt: { fontSize: 12 } as TextStyle,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 36,
  } as ViewStyle,
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#888', alignSelf: 'center', marginBottom: 16 } as ViewStyle,
  sheetTitle: { fontSize: 18 } as TextStyle,
  sheetSub: { fontSize: 13, marginTop: 2, marginBottom: 8 } as TextStyle,
  fieldLabel: { fontSize: 11, letterSpacing: 0.7, marginTop: 12, marginBottom: 6 } as TextStyle,
  input58: { height: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 14.5 } as TextStyle,
  catChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 } as ViewStyle,
  modalCatChip: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  modalCatChipTxt: { fontSize: 12.5 } as TextStyle,
  submitBtn58: { height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 22 } as ViewStyle,
  submitBtnTxt: { fontSize: 15 } as TextStyle,

  studentResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,
  studentResultName: { fontSize: 14 } as TextStyle,
  appointPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 } as ViewStyle,
  appointTxt: { fontSize: 12 } as TextStyle,
  emptyTxt: { fontSize: 13 } as TextStyle,
});
