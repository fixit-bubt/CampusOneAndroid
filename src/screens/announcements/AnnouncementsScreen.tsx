import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, Platform,
  RefreshControl, Alert, TextInput, Modal, Pressable,
  ActivityIndicator, Animated, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { LogoMark } from '../../components/ui/Logo';
import { FontFamily, Layout, Accent, SectorColors, pillBg, Radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, CacheKeys } from '../../services/cacheService';
import { useToast } from '../../components/ui/Toast';
import { useT } from '../../i18n';
import type { Announcement } from '../../types/database';
import {
  fetchAnnouncementsFeed,
  toggleAnnouncementBookmark,
  triggerNoticeSync,
  markAnnouncementAsRead,
  ANNOUNCEMENT_CATEGORIES,
  KNOWN_DEPARTMENTS,
} from '../../services/announcementService';

export type MainTab = 'all' | 'urgent' | 'saved';

function priTone(C: any, priority: string, isDark?: boolean): { fg: string; bg: string } {
  switch (priority) {
    case 'Urgent':    return { fg: C.danger, bg: C.dangerBg };
    case 'Important': return { fg: C.warn,   bg: C.warnBg };
    default:          return { fg: Accent.slate, bg: pillBg(Accent.slate, isDark) };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

const AnnouncementCard = memo(function AnnouncementCard({
  a,
  C,
  isDark,
  unread,
  isSaved,
  canDelete,
  onToggleSave,
  onDelete,
  onPress,
}: {
  a: Announcement;
  C: any;
  isDark: boolean;
  unread: boolean;
  isSaved: boolean;
  canDelete: boolean;
  onToggleSave: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
  onPress: (id: string) => void;
}) {
  const { fg, bg: priBg } = priTone(C, a.priority, isDark);
  const isOfficial = a.source === 'bubt_official' || a.code?.startsWith('BUBT-N-');
  const bg = `${fg}1a`;

  const handleCardPress = useCallback(() => onPress(a.id), [onPress, a.id]);
  const handleToggle = useCallback(() => onToggleSave(a), [onToggleSave, a]);
  const handleDelete = useCallback(() => onDelete(a), [onDelete, a]);

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      activeOpacity={0.75}
    >
      <View style={[styles.thumb, { backgroundColor: bg }]}>
        <Icon name="announce" size={22} color={fg} />
        {unread && <View style={[styles.unreadDot, { backgroundColor: C.brand, borderColor: C.surface }]} />}
      </View>

      <View style={styles.cardBody}>
        {/* Eyebrow: Department, Time, Official Badge */}
        <View style={styles.eyebrowRow}>
          <Text
            style={[styles.cardEyebrow, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}
            numberOfLines={1}
          >
            {a.department_code && a.department_code !== 'ALL'
              ? `${a.department_code} · `
              : `${a.department} · `}
            {timeAgo(a.created_at)}
          </Text>

          {isOfficial && (
            <View style={[styles.officialBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#e0edff' }]}>
              <Feather name="check-circle" size={10} color="#2563eb" />
              <Text style={[styles.officialTxt, { color: '#2563eb', fontFamily: FontFamily.jakartaBold }]}>
                BUBT Official
              </Text>
            </View>
          )}

          {/* Bookmark Button */}
          <TouchableOpacity
            onPress={handleToggle}
            hitSlop={8}
            activeOpacity={0.7}
            style={styles.starBtn}
          >
            <Feather
              name="bookmark"
              size={15}
              color={isSaved ? Accent.gold : C.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text
          style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
          numberOfLines={2}
        >
          {a.title}
        </Text>

        {/* Cohesive Metadata Bar */}
        <View style={styles.cardMetaBar}>
          <View style={[styles.priPill, { backgroundColor: priBg }]}>
            <View style={[styles.priDot, { backgroundColor: fg }]} />
            <Text style={[styles.priText, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
              {a.priority}
            </Text>
          </View>

          {a.category && (
            <View style={[styles.catPill, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Text style={[styles.catText, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {a.category}
              </Text>
            </View>
          )}

          {a.pinned && (
            <View style={[styles.pinnedPill, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#e0edff' }]}>
              <Icon name="pin" size={10} color={C.brand} />
              <Text style={[styles.pinnedTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                Pinned
              </Text>
            </View>
          )}

          {a.attachment_url && (
            <View style={[styles.attachBadge, { backgroundColor: isDark ? 'rgba(214, 61, 53, 0.14)' : '#fee2e2' }]}>
              <Feather name="file-text" size={10} color={C.danger} />
              <Text style={[styles.attachTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                PDF
              </Text>
            </View>
          )}

          {a.image_url && !a.attachment_url && (
            <View style={[styles.attachBadge, { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.14)' : '#e0f4f0' }]}>
              <Feather name="image" size={10} color={SectorColors.jobs} />
              <Text style={[styles.attachTxt, { color: SectorColors.jobs, fontFamily: FontFamily.jakartaBold }]}>
                Photo
              </Text>
            </View>
          )}
        </View>
      </View>

      {canDelete && (
        <TouchableOpacity onPress={handleDelete} hitSlop={8} activeOpacity={0.7} style={{ padding: 4 }}>
          <Feather name="trash-2" size={15} color={C.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

export function AnnouncementsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const isAdmin = profile?.role === 'admin';
  const studentDept = profile?.department || '';

  const [items, setItems] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [mainTab, setMainTab] = useState<MainTab>('all');
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [includeUniversal, setIncludeUniversal] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);


  const load = useCallback(async () => {
    // 1. Instant Cache Load
    const cachedItems = await getCache<Announcement[]>(CacheKeys.ANNOUNCEMENTS);
    if (cachedItems && cachedItems.length > 0) {
      setItems(cachedItems);
    }
    if (user?.id) {
      const cachedReads = await getCache<string[]>(CacheKeys.ANNOUNCEMENT_READS(user.id));
      if (cachedReads) setReadIds(new Set(cachedReads));
      const cachedSaves = await getCache<string[]>(CacheKeys.ANNOUNCEMENT_BOOKMARKS(user.id));
      if (cachedSaves) setSavedIds(new Set(cachedSaves));
    }

    // 2. Fetch fresh
    const res = await fetchAnnouncementsFeed(user?.id);
    if (res.error) {
      if (cachedItems && cachedItems.length > 0) setIsOffline(true);
      return;
    }

    setIsOffline(false);
    setItems(res.items);
    setReadIds(res.readIds);
    setSavedIds(res.savedIds);
  }, [user?.id]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [load, navigation]);

  async function onRefresh() {
    setRefreshing(true);
    const res = await triggerNoticeSync(false);
    await load();
    setRefreshing(false);
    if (res.success && (res.newAdded ?? 0) > 0) {
      toast({ type: 'success', title: t.announce2.syncSuccess(res.newAdded!) });
    }
  }

  const handlePressCard = useCallback((id: string) => {
    if (user?.id && !readIds.has(id)) {
      setReadIds(prev => new Set(prev).add(id));
      markAnnouncementAsRead(id, user.id);
    }
    navigation.navigate('AnnouncementDetail', { announcementId: id });
  }, [navigation, user?.id, readIds]);

  const handleToggleSave = useCallback(async (item: Announcement) => {
    if (!user?.id) {
      toast({ type: 'info', title: t.common.error, message: 'Please sign in to save notices.' });
      return;
    }
    const currentlySaved = savedIds.has(item.id);
    const nextSaved = new Set(savedIds);
    if (currentlySaved) {
      nextSaved.delete(item.id);
    } else {
      nextSaved.add(item.id);
    }
    setSavedIds(nextSaved);

    const res = await toggleAnnouncementBookmark(item.id, user.id, currentlySaved);
    if (!res.success) {
      setSavedIds(savedIds); // rollback
      toast({ type: 'error', title: t.common.error, message: res.error });
    } else {
      toast({
        type: 'success',
        title: currentlySaved ? t.announce2.bookmarkRemoved : t.announce2.bookmarkSaved,
      });
    }
  }, [user?.id, savedIds, toast, t]);

  async function handleManualSync(deep = false) {
    if (syncing) return;
    setSyncing(true);
    toast({ type: 'info', title: deep ? 'Deep crawling BUBT archive…' : t.announce2.syncing });
    const res = await triggerNoticeSync(deep);
    setSyncing(false);

    if (res.success) {
      await load();
      if ((res.newAdded ?? 0) > 0) {
        toast({ type: 'success', title: t.announce2.syncSuccess(res.newAdded!) });
      } else {
        toast({ type: 'info', title: t.announce2.syncUpToDate });
      }
    } else {
      toast({ type: 'error', title: t.announce2.syncFailed, message: res.error });
    }
  }

  const deleteAnnouncement = useCallback((a: Announcement) => {
    Alert.alert(t.common.delete, a.title, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('announcements')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', a.id);
          if (error) {
            toast({ type: 'error', title: t.common.error, message: error.message });
            return;
          }
          setItems(prev => prev.filter(x => x.id !== a.id));
        },
      },
    ]);
  }, [t, toast]);

  // Department options
  const deptOptions = useMemo(() => {
    return [
      { id: 'ALL', label: 'All Departments' },
      ...(studentDept ? [{ id: 'MY_DEPT', label: `My Department (${studentDept})` }] : []),
      { id: 'CSE', label: 'Computer Science & Engineering (CSE)' },
      { id: 'EEE', label: 'Electrical & Electronic Engineering (EEE)' },
      { id: 'Civil', label: 'Civil Engineering' },
      { id: 'Textile', label: 'Textile Engineering' },
      { id: 'Business', label: 'Faculty of Business (BBA / MBA)' },
      { id: 'Law', label: 'Law & Justice' },
      { id: 'English', label: 'Department of English' },
      { id: 'Economics', label: 'Department of Economics' },
      { id: 'EXAM', label: 'Controller of Examinations' },
      { id: 'REG', label: 'Office of the Registrar' },
    ];
  }, [studentDept]);

  // 1. Search Query Filter
  const searchedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.body && a.body.toLowerCase().includes(q)) ||
      (a.department && a.department.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.code && a.code.toLowerCase().includes(q))
    );
  }, [items, query]);

  // 2. Scoped by Category & Department (the universe of notices for current category & department)
  const scopedItems = useMemo(() => {
    let result = searchedItems;

    // Category Filter
    if (categoryFilter !== 'all') {
      const selectedCat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === categoryFilter);
      if (selectedCat?.slug) {
        result = result.filter(a =>
          a.category_slug === selectedCat.slug ||
          a.category?.toLowerCase() === selectedCat.label.toLowerCase()
        );
      }
    }

    // Department Filter
    if (deptFilter === 'MY_DEPT' && studentDept) {
      result = result.filter(a => {
        const d = (a.department || '').toLowerCase();
        const dc = (a.department_code || '').toLowerCase();
        const sd = studentDept.toLowerCase();
        return (
          dc === 'all' ||
          d === 'all' ||
          d.includes('university-wide') ||
          d.includes('administration') ||
          d.includes('controller of examinations') ||
          d.includes('registrar') ||
          d.includes(sd) ||
          dc.includes(sd)
        );
      });
    } else if (deptFilter !== 'ALL') {
      const targetDept = KNOWN_DEPARTMENTS.find(d => d.id === deptFilter);
      if (targetDept) {
        const code = targetDept.shortCode.toLowerCase();
        const id = targetDept.id.toLowerCase();
        result = result.filter(a => {
          const d = (a.department || '').toLowerCase();
          const dc = (a.department_code || '').toLowerCase();
          const isDept =
            d.includes(code) ||
            dc === code ||
            d.includes(id) ||
            dc === id;

          const isUniversal =
            includeUniversal &&
            deptFilter !== 'EXAM' &&
            deptFilter !== 'REG' &&
            (dc === 'all' ||
              d === 'all' ||
              d.includes('university-wide') ||
              d.includes('controller of examinations') ||
              d.includes('office of the registrar'));

          return isDept || isUniversal;
        });
      }
    }

    return result;
  }, [searchedItems, categoryFilter, deptFilter, studentDept, includeUniversal]);

  // 3. Dynamic Synchronized Tab Counts (Unread notices for active tabs, saved bookmarks for saved)
  const tabCounts = useMemo(() => {
    const unreadScoped = scopedItems.filter(a => !readIds.has(a.id));
    const unreadUrgent = unreadScoped.filter(
      a =>
        a.priority === 'Urgent' ||
        a.priority === 'Important' ||
        a.pinned ||
        a.category_slug === 'exam-related' ||
        /exam|routine|viva/i.test(a.title)
    );
    return {
      all: unreadScoped.length,
      urgent: unreadUrgent.length,
      saved: scopedItems.filter(a => savedIds.has(a.id)).length,
    };
  }, [scopedItems, readIds, savedIds]);

  // 4. Filtered List by Main Tab (All Notices | Urgent & Exams | Saved)
  const filtered = useMemo(() => {
    if (mainTab === 'urgent') {
      return scopedItems.filter(a => a.priority === 'Urgent' || a.priority === 'Important' || a.pinned || a.category_slug === 'exam-related' || /exam|routine|viva/i.test(a.title));
    }
    if (mainTab === 'saved') {
      return scopedItems.filter(a => savedIds.has(a.id));
    }
    return scopedItems;
  }, [scopedItems, mainTab, savedIds]);

  // Truncation & Pagination (Top 10 by default with 58dp View More bar)
  const isSearchOrFilterActive = query.trim().length > 0 || categoryFilter !== 'all' || deptFilter !== 'ALL';
  const shouldTruncate = !isSearchOrFilterActive && !expanded && filtered.length > 10;
  const displayedItems = shouldTruncate ? filtered.slice(0, 10) : filtered;
  const remainingCount = filtered.length - 10;

  const handleTabChange = useCallback((newTab: MainTab) => {
    setMainTab(newTab);
    setExpanded(false);
  }, []);

  const activeCategoryLabel = useMemo(() => {
    return ANNOUNCEMENT_CATEGORIES.find(c => c.id === categoryFilter)?.label || t.announce2.allCategories;
  }, [categoryFilter, t.announce2.allCategories]);

  const activeDeptLabel = useMemo(() => {
    if (deptFilter === 'MY_DEPT') return t.announce2.myDepartment(studentDept || 'Dept');
    return deptOptions.find(d => d.id === deptFilter)?.label || t.announce2.allDepartments;
  }, [deptFilter, studentDept, deptOptions, t.announce2]);

  const ANNOUNCEMENT_TABS: TabItem<MainTab>[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: tabCounts.all > 0 ? tabCounts.all : undefined, color: SectorColors.announce },
      { id: 'urgent', label: 'Urgent', count: tabCounts.urgent > 0 ? tabCounts.urgent : undefined, color: C.danger },
      { id: 'saved', label: 'Saved', count: tabCounts.saved > 0 ? tabCounts.saved : undefined, color: Accent.gold },
    ],
    [tabCounts.all, tabCounts.urgent, tabCounts.saved, C.danger]
  );

  const renderCard = useCallback(({ item }: { item: Announcement }) => (
    <AnnouncementCard
      a={item}
      C={C}
      isDark={isDark}
      unread={!readIds.has(item.id)}
      isSaved={savedIds.has(item.id)}
      canDelete={isAdmin}
      onToggleSave={handleToggleSave}
      onDelete={deleteAnnouncement}
      onPress={handlePressCard}
    />
  ), [C, isDark, readIds, savedIds, isAdmin, handleToggleSave, deleteAnnouncement, handlePressCard]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.announce2.title}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.topRightActions}>
            {isAdmin && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => navigation.navigate('AnnouncePost')}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={21} color={C.text} />
              </TouchableOpacity>
            )}
            <LogoMark size={28} shadow={false} />
          </View>
        }
      />

      {/* 1. Animated Segmented Switcher (3 Tabs: All | Urgent | Saved) */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 4 }}>
        <SegmentedTabs
          tabs={ANNOUNCEMENT_TABS}
          activeTab={mainTab}
          onTabChange={handleTabChange}
        />
      </View>

      {/* 2. Global Search Bar */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6, paddingBottom: 6 }}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Icon name="search" size={18} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder={t.announce2.searchPlaceholder}
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={15} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Dual Dropdown Selector Bars */}
      <View style={[styles.dualBarRow, { paddingHorizontal: Layout.screenPadding }]}>
        {/* Category Dropdown Bar */}
        <TouchableOpacity
          style={[
            styles.dualBarBtn,
            categoryFilter !== 'all'
              ? { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#e0edff', borderColor: C.brand }
              : { backgroundColor: C.surface, borderColor: C.border },
          ]}
          onPress={() => setCategoryModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.dualBarLeft}>
            <Feather
              name="layers"
              size={16}
              color={categoryFilter !== 'all' ? C.brand : C.textMuted}
            />
            <Text
              style={[
                styles.dualBarTxt,
                {
                  color: categoryFilter !== 'all' ? C.brand : C.text,
                  fontFamily: categoryFilter !== 'all' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
              numberOfLines={1}
            >
              {activeCategoryLabel}
            </Text>
          </View>
          <Feather
            name="chevron-down"
            size={16}
            color={categoryFilter !== 'all' ? C.brand : C.textMuted}
          />
        </TouchableOpacity>

        {/* Department Dropdown Bar */}
        <TouchableOpacity
          style={[
            styles.dualBarBtn,
            deptFilter !== 'ALL'
              ? { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.16)' : '#e0f4f0', borderColor: SectorColors.jobs }
              : { backgroundColor: C.surface, borderColor: C.border },
          ]}
          onPress={() => setDeptModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.dualBarLeft}>
            <Feather
              name="shield"
              size={16}
              color={deptFilter !== 'ALL' ? SectorColors.jobs : C.textMuted}
            />
            <Text
              style={[
                styles.dualBarTxt,
                {
                  color: deptFilter !== 'ALL' ? SectorColors.jobs : C.text,
                  fontFamily: deptFilter !== 'ALL' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                },
              ]}
              numberOfLines={1}
            >
              {activeDeptLabel}
            </Text>
          </View>
          <Feather
            name="chevron-down"
            size={16}
            color={deptFilter !== 'ALL' ? SectorColors.jobs : C.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Main Announcements Virtualized List (Locked 60 FPS) */}
      <FlatList
        data={displayedItems}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={<OfflineBanner visible={isOffline} onRetry={load} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="announce" size={36} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {mainTab === 'saved' ? t.announce2.noSavedNotices : t.announce2.noNoticesFound}
            </Text>
            <Text style={[styles.emptyDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {mainTab === 'saved'
                ? t.announce2.noSavedNoticesBody
                : deptFilter !== 'ALL'
                ? `BUBT has not posted specific circulars for ${activeDeptLabel} in this section. General exam schedules and holiday notices are published campus-wide.`
                : t.announce2.noNoticesMatching}
            </Text>

            <View style={styles.emptyActionRow}>
              {deptFilter !== 'ALL' && (
                <TouchableOpacity
                  style={[styles.resetBtn, { backgroundColor: C.brand, borderColor: C.brand }]}
                  onPress={() => setDeptFilter('ALL')}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.resetBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    Show All Campus Notices
                  </Text>
                </TouchableOpacity>
              )}

              {(categoryFilter !== 'all' || deptFilter !== 'ALL' || query.length > 0) && (
                <TouchableOpacity
                  style={[styles.resetBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => {
                    setCategoryFilter('all');
                    setDeptFilter('ALL');
                    setQuery('');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.resetBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.announce2.resetFilters}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListFooterComponent={
          shouldTruncate ? (
            <View style={{ paddingTop: 6, paddingBottom: 28 }}>
              <TouchableOpacity
                style={[styles.viewMoreBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setExpanded(true)}
                activeOpacity={0.75}
              >
                <View style={styles.viewMoreLeft}>
                  <View
                    style={[
                      styles.viewMoreIconBox,
                      {
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.20)' : '#e0edff',
                      },
                    ]}
                  >
                    <Feather name="chevron-down" size={18} color={C.brand} />
                  </View>
                  <Text style={[styles.viewMoreTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    View More Notices ({remainingCount} remaining)
                  </Text>
                </View>
                <Feather name="arrow-down" size={16} color={C.brand} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ height: 28 }} />
          )
        }
      />

      {/* =========================================================================
          MODAL 1: CATEGORY SELECTION SHEET (SEPARATE ROUNDED BARS)
         ========================================================================= */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCategoryModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="layers" size={17} color={C.brand} />
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.announce2.categoryDropdown}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalBarsContainer}>
                {ANNOUNCEMENT_CATEGORIES.map(cat => {
                  const active = categoryFilter === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.pickerBar,
                        { backgroundColor: C.surface, borderColor: C.border },
                        active && {
                          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.14)' : '#eff6ff',
                          borderColor: C.brand,
                        },
                      ]}
                      onPress={() => {
                        setCategoryFilter(cat.id);
                        setCategoryModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.pickerBarLeft}>
                        <View
                          style={[
                            styles.pickerBarIconBox,
                            {
                              backgroundColor: active
                                ? (isDark ? 'rgba(59, 130, 246, 0.25)' : '#dbeafe')
                                : C.surface2,
                            },
                          ]}
                        >
                          <Feather
                            name={cat.icon as any}
                            size={18}
                            color={active ? C.brand : C.textMuted}
                          />
                        </View>
                        <Text
                          style={[
                            styles.pickerBarTitle,
                            {
                              color: active ? C.brand : C.text,
                              fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </View>
                      {active ? (
                        <Feather name="check-circle" size={20} color={C.brand} />
                      ) : (
                        <View style={[styles.radioOutline, { borderColor: C.border }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 2: DEPARTMENT SELECTION SHEET (SEPARATE ROUNDED BARS)
         ========================================================================= */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDeptModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="shield" size={17} color={SectorColors.jobs} />
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.announce2.officeDropdown}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalBarsContainer}>
                {deptOptions.map(dept => {
                  const active = deptFilter === dept.id;
                  return (
                    <TouchableOpacity
                      key={dept.id}
                      style={[
                        styles.pickerBar,
                        { backgroundColor: C.surface, borderColor: C.border },
                        active && {
                          backgroundColor: isDark ? 'rgba(14, 156, 138, 0.14)' : '#e0f4f0',
                          borderColor: SectorColors.jobs,
                        },
                      ]}
                      onPress={() => {
                        setDeptFilter(dept.id);
                        setDeptModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.pickerBarLeft}>
                        <View
                          style={[
                            styles.pickerBarIconBox,
                            {
                              backgroundColor: active
                                ? (isDark ? 'rgba(14, 156, 138, 0.25)' : '#cbf0e8')
                                : C.surface2,
                            },
                          ]}
                        >
                          <Feather
                            name={dept.id === 'ALL' ? 'grid' : dept.id === 'MY_DEPT' ? 'target' : 'shield'}
                            size={18}
                            color={active ? SectorColors.jobs : C.textMuted}
                          />
                        </View>
                        <Text
                          style={[
                            styles.pickerBarTitle,
                            {
                              color: active ? SectorColors.jobs : C.text,
                              fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            },
                          ]}
                        >
                          {dept.label}
                        </Text>
                      </View>
                      {active ? (
                        <Feather name="check-circle" size={20} color={SectorColors.jobs} />
                      ) : (
                        <View style={[styles.radioOutline, { borderColor: C.border }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  topRightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  headerBtn: { padding: 6 } as ViewStyle,

  // Animated Segmented Switcher
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 4,
    position: 'relative',
  } as ViewStyle,

  activeIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 13,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  } as ViewStyle,

  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4.5,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 13,
    zIndex: 1,
  } as ViewStyle,

  tabBtnTxt: {
    fontSize: 12.5,
    flexShrink: 1,
  },

  tabBadge: {
    paddingHorizontal: 5.5,
    paddingVertical: 1,
    borderRadius: 999,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  tabBadgeTxt: {
    fontSize: 10.5,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  // Dual Dropdown Bars Row (58dp Standard)
  dualBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
    paddingBottom: 10,
  } as ViewStyle,
  dualBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  } as ViewStyle,
  dualBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  } as ViewStyle,
  dualBarTxt: {
    flex: 1,
    fontSize: 13.5,
  } as any,

  // Scroll and list
  scroll: { paddingTop: 6, paddingBottom: 24 } as ViewStyle,
  list: { gap: 10 } as ViewStyle,

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 13,
    borderRadius: Radius.lg,
    borderWidth: 1,
  } as ViewStyle,
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,

  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  } as ViewStyle,
  cardEyebrow: {
    fontSize: 11,
    flex: 1,
  } as any,
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  } as ViewStyle,
  officialTxt: {
    fontSize: 10,
  } as any,
  starBtn: {
    padding: 3,
  } as ViewStyle,

  cardTitle: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 8,
  } as any,

  // Card Metadata Bar
  cardMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  } as ViewStyle,
  priPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  } as ViewStyle,
  priDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  } as ViewStyle,
  priText: {
    fontSize: 10.5,
  } as any,
  catPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  } as ViewStyle,
  catText: {
    fontSize: 10.5,
  } as any,
  pinnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  } as ViewStyle,
  pinnedTxt: {
    fontSize: 10,
  } as any,
  attachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  } as ViewStyle,
  attachTxt: {
    fontSize: 10,
  } as any,

  // Empty State
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 10,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 15,
    marginTop: 4,
  } as any,
  emptyDesc: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  } as any,
  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  } as ViewStyle,
  resetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 4,
  } as ViewStyle,
  resetBtnTxt: {
    fontSize: 12,
  } as any,

  // Modal Sheet & Distinct Bars (58dp Standard)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 18,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 28,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  } as ViewStyle,
  modalTitle: {
    fontSize: 16,
  } as any,
  modalBarsContainer: {
    gap: 10,
    paddingBottom: 10,
  } as ViewStyle,

  // Distinct Rounded Picker Bar (Inside Modal - 58dp Standard)
  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  pickerBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,
  pickerBarIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pickerBarTitle: {
    fontSize: 14.5,
    flex: 1,
  } as any,
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
  } as ViewStyle,

  // 58dp View More Notices Bar
  viewMoreBtn: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  } as ViewStyle,
  viewMoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,
  viewMoreIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  viewMoreTxt: {
    fontSize: 14,
  } as any,
});
