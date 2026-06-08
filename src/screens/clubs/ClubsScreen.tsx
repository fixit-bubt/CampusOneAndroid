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
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

const CL_CATS: Record<string, { label: string; fg: string }> = {
  academic:  { label: 'Academic',  fg: '#2b5be3' },
  cultural:  { label: 'Cultural',  fg: '#ec4899' },
  sports:    { label: 'Sports',    fg: '#0e9c8a' },
  technical: { label: 'Technical', fg: '#8b5cf6' },
  social:    { label: 'Social',    fg: '#b9760a' },
  other:     { label: 'Other',     fg: '#5b6b86' },
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
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: clubsData, error } = await supabase
      .from('clubs')
      .select('*, club_members!left(role, user_id)')
      .order('name')
      .limit(50);
    if (error) return;
    if (clubsData) {
      const mapped = clubsData.map((c: any) => ({
        ...c,
        member_count: c.member_count ?? c.club_members?.length ?? 0,
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
      <SubBar title="Clubs" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {clubs.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="clubs" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>No clubs found</Text>
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
                        <View style={[styles.rolePill, { backgroundColor: '#eef3ff' }]}>
                          <View style={[styles.roleDot, { backgroundColor: '#2b5be3' }]} />
                          <Text style={[styles.roleTxt, { color: '#2b5be3', fontFamily: FontFamily.jakartaBold }]}>{role}</Text>
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
