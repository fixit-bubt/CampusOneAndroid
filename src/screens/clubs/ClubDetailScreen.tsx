// Matches design screens-d.jsx — ClubDetail (Feed + Members tabs)
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, type ViewStyle,
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

const CL_CATS: Record<string, { label: string; fg: string }> = {
  academic:  { label: 'Academic',  fg: '#2b5be3' },
  cultural:  { label: 'Cultural',  fg: '#ec4899' },
  sports:    { label: 'Sports',    fg: '#0e9c8a' },
  technical: { label: 'Technical', fg: '#8b5cf6' },
  social:    { label: 'Social',    fg: '#b9760a' },
  other:     { label: 'Other',     fg: '#5b6b86' },
};

type Tab = 'feed' | 'members';

interface Club {
  id: string;
  name: string;
  category: string;
  about: string;
}

interface Post {
  id: string;
  body: string;
  created_at: string;
  profiles: { full_name: string };
}

interface Member {
  user_id: string;
  role: string;
  profiles: { full_name: string };
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function ClubDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const { id } = route.params;
  const [club, setClub] = useState<Club | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [clubRes, postsRes, membersRes] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', id).single(),
        supabase.from('club_posts').select('*, profiles:user_id(full_name)').eq('club_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('club_members').select('*, profiles:user_id(full_name)').eq('club_id', id),
      ]);
      if (clubRes.data) setClub(clubRes.data as Club);
      if (postsRes.data) setPosts(postsRes.data as any);
      if (membersRes.data) {
        setMembers(membersRes.data as any);
        const me = (membersRes.data as any[]).find(m => m.user_id === user?.id);
        if (me) setMyRole(me.role);
      }
    })();
  }, [id, user?.id]);

  if (!club) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Club" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  const cat = CL_CATS[club.category] ?? CL_CATS.other;
  const tintBg = isDark ? `${cat.fg}2e` : `${cat.fg}18`;
  const canManage = myRole === 'president' || myRole === 'vp';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={club.name}
        onBack={() => navigation.goBack()}
        rightSlot={canManage ? (
          <View style={styles.rightRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ClubManage', { id })} activeOpacity={0.75}>
              <Feather name="sliders" size={21} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ClubPost', { club: { id, name: club.name } })} activeOpacity={0.75}>
              <Feather name="plus" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
        ) : undefined}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Club header card */}
        <View style={[styles.headerCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.thumb, { backgroundColor: tintBg }]}>
            <Icon name="clubs" size={24} color={cat.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.clubName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{club.name}</Text>
            <Text style={[styles.clubMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {members.length} members · {cat.label}
            </Text>
          </View>
          {myRole && (
            <View style={[styles.rolePill, { backgroundColor: '#eef3ff' }]}>
              <View style={[styles.roleDot, { backgroundColor: '#2b5be3' }]} />
              <Text style={[styles.roleTxt, { color: '#2b5be3', fontFamily: FontFamily.jakartaBold }]}>{myRole}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.desc, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{club.about}</Text>

        {/* Tabs */}
        <View style={styles.chips}>
          {(['feed', 'members'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, tab === t
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setTab(t)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipTxt, { color: tab === t ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {t === 'feed' ? 'Feed' : 'Members'}
              </Text>
              {t === 'members' && (
                <Text style={[styles.chipCount, { color: tab === t ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {members.length}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {tab === 'feed' ? (
          <View style={styles.feedList}>
            {posts.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>No posts yet</Text>
              </View>
            ) : posts.map(p => (
              <View key={p.id} style={[styles.postCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.postHeader}>
                  <Avatar name={(p as any).profiles?.full_name} size="sm" />
                  <View>
                    <Text style={[styles.postAuthor, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {(p as any).profiles?.full_name ?? 'Member'}
                    </Text>
                    <Text style={[styles.postTime, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                      {timeAgo(p.created_at)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.postBody, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>{p.body}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.membersCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            {members.map((m, i) => {
              const isLead = m.role === 'president' || m.role === 'vp';
              return (
                <View key={m.user_id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                  <View style={styles.memberRow}>
                    <Avatar name={(m as any).profiles?.full_name} size="sm" />
                    <Text style={[styles.memberName, { color: C.text, fontFamily: FontFamily.jakartaBold, flex: 1 }]}>
                      {(m as any).profiles?.full_name ?? 'Member'}
                    </Text>
                    <View style={[styles.memberRolePill,
                      isLead ? { backgroundColor: '#eef3ff' } : { backgroundColor: C.surface2 }]}>
                      <Text style={[styles.memberRoleTxt,
                        { color: isLead ? '#2b5be3' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {m.role}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  clubName: { fontSize: 16 } as any,
  clubMeta: { fontSize: 12, marginTop: 1 } as any,
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, flexShrink: 0 } as ViewStyle,
  roleDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  roleTxt: { fontSize: 11 } as any,

  desc: { fontSize: 13.5, lineHeight: 20, marginTop: 12, marginHorizontal: 2 } as any,

  chips: { flexDirection: 'row', gap: 8, marginTop: 14 } as ViewStyle,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,

  feedList: { gap: 10, marginTop: 12 } as ViewStyle,
  postCard: { padding: 14, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  postAuthor: { fontSize: 13.5 } as any,
  postTime: { fontSize: 11.5, marginTop: 1 } as any,
  postBody: { fontSize: 14, lineHeight: 21, marginTop: 10 } as any,

  membersCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginTop: 12 } as ViewStyle,
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 15 } as ViewStyle,
  memberName: { fontSize: 14 } as any,
  memberRolePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 } as ViewStyle,
  memberRoleTxt: { fontSize: 11 } as any,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  rightRow: { flexDirection: 'row', gap: 4 } as ViewStyle,
  iconBtn: { padding: 8 } as ViewStyle,

  empty: { alignItems: 'center', padding: 24 } as ViewStyle,
  emptyTxt: { fontSize: 13.5 } as any,
});
