// Matches design screens-b.jsx — Marketplace (2-col grid, All/Mine tabs)
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

type Tab = 'all' | 'mine';

const MK_CATS: Record<string, { icon: string; fg: string; label: string }> = {
  books:       { icon: 'book-open', fg: Accent.blue, label: 'Books'       },
  electronics: { icon: 'cpu',       fg: Accent.purple, label: 'Electronics' },
  clothing:    { icon: 'scissors',  fg: Accent.pink, label: 'Clothing'    },
  sports:      { icon: 'activity',  fg: Accent.teal, label: 'Sports'      },
  furniture:   { icon: 'layers',    fg: Accent.amber, label: 'Furniture'   },
  other:       { icon: 'package',   fg: Accent.slate, label: 'Other'       },
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
  created_at: string;
}

export function MarketScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);
    if (data) setListings(data as Listing[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const list = tab === 'mine' ? listings.filter(l => l.seller_id === user?.id) : listings;

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
        {(['all', 'mine'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, tab === t
              ? { backgroundColor: C.brand, borderColor: C.brand }
              : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setTab(t)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipTxt, { color: tab === t ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {t === 'all' ? 'All Listings' : 'My Listings'}
            </Text>
            <Text style={[styles.chipCount, { color: tab === t ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t === 'all' ? listings.length : listings.filter(l => l.seller_id === user?.id).length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="market" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {tab === 'mine' ? 'No listings yet' : 'No items available'}
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
                    <Feather name={cat.icon as any} size={36} color={isDark ? cat.fg : cat.fg} />
                    {isSold && (
                      <View style={styles.soldOverlay}>
                        <View style={[styles.soldPill, { backgroundColor: '#fff' }]}>
                          <Text style={[styles.soldTxt, { color: '#0f1a2e', fontFamily: FontFamily.jakartaExtraBold }]}>Sold</Text>
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
                      {l.condition}{l.negotiable ? ' · Negotiable' : ''}
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
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 } as ViewStyle,
  cell: { width: '47.5%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  cellThumb: { height: 96, alignItems: 'center', justifyContent: 'center', position: 'relative' } as ViewStyle,
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
