import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, Modal, Share, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { FontFamily, Layout, Accent, SectorColors, LightColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, CacheKeys } from '../../services/cacheService';
import { fetchPeople, type Person } from '../../services/peopleService';
import {
  openListingDmThread,
  updateListingStatus,
  deleteListingRow,
  getSavedListingIds,
  toggleSavedListing,
} from '../../services/marketService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import type { Listing } from '../../types/database';

const MARKET_COLOR = SectorColors.market;

const MK_CATS: Record<string, { icon: keyof typeof Feather.glyphMap; fg: string; label: string }> = {
  books:       { icon: 'book-open', fg: Accent.blue,   label: 'Books'       },
  electronics: { icon: 'cpu',       fg: Accent.purple, label: 'Electronics' },
  furniture:   { icon: 'layers',    fg: Accent.amber,  label: 'Furniture'   },
  notes:       { icon: 'file-text', fg: Accent.teal,   label: 'Notes'       },
  drafting:    { icon: 'edit-3',    fg: '#f59e0b',     label: 'Drafting'    },
  labgear:     { icon: 'shield',    fg: '#10b981',     label: 'Lab Gear'    },
  other:       { icon: 'package',   fg: Accent.slate,  label: 'Other'       },
};

export function MarketDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();
  const isAdmin = profile?.role === 'admin';

  // Support both listingId and id safely
  const { listingId, id: paramId } = route.params ?? {};
  const id = listingId || paramId;

  const [listing, setListing] = useState<Listing | any>(null);
  const [failed, setFailed] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<Person | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [dmLoading, setDmLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ name: string | null; whatsapp: string | null } | null>(null);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Load wishlist bookmark state
  useEffect(() => {
    if (id) {
      getSavedListingIds().then(ids => setIsSaved(ids.includes(id)));
    }
  }, [id]);

  const load = useCallback(async () => {
    if (!id) { setFailed(true); return; }

    // 1. Check local cache first
    const cached = await getCache<any[]>(CacheKeys.MARKET_LISTINGS);
    const found = cached?.find(l => l.id === id);
    if (found) {
      setListing(found);
      fetchPeople([found.seller_id]).then(p => {
        if (p[found.seller_id]) setSellerProfile(p[found.seller_id]);
      });
    }

    // 2. Fetch fresh from DB
    const { data: l, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !l) {
      if (!found) setFailed(true);
      return;
    }

    setListing(l);
    // Resolve seller info via directory RPC
    const people = await fetchPeople([l.seller_id]);
    if (people[l.seller_id]) {
      setSellerProfile(people[l.seller_id]);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Toggle favorite
  async function handleToggleBookmark() {
    if (!id) return;
    const { saved } = await toggleSavedListing(id);
    setIsSaved(saved);
    toast({
      type: 'info',
      title: saved ? t.market2.savedListings : 'Removed',
      message: saved ? 'Added to your wishlist' : 'Removed from your wishlist',
    });
  }

  // Native share sheet
  async function handleShare() {
    if (!listing) return;
    try {
      const priceTxt = listing.price === 0 ? t.market2.free : `৳${listing.price}`;
      await Share.share({
        title: listing.title,
        message: `${listing.title} (${priceTxt}) on CampusOne Marketplace.\n${listing.description || ''}`,
      });
    } catch {
      // Ignored if cancelled
    }
  }

  // In-App Direct Chat via open_dm_thread RPC
  async function handleMessageSeller() {
    if (!listing || !user || dmLoading) return;
    setDmLoading(true);
    try {
      const res = await openListingDmThread(listing.code, listing.seller_id);
      if (!res.success) {
        toast({ type: 'error', title: t.common.error, message: res.error ?? 'Could not start conversation' });
        return;
      }
      const priceLabel = (listing.price ?? 0) === 0 ? 'Free' : `৳ ${listing.price}`;
      const introText = `Hi, I'm interested in your listing "${listing.title}" (${priceLabel}). Is this still available?`;
      navigation.navigate('MessageThread', {
        kind: 'dm',
        id: listing.seller_id,
        title: sellerProfile?.full_name ?? t.market2.seller,
        initialText: introText,
      });
    } catch (e: any) {
      toast({ type: 'error', title: t.common.error, message: e?.message ?? 'Failed to open message thread' });
    } finally {
      setDmLoading(false);
    }
  }

  // Reveal WhatsApp contact via RPC
  async function revealContact() {
    if (!listing) return;
    const { data: c, error } = await supabase.rpc('listing_contact', { p_code: listing.code });
    if (error) {
      toast({ type: 'error', title: t.common.error, message: 'Connect to internet to reveal contact' });
      return;
    }
    setRevealed(true);
    const row = Array.isArray(c) ? c[0] : c;
    if (row) {
      setContactInfo({ name: row.name ?? null, whatsapp: row.whatsapp ?? null });
      setContactSheetOpen(true);
    }
  }

  // Owner status actions
  function handleToggleSold() {
    if (!listing || !id) return;
    const isCurrentlySold = listing.status === 'Sold';
    const alertTitle = isCurrentlySold ? t.market2.relistConfirmTitle : t.market2.markSoldConfirmTitle;
    const alertBody = isCurrentlySold ? t.market2.relistConfirmBody : t.market2.markSoldConfirmBody;
    const nextStatus = isCurrentlySold ? 'Available' : 'Sold';

    Alert.alert(alertTitle, alertBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: isCurrentlySold ? t.market2.relistListing : t.market2.markSold,
        onPress: async () => {
          const res = await updateListingStatus(id, nextStatus);
          if (!res.success) {
            toast({ type: 'error', title: t.common.error, message: res.error });
            return;
          }
          setListing((prev: any) => ({ ...prev, status: nextStatus }));
          toast({ type: 'success', title: t.common.done, message: `Listing marked as ${nextStatus.toLowerCase()}` });
        },
      },
    ]);
  }

  // Delete listing action
  function handleDeleteListing() {
    if (!id) return;
    Alert.alert(t.market2.deleteListingTitle, t.market2.deleteListingBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete ?? 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteListingRow(id);
          if (!res.success) {
            toast({ type: 'error', title: t.common.error, message: res.error });
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  }

  // Navigate to course in Study Hub
  async function handleNavigateCourse() {
    if (!listing?.course_code) return;
    const code = listing.course_code.trim();
    const { data } = await supabase
      .from('courses')
      .select('id')
      .ilike('code', code)
      .maybeSingle();

    if (data?.id) {
      navigation.navigate('CourseDetail', { courseId: data.id });
    } else {
      navigation.navigate('StudyHub');
    }
  }

  if (!listing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.market2.marketplace} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {failed ? (
            <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>{t.common.notFound}</Text>
          ) : (
            <ActivityIndicator color={MARKET_COLOR} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const catMeta = MK_CATS[listing.category?.toLowerCase()] ?? MK_CATS.other;
  const tintBg = isDark ? `${catMeta.fg}24` : `${catMeta.fg}14`;
  const isOwn = listing.seller_id === user?.id;
  const isSold = listing.status === 'Sold';
  const isFree = (listing.price ?? 0) === 0;

  // Condition color
  const condColor = listing.condition === 'New' ? '#059669' : listing.condition === 'Like New' ? '#2563EB' : '#64748B';
  const condBg = isDark ? `${condColor}2e` : `${condColor}14`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.market2.marketplace}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.topRightRow}>
            <TouchableOpacity onPress={handleShare} style={styles.topIconBtn} hitSlop={8} activeOpacity={0.7}>
              <Feather name="share-2" size={19} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleBookmark} style={styles.topIconBtn} hitSlop={8} activeOpacity={0.7}>
              <Feather
                name="heart"
                size={20}
                color={isSaved ? '#ef4444' : C.text}
                style={isSaved ? { transform: [{ scale: 1.1 }] } : undefined}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Photo / Lightbox Trigger */}
        <TouchableOpacity
          style={[styles.bigThumb, { backgroundColor: tintBg }]}
          onPress={() => { if (listing.photo_url) setLightboxOpen(true); }}
          activeOpacity={listing.photo_url ? 0.9 : 1}
        >
          {listing.photo_url ? (
            <>
              <Image source={{ uri: listing.photo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.zoomHintPill}>
                <Feather name="maximize-2" size={12} color="#fff" />
                <Text style={styles.zoomHintText}>Tap to zoom</Text>
              </View>
            </>
          ) : (
            <Feather name={catMeta.icon} size={68} color={catMeta.fg} />
          )}

          {isSold && (
            <View style={styles.soldOverlay}>
              <View style={[styles.soldPill, { backgroundColor: '#fff' }]}>
                <Text style={[styles.soldTxt, { color: LightColors.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {t.market2.sold}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {listing.title}
        </Text>

        {/* Price & Free Badge */}
        <View style={styles.priceRow}>
          {isFree ? (
            <View style={[styles.freePill, { backgroundColor: '#16a34a' }]}>
              <Text style={[styles.freePillTxt, { fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.market2.free} · {t.market2.giveaway}
              </Text>
            </View>
          ) : (
            <Text style={[styles.price, { color: isSold ? C.textMuted : C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              ৳{(listing.price ?? 0).toLocaleString('en-US')}
            </Text>
          )}

          {listing.negotiable && !isFree && (
            <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.1)' }]}>
              <Text style={[styles.pillTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.negotiable}
              </Text>
            </View>
          )}
        </View>

        {/* Attribute Pills */}
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
            <Feather name={catMeta.icon} size={12} color={catMeta.fg} />
            <Text style={[styles.pillTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
              {catMeta.label}
            </Text>
          </View>

          <View style={[styles.pill, { backgroundColor: condBg }]}>
            <Text style={[styles.pillTxt, { color: condColor, fontFamily: FontFamily.jakartaBold }]}>
              {listing.condition}
            </Text>
          </View>

          {listing.course_code ? (
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)' }]}
              onPress={handleNavigateCourse}
              activeOpacity={0.75}
            >
              <Feather name="book" size={11} color={Accent.blue} />
              <Text style={[styles.pillTxt, { color: Accent.blue, fontFamily: FontFamily.jakartaBold }]}>
                {listing.course_code} ↗
              </Text>
            </TouchableOpacity>
          ) : null}

          {isSold && (
            <View style={[styles.pill, { backgroundColor: C.dangerBg }]}>
              <View style={[styles.soldDot, { backgroundColor: C.danger }]} />
              <Text style={[styles.pillTxt, { color: C.danger, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.market2.sold}
              </Text>
            </View>
          )}
        </View>

        {/* Meetup Handover Spot */}
        {listing.meetup_spot ? (
          <View style={[styles.spotCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Feather name="map-pin" size={15} color={MARKET_COLOR} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.spotLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.meetupSpot}
              </Text>
              <Text style={[styles.spotValue, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                {listing.meetup_spot}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Description */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.market2.details}
        </Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
          {listing.description || 'No additional description provided.'}
        </Text>

        {/* Verified Student Seller Card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 20 }]}>
          {t.market2.seller}
        </Text>
        <TouchableOpacity
          style={[styles.sellerCard, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => navigation.navigate('StudentProfile', { studentId: listing.seller_id })}
          activeOpacity={0.8}
        >
          <Avatar name={sellerProfile?.full_name ?? undefined} size="md" />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[styles.sellerName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {sellerProfile?.full_name ?? t.market2.verifiedStudent}
              </Text>
              <Feather name="check-circle" size={13} color="#16a34a" />
            </View>
            <Text style={[styles.sellerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {sellerProfile?.department ?? t.market2.verifiedStudent}
            </Text>
          </View>
          <View style={styles.profileChevron}>
            <Text style={[styles.profileLinkTxt, { color: MARKET_COLOR, fontFamily: FontFamily.jakartaBold }]}>
              {t.market2.viewProfile}
            </Text>
            <Feather name="chevron-right" size={15} color={MARKET_COLOR} />
          </View>
        </TouchableOpacity>

        {/* Action Panel */}
        {isOwn ? (
          <View style={styles.ownerActions}>
            <View style={styles.ownerRow}>
              <TouchableOpacity
                style={[styles.halfBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => navigation.navigate('MarketPost', { listing })}
                activeOpacity={0.8}
              >
                <Icon name="sliders" size={16} color={C.text} />
                <Text style={[styles.halfBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.common.edit}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.halfBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={handleToggleSold}
                activeOpacity={0.8}
              >
                <Feather name={isSold ? 'rotate-ccw' : 'check'} size={16} color={isSold ? MARKET_COLOR : '#16a34a'} />
                <Text style={[styles.halfBtnTxt, { color: isSold ? MARKET_COLOR : '#16a34a', fontFamily: FontFamily.jakartaBold }]}>
                  {isSold ? t.market2.relistListing : t.market2.markSold}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: C.dangerBg }]}
              onPress={handleDeleteListing}
              activeOpacity={0.8}
            >
              <Icon name="trash" size={16} color={C.danger} />
              <Text style={[styles.deleteBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.deleteListing}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buyerActions}>
            {/* Primary: In-App Message */}
            {!isSold && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: MARKET_COLOR, opacity: dmLoading ? 0.7 : 1 }]}
                onPress={handleMessageSeller}
                disabled={dmLoading}
                activeOpacity={0.85}
              >
                {dmLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="message-square" size={18} color="#fff" />
                    <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      {t.market2.messageSeller}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Secondary: Reveal WhatsApp / Direct Call */}
            {revealed ? (
              <TouchableOpacity
                style={[styles.contactCard, { backgroundColor: C.surface, borderColor: Accent.teal }]}
                onPress={() => setContactSheetOpen(true)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactLabel, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.contactInfo}
                  </Text>
                  <View style={styles.contactRow}>
                    <Feather name="phone" size={15} color={C.textMuted} />
                    <Text style={[styles.contactTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                      {contactInfo?.whatsapp ?? t.market2.whatsappNotShared}
                    </Text>
                  </View>
                </View>
                <View style={[styles.contactCallBtn, { backgroundColor: C.successBg }]}>
                  <Feather name="phone" size={16} color={C.success} />
                </View>
              </TouchableOpacity>
            ) : !isSold ? (
              <TouchableOpacity
                style={[styles.secActionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={revealContact}
                activeOpacity={0.85}
              >
                <Feather name="phone" size={16} color={C.text} />
                <Text style={[styles.secActionTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.market2.contactInfo}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Admin Moderation Button */}
        {!isOwn && isAdmin && (
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: C.dangerBg, marginTop: 14 }]}
            onPress={handleDeleteListing}
            activeOpacity={0.8}
          >
            <Icon name="trash" size={16} color={C.danger} />
            <Text style={[styles.deleteBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
              {t.market2.deleteListingAdmin}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Lightbox Tap-to-Zoom Modal */}
      <Modal visible={lightboxOpen} transparent animationType="fade" onRequestClose={() => setLightboxOpen(false)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setLightboxOpen(false)} hitSlop={12}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          {listing.photo_url && (
            <Image source={{ uri: listing.photo_url }} style={styles.lightboxImg} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Contact Bottom Sheet */}
      <ContactSheet
        visible={contactSheetOpen}
        onClose={() => setContactSheetOpen(false)}
        title={t.market2.contactInfo}
        name={contactInfo?.name ?? sellerProfile?.full_name ?? t.market2.seller}
        phone={contactInfo?.whatsapp}
        inAppChatAction={handleMessageSeller}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  content: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  topRightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  topIconBtn: { padding: 4 } as ViewStyle,

  bigThumb: {
    height: 220,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  } as ViewStyle,
  zoomHintPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  zoomHintText: { color: '#fff', fontSize: 10.5, fontFamily: FontFamily.jakartaSemiBold } as any,

  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  soldPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 } as ViewStyle,
  soldTxt: { fontSize: 13 } as any,

  title: { fontSize: 21, letterSpacing: -0.4, lineHeight: 28, marginTop: 14 } as any,

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  } as ViewStyle,
  price: { fontSize: 24 } as any,
  freePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  } as ViewStyle,
  freePillTxt: { color: '#fff', fontSize: 14 } as any,

  pills: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 10 } as ViewStyle,
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5.5, borderRadius: 20 } as ViewStyle,
  pillTxt: { fontSize: 12 } as any,
  soldDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,

  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  } as ViewStyle,
  spotLabel: { fontSize: 10, letterSpacing: 0.6 } as any,
  spotValue: { fontSize: 13.5, marginTop: 1 } as any,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 18, marginBottom: 8 } as any,
  body: { fontSize: 14.5, lineHeight: 23 } as any,

  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  sellerName: { fontSize: 14.5 } as any,
  sellerSub: { fontSize: 12, marginTop: 2 } as any,
  profileChevron: { flexDirection: 'row', alignItems: 'center', gap: 3 } as ViewStyle,
  profileLinkTxt: { fontSize: 12 } as any,

  buyerActions: { gap: 10, marginTop: 20 } as ViewStyle,
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
  } as ViewStyle,
  actionTxt: { fontSize: 15 } as any,

  secActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  secActionTxt: { fontSize: 14 } as any,

  ownerActions: { gap: 10, marginTop: 20 } as ViewStyle,
  ownerRow: { flexDirection: 'row', gap: 10 } as ViewStyle,
  halfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  halfBtnTxt: { fontSize: 14 } as any,

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
  } as ViewStyle,
  deleteBtnTxt: { fontSize: 14 } as any,

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  } as ViewStyle,
  contactCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  contactLabel: { fontSize: 11.5, marginBottom: 2 } as any,
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  contactTxt: { fontSize: 13.5 } as any,

  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  } as ViewStyle,
  lightboxImg: {
    width: '94%',
    height: '75%',
  } as any,
});
