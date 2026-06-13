// Matches design screens-b.jsx — MarketDetail
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , Accent, LightColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';

const MK_CATS: Record<string, { icon: string; fg: string; label: string }> = {
  books:       { icon: 'book-open', fg: Accent.blue,   label: 'Books'       },
  electronics: { icon: 'cpu',       fg: Accent.purple, label: 'Electronics' },
  furniture:   { icon: 'layers',    fg: Accent.amber,  label: 'Furniture'   },
  notes:       { icon: 'file-text', fg: Accent.teal,   label: 'Notes'       },
  other:       { icon: 'package',   fg: Accent.slate,  label: 'Other'       },
};

export function MarketDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const isAdmin = profile?.role === 'admin';
  const { listingId } = route.params;
  const [listing, setListing] = useState<any>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ name: string | null; whatsapp: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase
        .from('listings')
        .select('*, profiles:seller_id(full_name)')
        .eq('id', listingId)
        .single();
      if (l) {
        setListing(l);
        setSellerName((l as any).profiles?.full_name ?? null);
      }
    })();
  }, [listingId]);

  async function revealContact() {
    if (!listing) return;
    const { data: c } = await supabase.rpc('listing_contact', { p_code: listing.code });
    setRevealed(true);
    const row = Array.isArray(c) ? c[0] : c;
    if (row) setContactInfo({ name: row.name ?? null, whatsapp: row.whatsapp ?? null });
  }

  async function markSold() {
    await supabase.from('listings').update({ status: 'Sold' }).eq('id', listingId);
    setListing((prev: any) => ({ ...prev, status: 'Sold' }));
  }

  function deleteListing() {
    Alert.alert('Delete listing', 'Remove this listing permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('listings').delete().eq('id', listingId);
          if (error) { Alert.alert('Error', error.message); return; }
          navigation.goBack();
        },
      },
    ]);
  }

  if (!listing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Marketplace" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  const cat = MK_CATS[listing.category?.toLowerCase()] ?? MK_CATS.other;
  const tintBg = isDark ? `${cat.fg}2e` : `${cat.fg}18`;
  const isOwn = listing.seller_id === user?.id;
  const isSold = listing.status === 'Sold';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Marketplace" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Large thumb */}
        <View style={[styles.bigThumb, { backgroundColor: tintBg }]}>
          <Feather name={cat.icon as any} size={72} color={cat.fg} />
          {isSold && (
            <View style={styles.soldOverlay}>
              <View style={[styles.soldPill, { backgroundColor: '#fff' }]}>
                <Text style={[styles.soldTxt, { color: LightColors.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.market2.sold}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Title + price */}
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{listing.title}</Text>
        <Text style={[styles.price, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          ৳{(listing.price ?? 0).toLocaleString('en-US')}
        </Text>

        {/* Pills */}
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.pillTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{cat.label}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.pillTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{listing.condition}</Text>
          </View>
          {listing.negotiable && (
            <View style={[styles.pill, { backgroundColor: C.infoBg }]}>
              <Text style={[styles.pillTxt, { color: C.info, fontFamily: FontFamily.jakartaSemiBold }]}>{t.market2.negotiable}</Text>
            </View>
          )}
          {isSold && (
            <View style={[styles.pill, { backgroundColor: C.dangerBg }]}>
              <View style={[styles.soldDot, { backgroundColor: C.danger }]} />
              <Text style={[styles.pillTxt, { color: C.danger, fontFamily: FontFamily.jakartaSemiBold }]}>{t.market2.sold}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.market2.details}</Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{listing.description}</Text>

        {/* Seller card */}
        <View style={[styles.sellerCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar name={sellerName ?? undefined} size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sellerName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {sellerName ?? t.market2.unknown}
            </Text>
            <Text style={[styles.sellerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {listing.location}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {isOwn ? (
          <View style={styles.ownerActions}>
            <View style={styles.ownerRow}>
              <TouchableOpacity
                style={[styles.halfBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => navigation.navigate('MarketPost', { listing })}
                activeOpacity={0.85}
              >
                <Icon name="sliders" size={16} color={C.text} />
                <Text style={[styles.halfBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.common.edit}</Text>
              </TouchableOpacity>
              {!isSold && (
                <TouchableOpacity
                  style={[styles.halfBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={markSold}
                  activeOpacity={0.85}
                >
                  <Feather name="check" size={16} color={C.text} />
                  <Text style={[styles.halfBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.market2.markSold}</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.dangerBg, marginTop: 0 }]}
              onPress={deleteListing}
              activeOpacity={0.85}
            >
              <Icon name="trash" size={16} color={C.danger} />
              <Text style={[styles.actionTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>{t.market2.deleteListing}</Text>
            </TouchableOpacity>
          </View>
        ) : revealed ? (
          <View style={[styles.contactCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.contactLabel, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>{t.market2.contactInfo}</Text>
            <View style={styles.contactRow}>
              <Feather name="user" size={15} color={C.textMuted} />
              <Text style={[styles.contactTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>{contactInfo?.name ?? sellerName ?? t.market2.seller}</Text>
            </View>
            <View style={styles.contactRow}>
              <Feather name="phone" size={15} color={C.textMuted} />
              <Text style={[styles.contactTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>{contactInfo?.whatsapp ?? t.market2.whatsappNotShared}</Text>
            </View>
          </View>
        ) : !isSold ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.brand }]}
            onPress={revealContact}
            activeOpacity={0.85}
          >
            <Icon name="mail" size={17} color="#fff" />
            <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.market2.contactSeller}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Admin moderation */}
        {!isOwn && isAdmin && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.dangerBg, marginTop: 10 }]}
            onPress={deleteListing}
            activeOpacity={0.85}
          >
            <Icon name="trash" size={16} color={C.danger} />
            <Text style={[styles.actionTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>{t.market2.deleteListingAdmin}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  content: { paddingTop: 16, paddingBottom: 20 } as ViewStyle,

  bigThumb: { height: 180, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' } as ViewStyle,
  soldOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  soldPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 } as ViewStyle,
  soldTxt: { fontSize: 13 } as any,

  title: { fontSize: 20, letterSpacing: -0.4, lineHeight: 28, marginTop: 16 } as any,
  price: { fontSize: 24, marginTop: 6 } as any,

  pills: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 10 } as ViewStyle,
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  pillTxt: { fontSize: 12 } as any,
  soldDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 18, marginBottom: 8 } as any,
  body: { fontSize: 14.5, lineHeight: 22.5 } as any,

  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 16 } as ViewStyle,
  sellerName: { fontSize: 14 } as any,
  sellerSub: { fontSize: 12, marginTop: 2 } as any,

  ownerActions: { gap: 10, marginTop: 18 } as ViewStyle,
  ownerRow: { flexDirection: 'row', gap: 10 } as ViewStyle,
  halfBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  halfBtnTxt: { fontSize: 14 } as any,

  contactCard: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 18 } as ViewStyle,
  contactLabel: { fontSize: 12, marginBottom: 2 } as any,
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  contactTxt: { fontSize: 13.5 } as any,

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, marginTop: 18 } as ViewStyle,
  actionTxt: { fontSize: 15 } as any,
});
