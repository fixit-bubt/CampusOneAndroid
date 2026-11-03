import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Platform,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import type { Profile } from '../../types/database';
import { useT } from '../../i18n';

type UserTab = 'student' | 'staff' | 'admin';

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  icon: string;
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

function formatDate(iso?: string | null): string {
  if (!iso) return 'Not available';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Not available';
  }
}

export function ManageUsersScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const t = useT();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<UserTab>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [deptModalVisible, setDeptModalVisible] = useState(false);

  // Profile Details Modal
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })
        .limit(600);

      if (error) {
        setErrorMsg(error.message);
      } else if (data) {
        setUsers(data as Profile[]);
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
  }, [loadUsers]);

  // Segregate by role
  const studentUsers = useMemo(() => users.filter((u) => u.role === 'student'), [users]);
  const staffUsers = useMemo(() => users.filter((u) => u.role === 'staff'), [users]);
  const adminUsers = useMemo(() => users.filter((u) => u.role === 'admin'), [users]);

  // Department counts for students
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { All: studentUsers.length };
    for (const s of studentUsers) {
      const deptRaw = (s.department ?? '').trim().toLowerCase();
      if (!deptRaw) continue;
      for (const d of DEPARTMENTS) {
        if (d.id === 'All') continue;
        if (
          deptRaw === d.id.toLowerCase() ||
          deptRaw === d.code.toLowerCase() ||
          deptRaw.includes(d.id.toLowerCase()) ||
          d.name.toLowerCase().includes(deptRaw)
        ) {
          counts[d.id] = (counts[d.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [studentUsers]);

  // Selected Department Item
  const activeDeptItem = useMemo(
    () => DEPARTMENTS.find((d) => d.id === selectedDept) ?? DEPARTMENTS[0],
    [selectedDept]
  );

  // Tabs for 58dp SegmentedTabs
  const tabs = useMemo<TabItem<UserTab>[]>(
    () => [
      {
        id: 'student',
        label: 'Student',
        icon: 'users',
        count: studentUsers.length,
      },
      {
        id: 'staff',
        label: 'Staff',
        icon: 'briefcase',
        count: staffUsers.length,
      },
      {
        id: 'admin',
        label: 'Admin',
        icon: 'shield',
        count: adminUsers.length,
      },
    ],
    [studentUsers.length, staffUsers.length, adminUsers.length]
  );

  // Filtered List based on tab, department, and search
  const displayedUsers = useMemo(() => {
    let list: Profile[] = [];
    if (activeTab === 'student') {
      list = studentUsers;
      if (selectedDept !== 'All') {
        const target = selectedDept.toLowerCase();
        list = list.filter((u) => {
          const dept = (u.department ?? '').toLowerCase();
          return (
            dept === target ||
            dept === activeDeptItem.code.toLowerCase() ||
            dept.includes(target) ||
            activeDeptItem.name.toLowerCase().includes(dept)
          );
        });
      }
    } else if (activeTab === 'staff') {
      list = staffUsers;
    } else {
      list = adminUsers;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((u) => {
      const name = (u.full_name ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const studentId = (u.student_id ?? '').toLowerCase();
      const dept = (u.department ?? '').toLowerCase();
      const phone = (u.phone ?? '').toLowerCase();
      const expertise = (u.expertise ?? '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        studentId.includes(q) ||
        dept.includes(q) ||
        phone.includes(q) ||
        expertise.includes(q)
      );
    });
  }, [
    activeTab,
    studentUsers,
    staffUsers,
    adminUsers,
    selectedDept,
    activeDeptItem,
    searchQuery,
  ]);

  const handleUserPress = useCallback(
    (u: Profile) => {
      setSelectedUser(u);
    },
    []
  );

  const handleOpenFullProfile = useCallback(
    (u: Profile) => {
      setSelectedUser(null);
      if (u.role === 'student') {
        navigation.navigate('StudentProfile', {
          studentId: u.id,
          id: u.id,
          student: u,
        });
      }
    },
    [navigation]
  );

  // Access check
  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Users" onBack={() => navigation.goBack()} />
        <View style={styles.accessDeniedWrap}>
          <Icon name="shield" size={40} color={C.danger} />
          <Text style={[styles.accessDeniedTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.manage?.accessDenied ?? 'Access Denied'}
          </Text>
          <Text style={[styles.accessDeniedSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.manage?.onlyAdminsManageUsers ?? 'Only administrators can view and manage user records.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render 58dp User Bar
  const renderUserItem = ({ item }: { item: Profile }) => {
    let metaSubtitle = '';
    if (item.role === 'student') {
      const parts: string[] = [];
      if (item.department) parts.push(item.department);
      if (item.intake) parts.push(`Intake ${item.intake}`);
      if (item.section) parts.push(`Sec ${item.section}`);
      metaSubtitle = parts.join(' · ') || item.student_id || item.email || 'Student';
    } else if (item.role === 'staff') {
      metaSubtitle = item.expertise ? `Trade: ${item.expertise}` : item.email || 'Campus Staff';
    } else {
      metaSubtitle = item.email || 'Administrator';
    }

    return (
      <TouchableOpacity
        style={[
          styles.userBar58,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
          },
        ]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        <Avatar uri={item.avatar_url} name={item.full_name} size="sm" />
        <View style={styles.userBarBody}>
          <Text
            style={[styles.userBarName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
            numberOfLines={1}
          >
            {item.full_name}
          </Text>
          <Text
            style={[styles.userBarMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
            numberOfLines={1}
          >
            {metaSubtitle}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={C.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Users" onBack={() => navigation.goBack()} />

      {/* Main Container with Natural Native Scrolling */}
      <View style={[styles.contentContainer, { paddingHorizontal: Layout.screenPadding }]}>
        <FlatList
          data={displayedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
          }
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={
            <View>
              {/* 58dp Search Bar */}
              <View
                style={[
                  styles.searchBar58,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    marginTop: 4,
                  },
                ]}
              >
                <Feather name="search" size={20} color={C.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={
                    activeTab === 'student'
                      ? 'Search students by name, ID, intake...'
                      : activeTab === 'staff'
                      ? 'Search staff by name, trade, email...'
                      : 'Search administrators...'
                  }
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* 58dp Segmented Tab Bar: [ Student | Staff | Admin ] */}
              <View style={styles.tabsWrapper}>
                <SegmentedTabs<UserTab>
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={(tId) => {
                    setActiveTab(tId);
                  }}
                  size="md"
                />
              </View>

              {/* 58dp Department Dropdown Bar (Student Tab Only) */}
              {activeTab === 'student' && (
                <TouchableOpacity
                  style={[
                    styles.deptDropdownBar58,
                    {
                      backgroundColor: C.surface,
                      borderColor: selectedDept !== 'All' ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => setDeptModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={styles.deptBarLeading}>
                    <Icon name={activeDeptItem.icon} size={32} color={selectedDept !== 'All' ? C.brand : C.text} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.deptBarTitle,
                          {
                            color: selectedDept !== 'All' ? C.brand : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedDept === 'All' ? 'All Departments' : activeDeptItem.name}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.deptBarTrailing}>
                    {selectedDept !== 'All' && (
                      <View style={[styles.deptCountPill, { backgroundColor: isDark ? '#262626' : '#e4e4e7' }]}>
                        <Text style={[styles.deptCountPillTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {displayedUsers.length}
                        </Text>
                      </View>
                    )}
                    <Feather name="chevron-down" size={18} color={selectedDept !== 'All' ? C.brand : C.textMuted} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            loading && users.length === 0 ? (
              <View style={[styles.centerContainer, { paddingVertical: 48 }]}>
                <ActivityIndicator size="large" color={C.brand} />
                <Text style={[styles.loadingTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Loading users...
                </Text>
              </View>
            ) : errorMsg && users.length === 0 ? (
              <View style={[styles.errorCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Feather name="alert-circle" size={32} color={C.danger} />
                <Text style={[styles.errorTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Could Not Load Users
                </Text>
                <Text style={[styles.errorDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {errorMsg}
                </Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: C.brand }]}
                  onPress={loadUsers}
                  activeOpacity={0.8}
                >
                  <Feather name="refresh-cw" size={16} color="#ffffff" />
                  <Text style={[styles.retryBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Icon name={activeTab === 'student' ? 'users' : activeTab === 'staff' ? 'briefcase' : 'shield'} size={44} color={C.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {searchQuery.trim().length > 0
                    ? 'No matching users found'
                    : activeTab === 'student' && selectedDept !== 'All'
                    ? `No students in ${activeDeptItem.code}`
                    : `No ${activeTab} accounts`}
                </Text>
                <Text style={[styles.emptyDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {searchQuery.trim().length > 0
                    ? 'Try refining your search keyword or clearing the search bar.'
                    : activeTab === 'student' && selectedDept !== 'All'
                    ? 'No registered student profiles match this department filter.'
                    : `There are currently no registered ${activeTab} accounts in the database.`}
                </Text>
                {selectedDept !== 'All' && activeTab === 'student' && (
                  <TouchableOpacity
                    style={[styles.clearFilterBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                    onPress={() => setSelectedDept('All')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.clearFilterBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                      Show All Departments
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      </View>

      {/* Department Picker Bottom Sheet Modal */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeptModalVisible(false)}
        />
        <View
          style={[
            styles.deptSheet,
            {
              backgroundColor: C.surface,
              paddingBottom: Math.max(28, insets.bottom + 12),
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#383838' : '#d4d4d8' }]} />

          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                Select Department
              </Text>
              <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Filter students by department
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.sheetCloseBtn, { backgroundColor: isDark ? '#262626' : '#e4e4e7' }]}
              onPress={() => setDeptModalVisible(false)}
            >
              <Feather name="x" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={DEPARTMENTS}
            keyExtractor={(d) => d.id}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 420 }}
            renderItem={({ item: d }) => {
              const isSelected = selectedDept === d.id;
              const count = deptCounts[d.id] ?? 0;

              return (
                <TouchableOpacity
                  style={[
                    styles.deptModalRow58,
                    {
                      backgroundColor: isSelected ? (isDark ? '#262626' : '#f4f4f5') : 'transparent',
                      borderColor: isSelected ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedDept(d.id);
                    setDeptModalVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.deptModalLeading}>
                    <Icon name={d.icon} size={32} color={isSelected ? C.brand : C.text} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.deptModalName,
                          {
                            color: isSelected ? C.brand : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {d.name}
                      </Text>
                      {d.id !== 'All' && (
                        <Text
                          style={[styles.deptModalCode, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
                        >
                          {d.code}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.deptModalTrailing}>
                    <View style={[styles.deptModalCountPill, { backgroundColor: isDark ? '#1c1c1c' : '#e4e4e7' }]}>
                      <Text style={[styles.deptModalCountTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                        {count}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={18} color={C.brand} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* User Details Bottom Sheet Modal */}
      <Modal
        visible={!!selectedUser}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedUser(null)}
        />
        <View
          style={[
            styles.detailsSheet,
            {
              backgroundColor: C.surface,
              paddingBottom: Math.max(28, insets.bottom + 12),
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#383838' : '#d4d4d8' }]} />

          {selectedUser && (
            <>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <Avatar uri={selectedUser.avatar_url} name={selectedUser.full_name} size="lg" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.profileName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}
                    numberOfLines={1}
                  >
                    {selectedUser.full_name}
                  </Text>
                  <View style={styles.roleBadgeRow}>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor:
                            selectedUser.role === 'admin'
                              ? `${C.warn}22`
                              : selectedUser.role === 'staff'
                              ? `${C.brand}22`
                              : `${C.success}22`,
                          borderColor:
                            selectedUser.role === 'admin'
                              ? C.warn
                              : selectedUser.role === 'staff'
                              ? C.brand
                              : C.success,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.roleBadgeDot,
                          {
                            backgroundColor:
                              selectedUser.role === 'admin'
                                ? C.warn
                                : selectedUser.role === 'staff'
                                ? C.brand
                                : C.success,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.roleBadgeTxt,
                          {
                            color:
                              selectedUser.role === 'admin'
                                ? C.warn
                                : selectedUser.role === 'staff'
                                ? C.brand
                                : C.success,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                      >
                        {selectedUser.role === 'admin'
                          ? 'Administrator'
                          : selectedUser.role === 'staff'
                          ? 'Staff Member'
                          : 'Student'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.sheetCloseBtn, { backgroundColor: isDark ? '#262626' : '#e4e4e7' }]}
                  onPress={() => setSelectedUser(null)}
                >
                  <Feather name="x" size={18} color={C.text} />
                </TouchableOpacity>
              </View>

              {/* Information Rows */}
              <View style={[styles.infoGrid, { backgroundColor: C.bg, borderColor: C.border }]}>
                {selectedUser.role === 'student' && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        Student ID
                      </Text>
                      <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {selectedUser.student_id || 'Not provided'}
                      </Text>
                    </View>
                    <View style={[styles.infoDivider, { backgroundColor: C.border }]} />

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        Department
                      </Text>
                      <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {selectedUser.department || 'Not specified'}
                      </Text>
                    </View>
                    <View style={[styles.infoDivider, { backgroundColor: C.border }]} />

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        Intake / Section
                      </Text>
                      <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {selectedUser.intake ? `Intake ${selectedUser.intake}` : 'Not set'}
                        {selectedUser.section ? ` · Sec ${selectedUser.section}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
                  </>
                )}

                {selectedUser.role === 'staff' && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        Assigned Trade
                      </Text>
                      <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {selectedUser.expertise || 'General Maintenance'}
                      </Text>
                    </View>
                    <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
                  </>
                )}

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Email Address
                  </Text>
                  <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {selectedUser.email || 'Not available'}
                  </Text>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: C.border }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Phone Number
                  </Text>
                  <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {selectedUser.phone || 'Not shared'}
                  </Text>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: C.border }]} />

                {selectedUser.role === 'student' && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        Blood Group
                      </Text>
                      <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {selectedUser.blood_group || 'Not specified'}
                      </Text>
                    </View>
                    <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
                  </>
                )}

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Account Created
                  </Text>
                  <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {formatDate(selectedUser.created_at)}
                  </Text>
                </View>
              </View>

              {/* Action Button: View Full Student Profile if Student */}
              {selectedUser.role === 'student' && (
                <TouchableOpacity
                  style={[styles.fullProfileBtn58, { backgroundColor: C.brand }]}
                  onPress={() => handleOpenFullProfile(selectedUser)}
                  activeOpacity={0.8}
                >
                  <Feather name="user" size={18} color="#ffffff" />
                  <Text style={[styles.fullProfileBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                    View Full Student Profile
                  </Text>
                  <Feather name="arrow-right" size={18} color="#ffffff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  contentContainer: {
    flex: 1,
    paddingTop: 12,
  } as ViewStyle,

  /* 58dp Universal Search Bar */
  searchBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  } as any,

  /* 58dp Tabs Wrapper */
  tabsWrapper: {
    marginBottom: 12,
  } as ViewStyle,

  /* 58dp Department Dropdown Bar */
  deptDropdownBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  } as ViewStyle,
  deptBarLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 10,
  } as ViewStyle,
  deptBarTitle: {
    fontSize: 14.5,
  } as any,
  deptBarTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  deptCountPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  } as ViewStyle,
  deptCountPillTxt: {
    fontSize: 12,
  } as any,

  /* 58dp User Bar Rows */
  listContent: {
    paddingBottom: 32,
  } as ViewStyle,
  userBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 8,
  } as ViewStyle,
  userBarBody: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  userBarName: {
    fontSize: 14,
  } as any,
  userBarMeta: {
    fontSize: 11.5,
    marginTop: 1.5,
  } as any,

  /* Loading & Error */
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  } as ViewStyle,
  loadingTxt: {
    fontSize: 14,
  } as any,

  errorCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  } as ViewStyle,
  errorTitle: {
    fontSize: 16,
    marginTop: 4,
  } as any,
  errorDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  } as any,
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    marginTop: 6,
  } as ViewStyle,
  retryBtnTxt: {
    fontSize: 14,
  } as any,

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  } as ViewStyle,
  emptyIconWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 16,
    textAlign: 'center',
  } as any,
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  } as any,
  clearFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  } as ViewStyle,
  clearFilterBtnTxt: {
    fontSize: 13.5,
  } as any,

  /* Modal Sheets */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  } as ViewStyle,
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 18,
  } as any,
  sheetSub: {
    fontSize: 12.5,
    marginTop: 2,
  } as any,
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  /* Department Bottom Sheet */
  deptSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 14,
  } as ViewStyle,
  deptModalRow58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  } as ViewStyle,
  deptModalLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  } as ViewStyle,
  deptModalName: {
    fontSize: 14,
  } as any,
  deptModalCode: {
    fontSize: 11.5,
    marginTop: 1,
  } as any,
  deptModalTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  deptModalCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  } as ViewStyle,
  deptModalCountTxt: {
    fontSize: 11.5,
  } as any,

  /* User Details Bottom Sheet */
  detailsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 14,
    maxHeight: '85%',
  } as ViewStyle,
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  } as ViewStyle,
  profileName: {
    fontSize: 17,
    marginBottom: 4,
  } as any,
  roleBadgeRow: {
    flexDirection: 'row',
  } as ViewStyle,
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  roleBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  roleBadgeTxt: {
    fontSize: 11.5,
  } as any,

  /* Details Grid */
  infoGrid: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  } as ViewStyle,
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  } as ViewStyle,
  infoLabel: {
    fontSize: 12.5,
  } as any,
  infoValue: {
    fontSize: 13.5,
    maxWidth: '65%',
    textAlign: 'right',
  } as any,
  infoDivider: {
    height: StyleSheet.hairlineWidth,
  } as ViewStyle,

  fullProfileBtn58: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  } as ViewStyle,
  fullProfileBtnTxt: {
    fontSize: 15,
  } as any,

  /* Access Denied */
  accessDeniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  } as ViewStyle,
  accessDeniedTitle: {
    fontSize: 18,
    marginTop: 6,
  } as any,
  accessDeniedSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  } as any,
});
