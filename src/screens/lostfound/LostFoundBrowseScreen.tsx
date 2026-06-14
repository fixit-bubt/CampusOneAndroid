import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import type { LostFoundItem } from '../../types/database';
import { useT } from '../../i18n';

type Filter = 'all' | 'Lost' | 'Found' | 'mine';

const CAT_COLOR: Record<string, string> = {
  Personal: Accent.blue, Electronics: SectorColors.lostfound, Documents: Accent.green, Other: Accent.slate,
};
const CAT_ICON: Record<string, string> = {
  Personal: 'user', Electronics: 'phone', Documents: 'layers', Other: 'inbox',
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function LFCard({ item, C, isDark, onPress }: { item: LostFoundItem; C: any; isDark: boolean; onPress: () => void }) {
  const fg = CAT_COLOR[item.category] ?? Accent.slate;
  const bg = `${fg}1e`;
  const isLost = item.type === 'Lost';
  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]} activeOpacity={0.75}>
      <View style={[styles.thumb, { backgroundColor: bg }]}>
        <Icon name={CAT_ICON[item.category] ?? 'inbox'} size={22} color={fg} />
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
        </View>
        <View style={styles.cardMeta}>
          <View style={[styles.typeBadge, isLost ? { backgroundColor: C.dangerBg } : { backgroundColor: C.successBg }]}>
            <View style={[styles.typeDot, { backgroundColor: isLost ? C.danger : C.success }]} />
            <Text style={[styles.typeText, { color: isLost ? C.danger : C.success, fontFamily: FontFamily.jakartaBold }]}>
              {item.type}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
            {item.status === 'Resolved' ? 'Resolved' : timeAgo(item.created_at)}
          </Text>
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
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('lost_found_items')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setItems(data as LostFoundItem[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const counts = {
    all: items.length,
    Lost: items.filter(i => i.type === 'Lost').length,
    Found: items.filter(i => i.type === 'Found').length,
    mine: items.filter(i => i.poster_id === user?.id).length,
  };

  const list = filter === 'all' ? items
    : filter === 'mine' ? items.filter(i => i.poster_id === user?.id)
    : items.filter(i => i.type === filter);

  const TABS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'Lost', label: 'Lost' },
    { id: 'Found', label: 'Found' },
    { id: 'mine', label: 'Mine' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Lost & Found"
        onBack={() => navigation.goBack()}
        right={
          isStudent ? (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
              onPress={() => navigation.navigate('LostFoundPost')}
            >
              <Icon name="plus" size={20} color={C.text} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Filter chips */}
      <View style={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[
              styles.chip,
              filter === t.id
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => setFilter(t.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, { color: filter === t.id ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {t.label}
            </Text>
            <Text style={[styles.chipCount, { color: filter === t.id ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {counts[t.id]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {!isStudent ? (
          <View style={styles.empty}>
            <Icon name="found" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Lost & Found is for students.</Text>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="found" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.lf.noItems}</Text>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Tap + to post a lost or found item
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map(item => (
              <LFCard
                key={item.id}
                item={item}
                C={C}
                isDark={isDark}
                onPress={() => navigation.navigate('LostFoundDetail', { itemId: item.id })}
              />
            ))}
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  } as ViewStyle,

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,

  chipText: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,

  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,

  list: { gap: 10 } as ViewStyle,

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,

  thumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14 } as any,

  cardLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  } as ViewStyle,

  cardLocTxt: { fontSize: 12 } as any,

  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  } as ViewStyle,

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  } as ViewStyle,

  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,

  typeText: { fontSize: 11 } as any,
  timeText: { fontSize: 12 } as any,

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  } as ViewStyle,

  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13, textAlign: 'center' } as any,
});
