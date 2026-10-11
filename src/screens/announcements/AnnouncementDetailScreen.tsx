import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
  Modal, Share, Pressable, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent, SectorColors, pillBg, Radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, CacheKeys } from '../../services/cacheService';
import { openUrl } from '../../utils/link';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import type { Announcement } from '../../types/database';
import { toggleAnnouncementBookmark } from '../../services/announcementService';

function priTone(C: any, priority: string, isDark?: boolean): { fg: string; bg: string } {
  switch (priority) {
    case 'Urgent':    return { fg: C.danger, bg: C.dangerBg };
    case 'Important': return { fg: C.warn,   bg: C.warnBg };
    default:          return { fg: Accent.slate, bg: pillBg(Accent.slate, isDark) };
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export function AnnouncementDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();

  const { announcementId, id: paramId } = route.params ?? {};
  const id = announcementId || paramId;
  const [item, setItem] = useState<Announcement | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) { setNotFound(true); return; }

    (async () => {
      // 1. Check cache first
      const cached = await getCache<Announcement[]>(CacheKeys.ANNOUNCEMENTS);
      const found = cached?.find(a => a.id === id);
      if (found && active) setItem(found);

      if (user?.id) {
        const cachedBookmarks = await getCache<string[]>(CacheKeys.ANNOUNCEMENT_BOOKMARKS(user.id));
        if (cachedBookmarks && active) {
          setIsSaved(cachedBookmarks.includes(id));
        }
      }

      // 2. Fetch fresh
      const [annRes, bmRes] = await Promise.all([
        supabase.from('announcements').select('*').eq('id', id).maybeSingle(),
        user?.id
          ? supabase.from('announcement_bookmarks').select('announcement_id').eq('announcement_id', id).eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (!active) return;

      if (annRes.error || !annRes.data) {
        if (!found) {
          if (annRes.error) console.error('announcement detail fetch:', annRes.error.message);
          setNotFound(true);
        }
        return;
      }

      setItem(annRes.data as Announcement);
      if (bmRes.data) setIsSaved(true);

      // Mark read
      if (user) {
        supabase
          .from('announcement_reads')
          .upsert({ announcement_id: id, user_id: user.id }, { onConflict: 'announcement_id,user_id' })
          .then(() => {}, () => {});
      }
    })();

    return () => { active = false; };
  }, [id, user?.id]);

  async function handleToggleSave() {
    if (!user?.id || !item) {
      toast({ type: 'info', title: t.common.error, message: 'Please sign in to save notices.' });
      return;
    }
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    const res = await toggleAnnouncementBookmark(item.id, user.id, isSaved);
    if (!res.success) {
      setIsSaved(isSaved); // rollback
      toast({ type: 'error', title: t.common.error, message: res.error });
    } else {
      toast({
        type: 'success',
        title: isSaved ? t.announce2.bookmarkRemoved : t.announce2.bookmarkSaved,
      });
    }
  }

  async function handleShare() {
    if (!item) return;
    const shareUrl = item.external_url || item.attachment_url || 'https://www.bubt.edu.bd/notice';
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\nNotice by ${item.department} · BUBT\n${shareUrl}`,
      });
    } catch {
      // dismissed
    }
  }

  async function handleDownloadPdf() {
    if (!item?.attachment_url) return;
    setDownloading(true);
    toast({ type: 'info', title: t.announce2.downloadStarted });
    try {
      const downloaded = await File.downloadFileAsync(item.attachment_url, Paths.cache, { idempotent: true });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save BUBT Notice',
          UTI: 'com.adobe.pdf',
        });
        toast({ type: 'success', title: t.announce2.downloadSuccess });
      } else {
        toast({ type: 'success', title: t.announce2.downloadSuccess });
      }
    } catch (err: any) {
      toast({ type: 'error', title: t.announce2.downloadFailed, message: err.message });
    } finally {
      setDownloading(false);
    }
  }

  if (!item) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.announce2.title} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {notFound
            ? <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>{t.common.error}</Text>
            : <ActivityIndicator color={C.brand} />}
        </View>
      </SafeAreaView>
    );
  }

  const { fg, bg } = priTone(C, item.priority, isDark);
  const isOfficial = item.source === 'bubt_official' || item.code?.startsWith('BUBT-N-');
  const googleDocsPdfViewer = item.attachment_url
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(item.attachment_url)}`
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.announce2.title}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.topRightActions}>
            <TouchableOpacity onPress={handleShare} hitSlop={8} style={styles.headerBtn}>
              <Feather name="share-2" size={19} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleSave} hitSlop={8} style={styles.headerBtn}>
              <Feather
                name="bookmark"
                size={19}
                color={isSaved ? Accent.gold : C.text}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Official Banner Tag */}
        {isOfficial && (
          <View style={[styles.officialBanner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.14)' : '#e0edff', borderColor: '#93c5fd' }]}>
            <View style={styles.officialBannerLeft}>
              <Feather name="shield" size={16} color="#2563eb" />
              <View>
                <Text style={[styles.officialBannerTitle, { color: '#1d4ed8', fontFamily: FontFamily.jakartaBold }]}>
                  {t.announce2.bubtOfficial}
                </Text>
                <Text style={[styles.officialBannerCode, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Ref: {item.code}
                </Text>
              </View>
            </View>
            {item.external_url && (
              <TouchableOpacity
                onPress={() => openUrl(item.external_url!)}
                style={styles.openWebBtn}
                activeOpacity={0.75}
              >
                <Feather name="external-link" size={13} color="#2563eb" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Priority + category pills */}
        <View style={styles.pills}>
          <View style={[styles.priPill, { backgroundColor: bg }]}>
            <View style={[styles.priDot, { backgroundColor: fg }]} />
            <Text style={[styles.priText, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
              {t.announce2.priorityLabels[item.priority] ?? item.priority}
            </Text>
          </View>

          {item.category && (
            <View style={[styles.priPill, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.priText, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {item.category}
              </Text>
            </View>
          )}

          {item.pinned && (
            <View style={[styles.priPill, { backgroundColor: C.infoBg }]}>
              <View style={[styles.priDot, { backgroundColor: C.info }]} />
              <Text style={[styles.priText, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>
                {t.announce2.pinned}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {item.title}
        </Text>

        {/* Issuing Office & Timestamp */}
        <View style={styles.metaRow}>
          <Feather name="calendar" size={13} color={C.textMuted} />
          <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {item.department} · {t.announce2.agoShort(timeAgo(item.created_at))}
          </Text>
        </View>

        {/* Body content */}
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
          {item.body}
        </Text>

        {/* Notice Image (Flyer / Poster) */}
        {item.image_url ? (
          <TouchableOpacity
            onPress={() => setImageModalVisible(true)}
            activeOpacity={0.85}
            style={styles.imageWrapper}
          >
            <Image source={{ uri: item.image_url }} style={styles.noticeImage} resizeMode="contain" />
            <View style={styles.tapToZoomPill}>
              <Feather name="maximize-2" size={12} color="#fff" />
              <Text style={styles.tapToZoomTxt}>Tap to zoom</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Attachment Card (PDF) */}
        {item.attachment_url && (
          <View style={[styles.attachCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.attachIcon, { backgroundColor: C.dangerBg }]}>
              <Feather name="file-text" size={20} color={C.danger} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.attachName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                numberOfLines={1}
              >
                {item.attachment_name ?? t.announce2.attachmentDefault}
              </Text>
              <Text style={[styles.attachMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                Official PDF Document
              </Text>
            </View>

            <View style={styles.attachActions}>
              {/* In-app Preview Button */}
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#e0edff' }]}
                onPress={() => setPdfModalVisible(true)}
                activeOpacity={0.75}
              >
                <Feather name="eye" size={14} color={C.brand} />
                <Text style={[styles.actionPillTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {t.announce2.previewPdf}
                </Text>
              </TouchableOpacity>

              {/* Download Button */}
              <TouchableOpacity
                style={[styles.downloadPill, { backgroundColor: C.surface2 }]}
                onPress={handleDownloadPdf}
                disabled={downloading}
                activeOpacity={0.75}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <Feather name="download" size={15} color={C.text} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* External Official Link fallback */}
        {item.external_url && (
          <TouchableOpacity
            style={[styles.webLinkRow, { borderColor: C.border }]}
            onPress={() => openUrl(item.external_url!)}
            activeOpacity={0.75}
          >
            <Feather name="globe" size={14} color={C.textMuted} />
            <Text style={[styles.webLinkTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.announce2.openInBrowser}
            </Text>
            <Feather name="arrow-up-right" size={13} color={C.textMuted} />
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* =========================================================================
          MODAL 1: IN-APP PDF VIEWER MODAL
         ========================================================================= */}
      <Modal
        visible={pdfModalVisible}
        animationType="slide"
        onRequestClose={() => setPdfModalVisible(false)}
      >
        <SafeAreaView style={[styles.safe, { backgroundColor: '#fff' }]}>
          <View style={styles.pdfHeader}>
            <TouchableOpacity onPress={() => setPdfModalVisible(false)} hitSlop={8} style={{ padding: 4 }}>
              <Feather name="x" size={22} color="#111" />
            </TouchableOpacity>
            <Text style={styles.pdfHeaderTitle} numberOfLines={1}>
              {item.attachment_name || 'Notice PDF'}
            </Text>
            <TouchableOpacity onPress={handleDownloadPdf} hitSlop={8} style={{ padding: 4 }}>
              <Feather name="download" size={20} color="#111" />
            </TouchableOpacity>
          </View>

          {googleDocsPdfViewer && (
            <WebView
              source={{ uri: googleDocsPdfViewer }}
              style={{ flex: 1, backgroundColor: '#fff' }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.pdfLoading}>
                  <ActivityIndicator size="large" color={C.brand} />
                  <Text style={[styles.pdfLoadingTxt, { color: '#666', fontFamily: FontFamily.jakartaMedium }]}>
                    Loading official PDF…
                  </Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* =========================================================================
          MODAL 2: FULLSCREEN IMAGE VIEWER MODAL
         ========================================================================= */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setImageModalVisible(false)}
            hitSlop={10}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>

          {item.image_url && (
            <Image
              source={{ uri: item.image_url }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 14, paddingBottom: 24 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  topRightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  headerBtn: { padding: 4 } as ViewStyle,

  // Official Banner
  officialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 14,
  } as ViewStyle,
  officialBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  officialBannerTitle: { fontSize: 13 } as any,
  officialBannerCode: { fontSize: 11, marginTop: 1 } as any,
  openWebBtn: { padding: 4 } as ViewStyle,

  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' } as ViewStyle,
  priPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  priDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  priText: { fontSize: 11.5 } as any,

  title: { fontSize: 20, letterSpacing: -0.4, marginTop: 14, lineHeight: 28 } as any,
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 } as ViewStyle,
  meta: { fontSize: 12.5 } as any,
  body: { fontSize: 14.5, lineHeight: 24, marginTop: 16 } as any,

  imageWrapper: { marginTop: 16, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.03)' } as ViewStyle,
  noticeImage: { width: '100%', height: 260, borderRadius: Radius.lg } as any,
  tapToZoomPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  tapToZoomTxt: { color: '#fff', fontSize: 11, fontFamily: FontFamily.jakartaMedium } as any,

  attachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 20,
  } as ViewStyle,
  attachIcon: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  attachName: { fontSize: 13.5 } as any,
  attachMeta: { fontSize: 11, marginTop: 2 } as any,
  attachActions: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.md,
  } as ViewStyle,
  actionPillTxt: { fontSize: 12 } as any,
  downloadPill: {
    padding: 7,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  webLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 8,
  } as ViewStyle,
  webLinkTxt: { fontSize: 12.5 } as any,

  // PDF Viewer Modal
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  } as ViewStyle,
  pdfHeaderTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginHorizontal: 12,
  } as any,
  pdfLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 10,
  } as ViewStyle,
  pdfLoadingTxt: { fontSize: 13 } as any,

  // Fullscreen Image Modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  } as ViewStyle,
  fullscreenImage: {
    width: '94%',
    height: '80%',
  } as any,
});
