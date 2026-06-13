// Matches design screens-d.jsx — Clubs browse
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';

const CL_CATS: Record<string, { label: string; fg: string }> = {
  academic:  { label: 'Academic',  fg: Accent.blue },
  cultural:  { label: 'Cultural',  fg: Accent.pink },
  sports:    { label: 'Sports',    fg: Accent.teal },
  technical: { label: 'Technical', fg: Accent.purple },
  social:    { label: 'Social',    fg: Accent.amber },
  other:     { label: 'Other',     fg: Accent.slate },
};

interface Club {
  id: string;
  name: string;
  category: string;
  member_count: number;
  description: string;
  user_role?: string;
}

export function ClubsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [clubsRes, countsRes] = await Promise.all([
      supabase
        .from('clubs')
        .select('*, club_members!left(role, user_id)')
        .eq('is_active', true)
        .order('name')
        .limit(50),
      // Accurate counts bypassing per-row RLS (the embedded join only returns
      // member rows of clubs the current user has joined).
      supabase.rpc('club_member_counts'),
    ]);
    if (clubsRes.error) return;
    const countMap: Record<string, number> = {};
    (countsRes.data ?? []).forEach((r: any) => { countMap[r.club_id] = Number(r.members); });
    if (clubsRes.data) {
      const mapped = clubsRes.data.map((c: any) => ({
        ...c,
        member_count: countMap[c.id] ?? c.club_members?.length ?? 0,
        user_role: c.club_members?.find((m: any) => m.user_id === user?.id)?.role ?? null,
      }));
      setClubs(mapped as Club[]);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.sectors.clubs} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {clubs.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="clubs" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.clubs2.noClubsFound}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {clubs.map(c => {
              const cat = CL_CATS[c.category] ?? CL_CATS.other;
              const tintBg = isDark ? `${cat.fg}2e` : `${cat.fg}18`;
              const role = c.user_role;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('ClubDetail', { id: c.id })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.thumb, { backgroundColor: tintBg }]}>
                    <Icon name="clubs" size={22} color={cat.fg} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={[styles.cardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {c.member_count} members · {cat.label}
                    </Text>
                    {role && (
                      <View style={styles.cardMeta}>
                        <View style={[styles.rolePill, { backgroundColor: C.infoBg }]}>
                          <View style={[styles.roleDot, { backgroundColor: C.info }]} />
                          <Text style={[styles.roleTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>{t.clubs.roleLabels[role] ?? role}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Icon name="chevR" size={18} color={C.textMuted} />
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
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14 } as any,
  cardSub: { fontSize: 12, marginTop: 3 } as any,
  cardMeta: { flexDirection: 'row', marginTop: 5 } as ViewStyle,
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  roleDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  roleTxt: { fontSize: 11 } as any,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
});
