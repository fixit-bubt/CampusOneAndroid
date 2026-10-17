import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
  Modal, Share, Pressable, Dimensions, type ViewStyle, type TextStyle, type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
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
import { toggleAnnouncementBookmark, markAnnouncementAsRead } from '../../services/announcementService';

const BANNERS_MAP: Record<string, ImageSourcePropType> = {
  'blood-drive.jpg': require('../../../assets/banners/blood-drive.jpg'),
  'convocation-2026.jpg': require('../../../assets/banners/convocation-2026.jpg'),
  'exam-routine.jpg': require('../../../assets/banners/exam-routine.jpg'),
  'hackathon-2026.jpg': require('../../../assets/banners/hackathon-2026.jpg'),
};

function resolveNoticeImage(rawUrl?: string | null): ImageSourcePropType | null {
  if (!rawUrl) return null;
  const cleaned = rawUrl.trim();
  const filename = cleaned.split('/').pop()?.split('?')[0] || '';
  if (filename && BANNERS_MAP[filename]) {
    return BANNERS_MAP[filename];
  }
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return { uri: cleaned };
  }
  if (cleaned.startsWith('/')) {
    return { uri: `https://campusonebubt.vercel.app${cleaned}` };
  }
  if (cleaned.startsWith('notices/') || cleaned.startsWith('storage/')) {
    const withoutStorage = cleaned.replace(/^storage\//, '').replace(/^\/+/, '');
    return { uri: `https://www.bubt.edu.bd/storage/${withoutStorage}` };
  }
  if (cleaned.startsWith('uploads/')) {
    return { uri: `https://www.bubt.edu.bd/${cleaned}` };
  }
  return { uri: cleaned };
}

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
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [zoomLoading, setZoomLoading] = useState(false);

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
      if (id) {
        markAnnouncementAsRead(id, user?.id || 'guest');
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
  const { width: winWidth, height: winHeight } = Dimensions.get('window');
  const displayImageUrl = item.image_url ||
    (item.attachment_url && /\.(jpe?g|png|webp|gif)$/i.test(item.attachment_url) ? item.attachment_url : null);
  const resolvedNoticeImg = resolveNoticeImage(displayImageUrl);

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

        {/* Notice Status & Category Bar */}
        {/* Notice Status & Category Bar */}
        {(item.priority === 'Urgent' || !!item.category) && (
          <View style={[styles.attrBar, { backgroundColor: C.surface, borderColor: C.border }]}>
            {/* Priority Pill */}
            {item.priority === 'Urgent' && (
              <View style={[styles.attrItem, { backgroundColor: bg }]}>
                <View style={[styles.priDot, { backgroundColor: fg }]} />
                <Text style={[styles.attrText, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
                  {t.announce2.priorityLabels[item.priority] ?? item.priority}
                </Text>
              </View>
            )}

            {/* Clean Humanized Category Pill */}
            {item.category ? (
              <View
                style={[
                  styles.attrItem,
                  {
                    backgroundColor:
                      item.category.toLowerCase().includes('offday') || item.category.toLowerCase().includes('holiday')
                        ? (isDark ? 'rgba(234, 88, 12, 0.16)' : '#fff7ed')
                        : item.category.toLowerCase().includes('exam')
                        ? (isDark ? 'rgba(59, 130, 246, 0.16)' : '#eff6ff')
                        : C.surface2,
                    borderColor:
                      item.category.toLowerCase().includes('offday') || item.category.toLowerCase().includes('holiday')
                        ? (isDark ? 'rgba(234, 88, 12, 0.35)' : '#fed7aa')
                        : item.category.toLowerCase().includes('exam')
                        ? (isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe')
                        : C.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Feather
                  name={
                    item.category.toLowerCase().includes('offday') || item.category.toLowerCase().includes('holiday')
                      ? 'sun'
                      : item.category.toLowerCase().includes('exam')
                      ? 'file-text'
                      : item.category.toLowerCase().includes('semester')
                      ? 'calendar'
                      : 'tag'
                  }
                  size={12}
                  color={
                    item.category.toLowerCase().includes('offday') || item.category.toLowerCase().includes('holiday')
                      ? '#ea580c'
                      : item.category.toLowerCase().includes('exam')
                      ? C.brand
                      : C.text
                  }
                />
                <Text
                  style={[
                    styles.attrText,
                    {
                      color:
                        item.category.toLowerCase().includes('offday') || item.category.toLowerCase().includes('holiday')
                          ? '#ea580c'
                          : item.category.toLowerCase().includes('exam')
                          ? C.brand
                          : C.text,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  {item.category.toLowerCase().includes('offday') || item.category.toLowerCase().includes('holiday')
                    ? 'Official Holiday'
                    : item.category.toLowerCase().includes('exam')
                    ? 'Exam Routine'
                    : item.category}
                </Text>
              </View>
            ) : null}
          </View>
        )}

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
        {resolvedNoticeImg && !imgError && (
          <View style={[styles.imageCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <TouchableOpacity
              onPress={() => setImageModalVisible(true)}
              activeOpacity={0.88}
              style={styles.imageWrapper}
            >
              <Image
                source={resolvedNoticeImg}
                style={styles.noticeImage}
                resizeMode="cover"
                onLoadStart={() => setImgLoading(true)}
                onLoadEnd={() => setImgLoading(false)}
                onError={() => {
                  setImgLoading(false);
                  setImgError(true);
                }}
              />
              {imgLoading && (
                <View style={[styles.imageLoadingOverlay, { backgroundColor: C.surface2 }]}>
                  <ActivityIndicator size="small" color={C.brand} />
                  <Text style={[styles.imageLoadingTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Loading official notice image…
                  </Text>
                </View>
              )}
              <View style={styles.tapToZoomPill}>
                <Feather name="maximize-2" size={12} color="#fff" />
                <Text style={styles.tapToZoomTxt}>Tap to zoom</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Official Web Link Bar */}
        {item.external_url && (
          <TouchableOpacity
            style={[
              styles.officialLinkBar,
              {
                backgroundColor: C.surface,
                borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
              },
            ]}
            onPress={() => openUrl(item.external_url!)}
            activeOpacity={0.82}
          >
            <View style={[styles.officialLinkIconSquircle, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.18)' : '#eff6ff' }]}>
              <Feather name="globe" size={20} color="#2563eb" />
            </View>
            <View style={styles.officialLinkBody}>
              <View style={styles.officialLinkBadgeRow}>
                <View style={styles.officialVerifiedDot} />
                <Text style={[styles.officialLinkDomain, { color: '#2563eb', fontFamily: FontFamily.jakartaBold }]}>
                  BUBT OFFICIAL PORTAL
                </Text>
              </View>
              <Text
                style={[styles.officialLinkTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                numberOfLines={1}
              >
                Open Official Notice on Web
              </Text>
              <Text
                style={[styles.officialLinkSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
                numberOfLines={1}
              >
                bubt.edu.bd · Verified university publication
              </Text>
            </View>
            <View style={[styles.officialLinkArrowBtn, { backgroundColor: isDark ? C.surface2 : '#f1f5f9' }]}>
              <Feather name="arrow-up-right" size={16} color="#2563eb" />
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* =========================================================================
          HIGH-DPI IN-APP PDF VIEWER (Zero Google Docs, 100% Offline, Native Feel)
         ========================================================================= */}
      <CampusPdfViewerModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        title={item.title || item.attachment_name || 'Notice PDF'}
        subtitle={item.department ? `${item.department} · BUBT` : 'BUBT Official Notice'}
        category={item.priority === 'Urgent' ? 'Urgent Notice' : 'Official Notice'}
        fileUrl={item.attachment_url}
        fileName={item.attachment_name || 'notice.pdf'}
      />

      {/* =========================================================================
          MODAL 2: FULLSCREEN IMAGE VIEWER MODAL WITH PINCH-TO-ZOOM
         ========================================================================= */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <SafeAreaView style={styles.imageModalOverlay}>
          <View style={styles.imageModalHeader}>
            <TouchableOpacity
              style={styles.imageModalClose}
              onPress={() => setImageModalVisible(false)}
              hitSlop={12}
            >
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.imageModalTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.image_url ? (
              <TouchableOpacity
                style={styles.imageModalShare}
                onPress={() => Share.share({ title: item.title, url: item.image_url! })}
                hitSlop={12}
              >
                <Feather name="share-2" size={19} color="#fff" />
              </TouchableOpacity>
            ) : <View style={{ width: 36 }} />}
          </View>

          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={styles.imageZoomScroll}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {resolvedNoticeImg && (
              <Image
                source={resolvedNoticeImg}
                style={[styles.fullscreenImage, { width: winWidth, height: winHeight * 0.78 }]}
                resizeMode="contain"
                onLoadStart={() => setZoomLoading(true)}
                onLoadEnd={() => setZoomLoading(false)}
              />
            )}
            {zoomLoading && (
              <View style={styles.zoomLoadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
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

  // Cohesive Attribute Bar
  attrBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
    padding: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 4,
  } as ViewStyle,
  attrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
  } as ViewStyle,
  attrText: {
    fontSize: 11,
  } as any,
  priDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,

  title: { fontSize: 20, letterSpacing: -0.4, marginTop: 14, lineHeight: 28 } as any,
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 } as ViewStyle,
  meta: { fontSize: 12.5 } as any,
  body: { fontSize: 14.5, lineHeight: 24, marginTop: 16 } as any,

  // Image Card
  imageCard: {
    marginTop: 18,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  imageWrapper: {
    width: '100%',
    height: 240,
    overflow: 'hidden',
    position: 'relative',
  } as ViewStyle,
  noticeImage: {
    width: '100%',
    height: '100%',
  } as any,
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  imageLoadingTxt: {
    fontSize: 11.5,
  } as any,
  tapToZoomPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  } as ViewStyle,
  tapToZoomTxt: { color: '#fff', fontSize: 11, fontFamily: FontFamily.jakartaBold } as any,

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

  officialLinkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 20,
  } as ViewStyle,
  officialLinkIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  officialLinkBody: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  officialLinkBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  } as ViewStyle,
  officialVerifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  } as ViewStyle,
  officialLinkDomain: {
    fontSize: 10,
    letterSpacing: 0.5,
  } as TextStyle,
  officialLinkTitle: {
    fontSize: 13.5,
  } as TextStyle,
  officialLinkSub: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,
  officialLinkArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

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
    gap: 10,
  } as ViewStyle,
  pdfLoadingTxt: { fontSize: 13 } as any,

  // Fullscreen Image Modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  } as ViewStyle,
  imageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  } as ViewStyle,
  imageModalClose: {
    padding: 4,
  } as ViewStyle,
  imageModalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 13.5,
    fontFamily: FontFamily.jakartaBold,
    marginHorizontal: 12,
    textAlign: 'center',
  } as any,
  imageModalShare: {
    padding: 4,
  } as ViewStyle,
  imageZoomScroll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  fullscreenImage: {
    width: '100%',
    height: '100%',
  } as any,
  zoomLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});
