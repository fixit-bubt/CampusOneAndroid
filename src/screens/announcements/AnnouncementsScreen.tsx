import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, TextInput, Modal, Pressable,
  ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
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
  ANNOUNCEMENT_CATEGORIES,
  KNOWN_DEPARTMENTS,
} from '../../services/announcementService';

type MainTab = 'all' | 'urgent' | 'saved';

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

function AnnouncementCard({
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
  onToggleSave: () => void;
  onDelete: () => void;
  onPress: () => void;
}) {
  const { fg, bg: priBg } = priTone(C, a.priority, isDark);
  const isOfficial = a.source === 'bubt_official' || a.code?.startsWith('BUBT-N-');
  const bg = `${fg}1a`;

  return (
    <TouchableOpacity
      onPress={onPress}
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

          {/* Bookmark Star Button */}
          <TouchableOpacity
            onPress={onToggleSave}
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

        {/* Metadata row */}
        <View style={styles.cardMeta}>
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
            <View style={styles.pinnedRow}>
              <Icon name="pin" size={11} color={C.brand} />
              <Text style={[styles.pinnedTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                Pinned
              </Text>
            </View>
          )}

          {a.attachment_url && (
            <View style={[styles.attachBadge, { backgroundColor: isDark ? 'rgba(214, 61, 53, 0.14)' : '#fee2e2' }]}>
              <Feather name="file-text" size={11} color={C.danger} />
              <Text style={[styles.attachTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                PDF
              </Text>
            </View>
          )}

          {a.image_url && !a.attachment_url && (
            <View style={[styles.attachBadge, { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.14)' : '#e0f4f0' }]}>
              <Feather name="image" size={11} color={SectorColors.jobs} />
              <Text style={[styles.attachTxt, { color: SectorColors.jobs, fontFamily: FontFamily.jakartaBold }]}>
                Photo
              </Text>
            </View>
          )}
        </View>
      </View>

      {canDelete && (
        <TouchableOpacity onPress={onDelete} hitSlop={8} activeOpacity={0.7} style={{ padding: 4 }}>
          <Feather name="trash-2" size={15} color={C.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

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
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('ALL');
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
    await load();
    setRefreshing(false);
  }

  async function handleToggleSave(item: Announcement) {
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
  }

  async function handleManualSync() {
    if (syncing) return;
    setSyncing(true);
    toast({ type: 'info', title: t.announce2.syncing });
    const res = await triggerNoticeSync();
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

  function deleteAnnouncement(a: Announcement) {
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
  }

  // Filter pipeline: Tab -> Search Query -> Category -> Department
  const filtered = useMemo(() => {
    let result = items;

    // 1. Main Tab Filter
    if (mainTab === 'urgent') {
      result = result.filter(a => a.priority === 'Urgent' || a.priority === 'Important' || a.pinned);
    } else if (mainTab === 'saved') {
      result = result.filter(a => savedIds.has(a.id));
    }

    // 2. Search query
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.body && a.body.toLowerCase().includes(q)) ||
        (a.department && a.department.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.code && a.code.toLowerCase().includes(q))
      );
    }

    // 3. Category Filter
    if (categoryFilter !== 'all') {
      const selectedCat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === categoryFilter);
      if (selectedCat?.slug) {
        result = result.filter(a =>
          a.category_slug === selectedCat.slug ||
          a.category?.toLowerCase() === selectedCat.label.toLowerCase()
        );
      }
    }

    // 4. Department Filter
    if (deptFilter === 'MY_DEPT' && studentDept) {
      result = result.filter(a => {
        const d = (a.department || '').toLowerCase();
        const dc = (a.department_code || '').toLowerCase();
        const sd = studentDept.toLowerCase();
        // Show universal varsity notices PLUS student's own department notices
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
        result = result.filter(a => {
          const d = (a.department || '').toLowerCase();
          const dc = (a.department_code || '').toLowerCase();
          const code = targetDept.shortCode.toLowerCase();
          return d.includes(code) || dc === code;
        });
      }
    }

    return result;
  }, [items, mainTab, query, categoryFilter, deptFilter, savedIds, studentDept]);

  const urgentCount = useMemo(() => {
    return items.filter(a => a.priority === 'Urgent' || a.pinned).length;
  }, [items]);

  const activeCategoryLabel = useMemo(() => {
    return ANNOUNCEMENT_CATEGORIES.find(c => c.id === categoryFilter)?.label || t.announce2.allCategories;
  }, [categoryFilter, t.announce2.allCategories]);

  const activeDeptLabel = useMemo(() => {
    if (deptFilter === 'MY_DEPT') return t.announce2.myDepartment(studentDept || 'Dept');
    return KNOWN_DEPARTMENTS.find(d => d.id === deptFilter)?.label || t.announce2.allDepartments;
  }, [deptFilter, studentDept, t.announce2]);

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
                onPress={handleManualSync}
                disabled={syncing}
                activeOpacity={0.75}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={C.brand} />
                ) : (
                  <Feather name="refresh-cw" size={19} color={C.text} />
                )}
              </TouchableOpacity>
            )}

            {isAdmin && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => navigation.navigate('AnnouncePost')}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={21} color={C.text} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* 1. Segmented Top Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, mainTab === 'all' && { borderBottomColor: C.brand, borderBottomWidth: 2 }]}
          onPress={() => setMainTab('all')}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.tabTxt,
              { color: mainTab === 'all' ? C.brand : C.textMuted, fontFamily: mainTab === 'all' ? FontFamily.jakartaBold : FontFamily.jakartaMedium },
            ]}
          >
            {t.announce2.tabAll} ({items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, mainTab === 'urgent' && { borderBottomColor: C.danger, borderBottomWidth: 2 }]}
          onPress={() => setMainTab('urgent')}
          activeOpacity={0.75}
        >
          <View style={styles.tabWithBadge}>
            <Text
              style={[
                styles.tabTxt,
                { color: mainTab === 'urgent' ? C.danger : C.textMuted, fontFamily: mainTab === 'urgent' ? FontFamily.jakartaBold : FontFamily.jakartaMedium },
              ]}
            >
              {t.announce2.tabUrgent}
            </Text>
            {urgentCount > 0 && (
              <View style={[styles.badgePill, { backgroundColor: C.dangerBg }]}>
                <Text style={[styles.badgeTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                  {urgentCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, mainTab === 'saved' && { borderBottomColor: Accent.gold, borderBottomWidth: 2 }]}
          onPress={() => setMainTab('saved')}
          activeOpacity={0.75}
        >
          <View style={styles.tabWithBadge}>
            <Text
              style={[
                styles.tabTxt,
                { color: mainTab === 'saved' ? Accent.gold : C.textMuted, fontFamily: mainTab === 'saved' ? FontFamily.jakartaBold : FontFamily.jakartaMedium },
              ]}
            >
              {t.announce2.tabSaved}
            </Text>
            {savedIds.size > 0 && (
              <View style={[styles.badgePill, { backgroundColor: `${Accent.gold}22` }]}>
                <Text style={[styles.badgeTxt, { color: Accent.gold, fontFamily: FontFamily.jakartaBold }]}>
                  {savedIds.size}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. Global Search Bar */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 10, paddingBottom: 6 }}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Icon name="search" size={16} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder={t.announce2.searchPlaceholder}
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Dual Dropdown Bars Row: Category & Department */}
      <View style={[styles.dualBarRow, { paddingHorizontal: Layout.screenPadding }]}>
        {/* Category Dropdown */}
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
          <Feather
            name="layers"
            size={13}
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
          <Feather
            name="chevron-down"
            size={14}
            color={categoryFilter !== 'all' ? C.brand : C.textMuted}
          />
        </TouchableOpacity>

        {/* Department Dropdown */}
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
          <Feather
            name="shield"
            size={13}
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
          <Feather
            name="chevron-down"
            size={14}
            color={deptFilter !== 'ALL' ? SectorColors.jobs : C.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Main Announcements List */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="announce" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {mainTab === 'saved' ? t.announce2.noSavedNotices : t.announce2.noNoticesFound}
            </Text>
            <Text
              style={[styles.emptyDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}
            >
              {mainTab === 'saved'
                ? t.announce2.noSavedNoticesBody
                : t.announce2.noNoticesMatching}
            </Text>
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
        ) : (
          <View style={styles.list}>
            {filtered.map(a => (
              <AnnouncementCard
                key={a.id}
                a={a}
                C={C}
                isDark={isDark}
                unread={!readIds.has(a.id)}
                isSaved={savedIds.has(a.id)}
                canDelete={isAdmin}
                onToggleSave={() => handleToggleSave(a)}
                onDelete={() => deleteAnnouncement(a)}
                onPress={() => navigation.navigate('AnnouncementDetail', { announcementId: a.id })}
              />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* =========================================================================
          MODAL 1: CATEGORY SELECTION SHEET
         ========================================================================= */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCategoryModalVisible(false)}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.announce2.categoryDropdown}
              </Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {ANNOUNCEMENT_CATEGORIES.map(cat => {
                const active = categoryFilter === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.modalOption,
                      active && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#f0f6ff' },
                    ]}
                    onPress={() => {
                      setCategoryFilter(cat.id);
                      setCategoryModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.modalOptionLeft}>
                      <Feather
                        name={cat.icon as any}
                        size={16}
                        color={active ? C.brand : C.textMuted}
                      />
                      <Text
                        style={[
                          styles.modalOptionTxt,
                          {
                            color: active ? C.brand : C.text,
                            fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </View>
                    {active && <Feather name="check" size={16} color={C.brand} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* =========================================================================
          MODAL 2: DEPARTMENT SELECTION SHEET
         ========================================================================= */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDeptModalVisible(false)}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.announce2.officeDropdown}
              </Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Optional: My Department Button */}
              {studentDept ? (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    deptFilter === 'MY_DEPT' && {
                      backgroundColor: isDark ? 'rgba(14, 156, 138, 0.14)' : '#e0f4f0',
                    },
                  ]}
                  onPress={() => {
                    setDeptFilter('MY_DEPT');
                    setDeptModalVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.modalOptionLeft}>
                    <Feather name="target" size={16} color={SectorColors.jobs} />
                    <Text
                      style={[
                        styles.modalOptionTxt,
                        {
                          color: deptFilter === 'MY_DEPT' ? SectorColors.jobs : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {t.announce2.myDepartment(studentDept)}
                    </Text>
                  </View>
                  {deptFilter === 'MY_DEPT' && <Feather name="check" size={16} color={SectorColors.jobs} />}
                </TouchableOpacity>
              ) : null}

              {KNOWN_DEPARTMENTS.map(dept => {
                const active = deptFilter === dept.id;
                return (
                  <TouchableOpacity
                    key={dept.id}
                    style={[
                      styles.modalOption,
                      active && { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.12)' : '#e0f4f0' },
                    ]}
                    onPress={() => {
                      setDeptFilter(dept.id);
                      setDeptModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.modalOptionLeft}>
                      <Feather
                        name="briefcase"
                        size={15}
                        color={active ? SectorColors.jobs : C.textMuted}
                      />
                      <Text
                        style={[
                          styles.modalOptionTxt,
                          {
                            color: active ? SectorColors.jobs : C.text,
                            fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {dept.label}
                      </Text>
                    </View>
                    {active && <Feather name="check" size={16} color={SectorColors.jobs} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  topRightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  headerBtn: { padding: 5 } as ViewStyle,

  // Top Segmented Switcher
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  tabTxt: { fontSize: 13 } as any,
  tabWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 } as ViewStyle,
  badgePill: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 10 } as ViewStyle,
  badgeTxt: { fontSize: 10.5 } as any,

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 8,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  } as TextStyle,

  // Dual Dropdown Bars Row
  dualBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
    paddingBottom: 8,
  } as ViewStyle,
  dualBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  } as ViewStyle,
  dualBarTxt: {
    flex: 1,
    fontSize: 12,
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
    flex: 1,
    fontSize: 11,
    textTransform: 'uppercase',
  } as any,
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  } as ViewStyle,
  officialTxt: {
    fontSize: 10,
  } as any,
  starBtn: {
    padding: 2,
  } as ViewStyle,

  cardTitle: {
    fontSize: 14,
    lineHeight: 20,
  } as any,
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
  } as ViewStyle,

  priPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 20,
  } as ViewStyle,
  priDot: { width: 5.5, height: 5.5, borderRadius: 3 } as ViewStyle,
  priText: { fontSize: 10.5 } as any,

  catPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  catText: { fontSize: 10.5 } as any,

  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 } as ViewStyle,
  pinnedTxt: { fontSize: 10.5 } as any,

  attachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  } as ViewStyle,
  attachTxt: { fontSize: 10 } as any,

  // Empty State
  empty: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    gap: 8,
  } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 } as any,
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  } as ViewStyle,
  resetBtnTxt: { fontSize: 12.5 } as any,

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    marginBottom: 6,
  } as ViewStyle,
  modalTitle: { fontSize: 15 } as any,
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
  } as ViewStyle,
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,
  modalOptionTxt: { fontSize: 13.5 } as any,
});
