// Student Directory - university-wide peer discovery network.
// Features: segmented discovery (All Students / My Connections / Requests),
// smart cohort matching (My Classmates), department filtering, CR badges,
// blood group indicators, and instant contact reveal via ContactSheet.

import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ScrollView, RefreshControl, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { FontFamily, Layout, Accent, SectorColors, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useMessages } from '../../store/messagesStore';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import {
  connectErrorKey,
  sendConnectionRequest,
  cancelConnectionRequest,
  respondConnection,
} from '../../services/connectionsService';

type ConnState = 'none' | 'requested' | 'incoming' | 'connected';
type TabKey = 'all' | 'connections' | 'requests';

export interface Student {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  department: string;
  program?: string | null;
  intake: string;
  section: string;
  blood_group?: string | null;
  student_id?: string | null;
  is_cr?: boolean;
  email?: string | null;
  whatsapp?: string | null;
  connState: ConnState;
}

const DEPARTMENTS = ['All', 'CSE', 'EEE', 'BBA', 'Law', 'English', 'Civil', 'Textile', 'Economics'];

const STATUS_MAP: Record<string, ConnState> = {
  accepted: 'connected',
  pending_outgoing: 'requested',
  pending_incoming: 'incoming',
  none: 'none',
};

export function DirectoryScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const { reload: reloadMessages } = useMessages();
  const t = useT();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [classmatesOnly, setClassmatesOnly] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});
  const [contactStudent, setContactStudent] = useState<Student | null>(null);

  const isHidden = profile?.directory_visible === false;

  const load = useCallback(async () => {
    if (!user?.id) return;
    const cacheKey = CacheKeys.DIRECTORY(user.id);

    // 1. Optimistic cache load
    const cached = await getCache<Student[]>(cacheKey);
    if (cached && cached.length) setStudents(cached);
    if (!cached || cached.length === 0) setLoading(true);

    // 2. Network sync
    try {
      const { data: profiles, error } = await supabase.rpc('student_directory');
      if (error) {
        if (cached && cached.length) setIsOffline(true);
        return;
      }
      setIsOffline(false);
      const rows: Student[] = (profiles ?? []).map((p: any) => ({
        ...p,
        connState: STATUS_MAP[p.status as string] ?? 'none',
      }));
      setStudents(rows);
      setCache(cacheKey, rows);
    } catch {
      if (cached && cached.length) setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function updateStudentState(studentId: string, newState: ConnState) {
    if (!user?.id) return;
    setStudents(prev => {
      const updated = prev.map(s => (s.id === studentId ? { ...s, connState: newState } : s));
      setCache(CacheKeys.DIRECTORY(user.id), updated);
      return updated;
    });
  }

  async function handleConnect(studentId: string) {
    if (!user || actionBusy[studentId]) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to send requests.' });
      return;
    }
    setActionBusy(prev => ({ ...prev, [studentId]: true }));
    const res = await sendConnectionRequest(studentId);
    setActionBusy(prev => ({ ...prev, [studentId]: false }));

    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: t.directory2[connectErrorKey(res.error)] });
      await load();
      return;
    }
    updateStudentState(studentId, 'requested');
    toast({ type: 'success', title: t.directory2.requestSent });
  }

  async function handleCancel(studentId: string) {
    if (!user || actionBusy[studentId]) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to cancel requests.' });
      return;
    }
    setActionBusy(prev => ({ ...prev, [studentId]: true }));
    const res = await cancelConnectionRequest(studentId);
    setActionBusy(prev => ({ ...prev, [studentId]: false }));

    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      await load();
      return;
    }
    updateStudentState(studentId, 'none');
    toast({ type: 'info', title: t.directory2.requestCancelled });
  }

  async function handleAccept(studentId: string) {
    if (!user || actionBusy[studentId]) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to manage requests.' });
      return;
    }
    setActionBusy(prev => ({ ...prev, [studentId]: true }));
    const res = await respondConnection(studentId, true);
    setActionBusy(prev => ({ ...prev, [studentId]: false }));

    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      await load();
      return;
    }
    updateStudentState(studentId, 'connected');
    reloadMessages();
    toast({ type: 'success', title: t.directory2.connected });
    await load();
  }

  async function handleDecline(studentId: string) {
    if (!user || actionBusy[studentId]) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to manage requests.' });
      return;
    }
    setActionBusy(prev => ({ ...prev, [studentId]: true }));
    const res = await respondConnection(studentId, false);
    setActionBusy(prev => ({ ...prev, [studentId]: false }));

    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      await load();
      return;
    }
    updateStudentState(studentId, 'none');
    toast({ type: 'info', title: t.directory2.declined });
  }

  // Count metrics for tabs
  const incomingCount = useMemo(() => students.filter(s => s.connState === 'incoming').length, [students]);
  const outgoingCount = useMemo(() => students.filter(s => s.connState === 'requested').length, [students]);
  const connectedCount = useMemo(() => students.filter(s => s.connState === 'connected').length, [students]);
  const requestsTotal = incomingCount + outgoingCount;

  // Filter pipeline
  const filteredStudents = useMemo(() => {
    let list = students;

    // Tab isolation
    if (tab === 'connections') {
      list = list.filter(s => s.connState === 'connected');
    } else if (tab === 'requests') {
      list = list.filter(s => s.connState === 'incoming' || s.connState === 'requested');
    }

    // Classmates shortcut
    if (classmatesOnly && profile?.intake && profile?.section) {
      list = list.filter(s => s.intake === profile.intake && s.section === profile.section);
    }

    // Department filter
    if (selectedDept !== 'All') {
      list = list.filter(s => s.department?.toLowerCase() === selectedDept.toLowerCase());
    }

    // Multi-attribute search query
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(s => {
        return (
          (s.full_name && s.full_name.toLowerCase().includes(q)) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.intake && s.intake.toLowerCase().includes(q)) ||
          (s.section && s.section.toLowerCase().includes(q)) ||
          (s.blood_group && s.blood_group.toLowerCase().includes(q)) ||
          (s.student_id && s.student_id.toLowerCase().includes(q)) ||
          (s.program && s.program.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [students, tab, classmatesOnly, selectedDept, query, profile?.intake, profile?.section]);

  const hasCohort = !!(profile?.intake && profile?.section);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.sectors.directory} onBack={() => navigation.goBack()} />
      <OfflineBanner
        visible={isOffline}
        message="Showing cached student directory. Connect to internet to manage connection requests."
      />

      {/* Reciprocal Privacy Guard: Profile Hidden State */}
      {isHidden ? (
        <View style={styles.hiddenContainer}>
          <View style={[styles.hiddenIconBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Icon name="eyeOff" size={32} color={C.brand} />
          </View>
          <Text style={[styles.hiddenTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.directory2.hiddenTitle}
          </Text>
          <Text style={[styles.hiddenBody, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.directory2.hiddenBody}
          </Text>
          <TouchableOpacity
            style={[styles.hiddenBtn, { backgroundColor: C.brand }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.85}
          >
            <Text style={[styles.hiddenBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {t.directory2.goToProfile}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={s => s.id}
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              {/* Segmented Track Switcher */}
              <View style={[styles.tabTrack, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <TouchableOpacity
                  style={[styles.tabBtn, tab === 'all' && [styles.tabBtnActive, { backgroundColor: C.surface }]]}
                  onPress={() => setTab('all')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabTxt, { color: tab === 'all' ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.tabAll}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, tab === 'connections' && [styles.tabBtnActive, { backgroundColor: C.surface }]]}
                  onPress={() => setTab('connections')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabTxt, { color: tab === 'connections' ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.tabConnections}
                  </Text>
                  {connectedCount > 0 && (
                    <View style={[styles.countPill, { backgroundColor: pillBg(Accent.teal, isDark) }]}>
                      <Text style={[styles.countPillTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>
                        {connectedCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, tab === 'requests' && [styles.tabBtnActive, { backgroundColor: C.surface }]]}
                  onPress={() => setTab('requests')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabTxt, { color: tab === 'requests' ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.tabRequests}
                  </Text>
                  {requestsTotal > 0 && (
                    <View style={[styles.countPill, { backgroundColor: incomingCount > 0 ? C.brand : C.warnBg }]}>
                      <Text style={[styles.countPillTxt, { color: incomingCount > 0 ? '#fff' : C.warn, fontFamily: FontFamily.jakartaBold }]}>
                        {requestsTotal}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Icon name="search" size={17} color={C.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
                  placeholder={t.directory2.searchPlaceholderFull}
                  placeholderTextColor={C.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                    <Icon name="x" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Chips (Visible in 'all' tab) */}
              {tab === 'all' && (
                <View style={styles.chipsBlock}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                    {/* Smart Classmates Chip */}
                    {hasCohort && (
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          classmatesOnly
                            ? [styles.chipActive, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]
                            : [styles.chipInactive, { backgroundColor: C.surface, borderColor: C.border }],
                        ]}
                        onPress={() => setClassmatesOnly(!classmatesOnly)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipTxt, { color: classmatesOnly ? '#b45309' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                          ✨ {t.directory2.myClassmatesChip(profile!.intake!, profile!.section!)}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Department Pills */}
                    {DEPARTMENTS.map(dept => {
                      const active = selectedDept === dept;
                      return (
                        <TouchableOpacity
                          key={dept}
                          style={[
                            styles.chip,
                            active
                              ? [styles.chipActive, { backgroundColor: C.brand, borderColor: C.brand }]
                              : [styles.chipInactive, { backgroundColor: C.surface, borderColor: C.border }],
                          ]}
                          onPress={() => setSelectedDept(dept)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipTxt, { color: active ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                            {dept === 'All' ? t.directory2.allDepts : dept}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            loading && students.length === 0 ? (
              <View style={styles.emptyLoading}>
                <ActivityIndicator size="small" color={C.brand} />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="directory" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {tab === 'connections'
                    ? t.directory2.noConnections
                    : tab === 'requests'
                    ? t.directory2.noRequests
                    : t.common.noResults}
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {tab === 'connections'
                    ? t.directory2.noConnectionsSub
                    : tab === 'requests'
                    ? t.directory2.noRequestsSub
                    : 'Try a different search term or clear filters.'}
                </Text>
              </View>
            )
          }
          renderItem={({ item: s }) => {
            const isBusy = !!actionBusy[s.id];
            const metaParts = [s.department, s.intake ? `Intake ${s.intake}` : null, s.section ? `Sec ${s.section}` : null]
              .filter(Boolean)
              .join(' · ');

            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    style={styles.identity}
                    onPress={() => navigation.navigate('StudentProfile', { student: s })}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={s.avatar_url} name={s.full_name} size="md" />
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {s.full_name}
                      </Text>

                      {metaParts.length > 0 && (
                        <Text style={[styles.cardMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                          {metaParts}
                        </Text>
                      )}

                      {/* Badges: CR + Blood */}
                      <View style={styles.cardBadges}>
                        {s.is_cr ? (
                          <View style={[styles.miniCrBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                            <Text style={[styles.miniCrTxt, { color: '#b45309', fontFamily: FontFamily.jakartaBold }]}>
                              CR
                            </Text>
                          </View>
                        ) : null}

                        {s.blood_group ? (
                          <View style={[styles.miniBloodBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                            <Text style={[styles.miniBloodTxt, { color: '#b91c1c', fontFamily: FontFamily.jakartaBold }]}>
                              {s.blood_group}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Right Action based on Tab and Status */}
                  {tab === 'connections' ? (
                    <View style={styles.connActionsRow}>
                      <TouchableOpacity
                        style={[styles.smallIconBtn, { backgroundColor: C.brand }]}
                        onPress={() => navigation.navigate('MessageThread', { kind: 'dm', id: s.id, title: s.full_name })}
                        activeOpacity={0.8}
                      >
                        <Icon name="chat" size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallIconBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                        onPress={() => setContactStudent(s)}
                        activeOpacity={0.8}
                      >
                        <Icon name="phone" size={14} color={C.text} />
                      </TouchableOpacity>
                    </View>
                  ) : s.connState === 'connected' ? (
                    <TouchableOpacity
                      style={[styles.connPillBtn, { backgroundColor: pillBg(Accent.teal, isDark) }]}
                      onPress={() => setContactStudent(s)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.connDot, { backgroundColor: Accent.teal }]} />
                      <Text style={[styles.connTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>
                        {t.directory2.connected}
                      </Text>
                    </TouchableOpacity>
                  ) : s.connState === 'requested' ? (
                    <View style={styles.requestedBox}>
                      <View style={[styles.connPill, { backgroundColor: C.warnBg }]}>
                        <View style={[styles.connDot, { backgroundColor: C.warn }]} />
                        <Text style={[styles.connTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                          {t.directory2.requested}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.cancelLink, { borderColor: C.border }]}
                        onPress={() => handleCancel(s.id)}
                        disabled={isBusy}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cancelLinkTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                          {t.directory2.cancelRequest}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : s.connState === 'none' ? (
                    <TouchableOpacity
                      style={[styles.connectBtn, { backgroundColor: C.brand, opacity: isBusy ? 0.6 : 1 }]}
                      onPress={() => handleConnect(s.id)}
                      disabled={isBusy}
                      activeOpacity={0.85}
                    >
                      <Icon name="userPlus" size={14} color="#fff" />
                      <Text style={[styles.connectTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                        {t.directory2.connect}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Incoming Request Notification Row */}
                {s.connState === 'incoming' && (
                  <View style={[styles.incomingArea, { borderTopColor: C.border }]}>
                    <Text style={[styles.wantsToConnect, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.wantsToConnect}
                    </Text>
                    <View style={styles.incomingActions}>
                      <TouchableOpacity
                        style={[styles.halfActionBtn, { backgroundColor: C.brand, opacity: isBusy ? 0.6 : 1 }]}
                        onPress={() => handleAccept(s.id)}
                        disabled={isBusy}
                        activeOpacity={0.85}
                      >
                        <Icon name="check" size={14} color="#fff" />
                        <Text style={[styles.halfBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                          {t.directory2.accept}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.halfActionBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                        onPress={() => handleDecline(s.id)}
                        disabled={isBusy}
                        activeOpacity={0.85}
                      >
                        <Icon name="x" size={14} color={C.text} />
                        <Text style={[styles.halfBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {t.directory2.decline}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Standardized ContactSheet for One-Tap Call, WhatsApp, Mail, DM */}
      {contactStudent ? (
        <ContactSheet
          visible={!!contactStudent}
          name={contactStudent.full_name}
          roleSubtitle={`${contactStudent.department} · Intake ${contactStudent.intake} · Sec ${contactStudent.section}`}
          avatarUri={contactStudent.avatar_url}
          phone={contactStudent.whatsapp}
          email={contactStudent.email}
          inAppChatAction={() => {
            const tgt = contactStudent;
            setContactStudent(null);
            navigation.navigate('MessageThread', { kind: 'dm', id: tgt.id, title: tgt.full_name });
          }}
          onClose={() => setContactStudent(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 24 } as ViewStyle,

  headerBlock: { marginBottom: 12 } as ViewStyle,

  tabTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 10,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  } as ViewStyle,
  tabBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,
  tabTxt: { fontSize: 13 } as TextStyle,
  countPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  } as ViewStyle,
  countPillTxt: { fontSize: 11 } as TextStyle,

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 11 } as TextStyle,

  chipsBlock: { marginBottom: 4 } as ViewStyle,
  chipsScroll: { gap: 7 } as ViewStyle,
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,
  chipActive: {} as ViewStyle,
  chipInactive: {} as ViewStyle,
  chipTxt: { fontSize: 12.5 } as TextStyle,

  emptyLoading: { paddingVertical: 40, alignItems: 'center' } as ViewStyle,
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 } as ViewStyle,
  emptyTitle: { fontSize: 16, marginTop: 12, textAlign: 'center' } as TextStyle,
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 } as TextStyle,

  card: { padding: 13, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardName: { fontSize: 14.5, letterSpacing: -0.01 } as TextStyle,
  cardMeta: { fontSize: 12, marginTop: 2 } as TextStyle,
  cardBadges: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 } as ViewStyle,

  miniCrBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  } as ViewStyle,
  miniCrTxt: { fontSize: 9.5 } as TextStyle,
  miniBloodBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  } as ViewStyle,
  miniBloodTxt: { fontSize: 9.5 } as TextStyle,

  connPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  } as ViewStyle,
  connPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  } as ViewStyle,
  connDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  connTxt: { fontSize: 11.5 } as TextStyle,

  requestedBox: { alignItems: 'flex-end', gap: 3 } as ViewStyle,
  cancelLink: { paddingHorizontal: 4, paddingVertical: 1 } as ViewStyle,
  cancelLinkTxt: { fontSize: 11 } as TextStyle,

  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  } as ViewStyle,
  connectTxt: { fontSize: 12.5 } as TextStyle,

  connActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  incomingArea: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 } as ViewStyle,
  wantsToConnect: { fontSize: 12, marginBottom: 7 } as TextStyle,
  incomingActions: { flexDirection: 'row', gap: 8 } as ViewStyle,
  halfActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 35,
    borderRadius: 9,
  } as ViewStyle,
  halfBtnTxt: { fontSize: 13 } as TextStyle,

  hiddenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  } as ViewStyle,
  hiddenIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  } as ViewStyle,
  hiddenTitle: { fontSize: 18, marginBottom: 8, textAlign: 'center' } as TextStyle,
  hiddenBody: { fontSize: 13.5, textAlign: 'center', lineHeight: 20, marginBottom: 20 } as TextStyle,
  hiddenBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  } as ViewStyle,
  hiddenBtnTxt: { fontSize: 14 } as TextStyle,
});
