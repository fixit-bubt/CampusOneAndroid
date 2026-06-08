// Matches design screens-d.jsx — Faculty (search + save, All/Saved tabs)
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

type Tab = 'all' | 'saved';

interface FacultyMember {
  id: string;
  name: string;
  designation: string;
  research_interests: string[] | null;
  on_leave: boolean;
  photo_url: string | null;
  departments: { name: string } | null;
}

export function FacultyScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [facRes, savedRes] = await Promise.all([
      supabase.from('faculty').select('id, name, designation, research_interests, on_leave, photo_url, departments(name)').order('name'),
      supabase.from('faculty_bookmarks').select('faculty_id').eq('user_id', user?.id ?? ''),
    ]);
    if (facRes.data) setFaculty(facRes.data as any as FacultyMember[]);
    if (savedRes.data) setSavedIds(new Set(savedRes.data.map((s: any) => s.faculty_id)));
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleSave(facId: string) {
    if (!user) return;
    const isSaved = savedIds.has(facId);
    const next = new Set(savedIds);
    if (isSaved) {
      next.delete(facId);
      await supabase.from('faculty_bookmarks').delete().eq('faculty_id', facId).eq('user_id', user.id);
    } else {
      next.add(facId);
      await supabase.from('faculty_bookmarks').insert({ faculty_id: facId, user_id: user.id });
    }
    setSavedIds(next);
  }

  const base = tab === 'saved' ? faculty.filter(f => savedIds.has(f.id)) : faculty;
  const filtered = base.filter(f =>
    (f.name + ' ' + (Array.isArray(f.research_interests) ? f.research_interests.join(' ') : '')).toLowerCase().includes(query.toLowerCase().trim())
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Faculty" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
          <Icon name="search" size={17} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder="Search supervisor..."
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Tabs */}
        <View style={[styles.chips, { marginBottom: 12 }]}>
          {(['all', 'saved'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, tab === t
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setTab(t)}
              activeOpacity={0.75}
            >
              {t === 'saved' && (
                <Feather name="star" size={13} color={tab === t ? '#fff' : C.text2} />
              )}
              <Text style={[styles.chipTxt, { color: tab === t ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {t === 'all' ? 'All' : 'Saved'}
              </Text>
              <Text style={[styles.chipCount, { color: tab === t ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t === 'all' ? faculty.length : savedIds.size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="star" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Nothing here</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(f => (
              <View key={f.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => navigation.navigate('FacultyProfile', { id: f.id })}
                  activeOpacity={0.75}
                >
                  <Avatar name={f.name} size="md" />
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={[styles.cardDesig, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {f.designation}
                    </Text>
                    <Text style={[styles.cardSpec, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {Array.isArray(f.research_interests) ? f.research_interests.join(', ') : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={() => toggleSave(f.id)} activeOpacity={0.75}>
                  <Feather name="star" size={20} color={savedIds.has(f.id) ? '#d9870b' : C.textMuted} />
                </TouchableOpacity>
              </View>
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
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14, marginBottom: 12 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 13 } as TextStyle,
  chips: { flexDirection: 'row', gap: 8 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardName: { fontSize: 14.5 } as any,
  cardDesig: { fontSize: 12, marginTop: 2 } as any,
  cardSpec: { fontSize: 11.5, marginTop: 1 } as any,
  saveBtn: { padding: 8 } as ViewStyle,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
});
