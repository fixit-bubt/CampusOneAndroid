import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  RefreshControl, Image, ActivityIndicator, Animated, FlatList,
  Modal, ScrollView, Switch, Dimensions, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout, Accent, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { fetchPeople, type Person } from '../../services/peopleService';
import { getSavedListingIds, toggleSavedListing } from '../../services/marketService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { formatRelativeTime, formatPrice } from '../../utils/format';
import type { Listing } from '../../types/database';

type Tab = 'all' | 'mine' | 'saved';
type ConditionPreset = 'all' | 'New' | 'Like New' | 'Used';

const MARKET_COLOR = SectorColors.market;

interface CategoryMeta {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  fg: string;
  labelKey: string;
  subKey: string;
}

const CATEGORIES: CategoryMeta[] = [
  { id: 'all',         icon: 'grid',      fg: MARKET_COLOR,  labelKey: 'all',            subKey: 'catAllSub'         },
  { id: 'Books',       icon: 'book-open', fg: Accent.blue,   labelKey: 'catBooks',       subKey: 'catBooksSub'       },
  { id: 'Electronics', icon: 'cpu',       fg: Accent.purple, labelKey: 'catElectronics', subKey: 'catElectronicsSub' },
  { id: 'Notes',       icon: 'file-text', fg: Accent.teal,   labelKey: 'catNotes',       subKey: 'catNotesSub'       },
  { id: 'Drafting',    icon: 'edit-3',    fg: '#f59e0b',     labelKey: 'catDrafting',    subKey: 'catDraftingSub'    },
  { id: 'LabGear',     icon: 'shield',    fg: '#10b981',     labelKey: 'catLabGear',     subKey: 'catLabGearSub'     },
  { id: 'Furniture',   icon: 'layers',    fg: Accent.amber,  labelKey: 'catFurniture',   subKey: 'catFurnitureSub'   },
  { id: 'Other',       icon: 'package',   fg: Accent.slate,  labelKey: 'catOther',       subKey: 'catOtherSub'       },
];

export function MarketScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { user } = useAuth();

  // Primary filters
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  // Secondary filters (inside modal)
  const [conditionFilter, setConditionFilter] = useState<ConditionPreset>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'asc' | 'desc'>('newest');
  const [hideSold, setHideSold] = useState(true);

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Data states
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Animated sliding tab indicator
  const [trackWidth, setTrackWidth] = useState(0);
  const animIndex = useRef(new Animated.Value(0)).current;
  const tabIndexMap: Record<Tab, number> = useMemo(() => ({ all: 0, mine: 1, saved: 2 }), []);

  useEffect(() => {
    const idx = tabIndexMap[tab] ?? 0;
    Animated.spring(animIndex, {
      toValue: idx,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [tab, animIndex, tabIndexMap]);

  // Animated sliding sort indicator
  const [sortTrackWidth, setSortTrackWidth] = useState(0);
  const sortAnimIndex = useRef(new Animated.Value(0)).current;
  const sortIndexMap: Record<'newest' | 'asc' | 'desc', number> = useMemo(() => ({ newest: 0, asc: 1, desc: 2 }), []);

  useEffect(() => {
    const idx = sortIndexMap[sortBy] ?? 0;
    Animated.spring(sortAnimIndex, {
      toValue: idx,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [sortBy, sortAnimIndex, sortIndexMap]);

  // Animated sliding condition indicator
  const [condTrackWidth, setCondTrackWidth] = useState(0);
  const condAnimIndex = useRef(new Animated.Value(0)).current;
  const condIndexMap: Record<ConditionPreset, number> = useMemo(() => ({ all: 0, New: 1, 'Like New': 2, Used: 3 }), []);

  useEffect(() => {
    const idx = condIndexMap[conditionFilter] ?? 0;
    Animated.spring(condAnimIndex, {
      toValue: idx,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [conditionFilter, condAnimIndex, condIndexMap]);

  // Load saved listing IDs from AsyncStorage
  const loadSavedIds = useCallback(async () => {
    const ids = await getSavedListingIds();
    setSavedIds(new Set(ids));
  }, []);

  const load = useCallback(async () => {
    const cached = await getCache<Listing[]>(CacheKeys.MARKET_LISTINGS);
    if (cached && cached.length > 0) {
      setListings(cached);
      setLoading(false);
      const sellerIds = Array.from(new Set(cached.map(l => l.seller_id)));
      fetchPeople(sellerIds).then(people => {
        setPeopleMap(prev => ({ ...prev, ...people }));
      });
    }

    await loadSavedIds();

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

  async function handleToggleFavorite(id: string) {
    const { ids } = await toggleSavedListing(id);
    setSavedIds(new Set(ids));
  }

  function handleResetFilters() {
    setQuery('');
    setCategory('all');
    setConditionFilter('all');
    setSortBy('newest');
    setHideSold(true);
  }

  const hasSecondaryFilters =
    conditionFilter !== 'all' ||
    sortBy !== 'newest' ||
    !hideSold;

  const hasAnyActiveFilters =
    query.trim().length > 0 ||
    category !== 'all' ||
    hasSecondaryFilters;

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: listings.length,
      mine: listings.filter(l => l.seller_id === user?.id).length,
      saved: listings.filter(l => savedIds.has(l.id)).length,
    };
  }, [listings, user?.id, savedIds]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: listings.length };
    const knownIds = new Set(CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'Other').map(c => c.id.toLowerCase()));
    let otherCount = 0;

    listings.forEach(l => {
      const cat = l.category?.trim();
      if (!cat) return;
      const lower = cat.toLowerCase();
      if (knownIds.has(lower)) {
        const standardCat = CATEGORIES.find(c => c.id.toLowerCase() === lower)?.id;
        if (standardCat) {
          map[standardCat] = (map[standardCat] ?? 0) + 1;
        }
      } else {
        otherCount++;
      }
    });

    map['Other'] = otherCount;
    return map;
  }, [listings]);

  // Current category metadata
  const currentCategoryMeta = useMemo(() => {
    return CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase()) ?? CATEGORIES[0];
  }, [category]);

  const currentCategoryLabel = useMemo(() => {
    if (currentCategoryMeta.id === 'all') return t.market2.allCategories;
    return (t.market2 as any)[currentCategoryMeta.labelKey] ?? currentCategoryMeta.id;
  }, [currentCategoryMeta, t]);

  // Filtered & sorted list
  const filteredListings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings
      .filter(l => {
        if (tab === 'mine') return l.seller_id === user?.id;
        if (tab === 'saved') return savedIds.has(l.id);
        return true;
      })
      .filter(l => {
        if (hideSold && tab !== 'mine') {
          return l.status !== 'Sold';
        }
        return true;
      })
      .filter(l => {
        if (category === 'all') return true;
        if (category.toLowerCase() === 'other') {
          const isStandard = CATEGORIES.some(c => c.id !== 'all' && c.id !== 'Other' && c.id.toLowerCase() === l.category?.toLowerCase());
          return !isStandard;
        }
        return l.category?.toLowerCase() === category.toLowerCase();
      })
      .filter(l => {
        if (conditionFilter === 'all') return true;
        return l.condition === conditionFilter;
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
  }, [listings, tab, user?.id, savedIds, hideSold, category, conditionFilter, query, sortBy]);

  // Responsive 2-column calculation
  const screenWidth = Dimensions.get('window').width;
  const cardGap = 11;
  const cardWidth = Math.floor((screenWidth - Layout.screenPadding * 2 - cardGap) / 2);

  const TABS: { id: Tab; label: string; count: number }[] = useMemo(
    () => [
      { id: 'all', label: t.common.all, count: counts.all },
      { id: 'mine', label: t.market2.myListings, count: counts.mine },
      { id: 'saved', label: t.market2.savedListings, count: counts.saved },
    ],
    [t, counts]
  );

  const TRACK_PADDING = 3;
  const innerTrackWidth = Math.max(0, trackWidth - TRACK_PADDING * 2);
  const tabWidth = innerTrackWidth > 0 ? innerTrackWidth / 3 : 0;
  const translateX = animIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
  });

  const innerSortTrackWidth = Math.max(0, sortTrackWidth - TRACK_PADDING * 2);
  const sortWidth = innerSortTrackWidth > 0 ? innerSortTrackWidth / 3 : 0;
  const sortTranslateX = sortAnimIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, sortWidth, sortWidth * 2],
  });

  const innerCondTrackWidth = Math.max(0, condTrackWidth - TRACK_PADDING * 2);
  const condWidth = innerCondTrackWidth > 0 ? innerCondTrackWidth / 4 : 0;
  const condTranslateX = condAnimIndex.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, condWidth, condWidth * 2, condWidth * 3],
  });

  // Render individual listing card
  const renderItem = useCallback(({ item }: { item: Listing }) => {
    const isSold = item.status === 'Sold';
    const isFavorite = savedIds.has(item.id);
    const catMeta = CATEGORIES.find(c => c.id.toLowerCase() === item.category?.toLowerCase()) ?? CATEGORIES[CATEGORIES.length - 1];
    const seller = peopleMap[item.seller_id];
    const isFree = (item.price ?? 0) === 0;

    const condColor = item.condition === 'New' ? '#059669' : item.condition === 'Like New' ? '#2563EB' : '#64748B';
    const condBg = isDark ? `${condColor}2e` : `${condColor}14`;
    const condLabel = item.condition === 'New' ? t.market2.condNew : item.condition === 'Like New' ? t.market2.condLikeNew : item.condition === 'Used' ? t.market2.condUsed : item.condition;

    const sellerName = seller?.full_name ? seller.full_name.split(' ')[0] : t.market2.verifiedStudent;
    const sellerDept = seller?.department ? ` · ${seller.department}` : '';
    const timeAgo = formatRelativeTime(item.created_at);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            width: cardWidth,
            backgroundColor: C.surface,
            borderColor: C.border,
            opacity: isSold ? 0.75 : 1,
          },
        ]}
        onPress={() => navigation.navigate('MarketDetail', { listingId: item.id, id: item.id })}
        activeOpacity={0.8}
      >
        {/* Thumbnail Hero */}
        <View style={[styles.cardThumb, { backgroundColor: isDark ? `${catMeta.fg}24` : `${catMeta.fg}14` }]}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.cardImg} resizeMode="cover" />
          ) : (
            <Feather name={catMeta.icon} size={36} color={catMeta.fg} />
          )}

          {/* Top Badges */}
          <View style={styles.thumbTopRow}>
            {isFree ? (
              <View style={[styles.condBadge, { backgroundColor: '#10b981', borderColor: '#059669' }]}>
                <Text style={[styles.condText, { color: '#fff', fontFamily: FontFamily.jakartaExtraBold }]}>
                  FREE
                </Text>
              </View>
            ) : item.condition ? (
              <View style={[styles.condBadge, { backgroundColor: condBg, borderColor: condColor }]}>
                <Text style={[styles.condText, { color: condColor, fontFamily: FontFamily.jakartaBold }]}>
                  {condLabel}
                </Text>
              </View>
            ) : <View />}

            <TouchableOpacity
              style={[styles.heartBtn, { backgroundColor: isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.92)' }]}
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
          {/* Price & Relative Time */}
          <View style={styles.priceRow}>
            {isFree ? (
              <Text style={[styles.freePriceTxt, { color: '#059669', fontFamily: FontFamily.jakartaExtraBold }]}>
                FREE
              </Text>
            ) : (
              <Text style={[styles.priceText, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {formatPrice(item.price ?? 0)}
              </Text>
            )}

            <Text style={[styles.timeAgoTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {timeAgo}
            </Text>
          </View>

          {/* Negotiable or Fixed Label */}
          <Text
            style={[
              styles.negotiableText,
              {
                color: item.negotiable ? '#059669' : C.textMuted,
                fontFamily: FontFamily.jakartaSemiBold,
              },
            ]}
          >
            {item.negotiable ? t.market2.negotiable : t.market2.fixedPrice}
          </Text>

          {/* Title */}
          <Text
            style={[styles.titleText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
            numberOfLines={2}
          >
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
              {sellerName}{sellerDept}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [cardWidth, savedIds, peopleMap, isDark, C, navigation, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 1. Clean Top Header */}
      <SubBar title={t.market2.marketplace} onBack={() => navigation.goBack()} />

      {/* Main Container */}
      <View style={{ flex: 1 }}>
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* 2. Prominent Emerald Hero Action Bar */}
        <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 4, paddingBottom: 6 }}>
          <TouchableOpacity
            style={[styles.heroActBtn, { backgroundColor: MARKET_COLOR }]}
            onPress={() => navigation.navigate('MarketPost')}
            activeOpacity={0.85}
          >
            <Feather name="plus-circle" size={16} color="#fff" />
            <Text style={[styles.heroActBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {t.market2.sellItem}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Segmented Tab Switcher (Card Animation matching Blood & Directory) */}
        <View
          style={[styles.tabContainer, { backgroundColor: C.surface2 }]}
          onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        >
          {tabWidth > 0 && (
            <Animated.View
              style={[
                styles.activeIndicator,
                {
                  width: tabWidth,
                  transform: [{ translateX }],
                  backgroundColor: C.surface,
                  borderColor: isDark ? `${MARKET_COLOR}55` : `${MARKET_COLOR}35`,
                },
              ]}
            />
          )}

          {TABS.map(tItem => {
            const active = tab === tItem.id;
            return (
              <TouchableOpacity
                key={tItem.id}
                style={styles.tabBtn}
                onPress={() => setTab(tItem.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabBtnTxt,
                    {
                      color: active ? MARKET_COLOR : C.textMuted,
                      fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tItem.label}
                </Text>
                {tItem.count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor: active
                          ? `${MARKET_COLOR}22`
                          : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.border),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeTxt,
                        {
                          color: active ? MARKET_COLOR : C.textMuted,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {tItem.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Structured Dual Control Bar (Matches Directory Screen) */}
        <View style={styles.dualBarRow}>
          {/* Left: Quick 'All' Reset Button */}
          <TouchableOpacity
            style={[
              styles.dualBarBtn,
              category === 'all'
                ? [
                    styles.dualBarBtnActive,
                    {
                      backgroundColor: isDark ? `${MARKET_COLOR}22` : `${MARKET_COLOR}14`,
                      borderColor: isDark ? `${MARKET_COLOR}66` : MARKET_COLOR,
                    },
                  ]
                : [styles.dualBarBtnInactive, { backgroundColor: C.surface, borderColor: C.border }],
            ]}
            onPress={() => setCategory('all')}
            activeOpacity={0.75}
          >
            <Feather
              name="grid"
              size={14}
              color={category === 'all' ? (isDark ? '#fff' : MARKET_COLOR) : C.text2}
            />
            <Text
              style={[
                styles.dualBarTxt,
                {
                  color: category === 'all' ? (isDark ? '#fff' : MARKET_COLOR) : C.text,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
              numberOfLines={1}
            >
              {t.common.all}
            </Text>
          </TouchableOpacity>

          {/* Right: Category Picker Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dualBarBtn,
              category !== 'all'
                ? [
                    styles.dualBarBtnActive,
                    {
                      backgroundColor: isDark ? `${currentCategoryMeta.fg}22` : `${currentCategoryMeta.fg}14`,
                      borderColor: isDark ? `${currentCategoryMeta.fg}66` : currentCategoryMeta.fg,
                    },
                  ]
                : [styles.dualBarBtnInactive, { backgroundColor: C.surface, borderColor: C.border }],
            ]}
            onPress={() => setCategoryModalVisible(true)}
            activeOpacity={0.75}
          >
            <Feather
              name={currentCategoryMeta.icon}
              size={14}
              color={category !== 'all' ? (isDark ? '#fff' : currentCategoryMeta.fg) : C.text2}
            />
            <Text
              style={[
                styles.dualBarTxt,
                {
                  color: category !== 'all' ? (isDark ? '#fff' : currentCategoryMeta.fg) : C.text,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
              numberOfLines={1}
            >
              {currentCategoryLabel}
            </Text>
            <Icon
              name="chevD"
              size={14}
              color={category !== 'all' ? (isDark ? '#fff' : currentCategoryMeta.fg) : C.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* 5. Search Bar & Secondary Filter Trigger */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="search" size={16} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
              placeholder={t.market2.searchItems}
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} style={{ padding: 4 }}>
                <Feather name="x" size={14} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterTriggerBtn,
              hasSecondaryFilters
                ? {
                    backgroundColor: MARKET_COLOR,
                    borderColor: MARKET_COLOR,
                  }
                : {
                    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.16)' : 'rgba(5, 150, 105, 0.08)',
                    borderColor: isDark ? 'rgba(5, 150, 105, 0.45)' : 'rgba(5, 150, 105, 0.35)',
                  },
            ]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.75}
          >
            <Feather
              name="sliders"
              size={14}
              color={hasSecondaryFilters ? '#fff' : MARKET_COLOR}
            />
            <Text
              style={[
                styles.filterTriggerTxt,
                {
                  color: hasSecondaryFilters ? '#fff' : MARKET_COLOR,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
            >
              Filter
            </Text>
            {hasSecondaryFilters && (
              <View style={[styles.filterActiveDot, { backgroundColor: '#fff' }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Clear Tag */}
        {hasAnyActiveFilters && (
          <View style={styles.activeFilterNoticeRow}>
            <Text style={[styles.filterCountTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {filteredListings.length} {filteredListings.length === 1 ? 'item found' : 'items found'}
            </Text>
            <TouchableOpacity
              style={[styles.clearPill, { backgroundColor: C.surface2, borderColor: C.border }]}
              onPress={handleResetFilters}
              activeOpacity={0.75}
            >
              <Feather name="rotate-ccw" size={11} color={C.brand} />
              <Text style={[styles.clearPillTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.clearFilters}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 6. Virtualized 2-Column Grid */}
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
                {hasAnyActiveFilters && (
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

      {/* 7. Category Bottom Sheet Modal (Exact Match to Directory Screen) */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setCategoryModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIcon,
                    { backgroundColor: isDark ? `${MARKET_COLOR}25` : `${MARKET_COLOR}15` },
                  ]}
                >
                  <Feather name="grid" size={17} color={MARKET_COLOR} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.selectCategory}
                  </Text>
                  <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {t.market2.categorySubtitle(listings.length)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 440 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {CATEGORIES.map(c => {
                const active = category.toLowerCase() === c.id.toLowerCase();
                const count = categoryCounts[c.id] ?? (c.id === 'all' ? listings.length : 0);
                const fg = c.fg;
                const iconBg = isDark ? `${fg}24` : `${fg}15`;
                const label = c.id === 'all' ? t.market2.allCategories : (t.market2 as any)[c.labelKey] ?? c.id;
                const sub = (t.market2 as any)[c.subKey] ?? '';

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.modalItemCard,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(255, 255, 255, 0.04)' : `${fg}08`)
                          : C.surface,
                        borderColor: active ? fg : C.border,
                        borderWidth: active ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      setCategory(c.id);
                      setCategoryModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.modalItemIconBox, { backgroundColor: iconBg }]}>
                      <Feather name={c.icon} size={18} color={fg} />
                    </View>

                    <View style={styles.modalItemInfo}>
                      <Text
                        style={[
                          styles.modalItemNameTxt,
                          {
                            color: active ? fg : C.text,
                            fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaSemiBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      {sub.length > 0 && (
                        <Text
                          style={[styles.modalItemSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}
                          numberOfLines={1}
                        >
                          {sub}
                        </Text>
                      )}
                    </View>

                    <View style={styles.modalItemRight}>
                      <View
                        style={[
                          styles.modalCountBadge,
                          {
                            backgroundColor: active
                              ? (isDark ? `${fg}30` : `${fg}18`)
                              : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalCountTxt,
                            {
                              color: active ? fg : C.textMuted,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>

                      {active && (
                        <View style={[styles.modalCheckCircle, { backgroundColor: fg }]}>
                          <Feather name="check" size={11} color="#fff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 8. Secondary Filter & Sort Bottom Sheet Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIcon,
                    { backgroundColor: isDark ? `${MARKET_COLOR}25` : `${MARKET_COLOR}15` },
                  ]}
                >
                  <Feather name="sliders" size={17} color={MARKET_COLOR} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.filterAndSort}
                  </Text>
                  <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {t.market2.filterSubtitle}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
              >
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Sort By Section (Animated Bar) */}
              <Text style={[styles.sectionHeading, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.sortBy}
              </Text>
              <View
                style={[styles.segTrack, { backgroundColor: C.surface2 }]}
                onLayout={e => setSortTrackWidth(e.nativeEvent.layout.width)}
              >
                {sortWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.segIndicator,
                      {
                        width: sortWidth,
                        transform: [{ translateX: sortTranslateX }],
                        backgroundColor: C.surface,
                        borderColor: isDark ? `${MARKET_COLOR}55` : `${MARKET_COLOR}35`,
                      },
                    ]}
                  />
                )}

                {[
                  { id: 'newest', label: t.market2.sortNewest, icon: 'clock' },
                  { id: 'asc', label: t.market2.sortPriceAsc, icon: 'arrow-up' },
                  { id: 'desc', label: t.market2.sortPriceDesc, icon: 'arrow-down' },
                ].map(s => {
                  const active = sortBy === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.segBtn}
                      onPress={() => setSortBy(s.id as any)}
                      activeOpacity={0.75}
                    >
                      <Feather name={s.icon as any} size={12} color={active ? MARKET_COLOR : C.textMuted} />
                      <Text
                        style={[
                          styles.segBtnTxt,
                          {
                            color: active ? MARKET_COLOR : C.textMuted,
                            fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Availability Section */}
              <Text style={[styles.sectionHeading, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
                {t.market2.availability}
              </Text>
              <View
                style={[
                  styles.switchRowCard,
                  { backgroundColor: C.surface2, borderColor: C.border },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.switchTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.hideSold}
                  </Text>
                  <Text style={[styles.switchSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {t.market2.hideSoldSubtitle}
                  </Text>
                </View>
                <Switch
                  value={hideSold}
                  onValueChange={setHideSold}
                  trackColor={{ false: C.border, true: MARKET_COLOR }}
                  thumbColor="#fff"
                />
              </View>

              {/* Condition Section (Animated Bar) */}
              <Text style={[styles.sectionHeading, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
                {t.market2.condition}
              </Text>
              <View
                style={[styles.segTrack, { backgroundColor: C.surface2 }]}
                onLayout={e => setCondTrackWidth(e.nativeEvent.layout.width)}
              >
                {condWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.segIndicator,
                      {
                        width: condWidth,
                        transform: [{ translateX: condTranslateX }],
                        backgroundColor: C.surface,
                        borderColor: isDark ? `${MARKET_COLOR}55` : `${MARKET_COLOR}35`,
                      },
                    ]}
                  />
                )}

                {[
                  { id: 'all', label: t.common.all },
                  { id: 'New', label: t.market2.condNew },
                  { id: 'Like New', label: t.market2.condLikeNew },
                  { id: 'Used', label: t.market2.condUsed },
                ].map(c => {
                  const active = conditionFilter === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.segBtn}
                      onPress={() => setConditionFilter(c.id as ConditionPreset)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.segBtnTxt,
                          {
                            color: active ? MARKET_COLOR : C.textMuted,
                            fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons (Both flex: 1 for equal size) */}
              <View style={styles.filterActionsRow}>
                <TouchableOpacity
                  style={[styles.sheetResetBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={handleResetFilters}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.sheetResetTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.resetFilters}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sheetApplyBtn, { backgroundColor: MARKET_COLOR }]}
                  onPress={() => setFilterModalVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.sheetApplyTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.applyFilters}
                  </Text>
                </TouchableOpacity>
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

  // Prominent Hero Action Bar
  heroActBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
  } as ViewStyle,
  heroActBtnTxt: {
    fontSize: 14,
    letterSpacing: 0.1,
  } as any,

  // Segmented Tab Switcher (Matches Blood & Directory)
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginHorizontal: Layout.screenPadding,
    marginBottom: 8,
    position: 'relative',
  } as ViewStyle,
  activeIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 11,
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
    paddingVertical: 9,
    gap: 5,
    zIndex: 1,
  } as ViewStyle,
  tabBtnTxt: { fontSize: 13 } as any,
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  } as ViewStyle,
  tabBadgeTxt: { fontSize: 10.5 } as any,

  // Dual Control Bar (Matches Directory)
  dualBarRow: {
    flexDirection: 'row',
    gap: 9,
    marginHorizontal: Layout.screenPadding,
    marginBottom: 8,
  } as ViewStyle,
  dualBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  dualBarBtnActive: {} as ViewStyle,
  dualBarBtnInactive: {} as ViewStyle,
  dualBarTxt: { fontSize: 12.5 } as any,

  // Search & Filter Row (Directly above feed)
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Layout.screenPadding,
    marginBottom: 6,
  } as ViewStyle,
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  } as TextStyle,
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    position: 'relative',
  } as ViewStyle,
  filterTriggerTxt: { fontSize: 12.5 } as any,
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  } as ViewStyle,

  // Notice & Reset Pill Row
  activeFilterNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Layout.screenPadding,
    marginBottom: 8,
    paddingTop: 2,
  } as ViewStyle,
  filterCountTxt: { fontSize: 11.5 } as any,
  clearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  clearPillTxt: { fontSize: 11 } as any,

  listContent: {
    paddingBottom: 28,
  } as ViewStyle,

  // 2-Column Product Card
  card: {
    borderRadius: 15,
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
    borderRadius: 7,
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
    borderRadius: 14,
    backgroundColor: '#fff',
  } as ViewStyle,
  soldBadgeText: { fontSize: 11 } as any,

  cardBody: {
    padding: 10,
    gap: 3,
  } as ViewStyle,
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  priceText: { fontSize: 15 } as any,
  freePriceTxt: { fontSize: 14 } as any,
  timeAgoTxt: { fontSize: 10 } as any,
  negotiableText: { fontSize: 10 } as any,
  titleText: {
    fontSize: 12.5,
    lineHeight: 17,
    height: 34,
    marginTop: 1,
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
  coursePillText: { fontSize: 9.5 } as any,
  spotText: { fontSize: 10, flex: 1 } as any,

  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  } as ViewStyle,
  emptyTitle: { fontSize: 16, textAlign: 'center' } as any,
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 } as any,
  emptyActionBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
  } as ViewStyle,
  emptyActionTxt: { fontSize: 13 } as any,

  // Bottom Sheet Modal Shared Styles (Exact Directory Parity)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  } as ViewStyle,
  modalBackdrop: {
    ...StyleSheet.absoluteFill as any,
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 18,
  } as ViewStyle,
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  } as ViewStyle,
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,
  modalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalTitle: { fontSize: 17 } as any,
  modalSub: { fontSize: 12, marginTop: 1 } as any,
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Category Sheet Items
  modalItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  } as ViewStyle,
  modalItemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalItemInfo: { flex: 1 } as ViewStyle,
  modalItemNameTxt: { fontSize: 14 } as any,
  modalItemSubTxt: { fontSize: 11.5, marginTop: 2 } as any,
  modalItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  modalCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  } as ViewStyle,
  modalCountTxt: { fontSize: 11.5 } as any,
  modalCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Filter Sheet Elements
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  } as any,
  segTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 13,
    padding: 3,
    position: 'relative',
    marginBottom: 4,
  } as ViewStyle,
  segIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  } as ViewStyle,
  segBtn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 1,
  } as ViewStyle,
  segBtnTxt: { fontSize: 12 } as any,

  switchRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  switchTitle: { fontSize: 13.5 } as any,
  switchSub: { fontSize: 11.5, marginTop: 2 } as any,

  filterActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  } as ViewStyle,
  sheetResetBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  sheetResetTxt: { fontSize: 13 } as any,
  sheetApplyBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  } as ViewStyle,
  sheetApplyTxt: { fontSize: 13 } as any,
});
