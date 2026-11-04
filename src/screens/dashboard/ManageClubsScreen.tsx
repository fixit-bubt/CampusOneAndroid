import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  FlatList,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { fetchPeople } from '../../services/peopleService';

const CATEGORY_LIST = ['All', 'Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const;
type CategoryFilter = typeof CATEGORY_LIST[number];

const FORM_CATEGORIES = ['Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const;
type FormCategory = typeof FORM_CATEGORIES[number];

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  All: 'layers',
  Tech: 'cpu',
  Cultural: 'music',
  Sports: 'activity',
  Professional: 'briefcase',
  Social: 'users',
};

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
}

const DEPARTMENTS: DepartmentOption[] = [
  { id: 'All', code: 'All', name: 'All Departments', icon: 'globe' },
  { id: 'CSE', code: 'CSE', name: 'Computer Science & Engineering', icon: 'cpu' },
  { id: 'EEE', code: 'EEE', name: 'Electrical & Electronic Engineering', icon: 'zap' },
  { id: 'BBA', code: 'BBA', name: 'Business Administration', icon: 'briefcase' },
  { id: 'Law', code: 'Law', name: 'Department of Law', icon: 'shield' },
  { id: 'English', code: 'English', name: 'Department of English', icon: 'book-open' },
  { id: 'Civil', code: 'Civil', name: 'Civil Engineering', icon: 'compass' },
  { id: 'Textile', code: 'Textile', name: 'Textile Engineering', icon: 'layers' },
  { id: 'Economics', code: 'Economics', name: 'Department of Economics', icon: 'trending-up' },
];

interface ClubRow {
  id: string;
  name: string;
  tagline: string | null;
  category: string;
  is_active: boolean;
  president_name?: string | null;
  member_count?: number;
}

interface StudentItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  intake: string | null;
  student_id: string | null;
  email: string | null;
}

const ClubAdminCard = React.memo(function ClubAdminCard({
  club,
  onPress,
  onAppointPresident,
  onManage,
  C,
  t,
}: {
  club: ClubRow;
  onPress: (club: ClubRow) => void;
  onAppointPresident: (club: ClubRow) => void;
  onManage: (club: ClubRow) => void;
  C: any;
  t: any;
}) {
  return (
    <View style={[styles.clubCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => onPress(club)}
        activeOpacity={0.75}
      >
        <View style={styles.thumb}>
          <Icon name="clubs" size={32} color={C.text} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.clubName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {club.name}
          </Text>

          {club.tagline ? (
            <Text style={[styles.tagline, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              {club.tagline}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={[styles.categoryPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
              <Text style={[styles.categoryTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {club.category}
              </Text>
            </View>

            <Text style={[styles.memberCount, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {club.member_count ?? 0} {t.clubs.members.toLowerCase()}
            </Text>

            {club.president_name ? (
              <View style={styles.presRow}>
                <Feather name="award" size={13} color={C.text} />
                <Text style={[styles.presidentTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>
                  {club.president_name}
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

      <View style={[styles.actionRow, { borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[styles.equalActionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          onPress={() => onAppointPresident(club)}
          activeOpacity={0.75}
        >
          <Feather name="user-check" size={15} color={C.text} />
          <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            President
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.equalActionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          onPress={() => onManage(club)}
          activeOpacity={0.75}
        >
          <Feather name="edit-2" size={15} color={C.text} />
          <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const StudentAssignCard = React.memo(function StudentAssignCard({
  item,
  onSelect,
  C,
}: {
  item: StudentItem;
  onSelect: (item: StudentItem) => void;
  C: any;
}) {
  const metaParts: string[] = [];
  if (item.department) metaParts.push(item.department);
  if (item.intake) metaParts.push(`Intake ${item.intake}`);
  if (item.student_id) metaParts.push(item.student_id);
  const metaLine = metaParts.join(' · ') || item.email || 'Student';

  return (
    <TouchableOpacity
      style={[styles.studentBar58, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={() => onSelect(item)}
      activeOpacity={0.75}
    >
      <Avatar uri={item.avatar_url} name={item.full_name} size="sm" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.studentName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {item.full_name}
        </Text>
        <Text style={[styles.studentMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
          {metaLine}
        </Text>
      </View>
      <View style={[styles.appointBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
        <Text style={[styles.appointBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          Appoint
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export function ManageClubsScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newCategory, setNewCategory] = useState<FormCategory>('Tech');
  const [createCategoryModalVisible, setCreateCategoryModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const [presTarget, setPresTarget] = useState<ClubRow | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [debouncedStudentQuery, setDebouncedStudentQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 180);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedStudentQuery(studentQuery), 180);
    return () => clearTimeout(handler);
  }, [studentQuery]);

  const load = useCallback(async () => {
    try {
      const [clubsRes, presRes, membersCountRes] = await Promise.all([
        supabase.from('clubs').select('*').order('name'),
        supabase.from('club_members').select('club_id, user_id').eq('role', 'president'),
        supabase.from('club_members').select('club_id').limit(2000),
      ]);

      if (clubsRes.data) {
        const presidents = (presRes.data ?? []) as any[];
        const presUserIds = presidents.map(m => m.user_id);
        const people = await fetchPeople(presUserIds);

        const countMap: Record<string, number> = {};
        if (membersCountRes.data) {
          for (const m of membersCountRes.data) {
            countMap[m.club_id] = (countMap[m.club_id] || 0) + 1;
          }
        }

        setClubs((clubsRes.data as any[]).map(c => {
          const pres = presidents.find(m => m.club_id === c.id);
          const presName = pres ? (people[pres.user_id]?.full_name ?? null) : null;
          return {
            ...c,
            member_count: countMap[c.id] || 0,
            president_name: presName,
          };
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!presTarget) return;
    let isCancelled = false;
    (async () => {
      setStudentsLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, department, intake, student_id, email')
        .eq('role', 'student')
        .order('full_name', { ascending: true })
        .limit(300);

      if (!isCancelled && data) {
        setStudents(data as StudentItem[]);
      }
      if (!isCancelled) setStudentsLoading(false);
    })();

    return () => { isCancelled = true; };
  }, [presTarget]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCreateClub = useCallback(async () => {
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
  }, [newName, newTagline, newCategory, creating, user?.id, t.common.error, toast, load]);

  const performAssignPresident = useCallback(async (userId: string, studentName: string) => {
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
    setSelectedDept('All');
    await load();
  }, [presTarget, assigning, t.common.error, toast, load]);

  const confirmAssignPresident = useCallback((student: StudentItem) => {
    if (!presTarget) return;
    Alert.alert(
      'Appoint President',
      `Appoint ${student.full_name} as President of ${presTarget.name}? The previous president will be demoted to a regular member.`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: 'Confirm Handover',
          onPress: () => performAssignPresident(student.id, student.full_name),
        },
      ]
    );
  }, [presTarget, t.common.cancel, performAssignPresident]);

  const filteredClubs = useMemo(() => {
    let result = clubs;

    if (categoryFilter !== 'All') {
      result = result.filter(c => c.category === categoryFilter);
    }

    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.tagline && c.tagline.toLowerCase().includes(q)) ||
        (c.president_name && c.president_name.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [clubs, categoryFilter, debouncedSearch]);

  const filteredStudents = useMemo(() => {
    let list = students;

    if (selectedDept !== 'All') {
      list = list.filter(s => s.department === selectedDept);
    }

    const q = debouncedStudentQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        (s.student_id && s.student_id.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.intake && s.intake.toLowerCase().includes(q))
      );
    }

    return list;
  }, [students, selectedDept, debouncedStudentQuery]);

  const activeDeptItem = useMemo(() => {
    return DEPARTMENTS.find(d => d.id === selectedDept) ?? DEPARTMENTS[0];
  }, [selectedDept]);

  const handleOpenClubDetail = useCallback((club: ClubRow) => {
    navigation.navigate('ClubDetail', { clubId: club.id });
  }, [navigation]);

  const handleOpenClubManage = useCallback((club: ClubRow) => {
    navigation.navigate('ClubManage', { clubId: club.id });
  }, [navigation]);

  const renderClubItem = useCallback(({ item }: { item: ClubRow }) => (
    <ClubAdminCard
      club={item}
      onPress={handleOpenClubDetail}
      onAppointPresident={setPresTarget}
      onManage={handleOpenClubManage}
      C={C}
      t={t}
    />
  ), [handleOpenClubDetail, handleOpenClubManage, C, t]);

  const renderStudentItem = useCallback(({ item }: { item: StudentItem }) => (
    <StudentAssignCard
      item={item}
      onSelect={confirmAssignPresident}
      C={C}
    />
  ), [confirmAssignPresident, C]);

  const clubKeyExtractor = useCallback((item: ClubRow) => item.id, []);
  const studentKeyExtractor = useCallback((item: StudentItem) => item.id, []);

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

  const ListHeader = (
    <View style={{ marginBottom: 12 }}>
      {/* Search Bar */}
      <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
        <Icon name="search" size={20} color={C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          placeholder="Search clubs..."
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

      {/* Category Filter Dropdown Bar */}
      <TouchableOpacity
        style={[
          styles.bar58,
          styles.dropdownBar,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
            marginBottom: 10,
          },
        ]}
        onPress={() => setFilterModalVisible(true)}
        activeOpacity={0.75}
      >
        <View style={styles.barLeft}>
          <Feather
            name={CATEGORY_ICONS[categoryFilter] ?? 'layers'}
            size={28}
            color={C.text}
          />
          <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {categoryFilter === 'All' ? 'All Categories' : `Category: ${categoryFilter}`}
          </Text>
        </View>
        <Feather name="chevron-down" size={20} color={C.textMuted} />
      </TouchableOpacity>

      {/* Create New Club Trigger Bar */}
      <TouchableOpacity
        style={[
          styles.bar58,
          styles.dropdownBar,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
          },
        ]}
        onPress={() => setCreateOpen(true)}
        activeOpacity={0.75}
      >
        <View style={styles.barLeft}>
          <View style={styles.iconSlot32}>
            <Feather name="plus-circle" size={32} color={C.text} />
          </View>
          <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {t.clubs.newClub}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.clubs.manageClubs} onBack={() => navigation.goBack()} />

      {loading && clubs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.text} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredClubs}
          renderItem={renderClubItem}
          keyExtractor={clubKeyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
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
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

      {/* Create Club Modal */}
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
                placeholder="Club name"
                placeholderTextColor={C.textMuted}
                autoFocus
              />

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
                placeholder="Club tagline or summary"
                placeholderTextColor={C.textMuted}
              />

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
                  <View style={styles.iconSlot32}>
                    <Feather name={CATEGORY_ICONS[newCategory] ?? 'layers'} size={32} color={C.text} />
                  </View>
                  <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {newCategory}
                  </Text>
                </View>
                <Feather name="chevron-down" size={20} color={C.textMuted} />
              </TouchableOpacity>

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

      {/* Create Category Picker Bottom Sheet */}
      <Modal
        visible={createCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateCategoryModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCreateCategoryModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border2 }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 14 }]}>
              Select Club Category
            </Text>

            <View style={{ gap: 8 }}>
              {FORM_CATEGORIES.map(cat => {
                const isSelected = newCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        backgroundColor: isSelected ? C.surface2 : C.surface,
                        borderColor: isSelected ? C.border2 : C.border,
                      },
                    ]}
                    onPress={() => {
                      setNewCategory(cat);
                      setCreateCategoryModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.barLeft}>
                      <View style={styles.iconSlot32}>
                        <Feather name={CATEGORY_ICONS[cat] ?? 'layers'} size={32} color={C.text} />
                      </View>
                      <Text
                        style={[
                          styles.barTitle,
                          {
                            color: C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={22} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Main Screen Category Filter Bottom Sheet */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setFilterModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border2 }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 14 }]}>
              Filter by Category
            </Text>

            <View style={{ gap: 8 }}>
              {CATEGORY_LIST.map(cat => {
                const isSelected = categoryFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        backgroundColor: isSelected ? C.surface2 : C.surface,
                        borderColor: isSelected ? C.border2 : C.border,
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
                        size={28}
                        color={C.text}
                      />
                      <Text
                        style={[
                          styles.barTitle,
                          {
                            color: C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {cat === 'All' ? 'All Categories' : cat}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full-Page Appoint President View */}
      <Modal
        visible={!!presTarget}
        animationType="slide"
        onRequestClose={() => { setPresTarget(null); setStudentQuery(''); setSelectedDept('All'); }}
      >
        <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
          <SubBar
            title="Appoint President"
            onBack={() => { setPresTarget(null); setStudentQuery(''); setSelectedDept('All'); }}
          />

          <View style={[styles.fullPageContent, { paddingHorizontal: Layout.screenPadding }]}>
            {/* Club Target Banner */}
            <View style={[styles.targetClubBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.thumb}>
                <Icon name="clubs" size={32} color={C.text} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.targetClubTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {presTarget?.name}
                </Text>
                <Text style={[styles.targetClubSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {presTarget?.president_name ? `Current: ${presTarget.president_name}` : 'No president currently assigned'}
                </Text>
              </View>
            </View>

            {/* Student Search Bar */}
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10, marginBottom: 10 }]}>
              <Icon name="search" size={20} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder="Search students..."
                placeholderTextColor={C.textMuted}
                value={studentQuery}
                onChangeText={setStudentQuery}
                autoCapitalize="none"
              />
              {studentQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStudentQuery('')} hitSlop={8} activeOpacity={0.7}>
                  <Feather name="x-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Department Dropdown Bar */}
            <TouchableOpacity
              style={[
                styles.bar58,
                styles.dropdownBar,
                {
                  backgroundColor: C.surface,
                  borderColor: selectedDept !== 'All' ? C.border2 : C.border,
                  marginBottom: 12,
                },
              ]}
              onPress={() => setDeptModalVisible(true)}
              activeOpacity={0.75}
            >
              <View style={styles.barLeft}>
                <View style={styles.iconSlot32}>
                  <Feather name={activeDeptItem.icon} size={32} color={C.text} />
                </View>
                <Text
                  style={[
                    styles.barTitle,
                    {
                      color: C.text,
                      fontFamily: selectedDept !== 'All' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {selectedDept === 'All' ? 'All Departments' : activeDeptItem.name}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {selectedDept !== 'All' && (
                  <View style={[styles.countPill, { backgroundColor: C.surface2 }]}>
                    <Text style={[styles.countPillTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {filteredStudents.length}
                    </Text>
                  </View>
                )}
                <Feather name="chevron-down" size={20} color={C.textMuted} />
              </View>
            </TouchableOpacity>

            {/* Students List */}
            {studentsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={C.brand} size="large" />
                <Text style={[styles.loadingTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}>
                  Loading students...
                </Text>
              </View>
            ) : filteredStudents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="users" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {studentQuery ? 'No students match your search' : 'No students found in this department'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={studentKeyExtractor}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 30 }}
                renderItem={renderStudentItem}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Department Selection Bottom Sheet */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDeptModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '80%' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border2 }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 14 }]}>
              Select Department
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 20 }}>
              {DEPARTMENTS.map(dept => {
                const isSelected = selectedDept === dept.id;
                return (
                  <TouchableOpacity
                    key={dept.id}
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        backgroundColor: isSelected ? C.surface2 : C.surface,
                        borderColor: isSelected ? C.border2 : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedDept(dept.id);
                      setDeptModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.barLeft}>
                      <View style={styles.iconSlot32}>
                        <Feather name={dept.icon} size={32} color={C.text} />
                      </View>
                      <Text
                        style={[
                          styles.barTitle,
                          {
                            color: C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {dept.name}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
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
  fullPageContent: { flex: 1, paddingTop: 8 } as ViewStyle,

  bar58: {
    height: 58,
    borderRadius: Radius.md,
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
    gap: 14,
    flex: 1,
  } as ViewStyle,
  iconSlot32: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
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

  clubCard: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  cardHeader: { flexDirection: 'row', gap: 12, padding: 14 } as ViewStyle,
  thumb: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  clubName: { fontSize: 15 } as TextStyle,
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
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as ViewStyle,
  equalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
  } as ViewStyle,
  actionBtnTxt: { fontSize: 13 } as TextStyle,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 36,
  } as ViewStyle,
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 } as ViewStyle,
  sheetTitle: { fontSize: 18 } as TextStyle,

  targetClubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 6,
  } as ViewStyle,
  targetClubTitle: { fontSize: 15 } as TextStyle,
  targetClubSub: { fontSize: 12.5, marginTop: 2 } as TextStyle,

  countPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 } as ViewStyle,
  countPillTxt: { fontSize: 11 } as TextStyle,
  loadingTxt: { fontSize: 13 } as TextStyle,

  studentBar58: {
    height: 58,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  } as ViewStyle,
  studentName: { fontSize: 14 } as TextStyle,
  studentMeta: { fontSize: 12, marginTop: 2 } as TextStyle,
  appointBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  appointBtnTxt: { fontSize: 12 } as TextStyle,
});
