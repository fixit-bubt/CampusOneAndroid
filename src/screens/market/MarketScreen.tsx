import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Image, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , Accent, LightColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';

type Tab = 'all' | 'mine';

// Keys must match the postable categories in MarketPostScreen / Listing.category.
const MK_CATS: Record<string, { icon: string; fg: string; label: string }> = {
  books:       { icon: 'book-open', fg: Accent.blue,   label: 'Books'       },
  electronics: { icon: 'cpu',       fg: Accent.purple, label: 'Electronics' },
  furniture:   { icon: 'layers',    fg: Accent.amber,  label: 'Furniture'   },
  notes:       { icon: 'file-text', fg: Accent.teal,   label: 'Notes'       },
  other:       { icon: 'package',   fg: Accent.slate,  label: 'Other'       },
};

interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  negotiable: boolean;
  status: string;
  seller_id: string;
  description: string;
  photo_url: string | null;
  created_at: string;
}

export function MarketScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'asc' | 'desc'>('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      // Available ('A') sorts before Sold ('S') so Sold items don't crowd
      // available ones out of the 60-row window.
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(60);
    if (!error && data) setListings(data as Listing[]);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const q = query.trim().toLowerCase();
  const min = parseInt(minPrice, 10);
  const max = parseInt(maxPrice, 10);
  const list = listings
    .filter(l => (tab === 'mine' ? l.seller_id === user?.id : true))
    .filter(l => category === 'all' || l.category?.toLowerCase() === category)
    .filter(l => !q || [l.title, l.description, l.category].filter(Boolean).join(' ').toLowerCase().includes(q))
    .filter(l => (Number.isNaN(min) || l.price >= min) && (Number.isNaN(max) || l.price <= max))
    .sort((a, b) => (sortBy === 'asc' ? a.price - b.price : sortBy === 'desc' ? b.price - a.price : 0));

  const SORT_ORDER = ['newest', 'asc', 'desc'] as const;
  const cycleSort = () => setSortBy(prev => SORT_ORDER[(SORT_ORDER.indexOf(prev) + 1) % 3]);
  const sortLabel = sortBy === 'asc' ? t.market2.sortPriceAsc : sortBy === 'desc' ? t.market2.sortPriceDesc : t.market2.sortNewest;
  const sortIcon = sortBy === 'asc' ? 'arrow-up' : sortBy === 'desc' ? 'arrow-down' : 'clock';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Marketplace"
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('MarketPost')}
            activeOpacity={0.75}
          >
            <Feather name="plus" size={22} color={C.text} />
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={[styles.tabs, { paddingHorizontal: Layout.screenPadding }]}>
        {(['all', 'mine'] as Tab[]).map(tb => (
          <TouchableOpacity
            key={tb}
            style={[styles.chip, tab === tb
              ? { backgroundColor: C.brand, borderColor: C.brand }
              : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setTab(tb)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipTxt, { color: tab === tb ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {tb === 'all' ? t.market2.allListings : t.market2.myListings}
            </Text>
            <Text style={[styles.chipCount, { color: tab === tb ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {tb === 'all' ? listings.length : listings.filter(l => l.seller_id === user?.id).length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: Layout.screenPadding }}>
        <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
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
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.catChips, { paddingHorizontal: Layout.screenPadding }]}
      >
        {['all', ...Object.keys(MK_CATS)].map(c => {
          const on = category === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, on
                ? { backgroundColor: C.surface2, borderColor: C.text2 }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setCategory(c)}
              activeOpacity={0.75}
            >
              <Text style={[styles.catChipTxt, { color: on ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {c === 'all' ? t.common.all : (MK_CATS[c]?.label ?? c)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Price tools — min/max range + sort */}
      <View style={[styles.filterRow, { paddingHorizontal: Layout.screenPadding }]}>
        <TextInput
          style={[styles.priceInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
          placeholder={t.market2.priceMin}
          placeholderTextColor={C.textMuted}
          value={minPrice}
          onChangeText={v => setMinPrice(v.replace(/\D/g, ''))}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.priceInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
          placeholder={t.market2.priceMax}
          placeholderTextColor={C.textMuted}
          value={maxPrice}
          onChangeText={v => setMaxPrice(v.replace(/\D/g, ''))}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={cycleSort}
          activeOpacity={0.75}
        >
          <Feather name={sortIcon as any} size={13} color={C.text2} />
          <Text style={[styles.sortTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{sortLabel}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {loading && listings.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={C.brand} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="market" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {tab === 'mine' ? t.market2.noListingsYet : t.market2.noItemsAvailable}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {list.map(l => {
              const cat = MK_CATS[l.category?.toLowerCase()] ?? MK_CATS.other;
              const isSold = l.status === 'Sold';
              const tintBg = isDark ? `${cat.fg}2e` : `${cat.fg}18`;
              return (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.cell, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('MarketDetail', { listingId: l.id })}
                  activeOpacity={0.75}
                >
                  {/* Thumb */}
                  <View style={[styles.cellThumb, { backgroundColor: tintBg }]}>
                    {l.photo_url ? (
                      <Image source={{ uri: l.photo_url }} style={styles.cellThumbImg} resizeMode="cover" />
                    ) : (
                      <Feather name={cat.icon as any} size={36} color={cat.fg} />
                    )}
                    {isSold && (
                      <View style={styles.soldOverlay}>
                        <View style={[styles.soldPill, { backgroundColor: '#fff' }]}>
                          <Text style={[styles.soldTxt, { color: LightColors.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.market2.sold}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  {/* Info */}
                  <View style={styles.cellBody}>
                    <Text style={[styles.cellTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
                      {l.title}
                    </Text>
                    <Text style={[styles.cellPrice, { color: isSold ? C.textMuted : C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      ৳{(l.price ?? 0).toLocaleString('en-US')}
                    </Text>
                    <Text style={[styles.cellMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>
                      {l.condition}{l.negotiable ? t.market2.negotiableSuffix : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  tabs: { flexDirection: 'row', gap: 8, paddingVertical: 8 } as ViewStyle,
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderRadius: 13, marginBottom: 8 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 10 } as TextStyle,
  catChips: { flexDirection: 'row', gap: 7, paddingBottom: 8 } as ViewStyle,
  catChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  catChipTxt: { fontSize: 11.5 } as any,
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingBottom: 8 } as ViewStyle,
  priceInput: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 13 } as TextStyle,
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  sortTxt: { fontSize: 12.5 } as any,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 } as ViewStyle,
  cell: { width: '47.5%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  cellThumb: { height: 96, alignItems: 'center', justifyContent: 'center', position: 'relative' } as ViewStyle,
  cellThumbImg: { position: 'absolute', width: '100%', height: '100%' } as any,
  soldOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  soldPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 } as ViewStyle,
  soldTxt: { fontSize: 11 } as any,
  cellBody: { padding: 10, paddingBottom: 13 } as ViewStyle,
  cellTitle: { fontSize: 13.5, lineHeight: 18, height: 36, overflow: 'hidden' } as any,
  cellPrice: { fontSize: 16, marginTop: 4 } as any,
  cellMeta: { fontSize: 11, marginTop: 3 } as any,
  iconBtn: { padding: 8 } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
});
