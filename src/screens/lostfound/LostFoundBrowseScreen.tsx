import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image,
  RefreshControl, Keyboard, Modal, KeyboardAvoidingView, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout, SectorColors, Accent, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import type { LostFoundItem } from '../../types/database';
import { useT } from '../../i18n';

type TabFilter = 'all' | 'Lost' | 'Found' | 'mine';
type StatusFilter = 'Open' | 'Resolved' | 'All';
type CategoryFilter = 'All' | 'Personal' | 'Electronics' | 'Documents' | 'Other';

const CAT_COLOR: Record<string, string> = {
  Personal: Accent.blue,
  Electronics: SectorColors.lostfound,
  Documents: Accent.green,
  Other: Accent.slate,
};

const CAT_ICON: Record<string, string> = {
  Personal: 'user',
  Electronics: 'phone',
  Documents: 'layers',
  Other: 'inbox',
};

const CATEGORIES: { id: CategoryFilter; icon: string; fg: string }[] = [
  { id: 'All', icon: 'grid', fg: Accent.slate },
  { id: 'Personal', icon: 'user', fg: Accent.blue },
  { id: 'Electronics', icon: 'phone', fg: SectorColors.lostfound },
  { id: 'Documents', icon: 'layers', fg: Accent.green },
  { id: 'Other', icon: 'inbox', fg: Accent.slate },
];

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function LFCard({
  item,
  C,
  isDark,
  resolvedLabel = 'Resolved',
  onPress,
}: {
  item: LostFoundItem;
  C: any;
  isDark: boolean;
  resolvedLabel?: string;
  onPress: () => void;
}) {
  const fg = CAT_COLOR[item.category] ?? Accent.slate;
  const bg = pillBg(fg, isDark);
  const isLost = item.type === 'Lost';
  const isResolved = item.status === 'Resolved';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      activeOpacity={0.75}
    >
      <View style={[styles.thumb, { backgroundColor: bg }]}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <Icon name={CAT_ICON[item.category] ?? 'inbox'} size={24} color={fg} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardLoc}>
          <Icon name="pin" size={12} color={C.textMuted} />
          <Text style={[styles.cardLocTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
            {item.location}
          </Text>
          <Text style={[styles.cardDot, { color: C.textMuted }]}>·</Text>
          <Text style={[styles.cardTimeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
            {timeAgo(item.created_at)}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={[styles.typeBadge, isLost ? { backgroundColor: C.dangerBg } : { backgroundColor: C.successBg }]}>
            <View style={[styles.typeDot, { backgroundColor: isLost ? C.danger : C.success }]} />
            <Text style={[styles.typeText, { color: isLost ? C.danger : C.success, fontFamily: FontFamily.jakartaBold }]}>
              {item.type}
            </Text>
          </View>
          <View style={[styles.catBadge, { backgroundColor: bg }]}>
            <Text style={[styles.catBadgeTxt, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
              {item.category}
            </Text>
          </View>
          {isResolved && (
            <View style={[styles.resolvedBadge, { backgroundColor: isDark ? 'rgba(18, 145, 94, 0.2)' : '#e3f5ec' }]}>
              <Feather name="check" size={11} color={C.success} />
              <Text style={[styles.resolvedBadgeTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                {resolvedLabel}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Icon name="chevR" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );
}

export function LostFoundBrowseScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const isStudent = profile?.role === 'student';
  const t = useT();

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [filter, setFilter] = useState<TabFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Open');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Draft filters inside the modal
  const [draftCategory, setDraftCategory] = useState<CategoryFilter>('All');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>('Open');

  const [refreshing, setRefreshing] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [isOffline, setIsOffline] = useState(false);

  const searchInputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    // 1. Optimistic cache load
    const cached = await getCache<LostFoundItem[]>(CacheKeys.LOST_FOUND);
    if (cached && cached.length > 0) {
      setItems(cached);
      setLoadState('ready');
    }

    // 2. Network sync
    try {
      const { data, error } = await supabase
        .from('lost_found_items')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) {
        if (!cached || cached.length === 0) setLoadState('error');
        setIsOffline(true);
        return;
      }
      setIsOffline(false);
      if (data) {
        setItems(data as LostFoundItem[]);
        setCache(CacheKeys.LOST_FOUND, data);
      }
      setLoadState('ready');
    } catch {
      if (!cached || cached.length === 0) setLoadState('error');
      setIsOffline(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Counts calculated for the segmented track
  const counts = useMemo(() => {
    const base = statusFilter === 'All' ? items : items.filter(i => i.status === statusFilter);
    return {
      all: base.length,
      Lost: base.filter(i => i.type === 'Lost').length,
      Found: base.filter(i => i.type === 'Found').length,
      mine: items.filter(i => i.poster_id === user?.id).length,
    };
  }, [items, statusFilter, user?.id]);

  // Category counts for modal
  const catCounts = useMemo(() => {
    const map: Record<string, number> = { All: items.length };
    items.forEach(i => {
      map[i.category] = (map[i.category] ?? 0) + 1;
    });
    return map;
  }, [items]);

  const q = searchQuery.trim().toLowerCase();

  const filteredList = useMemo(() => {
    return items
      .filter(i => {
        if (filter === 'Lost') return i.type === 'Lost';
        if (filter === 'Found') return i.type === 'Found';
        if (filter === 'mine') return i.poster_id === user?.id;
        return true;
      })
      .filter(i => {
        if (statusFilter === 'Open') return i.status === 'Open';
        if (statusFilter === 'Resolved') return i.status === 'Resolved';
        return true;
      })
      .filter(i => {
        if (categoryFilter === 'All') return true;
        return i.category === categoryFilter;
      })
      .filter(i => {
        if (!q) return true;
        return (
          (i.title || '').toLowerCase().includes(q) ||
          (i.location || '').toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (i.category || '').toLowerCase().includes(q)
        );
      });
  }, [items, filter, statusFilter, categoryFilter, q, user?.id]);

  // Count active non-default filters
  const appliedFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'All') count++;
    if (statusFilter !== 'Open') count++;
    return count;
  }, [categoryFilter, statusFilter]);

  const isFiltered = q.length > 0 || appliedFiltersCount > 0;

  function openFilterModal() {
    setDraftCategory(categoryFilter);
    setDraftStatus(statusFilter);
    setFilterModalVisible(true);
  }

  function applyFilters() {
    setCategoryFilter(draftCategory);
    setStatusFilter(draftStatus);
    setFilterModalVisible(false);
  }

  function resetDraftFilters() {
    setDraftCategory('All');
    setDraftStatus('Open');
  }

  function clearAllFilters() {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('Open');
  }

  const TABS: { id: TabFilter; label: string }[] = [
    { id: 'all', label: t.common.all },
    { id: 'Lost', label: t.lf.lost },
    { id: 'Found', label: t.lf.found },
    { id: 'mine', label: t.lf.myPosts },
  ];

  const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
    { id: 'Open', label: t.lf.statusOpenOnly },
    { id: 'Resolved', label: t.lf.statusResolvedOnly },
    { id: 'All', label: t.lf.statusAllOnly },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.lf.title} onBack={() => navigation.goBack()} />

      <OfflineBanner
        visible={isOffline}
        message="Showing cached lost & found items. Connect to the internet to post items or submit claims."
      />

      {/* Prominent Hero Action Bar (Parity with Blood Donation) */}
      {isStudent && (
        <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6, paddingBottom: 4 }}>
          <TouchableOpacity
            style={[styles.actBtn, { backgroundColor: SectorColors.lostfound }]}
            onPress={() => navigation.navigate('LostFoundPost')}
            activeOpacity={0.85}
          >
            <Feather name="plus-circle" size={16} color="#fff" />
            <Text style={[styles.actBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {t.lf.reportHeroBtn}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Unified Segmented Track Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: C.surface2 }]}>
        {TABS.map(tItem => {
          const active = filter === tItem.id;
          return (
            <TouchableOpacity
              key={tItem.id}
              style={[
                styles.tabBtn,
                active && { backgroundColor: C.surface, elevation: 1 },
              ]}
              onPress={() => setFilter(tItem.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnTxt, { color: active ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {tItem.label}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: active ? `${SectorColors.lostfound}20` : C.border }]}>
                <Text style={[styles.tabBadgeTxt, { color: active ? SectorColors.lostfound : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {counts[tItem.id]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Unified Single Row: Search Input + Filter Trigger (Zero Clutter) */}
      <View style={[styles.searchFilterRow, { paddingHorizontal: Layout.screenPadding }]}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => searchInputRef.current?.focus()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 8 }}
          >
            <Feather name="search" size={15} color={C.textMuted} />
          </TouchableOpacity>
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder={t.lf.searchPlaceholder}
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
            >
              <Feather name="x" size={14} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters Trigger Button (Prominent 44dp, never squashed) */}
        <TouchableOpacity
          style={[
            styles.filterBtn,
            appliedFiltersCount > 0
              ? { backgroundColor: `${SectorColors.lostfound}18`, borderColor: SectorColors.lostfound }
              : { backgroundColor: C.surface, borderColor: C.border },
          ]}
          onPress={openFilterModal}
          activeOpacity={0.75}
        >
          <Feather
            name="sliders"
            size={15}
            color={appliedFiltersCount > 0 ? SectorColors.lostfound : C.text2}
          />
          <Text
            style={[
              styles.filterBtnTxt,
              {
                color: appliedFiltersCount > 0 ? SectorColors.lostfound : C.text,
                fontFamily: FontFamily.jakartaBold,
              },
            ]}
            numberOfLines={1}
          >
            {categoryFilter !== 'All' ? categoryFilter : t.lf.filterBtn}
          </Text>
          {appliedFiltersCount > 0 ? (
            <View style={[styles.filterCountBadge, { backgroundColor: SectorColors.lostfound }]}>
              <Text style={styles.filterCountBadgeTxt}>{appliedFiltersCount}</Text>
            </View>
          ) : (
            <Feather name="chevron-down" size={13} color={C.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      {/* Main Feed of Cards (Starts Immediately Below Single Row) */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SectorColors.lostfound} />}
      >
        {!isStudent ? (
          <View style={styles.empty}>
            <Icon name="found" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Lost & Found is for students.
            </Text>
          </View>
        ) : loadState === 'loading' && items.length === 0 ? (
          <SkeletonList />
        ) : loadState === 'error' && items.length === 0 ? (
          <LoadError onRetry={load} />
        ) : filteredList.length === 0 ? (
          <View style={styles.empty}>
            <Feather name={isFiltered ? 'search' : 'inbox'} size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {isFiltered ? t.lf.noMatchesTitle : t.lf.noItems}
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {isFiltered ? t.lf.noMatchesSub : t.lf.noItemsSub}
            </Text>
            {isFiltered ? (
              <TouchableOpacity
                style={[styles.resetBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={clearAllFilters}
                activeOpacity={0.75}
              >
                <Feather name="rotate-ccw" size={13} color={C.text} />
                <Text style={[styles.resetBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.lf.resetFilters}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredList.map(item => (
              <LFCard
                key={item.id}
                item={item}
                C={C}
                isDark={isDark}
                resolvedLabel={t.lf.statusResolved}
                onPress={() => navigation.navigate('LostFoundDetail', { itemId: item.id })}
              />
            ))}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior="padding"
        >
          {/* Backdrop (dismiss on tap outside) */}
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />

          <View style={[styles.sheetContent, { backgroundColor: C.surface, borderColor: C.border }]}>
            {/* Grab Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.sheetHeaderIcon, { backgroundColor: `${SectorColors.lostfound}1e` }]}>
                  <Feather name="sliders" size={16} color={SectorColors.lostfound} />
                </View>
                <View>
                  <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.lf.filtersTitle}
                  </Text>
                  <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {filteredList.length} items matching
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.sheetCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Section 1: STATUS */}
              <Text style={[styles.sheetSectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.lf.statusLabel}
              </Text>
              <View style={styles.statusSegment}>
                {STATUS_OPTIONS.map(s => {
                  const selected = draftStatus === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.statusOptionRow,
                        { backgroundColor: selected ? (isDark ? 'rgba(255,255,255,0.08)' : C.surface2) : 'transparent' },
                      ]}
                      onPress={() => setDraftStatus(s.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.radioCircle, { borderColor: selected ? SectorColors.lostfound : C.border }]}>
                        {selected && <View style={[styles.radioDot, { backgroundColor: SectorColors.lostfound }]} />}
                      </View>
                      <Text
                        style={[
                          styles.statusOptionTxt,
                          {
                            color: selected ? C.text : C.text2,
                            fontFamily: selected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section 2: CATEGORY */}
              <Text style={[styles.sheetSectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 18 }]}>
                {t.lf.categoryLabel}
              </Text>
              <View style={styles.catOptionsList}>
                {CATEGORIES.map(cat => {
                  const selected = draftCategory === cat.id;
                  const fg = cat.fg;
                  const bg = pillBg(fg, isDark);
                  const label = cat.id === 'All' ? t.lf.allCategories
                    : cat.id === 'Personal' ? t.lf.catPersonal
                    : cat.id === 'Electronics' ? t.lf.catElectronics
                    : cat.id === 'Documents' ? t.lf.catDocuments
                    : t.lf.catOther;

                  const hint = cat.id === 'Personal' ? t.lf.catPersonalHint
                    : cat.id === 'Electronics' ? t.lf.catElectronics
                    : cat.id === 'Documents' ? t.lf.catDocuments
                    : cat.id === 'Other' ? t.lf.catOtherHint
                    : null;

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catOptionRow,
                        {
                          backgroundColor: selected ? bg : C.surface,
                          borderColor: selected ? fg : C.border,
                          borderWidth: selected ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => setDraftCategory(cat.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.catOptionIcon, { backgroundColor: selected ? `${fg}28` : bg }]}>
                        <Icon name={cat.icon} size={16} color={fg} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.catOptionTitle, { color: selected ? fg : C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {label}
                        </Text>
                        {hint && (
                          <Text style={[styles.catOptionHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                            {hint}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.catOptionCount, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : C.surface2 }]}>
                        <Text style={[styles.catOptionCountTxt, { color: selected ? fg : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          {catCounts[cat.id] ?? 0}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Sheet Actions */}
            <View style={[styles.sheetActionsRow, { borderTopColor: C.border }]}>
              <TouchableOpacity
                style={[styles.sheetResetBtn, { backgroundColor: C.surface2 }]}
                onPress={resetDraftFilters}
                activeOpacity={0.75}
              >
                <Text style={[styles.sheetResetTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {t.lf.reset}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetApplyBtn, { backgroundColor: SectorColors.lostfound }]}
                onPress={applyFilters}
                activeOpacity={0.85}
              >
                <Text style={[styles.sheetApplyTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.lf.applyFilters}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 12,
  } as ViewStyle,
  actBtnTxt: {
    fontSize: 13.5,
  } as any,

  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: Layout.screenPadding,
    marginTop: 6,
    marginBottom: 8,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  } as ViewStyle,
  tabBtnTxt: { fontSize: 13 } as any,
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  } as ViewStyle,
  tabBadgeTxt: { fontSize: 11 } as any,

  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  } as ViewStyle,

  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    paddingVertical: 0,
  } as TextStyle,

  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
    minWidth: 96,
  } as ViewStyle,
  filterBtnTxt: {
    fontSize: 12.5,
  } as TextStyle,
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  filterCountBadgeTxt: {
    fontSize: 10,
    color: '#fff',
    fontFamily: FontFamily.jakartaBold,
  } as TextStyle,

  scroll: { paddingTop: 2, paddingBottom: 24 } as ViewStyle,

  list: { gap: 10 } as ViewStyle,

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,

  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  } as ViewStyle,

  thumbImg: {
    width: '100%',
    height: '100%',
  } as any,

  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardTitle: { fontSize: 14.5 } as any,

  cardLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  } as ViewStyle,
  cardLocTxt: { fontSize: 12, flexShrink: 1 } as any,
  cardDot: { fontSize: 12 } as any,
  cardTimeTxt: { fontSize: 11.5 } as any,

  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  } as ViewStyle,

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 20,
  } as ViewStyle,
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  typeText: { fontSize: 11 } as any,

  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 20,
  } as ViewStyle,
  catBadgeTxt: { fontSize: 11 } as any,

  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 20,
  } as ViewStyle,
  resolvedBadgeTxt: { fontSize: 11 } as any,

  empty: {
    alignItems: 'center',
    paddingTop: 50,
    gap: 8,
    paddingHorizontal: 32,
  } as ViewStyle,
  emptyTitle: { fontSize: 15.5, textAlign: 'center' } as any,
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 } as any,

  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  } as ViewStyle,
  resetBtnTxt: { fontSize: 12.5 } as any,

  /* Bottom Sheet Modal Styles */
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  } as ViewStyle,
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: Layout.screenPadding,
    maxHeight: '82%',
  } as ViewStyle,
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  } as ViewStyle,
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  sheetHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  sheetTitle: {
    fontSize: 16,
  } as TextStyle,
  sheetSub: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  sheetSectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
  } as TextStyle,

  statusSegment: {
    gap: 6,
  } as ViewStyle,
  statusOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  } as ViewStyle,
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  } as ViewStyle,
  statusOptionTxt: {
    fontSize: 13.5,
  } as TextStyle,

  catOptionsList: {
    gap: 7,
  } as ViewStyle,
  catOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  } as ViewStyle,
  catOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  catOptionTitle: {
    fontSize: 14,
  } as TextStyle,
  catOptionHint: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,
  catOptionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  } as ViewStyle,
  catOptionCountTxt: {
    fontSize: 11.5,
  } as TextStyle,

  sheetActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  sheetResetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  sheetResetTxt: {
    fontSize: 13.5,
  } as TextStyle,
  sheetApplyBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  sheetApplyTxt: {
    fontSize: 14,
  } as TextStyle,
});
