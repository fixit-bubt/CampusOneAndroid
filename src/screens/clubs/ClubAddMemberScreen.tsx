import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { loadPeople } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';

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

function matchesDepartment(studentDept: string | null | undefined, deptCode: string): boolean {
  if (deptCode === 'All') return true;
  if (!studentDept) return false;
  const s = studentDept.toLowerCase().trim();
  const c = deptCode.toLowerCase().trim();
  if (c === 'cse') return s.includes('cse') || s.includes('computer');
  if (c === 'eee') return s.includes('eee') || s.includes('electrical');
  if (c === 'bba') return s.includes('bba') || s.includes('business');
  if (c === 'law') return s.includes('law');
  if (c === 'english') return s.includes('english') || s.includes('eng');
  if (c === 'civil') return s.includes('civil') || s.includes('ce');
  if (c === 'textile') return s.includes('textile') || s.includes('te');
  if (c === 'economics') return s.includes('economics') || s.includes('econ');
  return s.includes(c);
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

export function ClubAddMemberScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const clubId: string = route.params?.clubId;

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [deptModalVisible, setDeptModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [peopleMap, membersRes] = await Promise.all([
        loadPeople(),
        supabase.from('club_members').select('user_id').eq('club_id', clubId),
      ]);

      const memberIds = new Set<string>(((membersRes.data as any[]) ?? []).map((m: any) => m.user_id));
      setExistingMemberIds(memberIds);

      const studentList: StudentItem[] = Object.values(peopleMap)
        .filter((p: any) => p.role === 'student')
        .map((p: any) => ({
          id: p.id,
          full_name: p.full_name || 'Student',
          avatar_url: p.avatar_url || null,
          department: p.department || null,
          intake: p.intake ? String(p.intake) : null,
          student_id: p.student_id || null,
          email: p.email || null,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      setStudents(studentList);
    } catch {
      toast({ type: 'error', title: 'Error', message: 'Failed to load student directory' });
    } finally {
      setLoading(false);
    }
  }, [clubId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeDeptObj = useMemo(
    () => DEPARTMENTS.find((d) => d.id === selectedDept) ?? DEPARTMENTS[0],
    [selectedDept]
  );

  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => !existingMemberIds.has(s.id));

    if (selectedDept !== 'All') {
      result = result.filter((s) => matchesDepartment(s.department, selectedDept));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.intake && s.intake.toLowerCase().includes(q)) ||
          (s.student_id && s.student_id.toLowerCase().includes(q))
      );
    }

    return result;
  }, [students, existingMemberIds, selectedDept, searchQuery]);

  async function handleAddMember(student: StudentItem) {
    if (addingId) return;
    setAddingId(student.id);

    try {
      const { error } = await supabase.from('club_members').insert({
        club_id: clubId,
        user_id: student.id,
        role: 'member',
        added_by: user?.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast({ type: 'info', title: 'Already Member', message: `${student.full_name} is already in this club.` });
          setExistingMemberIds((prev) => new Set(prev).add(student.id));
        } else {
          toast({ type: 'error', title: 'Error', message: error.message });
        }
        return;
      }

      toast({
        type: 'success',
        title: 'Member Enrolled',
        message: `${student.full_name} joined the club roster.`,
      });

      setExistingMemberIds((prev) => new Set(prev).add(student.id));
    } catch (e: any) {
      toast({ type: 'error', title: 'Error', message: e?.message || 'Failed to add member' });
    } finally {
      setAddingId(null);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Add Club Member" onBack={() => navigation.goBack()} />

      <View style={[styles.container, { paddingHorizontal: Layout.screenPadding }]}>
        {/* 1. Universal 58dp Search Bar */}
        <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
          <Feather name="search" size={20} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder="Search students..."
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

        {/* 2. Universal 58dp Department Dropdown Bar */}
        <TouchableOpacity
          style={[
            styles.bar58,
            styles.dropdownBar,
            { backgroundColor: C.surface, borderColor: C.border, marginBottom: 14 },
          ]}
          onPress={() => setDeptModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.barLeft}>
            <Feather name={activeDeptObj.icon} size={28} color={C.text} />
            <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {activeDeptObj.name}
            </Text>
          </View>
          <View style={styles.barRightGroup}>
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

        {/* 3. Students List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.brand} size="large" />
            <Text style={[styles.loadingTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}>
              Loading student directory...
            </Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {searchQuery ? 'No students match your search' : 'No eligible students found in this department'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => {
              const metaParts: string[] = [];
              if (item.department) metaParts.push(item.department);
              if (item.intake) metaParts.push(`Intake ${item.intake}`);
              if (item.student_id) metaParts.push(item.student_id);
              const metaLine = metaParts.join(' · ') || item.email || 'Student';
              const isAdding = addingId === item.id;

              return (
                <View style={[styles.studentCard58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Avatar uri={item.avatar_url} name={item.full_name} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.studentName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {item.full_name}
                    </Text>
                    <Text style={[styles.studentMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {metaLine}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: C.brand }]}
                    onPress={() => handleAddMember(item)}
                    disabled={isAdding}
                    activeOpacity={0.8}
                  >
                    {isAdding ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <Text style={[styles.addBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                        Add
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* ─────────────────────────────────────────────────────────────
          DEPARTMENT SELECTION BOTTOM SHEET (58dp Option Bars)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDeptModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, maxHeight: '80%' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Select Department
            </Text>
            <FlatList
              data={DEPARTMENTS}
              keyExtractor={(d) => d.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
              renderItem={({ item: dept }) => {
                const isSelected = selectedDept === dept.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        backgroundColor: isSelected ? C.surface2 : C.bg,
                        borderColor: isSelected ? C.text : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedDept(dept.id);
                      setDeptModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.barLeft}>
                      <Feather name={dept.icon} size={28} color={C.text} />
                      <Text
                        style={[
                          styles.barTitle,
                          {
                            color: C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {dept.name}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color={C.text} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  container: { flex: 1, paddingTop: 10 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 } as ViewStyle,
  loadingTxt: { fontSize: 13 } as TextStyle,

  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 14,
    flexShrink: 1,
  } as TextStyle,
  barRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  } as TextStyle,

  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  } as ViewStyle,
  countPillTxt: {
    fontSize: 11,
  } as TextStyle,

  studentCard58: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  studentName: {
    fontSize: 14,
  } as TextStyle,
  studentMeta: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,

  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  addBtnTxt: {
    fontSize: 12,
  } as TextStyle,

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 20,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 14,
    textAlign: 'center',
  } as TextStyle,

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
  } as ViewStyle,
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 18,
    marginBottom: 16,
    paddingHorizontal: 4,
  } as TextStyle,
});

