import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys, withTimeout } from '../../services/cacheService';
import { fetchPeople } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

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

export function ClubDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const id = route.params?.clubId ?? route.params?.id;
  const [club, setClub] = useState<Club | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('feed');
  const [membersReady, setMembersReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMembersReady(true), 700);
    return () => clearTimeout(timer);
  }, []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [myRequest, setMyRequest] = useState<{ id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const CLUB_TABS: TabItem<Tab>[] = useMemo(() => [
    { id: 'feed',    label: t.clubs.feed,    color: C.brand },
    { id: 'members', label: t.clubs.members, count: members.length > 0 ? members.length : undefined, color: Accent.teal },
  ], [t.clubs.feed, t.clubs.members, members.length, C.brand]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  async function load() {
    if (!id) return;
    const cacheKey = CacheKeys.CLUB_DETAIL(id);

    // 1. Instant cache load
    const cached = await getCache<{
      club: Club;
      posts: Post[];
      members: Member[];
      myRole: string | null;
      myRequest: { id: string } | null;
    }>(cacheKey);

    if (cached) {
      if (cached.club) setClub(cached.club);
      if (cached.posts) setPosts(cached.posts);
      if (cached.members) setMembers(cached.members);
      if (cached.myRole !== undefined) setMyRole(cached.myRole);
      if (cached.myRequest !== undefined) setMyRequest(cached.myRequest);
    }

    // 2. Network sync with 5-second timeout
    try {
      const [clubRes, postsRes, membersRes, reqRes] = await withTimeout(
        Promise.all([
          supabase.from('clubs').select('*').eq('id', id).single(),
          supabase.from('club_posts').select('*').eq('club_id', id)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(30),
          supabase.from('club_members').select('*').eq('club_id', id),
          supabase.from('club_join_requests').select('id')
            .eq('club_id', id).eq('user_id', user?.id ?? '')
            .eq('status', 'pending').maybeSingle(),
        ]),
        5000
      );

      if (clubRes.data) {
        setIsOffline(false);
        setClub(clubRes.data as Club);
        setNotFound(false);
      } else {
        if (!cached?.club) setNotFound(true);
        else setIsOffline(true);
        return;
      }

      const people = await fetchPeople([
        ...((postsRes.data as any[]) ?? []).map(p => p.author_id),
        ...((membersRes.data as any[]) ?? []).map(m => m.user_id),
      ]);
      const named = (uid: string) =>
        people[uid] ? { full_name: people[uid].full_name } : null;

      const loadedPosts = postsRes.data ? (postsRes.data as any[]).map(p => ({ ...p, profiles: named(p.author_id) })) as any : [];
      setPosts(loadedPosts);

      let loadedMembers: Member[] = [];
      let resolvedRole: string | null = null;
      if (membersRes.data) {
        loadedMembers = (membersRes.data as any[])
          .map(m => ({ ...m, profiles: named(m.user_id) }))
          .sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9));
        setMembers(loadedMembers);
        const me = (membersRes.data as any[]).find(m => m.user_id === user?.id);
        resolvedRole = me ? me.role : null;
        setMyRole(resolvedRole);
      }
      const resolvedReq = reqRes.data ? { id: (reqRes.data as any).id } : null;
      setMyRequest(resolvedReq);

      // Save to cache
      setCache(cacheKey, {
        club: clubRes.data as Club,
        posts: loadedPosts,
        members: loadedMembers,
        myRole: resolvedRole,
        myRequest: resolvedReq,
      });
    } catch {
      if (cached?.club) {
        setIsOffline(true);
      } else {
        setNotFound(true);
      }
    }
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
        <View style={styles.center}>
          {notFound
            ? <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>{t.common.notFound}</Text>
            : <ActivityIndicator color={C.brand} />}
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin = profile?.role === 'admin';
  // Two different admin bypasses on the backend, not one: club_update_details()
  // and club_members RLS both allow is_admin() regardless of membership, so
  // the Members/Manage screens are legitimately open to any admin. But
  // club_posts select/insert/update (migration 0053) and club_can_manage()/
  // club_can_post() are membership-role-only with NO is_admin() bypass - an
  // admin who isn't a member of this club gets zero posts back and any
  // post insert/update/pin is rejected, so post actions must not be gated
  // on isAdmin or the buttons just fail.
  const canManageMembers = myRole === 'president' || myRole === 'vp';
  const canManagePosts = myRole === 'president' || myRole === 'vp';
  const canPost = myRole === 'president' || myRole === 'vp' || myRole === 'editor';
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={club.name}
        onBack={() => navigation.goBack()}
        rightSlot={canManageMembers ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ClubManage', { clubId: club.id })} activeOpacity={0.75}>
            <Feather name="sliders" size={22} color={C.text} />
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* Club header card */}
        <View style={[styles.headerCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.thumb}>
            <Icon name="clubs" size={32} color={C.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.clubName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{club.name}</Text>
            <Text style={[styles.clubMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {members.length} members · {club.category}
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

        {/* Self-serve join: request to join, or withdraw a pending request for students. */}
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
              <Feather name="user-plus" size={18} color={C.white} />
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
            <Feather name="log-out" size={18} color={C.text2} />
            <Text style={[styles.joinBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.clubs.leave}</Text>
          </TouchableOpacity>
        )}

        {/* Dedicated 58dp Create Post Bar for President, VP, and Editor (Above Feed & Centered) */}
        {canPost && (
          <TouchableOpacity
            style={[
              styles.bar58Center,
              { backgroundColor: C.surface, borderColor: C.border, marginTop: 14 },
            ]}
            onPress={() => navigation.navigate('ClubPost', { clubId: club.id, clubName: club.name })}
            activeOpacity={0.75}
          >
            <Feather name="plus-circle" size={24} color={C.text} />
            <Text style={[styles.barTitleCenter, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Create Club Post
            </Text>
          </TouchableOpacity>
        )}

        {/* Dedicated 58dp Dual Action Bar: Add Member & Manage Members */}
        {canManageMembers && (
          <View
            style={[
              styles.dualBar58,
              { backgroundColor: C.surface, borderColor: C.border, marginTop: canPost ? 10 : 14 },
            ]}
          >
            <TouchableOpacity
              style={styles.dualBarTab}
              onPress={() => navigation.navigate('ClubAddMember', { clubId: club.id, clubName: club.name })}
              activeOpacity={0.75}
            >
              <Feather name="user-plus" size={20} color={C.text} />
              <Text style={[styles.dualBarTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Add Member
              </Text>
            </TouchableOpacity>

            <View style={[styles.dualBarDivider, { backgroundColor: C.border }]} />

            <TouchableOpacity
              style={styles.dualBarTab}
              onPress={() => navigation.navigate('ClubMembers', { clubId: club.id, clubName: club.name })}
              activeOpacity={0.75}
            >
              <Feather name="users" size={20} color={C.text} />
              <Text style={[styles.dualBarTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Manage
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs */}
        <View style={{ marginTop: 14 }}>
          <SegmentedTabs<Tab>
            tabs={CLUB_TABS}
            activeTab={tab}
            onTabChange={setTab}
          />
        </View>

        {/* Tab content */}
        <View style={[styles.feedList, tab === 'feed' ? null : { display: 'none' }]}>
            {posts.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {isMember ? t.clubs2.noPosts : t.clubs2.noPostsNotMember}
                </Text>
              </View>
            ) : (
              posts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() =>
                    navigation.navigate('ClubPostDetail', {
                      postId: p.id,
                      clubId: club.id,
                      clubName: club.name,
                      canModerate: canManagePosts,
                    })
                  }
                  activeOpacity={0.75}
                >
                  <View style={styles.barLeft}>
                    <Feather
                      name={p.is_pinned ? 'bookmark' : 'file-text'}
                      size={28}
                      color={C.text}
                    />
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {p.title || 'Club Update'}
                      </Text>
                    </View>
                  </View>
                  {p.is_pinned && (
                    <View style={[styles.pinnedBadge, { backgroundColor: C.surface2 }]}>
                      <Text style={[styles.pinnedBadgeTxt, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                        Pinned
                      </Text>
                    </View>
                  )}
                  <Feather name="chevron-right" size={20} color={C.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>
        {(tab === 'members' || membersReady) && (
          <View style={[styles.membersCard, { backgroundColor: C.surface, borderColor: C.border }, tab === 'members' ? null : { display: 'none' }]}>
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

  dualBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  } as ViewStyle,
  dualBarTab: {
    flex: 1,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  dualBarTxt: {
    fontSize: 14,
  } as TextStyle,
  dualBarDivider: {
    width: 1,
    height: 28,
  } as ViewStyle,
  bar58Center: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  } as ViewStyle,
  barTitleCenter: {
    fontSize: 15,
  } as TextStyle,
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,
  barTitle: {
    fontSize: 14,
    flexShrink: 1,
  } as TextStyle,
  pinnedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  } as ViewStyle,
  pinnedBadgeTxt: {
    fontSize: 11,
  } as TextStyle,

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
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 58, borderRadius: 16, marginTop: 12 } as ViewStyle,
  joinBtnTxt: { fontSize: 14.5 } as any,
});
