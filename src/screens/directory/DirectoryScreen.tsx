// Matches design screens-c.jsx — Directory (search + connect)
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';

type ConnState = 'none' | 'requested' | 'incoming' | 'connected';

interface Student {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  department: string;
  intake: string;
  section: string;
  email?: string;
  whatsapp?: string | null;
  connState: ConnState;
}

export function DirectoryScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: profiles } = await supabase.rpc('student_directory');

    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${user?.id ?? ''},addressee_id.eq.${user?.id ?? ''}`);

    const map = new Map<string, ConnState>();
    (connections ?? []).forEach((c: any) => {
      const other = c.requester_id === user?.id ? c.addressee_id : c.requester_id;
      if (c.status === 'accepted') map.set(other, 'connected');
      else if (c.requester_id === user?.id) map.set(other, 'requested');
      else map.set(other, 'incoming');
    });

    setStudents((profiles ?? []).map((p: any) => ({
      ...p,
      connState: map.get(p.id) ?? 'none',
    })));
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleConn(studentId: string, action: 'connect' | 'accept' | 'decline') {
    if (!user) return;
    // Each mutation can be rejected by RLS / dedupe trigger; on error re-sync
    // from the DB instead of optimistically showing a false success state.
    if (action === 'connect') {
      const { error } = await supabase.from('connections').insert({ requester_id: user.id, addressee_id: studentId, status: 'pending' });
      if (error) { await load(); return; }
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, connState: 'requested' } : s));
    } else if (action === 'accept') {
      const { error } = await supabase.from('connections').update({ status: 'accepted' })
        .eq('requester_id', studentId).eq('addressee_id', user.id);
      if (error) { await load(); return; }
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, connState: 'connected' } : s));
    } else {
      const { error } = await supabase.from('connections').delete()
        .eq('requester_id', studentId).eq('addressee_id', user.id);
      if (error) { await load(); return; }
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, connState: 'none' } : s));
    }
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(query.toLowerCase().trim())
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.sectors.directory} onBack={() => navigation.goBack()} />

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
            placeholder={t.directory2.searchPlaceholder}
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* List */}
        <View style={styles.list}>
          {filtered.map(s => (
            <View key={s.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardTop}>
                <TouchableOpacity
                  style={styles.identity}
                  onPress={() => navigation.navigate('StudentProfile', { student: s })}
                  activeOpacity={0.7}
                >
                  <Avatar uri={s.avatar_url} name={s.full_name} size="md" />
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {s.full_name}
                    </Text>
                    <Text style={[styles.cardMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {s.department} · {s.intake} · {s.section}
                    </Text>
                  </View>
                </TouchableOpacity>
                {s.connState === 'connected' && (
                  <View style={[styles.connPill, { backgroundColor: Accent.tealBg }]}>
                    <View style={[styles.connDot, { backgroundColor: Accent.teal }]} />
                    <Text style={[styles.connTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>{t.directory2.connected}</Text>
                  </View>
                )}
                {s.connState === 'requested' && (
                  <View style={[styles.connPill, { backgroundColor: C.warnBg }]}>
                    <View style={[styles.connDot, { backgroundColor: C.warn }]} />
                    <Text style={[styles.connTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>{t.directory2.requested}</Text>
                  </View>
                )}
                {s.connState === 'none' && (
                  <TouchableOpacity
                    style={[styles.connectBtn, { backgroundColor: C.brand }]}
                    onPress={() => handleConn(s.id, 'connect')}
                    activeOpacity={0.85}
                  >
                    <Icon name="userPlus" size={15} color="#fff" />
                    <Text style={[styles.connectTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.directory2.connect}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {s.connState === 'incoming' && (
                <View style={styles.incomingArea}>
                  <Text style={[styles.wantsToConnect, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    Wants to connect
                  </Text>
                  <View style={styles.incomingActions}>
                    <TouchableOpacity
                      style={[styles.halfActionBtn, { backgroundColor: C.brand }]}
                      onPress={() => handleConn(s.id, 'accept')}
                      activeOpacity={0.85}
                    >
                      <Icon name="check" size={15} color="#fff" />
                      <Text style={[styles.halfBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.directory2.accept}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.halfActionBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                      onPress={() => handleConn(s.id, 'decline')}
                      activeOpacity={0.85}
                    >
                      <Icon name="x" size={15} color={C.text} />
                      <Text style={[styles.halfBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.directory2.decline}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {s.connState === 'connected' && s.email && (
                <View style={[styles.contactArea, { backgroundColor: C.surface2 }]}>
                  <View style={styles.contactRow}>
                    <Icon name="mail" size={14} color={C.textMuted} />
                    <Text style={[styles.contactTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                      {s.email}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 20 } as ViewStyle,
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14, marginBottom: 14 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 13 } as TextStyle,
  list: { gap: 10 } as ViewStyle,
  card: { padding: 13, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardName: { fontSize: 14.5 } as any,
  cardMeta: { fontSize: 12, marginTop: 2 } as any,
  connPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, flexShrink: 0 } as ViewStyle,
  connDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  connTxt: { fontSize: 11 } as any,
  connectBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, flexShrink: 0 } as ViewStyle,
  connectTxt: { fontSize: 12 } as any,
  incomingArea: { marginTop: 11 } as ViewStyle,
  wantsToConnect: { fontSize: 12, marginBottom: 8 } as any,
  incomingActions: { flexDirection: 'row', gap: 8 } as ViewStyle,
  halfActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 10 } as ViewStyle,
  halfBtnTxt: { fontSize: 13 } as any,
  contactArea: { marginTop: 11, padding: 10, borderRadius: 10 } as ViewStyle,
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 7 } as ViewStyle,
  contactTxt: { fontSize: 12.5 } as any,
});
