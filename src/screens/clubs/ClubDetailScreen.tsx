import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  ActivityIndicator, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

// Keys must match the clubs.category DB CHECK values exactly.
const CL_CATS: Record<string, { label: string; fg: string }> = {
  Tech:         { label: 'Tech',         fg: Accent.purple },
  Cultural:     { label: 'Cultural',     fg: Accent.pink },
  Sports:       { label: 'Sports',       fg: Accent.teal },
  Professional: { label: 'Professional', fg: Accent.blue },
  Social:       { label: 'Social',       fg: Accent.amber },
  other:        { label: 'Other',        fg: Accent.slate }, // display fallback only
};

type Tab = 'feed' | 'members';

interface Club {
  id: string;
  name: string;
  category: string;
  tagline: string | null;
  about: string | null;
  is_active: boolean;
  created_by: string | null;
}

interface Post {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
  profiles: { full_name: string };
}

interface Member {
  user_id: string;
  role: string;
  profiles: { full_name: string };
}

const ROLE_RANK: Record<string, number> = { president: 0, vp: 1, editor: 2, member: 3 };

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function ClubDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const id = route.params?.clubId ?? route.params?.id;
  const [club, setClub] = useState<Club | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [myRequest, setMyRequest] = useState<{ id: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  async function load() {
    const [clubRes, postsRes, membersRes, reqRes] = await Promise.all([
      supabase.from('clubs').select('*').eq('id', id).single(),
      supabase.from('club_posts').select('*, profiles:profiles!author_id(full_name)').eq('club_id', id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('club_members').select('*, profiles:profiles!user_id(full_name)').eq('club_id', id),
      // My own pending join request, if any (RLS only returns the caller's row).
      supabase.from('club_join_requests').select('id')
        .eq('club_id', id).eq('user_id', user?.id ?? '')
        .eq('status', 'pending').maybeSingle(),
    ]);
    if (clubRes.data) setClub(clubRes.data as Club);
    if (postsRes.data) setPosts(postsRes.data as any);
    if (membersRes.data) {
      setMembers((membersRes.data as any[]).sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9)));
      const me = (membersRes.data as any[]).find(m => m.user_id === user?.id);
      setMyRole(me ? me.role : null);
    }
    setMyRequest(reqRes.data ? { id: (reqRes.data as any).id } : null);
  }

  async function requestJoin() {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase.from('club_join_requests')
      .insert({ club_id: id, user_id: user.id, message: '' });
    setBusy(false);
    if (error) {
      const message = error.code === '23505' ? t.clubs.alreadyRequested
        : error.code === '42501' ? t.clubs.alreadyMemberErr
        : error.message;
      toast({ type: 'error', title: t.common.error, message });
      return;
    }
    toast({ type: 'success', title: t.clubs.requestSent, message: t.clubs.requestSentBody });
    load();
  }

  async function withdrawRequest() {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase.from('club_join_requests')
      .delete().eq('club_id', id).eq('user_id', user.id).eq('status', 'pending');
    setBusy(false);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    setMyRequest(null);
    toast({ type: 'success', title: t.clubs.requestWithdrawn });
  }

  if (!club) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.clubs2.clubTitle} onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  const cat = CL_CATS[club.category] ?? CL_CATS.other;
  const tintBg = isDark ? `${cat.fg}2e` : `${cat.fg}18`;
  const isAdmin = profile?.role === 'admin';
  const canManage = myRole === 'president' || myRole === 'vp' || isAdmin;
  const canPost = canManage || myRole === 'editor';
  const isMember = !!myRole;

  function leaveClub() {
    if (!user || myRole === 'president') return;
    Alert.alert(t.clubs.leaveTitle, t.clubs.leaveBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.clubs.leave, style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('club_members').delete().eq('club_id', id).eq('user_id', user.id);
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
          setMyRole(null);
          setMembers(prev => prev.filter(m => m.user_id !== user.id));
        },
      },
    ]);
  }

  async function togglePin(p: Post) {
    const { error } = await supabase.from('club_posts').update({ is_pinned: !p.is_pinned }).eq('id', p.id);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    load();
  }

  function deletePost(p: Post) {
    Alert.alert(t.clubs.deletePostTitle, t.clubs.deletePostBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('club_posts').delete().eq('id', p.id);
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
          setPosts(prev => prev.filter(x => x.id !== p.id));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={club.name}
        onBack={() => navigation.goBack()}
        rightSlot={(canManage || canPost) ? (
          <View style={styles.rightRow}>
            {canManage && (
              <>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ClubMembers', { clubId: club.id })} activeOpacity={0.75}>
                  <Feather name="users" size={20} color={C.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ClubManage', { clubId: club.id })} activeOpacity={0.75}>
                  <Feather name="sliders" size={20} color={C.text} />
                </TouchableOpacity>
              </>
            )}
            {canPost && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ClubPost', { clubId: club.id, clubName: club.name })} activeOpacity={0.75}>
                <Feather name="plus" size={22} color={C.text} />
              </TouchableOpacity>
            )}
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
            <View style={[styles.rolePill, { backgroundColor: C.infoBg }]}>
              <View style={[styles.roleDot, { backgroundColor: C.info }]} />
              <Text style={[styles.roleTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>
                {t.clubs.roleLabels[myRole] ?? myRole}
              </Text>
            </View>
          )}
        </View>

        {club.tagline ? (
          <Text style={[styles.tagline, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{club.tagline}</Text>
        ) : null}
        {club.about ? (
          <Text style={[styles.desc, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{club.about}</Text>
        ) : null}

        {/* Self-serve join: request to join, or withdraw a pending request. */}
        {!isMember && !isAdmin && (
          myRequest ? (
            <View style={[styles.inviteCard, { backgroundColor: C.surface2 }]}>
              <View style={[styles.pendingDot, { backgroundColor: Accent.amber }]} />
              <Text style={[styles.inviteTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.clubs.requestPending}
              </Text>
              <TouchableOpacity onPress={withdrawRequest} disabled={busy} hitSlop={8} activeOpacity={0.7}>
                <Text style={[styles.withdrawTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                  {t.clubs.withdrawRequest}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: C.brand }]}
              onPress={requestJoin}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Feather name="user-plus" size={15} color={C.white} />
              <Text style={[styles.joinBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                {t.clubs.requestToJoin}
              </Text>
            </TouchableOpacity>
          )
        )}
        {isMember && myRole !== 'president' && (
          <TouchableOpacity
            style={[styles.joinBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
            onPress={leaveClub}
            activeOpacity={0.75}
          >
            <Feather name="log-out" size={15} color={C.text2} />
            <Text style={[styles.joinBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.clubs.leave}</Text>
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={styles.chips}>
          {(['feed', 'members'] as Tab[]).map(tb => (
            <TouchableOpacity
              key={tb}
              style={[styles.chip, tab === tb
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setTab(tb)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipTxt, { color: tab === tb ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {tb === 'feed' ? t.clubs.feed : t.clubs.members}
              </Text>
              {tb === 'members' && (
                <Text style={[styles.chipCount, { color: tab === tb ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
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
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.clubs2.noPosts}</Text>
              </View>
            ) : posts.map(p => {
              const canModeratePost = canManage;
              const canDeletePost = canManage || p.author_id === user?.id;
              return (
                <View
                  key={p.id}
                  style={[styles.postCard, {
                    backgroundColor: C.surface,
                    borderColor: p.is_pinned ? Accent.amber : C.border,
                  }]}
                >
                  {p.is_pinned && (
                    <View style={styles.pinnedRow}>
                      <Feather name="bookmark" size={11} color={Accent.amber} />
                      <Text style={[styles.pinnedTxt, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                        {t.clubs.pinned}
                      </Text>
                    </View>
                  )}
                  <View style={styles.postHeader}>
                    <Avatar name={(p as any).profiles?.full_name} size="sm" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.postAuthor, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {(p as any).profiles?.full_name ?? t.clubs2.memberFallback}
                      </Text>
                      <Text style={[styles.postTime, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                        {timeAgo(p.created_at)}
                      </Text>
                    </View>
                    {canModeratePost && (
                      <TouchableOpacity onPress={() => togglePin(p)} hitSlop={8} activeOpacity={0.7}>
                        <Feather name="bookmark" size={16} color={p.is_pinned ? Accent.amber : C.textMuted} />
                      </TouchableOpacity>
                    )}
                    {canDeletePost && (
                      <TouchableOpacity onPress={() => deletePost(p)} hitSlop={8} activeOpacity={0.7} style={{ marginLeft: 12 }}>
                        <Feather name="trash-2" size={15} color={C.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {p.title ? (
                    <Text style={[styles.postTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{p.title}</Text>
                  ) : null}
                  <Text style={[styles.postBody, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>{p.body}</Text>
                  {p.image_url ? (
                    <Image source={{ uri: p.image_url }} style={styles.postImage} resizeMode="cover" />
                  ) : null}
                </View>
              );
            })}
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
                      isLead ? { backgroundColor: C.infoBg } : { backgroundColor: C.surface2 }]}>
                      <Text style={[styles.memberRoleTxt,
                        { color: isLead ? C.info : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {t.clubs.roleLabels[m.role] ?? m.role}
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

  tagline: { fontSize: 14, lineHeight: 20, marginTop: 12, marginHorizontal: 2 } as any,
  desc: { fontSize: 13.5, lineHeight: 20, marginTop: 6, marginHorizontal: 2 } as any,
  inviteCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 12 } as ViewStyle,
  inviteTxt: { flex: 1, fontSize: 12.5, lineHeight: 18 } as any,
  pendingDot: { width: 7, height: 7, borderRadius: 4 } as ViewStyle,
  withdrawTxt: { fontSize: 12.5 } as any,
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 } as ViewStyle,
  pinnedTxt: { fontSize: 10.5, letterSpacing: 0.4 } as any,
  postTitle: { fontSize: 14.5, marginTop: 10 } as any,
  postImage: { width: '100%', height: 160, borderRadius: 12, marginTop: 10 } as any,

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
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 13, marginTop: 12 } as ViewStyle,
  joinBtnTxt: { fontSize: 14 } as any,
});
