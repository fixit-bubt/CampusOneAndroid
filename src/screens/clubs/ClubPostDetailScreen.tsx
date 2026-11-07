import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchPeople } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';

function resolvePostImageUrl(urlOrPath: string | null): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) return urlOrPath;
  const { data } = supabase.storage.from('photos').getPublicUrl(urlOrPath);
  return data.publicUrl;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'Just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

interface PostDetail {
  id: string;
  club_id: string;
  author_id: string;
  title: string | null;
  body: string;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  author_role?: string | null;
  club_name?: string;
}

export function ClubPostDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const toast = useToast();

  const postId: string = route.params?.postId;
  const clubId: string = route.params?.clubId;
  const initialClubName: string = route.params?.clubName ?? 'Club Post';

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadPost = useCallback(async () => {
    try {
      const [postRes, clubRes, myRoleRes] = await Promise.all([
        supabase.from('club_posts').select('*').eq('id', postId).single(),
        supabase.from('clubs').select('name').eq('id', clubId).single(),
        user?.id
          ? supabase.from('club_members').select('role').eq('club_id', clubId).eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (postRes.error || !postRes.data) {
        toast({ type: 'error', title: 'Error', message: 'Club post not found' });
        setLoading(false);
        return;
      }

      const pData = postRes.data;
      const people = await fetchPeople([pData.author_id]);
      const author = people[pData.author_id];

      // Fetch author role in this club if available
      const authorMemRes = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', pData.author_id)
        .maybeSingle();

      setPost({
        id: pData.id,
        club_id: pData.club_id,
        author_id: pData.author_id,
        title: pData.title,
        body: pData.body || "",
        image_url: pData.image_url,
        is_pinned: !!pData.is_pinned,
        created_at: pData.created_at,
        author_name: author?.full_name || 'Club Member',
        author_avatar: author?.avatar_url || null,
        author_role: authorMemRes.data?.role || null,
        club_name: clubRes.data?.name || initialClubName,
      });

      if (myRoleRes.data) {
        setMyRole((myRoleRes.data as any).role);
      }
    } catch {
      toast({ type: 'error', title: 'Error', message: 'Failed to load post details' });
    } finally {
      setLoading(false);
    }
  }, [postId, clubId, initialClubName, user?.id, toast]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const canModerate = myRole === 'president' || myRole === 'vp';
  const canDelete = canModerate || post?.author_id === user?.id;

  async function togglePin() {
    if (!post || actionBusy) return;
    setActionBusy(true);

    const nextPinned = !post.is_pinned;
    const { error } = await supabase
      .from('club_posts')
      .update({ is_pinned: nextPinned })
      .eq('id', post.id);

    setActionBusy(false);
    if (error) {
      toast({ type: 'error', title: 'Error', message: error.message });
      return;
    }

    setPost((prev) => (prev ? { ...prev, is_pinned: nextPinned } : null));
    toast({
      type: 'success',
      title: nextPinned ? 'Post Pinned' : 'Post Unpinned',
      message: nextPinned ? 'Post pinned to the top of the feed.' : 'Post unpinned.',
    });
  }

  function confirmDelete() {
    if (!post || actionBusy) return;

    Alert.alert('Delete Post', 'Are you sure you want to permanently delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionBusy(true);
          const { error } = await supabase.from('club_posts').delete().eq('id', post.id);
          setActionBusy(false);
          if (error) {
            toast({ type: 'error', title: 'Error', message: error.message });
            return;
          }
          toast({ type: 'success', title: 'Post Deleted' });
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Club Post" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={C.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Club Post" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>
            Post not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={post.club_name || 'Club Post'} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pinned Indicator Banner */}
        {post.is_pinned && (
          <View style={[styles.pinnedBanner, { backgroundColor: C.surface2, borderColor: Accent.amber }]}>
            <Feather name="bookmark" size={16} color={Accent.amber} />
            <Text style={[styles.pinnedTxt, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
              Pinned Announcement
            </Text>
          </View>
        )}

        {/* Author Header Card */}
        <View style={[styles.authorCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar uri={post.author_avatar} name={post.author_name} size="md" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.authorRow}>
              <Text style={[styles.authorName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {post.author_name}
              </Text>
              {post.author_role && (
                <View style={[styles.rolePill, { backgroundColor: C.surface2 }]}>
                  <Text style={[styles.roleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {post.author_role}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.postMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {post.club_name} · {timeAgo(post.created_at)}
            </Text>
          </View>
        </View>

        {/* Post Title */}
        {post.title ? (
          <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {post.title}
          </Text>
        ) : null}

        {/* Optional Image Attachment */}
        {post.image_url ? (
          <Image resizeMethod="resize"
            source={{ uri: resolvePostImageUrl(post.image_url) || post.image_url }}
            style={[styles.postImage, { borderColor: C.border }]}
            resizeMode="cover"
          />
        ) : null}

        {/* Post Body Content */}
        <View style={[styles.bodyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.bodyTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
            {post.body}
          </Text>
        </View>

        {/* Officer Actions (58dp Bars) */}
        {(canModerate || canDelete) && (
          <View style={{ marginTop: 24, gap: 10 }}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              POST CONTROLS
            </Text>

            {canModerate && (
              <TouchableOpacity
                style={[styles.actionBtn58, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={togglePin}
                disabled={actionBusy}
                activeOpacity={0.75}
              >
                <Feather
                  name="bookmark"
                  size={24}
                  color={post.is_pinned ? Accent.amber : C.text}
                />
                <Text style={[styles.actionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {post.is_pinned ? 'Unpin Post' : 'Pin to Top of Feed'}
                </Text>
              </TouchableOpacity>
            )}

            {canDelete && (
              <TouchableOpacity
                style={[styles.actionBtn58, { backgroundColor: C.surface, borderColor: C.danger }]}
                onPress={confirmDelete}
                disabled={actionBusy}
                activeOpacity={0.75}
              >
                <Feather name="trash-2" size={24} color={C.danger} />
                <Text style={[styles.actionBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                  Delete Post
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 14, paddingBottom: 24 } as ViewStyle,

  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  } as ViewStyle,
  pinnedTxt: {
    fontSize: 13,
  } as TextStyle,

  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  } as ViewStyle,
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  authorName: {
    fontSize: 15,
  } as TextStyle,
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  } as ViewStyle,
  roleTxt: {
    fontSize: 11,
    textTransform: 'capitalize',
  } as TextStyle,
  postMeta: {
    fontSize: 12,
    marginTop: 3,
  } as TextStyle,

  title: {
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 14,
  } as TextStyle,

  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  } as ImageStyle,

  bodyCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  bodyTxt: {
    fontSize: 15,
    lineHeight: 24,
  } as TextStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 2,
  } as TextStyle,

  actionBtn58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  actionBtnTxt: {
    fontSize: 14,
  } as TextStyle,
});

