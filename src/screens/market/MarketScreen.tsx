import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  RefreshControl, Image, ActivityIndicator, Animated, FlatList,
  Dimensions, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout, Accent, SectorColors, LightColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { fetchPeople, type Person } from '../../services/peopleService';
import { getSavedListingIds, toggleSavedListing } from '../../services/marketService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import type { Listing } from '../../types/database';

type Tab = 'all' | 'available' | 'mine' | 'saved';
type PricePreset = 'all' | 'free' | 'under300' | '300to800' | '800plus';

const MARKET_COLOR = SectorColors.market;

const CATEGORIES: { id: string; icon: keyof typeof Feather.glyphMap; fg: string; labelKey: string }[] = [
  { id: 'all',         icon: 'grid',      fg: MARKET_COLOR,  labelKey: 'all'            },
  { id: 'Books',       icon: 'book-open', fg: Accent.blue,   labelKey: 'catBooks'       },
  { id: 'Electronics', icon: 'cpu',       fg: Accent.purple, labelKey: 'catElectronics' },
  { id: 'Notes',       icon: 'file-text', fg: Accent.teal,   labelKey: 'catNotes'       },
  { id: 'Furniture',   icon: 'layers',    fg: Accent.amber,  labelKey: 'catFurniture'   },
  { id: 'Other',       icon: 'package',   fg: Accent.slate,  labelKey: 'catOther'       },
];

export function MarketScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [pricePreset, setPricePreset] = useState<PricePreset>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'asc' | 'desc'>('newest');
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Animated sliding tab indicator
  const [trackWidth, setTrackWidth] = useState(0);
  const animIndex = useRef(new Animated.Value(0)).current;

  const TABS: Tab[] = useMemo(() => ['all', 'available', 'mine', 'saved'], []);

  useEffect(() => {
    const idx = TABS.indexOf(tab);
    Animated.spring(animIndex, {
      toValue: idx >= 0 ? idx : 0,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [tab, animIndex, TABS]);

  // Load saved listing IDs from AsyncStorage
  const loadSavedIds = useCallback(async () => {
    const ids = await getSavedListingIds();
    setSavedIds(new Set(ids));
  }, []);

  const load = useCallback(async () => {
    // 1. Instant cache load
    const cached = await getCache<Listing[]>(CacheKeys.MARKET_LISTINGS);
    if (cached && cached.length > 0) {
      setListings(cached);
      setLoading(false);
      // Background resolve sellers for cached listings
      const sellerIds = Array.from(new Set(cached.map(l => l.seller_id)));
      fetchPeople(sellerIds).then(people => {
        setPeopleMap(prev => ({ ...prev, ...people }));
      });
    }

    await loadSavedIds();

    // 2. Fetch fresh
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      if (cached && cached.length > 0) {
        setIsOffline(true);
      }
      setLoading(false);
      return;
    }

    setIsOffline(false);
    const freshList = data as Listing[];
    setListings(freshList);
    setCache(CacheKeys.MARKET_LISTINGS, freshList);
    setLoading(false);

    // Resolve sellers roster for clean avatars and intakes
    const sellerIds = Array.from(new Set(freshList.map(l => l.seller_id)));
    if (sellerIds.length > 0) {
      const people = await fetchPeople(sellerIds);
      setPeopleMap(prev => ({ ...prev, ...people }));
    }
  }, [loadSavedIds]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Toggle favorite with micro-interaction
  async function handleToggleFavorite(id: string) {
    const { saved, ids } = await toggleSavedListing(id);
    setSavedIds(new Set(ids));
  }

  // Reset all filters
  const hasActiveFilters = query.trim().length > 0 || category !== 'all' || pricePreset !== 'all' || sortBy !== 'newest';
  function handleResetFilters() {
    setQuery('');
    setCategory('all');
    setPricePreset('all');
    setSortBy('newest');
  }

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: listings.length,
      available: listings.filter(l => l.status === 'Available').length,
      mine: listings.filter(l => l.seller_id === user?.id).length,
      saved: listings.filter(l => savedIds.has(l.id)).length,
    };
  }, [listings, user?.id, savedIds]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: listings.length };
    listings.forEach(l => {
      const cat = l.category;
      if (cat) map[cat] = (map[cat] ?? 0) + 1;
    });
    return map;
  }, [listings]);

  // Filtered & sorted list
  const filteredListings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings
      .filter(l => {
        if (tab === 'available') return l.status === 'Available';
        if (tab === 'mine') return l.seller_id === user?.id;
        if (tab === 'saved') return savedIds.has(l.id);
        return true;
      })
      .filter(l => {
        if (category === 'all') return true;
        return l.category?.toLowerCase() === category.toLowerCase();
      })
      .filter(l => {
        if (pricePreset === 'free') return (l.price ?? 0) === 0;
        if (pricePreset === 'under300') return (l.price ?? 0) > 0 && (l.price ?? 0) < 300;
        if (pricePreset === '300to800') return (l.price ?? 0) >= 300 && (l.price ?? 0) <= 800;
        if (pricePreset === '800plus') return (l.price ?? 0) > 800;
        return true;
      })
      .filter(l => {
        if (!q) return true;
        const haystack = [l.title, l.description, l.category, l.course_code, l.meetup_spot]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'asc') return (a.price ?? 0) - (b.price ?? 0);
        if (sortBy === 'desc') return (b.price ?? 0) - (a.price ?? 0);
        return 0;
      });
  }, [listings, tab, user?.id, savedIds, category, pricePreset, query, sortBy]);

  const SORT_ORDER = ['newest', 'asc', 'desc'] as const;
  const cycleSort = () => setSortBy(prev => SORT_ORDER[(SORT_ORDER.indexOf(prev) + 1) % 3]);
  const sortLabel = sortBy === 'asc' ? t.market2.sortPriceAsc : sortBy === 'desc' ? t.market2.sortPriceDesc : t.market2.sortNewest;
  const sortIcon = sortBy === 'asc' ? 'arrow-up' : sortBy === 'desc' ? 'arrow-down' : 'clock';

  // Responsive 2-column calculation
  const screenWidth = Dimensions.get('window').width;
  const cardGap = 11;
  const cardWidth = Math.floor((screenWidth - Layout.screenPadding * 2 - cardGap) / 2);

  // Render individual listing card
  const renderItem = useCallback(({ item }: { item: Listing }) => {
    const isSold = item.status === 'Sold';
    const isFavorite = savedIds.has(item.id);
    const catMeta = CATEGORIES.find(c => c.id.toLowerCase() === item.category?.toLowerCase()) ?? CATEGORIES[5];
    const seller = peopleMap[item.seller_id];
    const isFree = (item.price ?? 0) === 0;

    // Condition color
    const condColor = item.condition === 'New' ? '#059669' : item.condition === 'Like New' ? '#2563EB' : '#64748B';
    const condBg = isDark ? `${condColor}2e` : `${condColor}14`;

    return (
      <TouchableOpacity
        style={[styles.card, { width: cardWidth, backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => navigation.navigate('MarketDetail', { listingId: item.id, id: item.id })}
        activeOpacity={0.8}
      >
        {/* Thumbnail Hero */}
        <View style={[styles.cardThumb, { backgroundColor: isDark ? `${catMeta.fg}24` : `${catMeta.fg}14` }]}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.cardImg} resizeMode="cover" />
          ) : (
            <Feather name={catMeta.icon} size={38} color={catMeta.fg} />
          )}

          {/* Top Row Badges: Condition on Left, Heart on Right */}
          <View style={styles.thumbTopRow}>
            <View style={[styles.condBadge, { backgroundColor: condBg, borderColor: condColor }]}>
              <Text style={[styles.condText, { color: condColor, fontFamily: FontFamily.jakartaBold }]}>
                {item.condition}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.heartBtn, { backgroundColor: isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.9)' }]}
              onPress={() => handleToggleFavorite(item.id)}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Feather
                name="heart"
                size={14}
                color={isFavorite ? '#ef4444' : C.textMuted}
                style={isFavorite ? { transform: [{ scale: 1.1 }] } : undefined}
              />
            </TouchableOpacity>
          </View>

          {/* Sold Overlay */}
          {isSold && (
            <View style={styles.soldOverlay}>
              <View style={styles.soldBadge}>
                <Text style={[styles.soldBadgeText, { color: '#0f172a', fontFamily: FontFamily.jakartaExtraBold }]}>
                  {t.market2.sold}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Price & Badges */}
          <View style={styles.priceRow}>
            {isFree ? (
              <View style={[styles.freeBadge, { backgroundColor: '#16a34a' }]}>
                <Text style={[styles.freeText, { fontFamily: FontFamily.jakartaExtraBold }]}>
                  {t.market2.free}
                </Text>
              </View>
            ) : (
              <Text style={[styles.priceText, { color: isSold ? C.textMuted : C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                ৳{(item.price ?? 0).toLocaleString('en-US')}
              </Text>
            )}

            {item.negotiable && !isFree && (
              <Text style={[styles.negotiableText, { color: Accent.teal, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.market2.negotiable}
              </Text>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.titleText, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Course code & Handover Spot */}
          {(item.course_code || item.meetup_spot) ? (
            <View style={styles.metaRow}>
              {item.course_code ? (
                <View style={[styles.coursePill, { backgroundColor: isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)' }]}>
                  <Text style={[styles.coursePillText, { color: Accent.blue, fontFamily: FontFamily.jakartaBold }]}>
                    {item.course_code}
                  </Text>
                </View>
              ) : null}
              {item.meetup_spot ? (
                <Text style={[styles.spotText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  📍 {item.meetup_spot}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Seller Footer */}
          <View style={[styles.sellerRow, { borderTopColor: C.border }]}>
            <Avatar name={seller?.full_name ?? undefined} size="xs" />
            <Text style={[styles.sellerName, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              {seller?.full_name ? seller.full_name.split(' ')[0] : t.market2.verifiedStudent}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [cardWidth, savedIds, peopleMap, isDark, C, navigation, t]);

  const tabWidth = trackWidth > 0 ? trackWidth / TABS.length : 0;
  const indicatorTranslateX = animIndex.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.market2.marketplace}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: MARKET_COLOR }]}
            onPress={() => navigation.navigate('MarketPost')}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={[styles.postBtnText, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {t.market2.sellItem}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Main Container */}
      <View style={{ flex: 1 }}>
        {/* Offline Banner */}
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* 1. Animated Segmented Track */}
        <View style={[styles.trackWrapper, { paddingHorizontal: Layout.screenPadding }]}>
          <View
            style={[styles.track, { backgroundColor: C.surface, borderColor: C.border }]}
            onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
          >
            {trackWidth > 0 && (
              <Animated.View
                style={[
                  styles.indicator,
                  {
                    width: tabWidth,
                    backgroundColor: MARKET_COLOR,
                    transform: [{ translateX: indicatorTranslateX }],
                  },
                ]}
              />
            )}

            {TABS.map(tb => {
              const active = tab === tb;
              const count = counts[tb];
              const label =
                tb === 'all'
                  ? t.common.all
                  : tb === 'available'
                  ? t.market2.availableListings
                  : tb === 'mine'
                  ? t.market2.myListings
                  : t.market2.savedListings;

              return (
                <TouchableOpacity
                  key={tb}
                  style={styles.tabBtn}
                  onPress={() => setTab(tb)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      {
                        color: active ? '#fff' : C.text2,
                        fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaSemiBold,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: active ? 'rgba(255,255,255,0.25)' : C.surface2,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          {
                            color: active ? '#fff' : C.textMuted,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Search & Sort Bar */}
        <View style={[styles.searchSection, { paddingHorizontal: Layout.screenPadding }]}>
          <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Icon name="search" size={16} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
              placeholder={t.market2.searchItems}
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

          <TouchableOpacity
            style={[styles.sortBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={cycleSort}
            activeOpacity={0.75}
          >
            <Feather name={sortIcon as any} size={13} color={C.text2} />
            <Text style={[styles.sortTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {sortLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Category Carousel */}
        <View style={styles.catSection}>
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.catList, { paddingHorizontal: Layout.screenPadding }]}
            renderItem={({ item }) => {
              const active = category.toLowerCase() === item.id.toLowerCase();
              const count = categoryCounts[item.id] ?? 0;
              const label = item.id === 'all' ? t.common.all : (t.market2 as any)[item.labelKey] ?? item.id;
              const activeBg = isDark ? `${item.fg}33` : `${item.fg}18`;

              return (
                <TouchableOpacity
                  style={[
                    styles.catChip,
                    active
                      ? { backgroundColor: activeBg, borderColor: item.fg }
                      : { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                  onPress={() => setCategory(item.id)}
                  activeOpacity={0.75}
                >
                  <Feather name={item.icon} size={13} color={active ? item.fg : C.textMuted} />
                  <Text
                    style={[
                      styles.catChipTxt,
                      {
                        color: active ? item.fg : C.text2,
                        fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  {count > 0 && (
                    <Text style={[styles.catCount, { color: active ? item.fg : C.textMuted, opacity: 0.8 }]}>
                      {count}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* 4. Quick Price Filters & Reset Button */}
        <View style={[styles.filterBar, { paddingHorizontal: Layout.screenPadding }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { id: 'all', label: t.common.all },
              { id: 'free', label: t.market2.free },
              { id: 'under300', label: t.market2.priceUnder300 },
              { id: '300to800', label: t.market2.price300to800 },
              { id: '800plus', label: t.market2.price800plus },
            ]}
            keyExtractor={p => p.id}
            contentContainerStyle={{ gap: 6, alignItems: 'center' }}
            renderItem={({ item }) => {
              const on = pricePreset === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.priceChip,
                    on
                      ? { backgroundColor: C.surface2, borderColor: C.text }
                      : { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                  onPress={() => setPricePreset(item.id as PricePreset)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.priceChipTxt,
                      {
                        color: on ? C.text : C.textMuted,
                        fontFamily: on ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.1)' }]}
              onPress={handleResetFilters}
              activeOpacity={0.7}
            >
              <Feather name="rotate-ccw" size={12} color="#ef4444" />
              <Text style={[styles.resetTxt, { color: '#ef4444', fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.clearFilters}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 5. Virtualized 2-Column Grid */}
        {loading && listings.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={MARKET_COLOR} />
          </View>
        ) : filteredListings.length === 0 ? (
          <View style={styles.emptyContainer}>
            {tab === 'saved' ? (
              <>
                <View style={[styles.emptyIconCircle, { backgroundColor: `${MARKET_COLOR}18` }]}>
                  <Feather name="heart" size={32} color={MARKET_COLOR} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.market2.savedEmptyTitle}
                </Text>
                <Text style={[styles.emptyDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.market2.savedEmptyDesc}
                </Text>
              </>
            ) : tab === 'mine' ? (
              <>
                <View style={[styles.emptyIconCircle, { backgroundColor: `${MARKET_COLOR}18` }]}>
                  <Feather name="tag" size={32} color={MARKET_COLOR} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.market2.noListingsYet}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: MARKET_COLOR }]}
                  onPress={() => navigation.navigate('MarketPost')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.emptyActionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.sellItem}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.emptyIconCircle, { backgroundColor: `${MARKET_COLOR}18` }]}>
                  <Icon name="market" size={32} color={MARKET_COLOR} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.market2.noItemsAvailable}
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={[styles.emptyActionBtn, { backgroundColor: C.surface2 }]}
                    onPress={handleResetFilters}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.emptyActionTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {t.market2.clearFilters}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredListings}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={{ gap: cardGap, paddingHorizontal: Layout.screenPadding }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MARKET_COLOR} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  } as ViewStyle,
  postBtnText: { fontSize: 13 } as any,

  trackWrapper: { marginTop: 4, marginBottom: 8 } as ViewStyle,
  track: {
    flexDirection: 'row',
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  } as ViewStyle,
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 18,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 2,
  } as ViewStyle,
  tabBtnText: { fontSize: 12.5 } as any,
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  } as ViewStyle,
  tabBadgeText: { fontSize: 10.5 } as any,

  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  } as ViewStyle,
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  } as TextStyle,
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 40,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  sortTxt: { fontSize: 12 } as any,

  catSection: { marginBottom: 8 } as ViewStyle,
  catList: { gap: 6 } as ViewStyle,
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  } as ViewStyle,
  catChipTxt: { fontSize: 12 } as any,
  catCount: { fontSize: 11, fontFamily: FontFamily.jakartaBold } as any,

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as ViewStyle,
  priceChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  priceChipTxt: { fontSize: 11.5 } as any,
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 6,
  } as ViewStyle,
  resetTxt: { fontSize: 11 } as any,

  listContent: {
    paddingBottom: 28,
  } as ViewStyle,

  // Card Structure
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 11,
  } as ViewStyle,
  cardThumb: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  } as ViewStyle,
  cardImg: {
    ...StyleSheet.absoluteFill as any,
    width: '100%',
    height: '100%',
  } as any,
  thumbTopRow: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  condBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  condText: { fontSize: 9.5 } as any,
  heartBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,

  soldOverlay: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  soldBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#fff',
  } as ViewStyle,
  soldBadgeText: { fontSize: 11 } as any,

  cardBody: {
    padding: 10,
    gap: 4,
  } as ViewStyle,
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  } as ViewStyle,
  priceText: { fontSize: 15.5 } as any,
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  } as ViewStyle,
  freeText: { color: '#fff', fontSize: 11 } as any,
  negotiableText: { fontSize: 10.5 } as any,
  titleText: {
    fontSize: 12.5,
    lineHeight: 17,
    height: 34,
    marginTop: 2,
  } as any,

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  } as ViewStyle,
  coursePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  } as ViewStyle,
  coursePillText: { fontSize: 10 } as any,
  spotText: { fontSize: 10.5, flex: 1 } as any,

  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  sellerName: { fontSize: 10.5, flex: 1 } as any,

  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
    paddingBottom: 60,
  } as ViewStyle,
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  } as ViewStyle,
  emptyTitle: { fontSize: 16, textAlign: 'center' } as any,
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 } as any,
  emptyActionBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  } as ViewStyle,
  emptyActionTxt: { fontSize: 13 } as any,
});
