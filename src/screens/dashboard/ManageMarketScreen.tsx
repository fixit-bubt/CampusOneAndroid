import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  Platform,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { ModerationReasonModal } from '../../components/market/ModerationReasonModal';
import { FontFamily, Layout } from '../../theme';
import { formatRelativeTime } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import { fetchPeople, type Person } from '../../services/peopleService';
import { moderateListingRow } from '../../services/marketService';
import { useT } from '../../i18n';
import type { Listing } from '../../types/database';

const CATEGORY_OPTIONS = [
  { id: 'all',         label: 'All Categories', icon: 'grid' as const },
  { id: 'Books',       label: 'Books & Guides', icon: 'book-open' as const },
  { id: 'Electronics', label: 'Electronics & Calculators', icon: 'cpu' as const },
  { id: 'Furniture',   label: 'Furniture & Chairs', icon: 'layers' as const },
  { id: 'Notes',       label: 'Lecture Notes', icon: 'file-text' as const },
  { id: 'Drafting',    label: 'Drafting & Lab Gear', icon: 'tool' as const },
  { id: 'Other',       label: 'Other Items', icon: 'package' as const },
];

type StatusFilter = 'all' | 'Available' | 'Sold';

const MarketAdminCard = memo(function MarketAdminCard({
  item,
  seller,
  onView,
  onModerate,
  C,
  isDark,
  takeDownLabel,
}: {
  item: Listing;
  seller?: Person;
  onView: (id: string) => void;
  onModerate: (item: Listing) => void;
  C: any;
  isDark: boolean;
  takeDownLabel: string;
}) {
  const isSold = item.status === 'Sold';
  const handleView = useCallback(() => onView(item.id), [onView, item.id]);
  const handleModerate = useCallback(() => onModerate(item), [onModerate, item]);

  return (
    <View style={[styles.listingCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Card Top: Code Pill, Price, Status */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.codePill, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Text style={[styles.codePillTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {item.code}
            </Text>
          </View>
          <View style={[styles.categoryPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.categoryPillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {item.category}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.priceTxt, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            ৳ {item.price}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isSold
                  ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                  : (isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)'),
                borderColor: isSold ? C.border : (C.success + '40'),
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isSold ? C.textMuted : C.success },
              ]}
            />
            <Text
              style={[
                styles.statusBadgeTxt,
                { color: isSold ? C.textMuted : C.success, fontFamily: FontFamily.jakartaBold },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Card Body: Title & Photo thumbnail */}
      <View style={styles.cardBodyRow}>
        {item.photo_url ? (
          <Image resizeMethod="resize" source={{ uri: item.photo_url }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Feather name="tag" size={22} color={C.textMuted} />
          </View>
        )}
        <View style={styles.cardBodyTextCol}>
          <Text style={[styles.listingTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.listingDescTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>

      {/* Seller Identity Row */}
      <View style={[styles.sellerInfoRow, { borderTopColor: C.border }]}>
        <View style={styles.sellerLeft}>
          <View style={styles.sellerIconSlot}>
            <Feather name="user" size={15} color={C.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.sellerNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {seller?.full_name || 'BUBT Student'}
            </Text>
            <Text style={[styles.sellerMetaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
              {[seller?.department, seller?.role].filter(Boolean).join(' · ') || 'Verified Member'}
            </Text>
          </View>
        </View>
        <Text style={[styles.timeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>

      {/* Handover Meetup Spot (if any) */}
      {item.meetup_spot ? (
        <View style={styles.meetupRow}>
          <Feather name="map-pin" size={13} color={C.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.meetupTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {item.meetup_spot}
          </Text>
        </View>
      ) : null}

      {/* Action Strip: View vs Take Down */}
      <View style={[styles.cardActionsRow, { borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, { backgroundColor: C.surface2, borderColor: C.border }]}
          onPress={handleView}
          activeOpacity={0.75}
        >
          <Feather name="eye" size={15} color={C.text} />
          <Text style={[styles.actionBtnSecondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            View Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnDanger, { backgroundColor: C.dangerBg, borderColor: C.danger + '35' }]}
          onPress={handleModerate}
          activeOpacity={0.75}
        >
          <Feather name="shield-off" size={15} color={C.danger} />
          <Text style={[styles.actionBtnDangerTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
            {takeDownLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export function ManageMarketScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const { profile } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Moderation modal state
  const [targetListing, setTargetListing] = useState<Listing | null>(null);
  const [moderating, setModerating] = useState(false);

  // 180ms Debounce search input to maintain 120 FPS typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch campus listings (bounded to 150)
  const loadListings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;
      const list = (data || []) as Listing[];
      setListings(list);

      // Hydrate seller profiles
      const sellerIds = Array.from(new Set(list.map((l) => l.seller_id).filter(Boolean)));
      if (sellerIds.length > 0) {
        const people = await fetchPeople(sellerIds);
        setPeopleMap((prev) => ({ ...prev, ...people }));
      }
    } catch (err: any) {
      toast({
        type: 'error',
        title: t.common.error,
        message: err.message || 'Failed to load listings',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.common.error, toast]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadListings();
  }, [loadListings]);

  // Filtered dataset
  const filteredListings = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return listings.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (selectedCategory !== 'all') {
        if (item.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }
      if (q) {
        const seller = peopleMap[item.seller_id];
        const haystack = [
          item.title,
          item.code,
          item.category,
          item.description,
          item.meetup_spot,
          seller?.full_name,
          seller?.department,
          seller?.role,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [listings, statusFilter, selectedCategory, debouncedQuery, peopleMap]);

  // Take down moderation action
  const handleConfirmModeration = async (reason: string) => {
    if (!targetListing) return;
    setModerating(true);
    try {
      const res = await moderateListingRow(
        targetListing.id,
        reason,
        targetListing.seller_id,
        targetListing.title,
        targetListing.code
      );
      if (!res.success) {
        toast({ type: 'error', title: t.common.error, message: res.error });
        return;
      }
      toast({
        type: 'success',
        title: 'Listing Removed',
        message: `Listing ${targetListing.code} taken down for: ${reason}`,
      });
      setListings((prev) => prev.filter((l) => l.id !== targetListing.id));
      setTargetListing(null);
    } finally {
      setModerating(false);
    }
  };

  const selectedCategoryLabel = useMemo(() => {
    return CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.label ?? 'All Categories';
  }, [selectedCategory]);

  const handleViewDetail = useCallback((listingId: string) => {
    navigation.navigate('MarketDetail', { listingId });
  }, [navigation]);

  const handleOpenModeration = useCallback((item: Listing) => {
    setTargetListing(item);
  }, []);

  const keyExtractorListing = useCallback((item: Listing) => item.id, []);

  const renderListingItem = useCallback(({ item }: { item: Listing }) => (
    <MarketAdminCard
      item={item}
      seller={peopleMap[item.seller_id]}
      onView={handleViewDetail}
      onModerate={handleOpenModeration}
      C={C}
      isDark={isDark}
      takeDownLabel={t.market2.takeDownListing ?? 'Take Down'}
    />
  ), [peopleMap, handleViewDetail, handleOpenModeration, C, isDark, t.market2.takeDownListing]);

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Marketplace" onBack={() => navigation.goBack()} />
        <View style={styles.centerBox}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>
            {t.manage?.accessDenied ?? 'Access Denied'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Marketplace" onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <FlatList
          data={filteredListings}
          keyExtractor={keyExtractorListing}
          renderItem={renderListingItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.textMuted}
              colors={[C.textMuted]}
            />
          }
          ListHeaderComponent={
            <View>
              {/* 2. Strict 58dp Search Bar */}
              <View style={{ paddingTop: 6, paddingBottom: 8 }}>
                <View style={[styles.searchBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.iconSlot32}>
                    <Feather name="search" size={20} color={C.text} />
                  </View>
                  <TextInput
                    style={[styles.searchInputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    placeholder="Search listings..."
                    placeholderTextColor={C.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} style={{ padding: 4 }}>
                      <Feather name="x" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 3. Strict 58dp Dropdown Category Bar */}
              <View style={{ paddingBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => setCategoryModalOpen(true)}
                  activeOpacity={0.75}
                >
                  <View style={styles.iconSlot32}>
                    <Feather name="filter" size={20} color={C.text} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                    <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {selectedCategoryLabel}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              {/* 4. Strict 58dp Filter Tabs Row */}
              <View style={{ paddingBottom: 12 }}>
                <View style={[styles.tabsRow58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {(['all', 'Available', 'Sold'] as const).map((s) => {
                    const active = statusFilter === s;
                    const label = s === 'all' ? 'All Items' : s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.tabItem58,
                          active && {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          },
                        ]}
                        onPress={() => setStatusFilter(s)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.tabItemTxt,
                            {
                              color: active ? C.text : C.textMuted,
                              fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. Count Indicator */}
              <View style={styles.countRow}>
                <Text style={[styles.countTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  LISTINGS ({filteredListings.length})
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={C.textMuted} />
              </View>
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Feather name="package" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  No Listings Found
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Try adjusting your search query or category filter.'
                    : 'No campus items currently match this status filter.'}
                </Text>
              </View>
            )
          }
        />
      </View>

      {/* 7. Category Dropdown Modal (Strict 58dp Bars) */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Category
              </Text>
              <TouchableOpacity
                onPress={() => setCategoryModalOpen(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, padding: 16 }}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.bar58,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                          : C.surface,
                        borderColor: isSelected ? C.text : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setCategoryModalOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconSlot32}>
                      <Feather name={cat.icon} size={28} color={C.text} />
                    </View>
                    <Text
                      style={[
                        styles.barTitleTxt,
                        {
                          color: C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                    {isSelected && <Feather name="check" size={18} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 8. Structured Moderation Reason Modal */}
      <ModerationReasonModal
        visible={!!targetListing}
        onClose={() => setTargetListing(null)}
        onConfirm={handleConfirmModeration}
        loading={moderating}
        listingTitle={targetListing?.title}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  body: { flex: 1 } as ViewStyle,
  centerBox: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' } as ViewStyle,


  // Universal 58dp Bars Standard
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  } as ViewStyle,

  searchBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  } as ViewStyle,

  searchInputTxt: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  } as TextStyle,

  iconSlot32: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  barTitleTxt: {
    fontSize: 14.5,
  } as TextStyle,

  // 58dp Tab Switcher Bar
  tabsRow58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    gap: 4,
  } as ViewStyle,

  tabItem58: {
    flex: 1,
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  tabItemTxt: {
    fontSize: 13.5,
  } as TextStyle,

  countRow: {
    paddingBottom: 8,
  } as ViewStyle,

  countTxt: {
    fontSize: 12.5,
  } as TextStyle,

  listContent: {
    paddingHorizontal: Layout.screenPadding,
    gap: 12,
  } as ViewStyle,

  // Listing Card
  listingCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  } as ViewStyle,

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as ViewStyle,

  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  codePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,

  codePillTxt: {
    fontSize: 11,
    letterSpacing: 0.5,
  } as TextStyle,

  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,

  categoryPillTxt: {
    fontSize: 11.5,
  } as TextStyle,

  priceTxt: {
    fontSize: 15,
  } as TextStyle,

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  } as ViewStyle,

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,

  statusBadgeTxt: {
    fontSize: 11,
  } as TextStyle,

  cardBodyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  } as ViewStyle,

  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
  } as ImageStyle,

  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  cardBodyTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,

  listingTitleTxt: {
    fontSize: 14.5,
    lineHeight: 20,
    marginBottom: 2,
  } as TextStyle,

  listingDescTxt: {
    fontSize: 12.5,
    lineHeight: 17,
  } as TextStyle,

  sellerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  } as ViewStyle,

  sellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  sellerIconSlot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  sellerNameTxt: {
    fontSize: 13,
  } as TextStyle,

  sellerMetaTxt: {
    fontSize: 11.5,
  } as TextStyle,

  timeTxt: {
    fontSize: 11,
  } as TextStyle,

  meetupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  } as ViewStyle,

  meetupTxt: {
    fontSize: 12,
  } as TextStyle,

  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,

  actionBtnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,

  actionBtnSecondaryTxt: {
    fontSize: 13,
  } as TextStyle,

  actionBtnDanger: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,

  actionBtnDangerTxt: {
    fontSize: 13,
  } as TextStyle,

  // Empty state
  emptyBox: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  } as ViewStyle,

  emptyTitle: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  } as TextStyle,

  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  } as TextStyle,

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
  } as ViewStyle,

  modalBox: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  } as ViewStyle,

  modalTitleTxt: {
    fontSize: 16,
  } as TextStyle,

  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});
