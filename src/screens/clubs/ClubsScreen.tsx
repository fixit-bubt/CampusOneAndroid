import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, RefreshControl, ActivityIndicator, KeyboardAvoidingView,
  type ViewStyle, type TextStyle,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys, withTimeout } from '../../services/cacheService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

const CATEGORY_LIST = ['All', 'My Clubs', 'Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const;
type CategoryFilter = typeof CATEGORY_LIST[number];

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  All: 'layers',
  'My Clubs': 'award',
  Tech: 'cpu',
  Cultural: 'music',
  Sports: 'activity',
  Professional: 'briefcase',
  Social: 'users',
};

interface Club {
  id: string;
  name: string;
  tagline: string | null;
  category: string;
  member_count: number;
  description?: string;
  user_role?: string | null;
}

export function ClubsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Search & Category Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const load = useCallback(async () => {
    // 1. Instant cache load
    const cached = await getCache<Club[]>(CacheKeys.CLUBS);
    if (cached && cached.length > 0) {
      setClubs(cached);
      setLoading(false);
    }

    try {
      // 2. Fetch fresh from Supabase with 5s timeout
      const [clubsRes, myRolesRes, countsRes] = await withTimeout(
        Promise.all([
          supabase
            .from('clubs')
            .select('id, name, tagline, category, is_active')
            .eq('is_active', true)
            .order('name')
            .limit(60),
          user?.id
            ? supabase.from('club_members').select('club_id, role').eq('user_id', user.id)
            : Promise.resolve({ data: [] as any[] }),
          supabase.rpc('club_member_counts'),
        ]),
        5000
      );

      if (clubsRes.error) {
        if (cached && cached.length > 0) {
          setIsOffline(true);
        } else {
          setLoadErr(true);
        }
        return;
      }

      setLoadErr(false);
      setIsOffline(false);

      const countMap: Record<string, number> = {};
      ((countsRes as any)?.data ?? []).forEach((r: any) => { countMap[r.club_id] = Number(r.members); });

      const roleMap: Record<string, string> = {};
      ((myRolesRes as any)?.data ?? []).forEach((m: any) => { roleMap[m.club_id] = m.role; });

      if (clubsRes.data) {
        const mapped = (clubsRes.data as any[]).map(c => ({
          id: c.id,
          name: c.name,
          tagline: c.tagline ?? null,
          category: c.category,
          member_count: countMap[c.id] ?? 0,
          user_role: roleMap[c.id] ?? null,
        }));
        setClubs(mapped as Club[]);
        setCache(CacheKeys.CLUBS, mapped as Club[]);
      }
    } catch {
      if (cached && cached.length > 0) {
        setIsOffline(true);
      } else {
        setLoadErr(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusRefresh(load);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const myClubs = useMemo(() => clubs.filter(c => !!c.user_role), [clubs]);

  // Filtered dataset
  const filteredClubs = useMemo(() => {
    let result = clubs;

    if (categoryFilter === 'My Clubs') {
      result = result.filter(c => !!c.user_role);
    } else if (categoryFilter !== 'All') {
      result = result.filter(c => c.category === categoryFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.tagline && c.tagline.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [clubs, categoryFilter, searchQuery]);

  const otherClubs = useMemo(() => filteredClubs.filter(c => !c.user_role), [filteredClubs]);

  const renderClubCard = useCallback((c: Club, i: number) => {
    const role = c.user_role;
    const isMyClub = !!role;
    return (
      <TouchableOpacity
        key={i}
        style={[
          styles.card,
          {
            backgroundColor: isMyClub
              ? (isDark ? 'rgba(39, 94, 254, 0.08)' : 'rgba(39, 94, 254, 0.05)')
              : C.surface,
            borderColor: isMyClub ? 'rgba(39, 94, 254, 0.45)' : C.border,
            borderWidth: isMyClub ? 1.5 : 1,
          },
        ]}
        onPress={() => navigation.navigate('ClubDetail', { clubId: c.id })}
        activeOpacity={0.75}
      >
        <View style={styles.thumb}>
          <Icon name="clubs" size={32} color={isMyClub ? C.brand : C.text} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {c.name}
            </Text>
            {role && (
              <View style={[styles.rolePill, { backgroundColor: isMyClub ? 'rgba(39, 94, 254, 0.18)' : C.surface2 }]}>
                <Text style={[styles.roleTxt, { color: isMyClub ? C.brand : C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.clubs.roleLabels[role] ?? role}
                </Text>
              </View>
            )}
          </View>

          {c.tagline ? (
            <Text style={[styles.tagline, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              {c.tagline}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={[styles.categoryPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
              <Text style={[styles.categoryTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {c.category}
              </Text>
            </View>

            <Text style={[styles.memberCount, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {c.member_count} {(c.member_count === 1 ? t.clubs.members.replace(/s$/, '') : t.clubs.members).toLowerCase()}
            </Text>
          </View>
        </View>

        <Icon name="chevR" size={18} color={C.textMuted} />
      </TouchableOpacity>
    );
  }, [isDark, C, navigation, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.sectors.clubs} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* 1. Universal 58dp Search Bar */}
        <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
          <Icon name="search" size={20} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder="Search clubs..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} activeOpacity={0.7}>
              <Feather name="x-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Big 58dp Category Dropdown Bar (Clean Monochrome) */}
        <TouchableOpacity
          style={[
            styles.bar58,
            styles.dropdownBar,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
              marginBottom: 14,
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.barLeft}>
            <Feather
              name={CATEGORY_ICONS[categoryFilter] ?? 'layers'}
              size={28}
              color={C.text}
            />
            <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {categoryFilter === 'All' ? 'All Club Categories' : categoryFilter === 'My Clubs' ? 'My Clubs' : `Category: ${categoryFilter}`}
            </Text>
          </View>
          <Feather name="chevron-down" size={20} color={C.textMuted} />
        </TouchableOpacity>

        {/* 3. Club Cards List */}
        {loading && clubs.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator style={{ marginTop: 30 }} color={C.text} size="large" />
          </View>
        ) : loadErr && clubs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="clubs" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.common.error}
            </Text>
          </View>
        ) : filteredClubs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="clubs" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {searchQuery ? 'No clubs match your search' : t.clubs2.noClubsFound}
            </Text>
            {searchQuery || categoryFilter !== 'All' ? (
              <TouchableOpacity
                style={[styles.clearSearchBtn, { backgroundColor: C.surface2 }]}
                onPress={() => { setSearchQuery(''); setCategoryFilter('All'); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.clearSearchTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  Reset Filters
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : categoryFilter === 'All' && !searchQuery.trim() && myClubs.length > 0 ? (
          <View>
            {/* Section 1: My Clubs (Pinned to Top) */}
            <View style={{ marginBottom: 18 }}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginBottom: 8 }]}>
                MY CLUBS · {myClubs.length}
              </Text>
              <View style={{ gap: 10 }}>
                {myClubs.map(renderClubCard)}
              </View>
            </View>

            {/* Section 2: All Campus Clubs */}
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginBottom: 8 }]}>
              ALL CAMPUS CLUBS
            </Text>
            <View style={{ gap: 10 }}>
              {otherClubs.map(renderClubCard)}
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredClubs.map(renderClubCard)}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
          CATEGORY FILTER BOTTOM SHEET (58dp Monochrome Option Bars)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setFilterModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 14 }]}>
              Filter by Category
            </Text>

            <View style={{ gap: 8 }}>
              {CATEGORY_LIST.map(cat => {
                const isSelected = categoryFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        backgroundColor: isSelected ? C.surface2 : C.bg,
                        borderColor: isSelected ? C.text : C.border,
                      },
                    ]}
                    onPress={() => {
                      setCategoryFilter(cat);
                      setFilterModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.barLeft}>
                      <Feather
                        name={CATEGORY_ICONS[cat] ?? 'layers'}
                        size={28}
                        color={C.text}
                      />
                      <Text
                        style={[
                          styles.barTitle,
                          {
                            color: C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {cat === 'All' ? 'All Club Categories' : cat}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 24 } as ViewStyle,

  // Universal 58dp Bar Standard
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  dropdownBar: {
    justifyContent: 'space-between',
  } as ViewStyle,
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  } as ViewStyle,
  barTitle: {
    fontSize: 14.5,
  } as TextStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
    marginLeft: 8,
  } as TextStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  } as TextStyle,
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  } as ViewStyle,
  thumb: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  } as ViewStyle,
  cardTitle: {
    fontSize: 15,
    flex: 1,
  } as TextStyle,
  tagline: {
    fontSize: 12.5,
    marginTop: 2,
  } as TextStyle,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  } as ViewStyle,
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  } as ViewStyle,
  categoryTxt: {
    fontSize: 11,
  } as TextStyle,
  memberCount: {
    fontSize: 12,
  } as TextStyle,

  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  } as ViewStyle,
  roleTxt: {
    fontSize: 11,
  } as TextStyle,

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 15,
  } as TextStyle,
  clearSearchBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  } as ViewStyle,
  clearSearchTxt: {
    fontSize: 13,
  } as TextStyle,

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 36,
  } as ViewStyle,
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#888',
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 18,
  } as TextStyle,
});
