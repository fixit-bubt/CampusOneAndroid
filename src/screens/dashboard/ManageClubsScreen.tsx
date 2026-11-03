import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

const CATEGORY_LIST = ['All', 'Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const;
type CategoryFilter = typeof CATEGORY_LIST[number];

const FORM_CATEGORIES = ['Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const;
type FormCategory = typeof FORM_CATEGORIES[number];

const CL_CATS: Record<string, string> = {
  Tech: Accent.purple,
  Cultural: Accent.pink,
  Sports: Accent.teal,
  Professional: Accent.blue,
  Social: Accent.amber,
  other: Accent.slate,
};

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  All: 'layers',
  Tech: 'cpu',
  Cultural: 'music',
  Sports: 'activity',
  Professional: 'briefcase',
  Social: 'users',
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
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Category filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Full-page Create Club state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newCategory, setNewCategory] = useState<FormCategory>('Tech');
  const [createCategoryModalVisible, setCreateCategoryModalVisible] = useState(false);
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
      `Appoint ${student.full_name} as President of ${presTarget.name}? The previous president will be atomically demoted to a regular member.`,
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

    if (categoryFilter !== 'All') {
      result = result.filter(c => c.category === categoryFilter);
    }

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
  }, [clubs, categoryFilter, searchQuery]);

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
      <SubBar title={t.clubs.manageClubs} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* 1. Standard 58dp Search Bar */}
        <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
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

        {/* 2. Standard 58dp Category Filter Dropdown Bar */}
        <TouchableOpacity
          style={[
            styles.bar58,
            styles.dropdownBar,
            {
              backgroundColor: categoryFilter !== 'All' ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : C.surface,
              borderColor: categoryFilter !== 'All' ? C.brand : C.border,
              marginBottom: 10,
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.barLeft}>
            <Feather
              name={CATEGORY_ICONS[categoryFilter] ?? 'layers'}
              size={18}
              color={categoryFilter !== 'All' ? C.brand : C.textMuted}
            />
            <Text
              style={[
                styles.barTitle,
                {
                  color: categoryFilter !== 'All' ? C.brand : C.text,
                  fontFamily: categoryFilter !== 'All' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
            >
              {categoryFilter === 'All' ? 'All Categories' : `Category: ${categoryFilter}`}
            </Text>
          </View>
          <Feather name="chevron-down" size={18} color={categoryFilter !== 'All' ? C.brand : C.textMuted} />
        </TouchableOpacity>

        {/* 3. Standard 58dp Create New Club Bar */}
        <TouchableOpacity
          style={[
            styles.bar58,
            styles.dropdownBar,
            {
              backgroundColor: C.surface,
              borderColor: C.brand,
              borderLeftColor: C.brand,
              borderLeftWidth: 4,
              marginBottom: 14,
            },
          ]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.75}
        >
          <View style={styles.barLeft}>
            <Feather name="plus-circle" size={20} color={C.brand} />
            <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs.newClub}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={C.brand} />
        </TouchableOpacity>

        {/* 4. Club Cards Listing */}
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
            {searchQuery || categoryFilter !== 'All' ? (
              <TouchableOpacity
                style={[styles.clearSearchBtn, { backgroundColor: C.surface2 }]}
                onPress={() => { setSearchQuery(''); setCategoryFilter('All'); }}
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

      {/* ─────────────────────────────────────────────────────────────
          FULL-PAGE CREATE CLUB MODAL (All 58dp Standard Bars)
          ───────────────────────────────────────────────────────────── */}
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
          <SubBar title="Create New Club" onBack={() => setCreateOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Field 1: Club Name */}
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 8 }]}>
                CLUB NAME
              </Text>
              <TextInput
                style={[
                  styles.bar58,
                  styles.fullPageInput,
                  { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
                ]}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. BUBT Robotics Club"
                placeholderTextColor={C.textMuted}
                autoFocus
              />

              {/* Field 2: Tagline */}
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 16 }]}>
                TAGLINE
              </Text>
              <TextInput
                style={[
                  styles.bar58,
                  styles.fullPageInput,
                  { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
                ]}
                value={newTagline}
                onChangeText={setNewTagline}
                placeholder="One-line summary for campus directory"
                placeholderTextColor={C.textMuted}
              />

              {/* Field 3: Category Dropdown Bar (58dp) */}
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 16 }]}>
                CATEGORY
              </Text>
              <TouchableOpacity
                style={[
                  styles.bar58,
                  styles.dropdownBar,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => setCreateCategoryModalVisible(true)}
                activeOpacity={0.75}
              >
                <View style={styles.barLeft}>
                  <View style={[styles.dot10, { backgroundColor: CL_CATS[newCategory] ?? C.brand }]} />
                  <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {newCategory}
                  </Text>
                </View>
                <Feather name="chevron-down" size={18} color={C.textMuted} />
              </TouchableOpacity>

              {/* Submit CTA Button (58dp) */}
              <TouchableOpacity
                style={[
                  styles.bar58,
                  styles.submitBtn58,
                  { backgroundColor: C.brand, opacity: newName.trim() && !creating ? 1 : 0.55, marginTop: 24 },
                ]}
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
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          CREATE CATEGORY PICKER BOTTOM SHEET (58dp Bars)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={createCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateCategoryModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCreateCategoryModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 14 }]}>
              Select Club Category
            </Text>

            <View style={{ gap: 8 }}>
              {FORM_CATEGORIES.map(cat => {
                const isSelected = newCategory === cat;
                const catColor = CL_CATS[cat] ?? C.brand;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        backgroundColor: isSelected ? (isDark ? `${catColor}20` : '#eff6ff') : C.bg,
                        borderColor: isSelected ? catColor : C.border,
                      },
                    ]}
                    onPress={() => {
                      setNewCategory(cat);
                      setCreateCategoryModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.barLeft}>
                      <View style={[styles.dot10, { backgroundColor: catColor }]} />
                      <Text
                        style={[
                          styles.barTitle,
                          {
                            color: isSelected ? catColor : C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={18} color={catColor} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MAIN SCREEN CATEGORY FILTER BOTTOM SHEET (58dp Bars)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setFilterModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 14 }]}>
              Filter by Category
            </Text>

            <View style={{ gap: 8 }}>
              {CATEGORY_LIST.map(cat => {
                const isSelected = categoryFilter === cat;
                const catColor = cat === 'All' ? C.brand : (CL_CATS[cat] ?? C.brand);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        backgroundColor: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff') : C.bg,
                        borderColor: isSelected ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setCategoryFilter(cat);
                      setFilterModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.barLeft}>
                      <Feather
                        name={CATEGORY_ICONS[cat] ?? 'layers'}
                        size={18}
                        color={isSelected ? C.brand : C.textMuted}
                      />
                      <Text
                        style={[
                          styles.barTitle,
                          {
                            color: isSelected ? C.brand : C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {cat === 'All' ? 'All Categories' : cat}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={18} color={C.brand} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          ASSIGN PRESIDENT SHEET (58dp Search & Student Selection)
          ───────────────────────────────────────────────────────────── */}
      <Modal visible={!!presTarget} transparent animationType="slide" onRequestClose={() => setPresTarget(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setPresTarget(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '82%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Appoint President
            </Text>
            <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {presTarget?.name}
            </Text>

            <View style={[styles.bar58, { backgroundColor: C.bg, borderColor: C.border, marginTop: 12, marginBottom: 8 }]}>
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

            <ScrollView style={{ maxHeight: 300, marginTop: 4 }} keyboardShouldPersistTaps="handled">
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

  // Universal 58dp Bar Standard
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  dropdownBar: {
    justifyContent: 'space-between',
  } as ViewStyle,
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,
  barTitle: {
    fontSize: 14.5,
  } as TextStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
    marginLeft: 8,
  } as TextStyle,
  fullPageInput: {
    marginTop: 6,
  } as TextStyle,

  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as TextStyle,
  dot10: {
    width: 10,
    height: 10,
    borderRadius: 5,
  } as ViewStyle,

  submitBtn58: {
    justifyContent: 'center',
  } as ViewStyle,
  submitBtnTxt: {
    fontSize: 15.5,
  } as TextStyle,

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
