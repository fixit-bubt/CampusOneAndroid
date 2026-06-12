// Lost & Found item detail (web parity: ItemDetail.jsx) — full claims flow.
// Claimant: submit claim/notify with optional proof photo, track its status,
// see the poster's contact once approved. Poster: review incoming claims,
// view proof, approve (unlocks contacts both ways + auto-resolves the item
// via the resolve_item_on_approval DB trigger) or reject.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  TextInput, ActivityIndicator, Alert, Linking, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import { uploadProof, getSignedUrl } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import type { LostFoundItem } from '../../types/database';

const CAT_COLOR: Record<string, string> = {
  Personal: Accent.blue, Electronics: SectorColors.lostfound, Documents: Accent.green, Other: Accent.slate,
};
const CAT_ICON: Record<string, string> = {
  Personal: 'user', Electronics: 'phone', Documents: 'layers', Other: 'inbox',
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hrs ago`;
  return `${Math.floor(secs / 86400)} days ago`;
}

interface ClaimRow {
  id: string;
  item_id: string;
  claimant_id: string;
  kind: string;
  message: string;
  proof_url: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null } | null;
}

interface Contact {
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
}

export function LostFoundDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const { itemId } = route.params;
  const id = itemId;

  const [item, setItem] = useState<LostFoundItem | null>(null);
  const [poster, setPoster] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [claimNote, setClaimNote] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

  const isMine = item?.poster_id === user?.id;
  const myClaim = claims.find(c => c.claimant_id === user?.id) ?? null;

  const load = useCallback(async () => {
    const [itemRes, claimsRes] = await Promise.all([
      supabase
        .from('lost_found_items')
        .select('*, profiles:poster_id(full_name, avatar_url)')
        .eq('id', id)
        .single(),
      // RLS scopes this automatically: poster sees all claims on the item,
      // a claimant sees only their own.
      supabase
        .from('claims')
        .select('*, profiles:claimant_id(full_name, avatar_url)')
        .eq('item_id', id)
        .order('created_at', { ascending: false }),
    ]);
    if (itemRes.data) {
      const { profiles, ...rest } = itemRes.data as any;
      setItem(rest as LostFoundItem);
      setPoster(profiles);
    }
    if (claimsRes.data) setClaims(claimsRes.data as ClaimRow[]);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Reveal the counterpart's contact once an approved claim involves me.
  useEffect(() => {
    (async () => {
      if (!user) return;
      const approved = claims.find(c =>
        c.status === 'Approved' && (c.claimant_id === user.id || item?.poster_id === user.id));
      if (!approved) { setContact(null); return; }
      const { data } = await supabase.rpc('claim_contact', { p_claim_id: approved.id });
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setContact(row as Contact);
    })();
  }, [claims, item?.poster_id, user]);

  async function pickProof() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.common.error, 'Permission to access the media library is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setProofUri(result.assets[0].uri);
  }

  async function handleClaim() {
    const msg = claimNote.trim();
    if (busy || !item || !user) return;
    if (msg.length < 10) { Alert.alert(t.common.error, t.lostfound.messageTooShort); return; }
    setBusy(true);
    let proofPath: string | null = null;
    if (proofUri) {
      const up = await uploadProof(proofUri, user.id, 'image/jpeg');
      if (!up.success) { setBusy(false); Alert.alert(t.common.error, up.error); return; }
      proofPath = up.path;
    }
    const { error } = await supabase.from('claims').insert({
      item_id: item.id,
      claimant_id: user.id,
      kind: item.type === 'Found' ? 'claim' : 'notify',
      message: msg,
      proof_url: proofPath,
    });
    setBusy(false);
    if (error) { Alert.alert(t.common.error, error.message); return; }
    setShowClaim(false);
    setClaimNote('');
    setProofUri(null);
    await load();
  }

  function decide(claim: ClaimRow, status: 'Approved' | 'Rejected') {
    const approve = status === 'Approved';
    Alert.alert(
      approve ? t.lostfound.approveConfirmTitle : t.lostfound.rejectConfirmTitle,
      approve ? t.lostfound.approveConfirmBody : t.lostfound.rejectConfirmBody,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: approve ? t.lostfound.approve : t.lostfound.reject,
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setDeciding(claim.id);
            const { error } = await supabase.from('claims').update({ status }).eq('id', claim.id);
            setDeciding(null);
            if (error) { Alert.alert(t.common.error, error.message); return; }
            await load();
          },
        },
      ],
    );
  }

  async function viewProof(claim: ClaimRow) {
    if (!claim.proof_url) return;
    // Old rows may hold a full URL; new rows hold a private-bucket path.
    const url = claim.proof_url.startsWith('http')
      ? claim.proof_url
      : await getSignedUrl(BUCKETS.proofs, claim.proof_url);
    if (url) Linking.openURL(url);
    else Alert.alert(t.common.error, t.common.loadingError);
  }

  if (!item) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Lost & Found" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={C.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const fg = CAT_COLOR[item.category] ?? Accent.slate;
  const bg = `${fg}1e`;
  const isLost = item.type === 'Lost';
  const resolved = item.status === 'Resolved';

  const claimBadge = (status: ClaimRow['status']) =>
    status === 'Approved' ? { fg: C.success, bgc: C.successBg, label: t.lostfound.approvedBadge } :
    status === 'Rejected' ? { fg: C.danger, bgc: C.dangerBg, label: t.lostfound.rejectedBadge } :
    { fg: C.warn, bgc: C.warnBg, label: t.lostfound.pendingBadge };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Lost & Found" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Large category thumb */}
        <View style={[styles.thumbLg, { backgroundColor: bg }]}>
          <Icon name={CAT_ICON[item.category] ?? 'inbox'} size={48} color={fg} />
          <View style={[styles.typeOverlay, isLost ? { backgroundColor: C.dangerBg } : { backgroundColor: C.successBg }]}>
            <View style={[styles.typeDot, { backgroundColor: isLost ? C.danger : C.success }]} />
            <Text style={[styles.typeText, { color: isLost ? C.danger : C.success, fontFamily: FontFamily.jakartaBold }]}>
              {item.type}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {item.title}
        </Text>

        <View style={[styles.catPill, { backgroundColor: bg }]}>
          <Icon name={CAT_ICON[item.category] ?? 'inbox'} size={13} color={fg} />
          <Text style={[styles.catPillTxt, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
            {item.category}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          DETAILS
        </Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
          {item.description}
        </Text>

        {/* Info grid */}
        <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.infoCell, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border }]}>
            <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>Where</Text>
            <View style={styles.infoVal}>
              <Icon name="pin" size={13} color={C.textMuted} />
              <Text style={[styles.infoTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {item.location}
              </Text>
            </View>
          </View>
          <View style={styles.infoCell}>
            <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>When</Text>
            <View style={styles.infoVal}>
              <Icon name="clock" size={13} color={C.textMuted} />
              <Text style={[styles.infoTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {timeAgo(item.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Posted by */}
        <View style={[styles.byCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar uri={poster?.avatar_url} name={poster?.full_name} size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.byName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {poster?.full_name ?? 'Anonymous'}
            </Text>
            <Text style={[styles.bySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {item.type === 'Found' ? 'Found by' : 'Posted by'}
            </Text>
          </View>
        </View>

        {resolved && (
          <View style={[styles.resolvedBanner, { backgroundColor: C.successBg }]}>
            <Icon name="check" size={16} color={C.success} />
            <Text style={[styles.resolvedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
              {t.lostfound.itemResolved}
            </Text>
          </View>
        )}

        {/* Contact unlocked (either side of an approved claim) */}
        {contact && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.lostfound.contactUnlocked.toUpperCase()}
            </Text>
            <View style={[styles.contactCard, { backgroundColor: C.surface, borderColor: C.success }]}>
              <Avatar uri={contact.avatar_url} name={contact.full_name} size="sm" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.byName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {contact.full_name}
                </Text>
                {contact.email ? (
                  <Text style={[styles.contactLine, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {contact.email}
                  </Text>
                ) : null}
              </View>
              <View style={styles.contactBtns}>
                {contact.email ? (
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: C.surface2 }]}
                    onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                    activeOpacity={0.75}
                  >
                    <Icon name="mail" size={15} color={C.text} />
                  </TouchableOpacity>
                ) : null}
                {contact.whatsapp ? (
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: C.successBg }]}
                    onPress={() => Linking.openURL(`https://wa.me/${(contact.whatsapp ?? '').replace(/[^0-9]/g, '')}`)}
                    activeOpacity={0.75}
                  >
                    <Icon name="chat" size={15} color={C.success} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </>
        )}

        {/* Poster: incoming claims */}
        {isMine && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.lostfound.claimsTitle.toUpperCase()} ({claims.length})
            </Text>
            {claims.length === 0 ? (
              <Text style={[styles.body, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.lostfound.noClaims}
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {claims.map(cl => {
                  const badge = claimBadge(cl.status);
                  return (
                    <View key={cl.id} style={[styles.claimCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                      <View style={styles.claimTop}>
                        <Avatar uri={cl.profiles?.avatar_url} name={cl.profiles?.full_name} size="sm" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.byName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {cl.profiles?.full_name ?? 'Student'}
                          </Text>
                          <Text style={[styles.bySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                            {timeAgo(cl.created_at)}
                          </Text>
                        </View>
                        <View style={[styles.claimBadge, { backgroundColor: badge.bgc }]}>
                          <Text style={[styles.claimBadgeTxt, { color: badge.fg, fontFamily: FontFamily.jakartaBold }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.claimMsg, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                        {cl.message}
                      </Text>
                      <View style={styles.claimActions}>
                        {cl.proof_url ? (
                          <TouchableOpacity
                            style={[styles.claimBtn, { backgroundColor: C.surface2 }]}
                            onPress={() => viewProof(cl)}
                            activeOpacity={0.75}
                          >
                            <Icon name="image" size={14} color={C.text2} />
                            <Text style={[styles.claimBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                              {t.lostfound.viewProof}
                            </Text>
                          </TouchableOpacity>
                        ) : <View />}
                        {cl.status === 'Pending' && !resolved && (
                          <View style={{ flexDirection: 'row', gap: 7 }}>
                            <TouchableOpacity
                              style={[styles.claimBtn, { backgroundColor: C.dangerBg }]}
                              onPress={() => decide(cl, 'Rejected')}
                              disabled={deciding === cl.id}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.claimBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                                {t.lostfound.reject}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.claimBtn, { backgroundColor: C.success }]}
                              onPress={() => decide(cl, 'Approved')}
                              disabled={deciding === cl.id}
                              activeOpacity={0.8}
                            >
                              {deciding === cl.id
                                ? <ActivityIndicator size="small" color={C.white} />
                                : (
                                  <Text style={[styles.claimBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                                    {t.lostfound.approve}
                                  </Text>
                                )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Claimant: my claim status */}
        {!isMine && myClaim && (
          <View style={[styles.myClaimCard, {
            backgroundColor: myClaim.status === 'Approved' ? C.successBg : myClaim.status === 'Rejected' ? C.dangerBg : C.warnBg,
          }]}>
            <Icon
              name={myClaim.status === 'Approved' ? 'check' : myClaim.status === 'Rejected' ? 'x' : 'clock'}
              size={16}
              color={claimBadge(myClaim.status).fg}
            />
            <Text style={[styles.myClaimTxt, { color: claimBadge(myClaim.status).fg, fontFamily: FontFamily.jakartaBold }]}>
              {myClaim.status === 'Approved' ? t.lostfound.claimStatusApproved
                : myClaim.status === 'Rejected' ? t.lostfound.claimStatusRejected
                : t.lostfound.claimStatusPending}
            </Text>
          </View>
        )}

        {/* Claimant: submit claim */}
        {!resolved && !isMine && !myClaim && (
          showClaim ? (
            <View style={styles.claimBox}>
              <TextInput
                style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
                value={claimNote}
                onChangeText={setClaimNote}
                placeholder="Describe how you identify this item..."
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 12, marginBottom: 6 }]}>
                {t.lostfound.proofLabel}
              </Text>
              {proofUri ? (
                <View style={[styles.proofPreviewWrap, { borderColor: C.border }]}>
                  <Image source={{ uri: proofUri }} style={styles.proofPreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={[styles.proofRemove, { backgroundColor: C.dangerBg }]}
                    onPress={() => setProofUri(null)}
                    activeOpacity={0.75}
                  >
                    <Icon name="x" size={13} color={C.danger} />
                    <Text style={[styles.claimBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                      {t.lostfound.removeProof}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.proofPick, { borderColor: C.border, backgroundColor: C.surface }]}
                  onPress={pickProof}
                  activeOpacity={0.75}
                >
                  <Icon name="image" size={17} color={C.textMuted} />
                  <Text style={[styles.claimBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {t.lostfound.addProof}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.brand, opacity: claimNote.trim().length >= 10 ? 1 : 0.5, marginTop: 12 }]}
                onPress={handleClaim}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <View style={styles.btnRow}>
                    <Icon name="handshake" size={17} color={C.white} />
                    <Text style={[styles.btnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                      {item.type === 'Found' ? 'Send Claim' : 'Notify Poster'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.brand, marginTop: 18 }]}
              onPress={() => {
                if (!user) {
                  Alert.alert('Sign in required', 'Please sign in to claim or notify about this item.');
                  return;
                }
                setShowClaim(true);
              }}
            >
              <View style={styles.btnRow}>
                <Icon name="handshake" size={17} color={C.white} />
                <Text style={[styles.btnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {item.type === 'Found' ? 'Claim This Item' : 'I Found It!'}
                </Text>
              </View>
            </TouchableOpacity>
          )
        )}

        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  thumbLg: {
    height: 160,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  } as ViewStyle,

  typeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  } as ViewStyle,

  typeDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  typeText: { fontSize: 11 } as any,

  title: { fontSize: 21, letterSpacing: -0.5, marginTop: 16, lineHeight: 28 } as any,

  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  } as ViewStyle,

  catPillTxt: { fontSize: 12.5 } as any,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  } as any,

  body: { fontSize: 14.5, lineHeight: 22 } as any,

  infoGrid: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 16,
  } as ViewStyle,

  infoCell: { flex: 1, padding: 14 } as ViewStyle,
  infoLabel: { fontSize: 11, letterSpacing: 0.4, marginBottom: 6 } as any,
  infoVal: { flexDirection: 'row', alignItems: 'center', gap: 5 } as ViewStyle,
  infoTxt: { fontSize: 13, flex: 1 } as any,

  byCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  } as ViewStyle,

  byName: { fontSize: 14 } as any,
  bySub: { fontSize: 12, marginTop: 2 } as any,

  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 18,
  } as ViewStyle,

  resolvedTxt: { fontSize: 14 } as any,

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  } as ViewStyle,
  contactLine: { fontSize: 12, marginTop: 2 } as any,
  contactBtns: { flexDirection: 'row', gap: 7 } as ViewStyle,
  contactBtn: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  claimCard: { borderRadius: 14, borderWidth: 1, padding: 13 } as ViewStyle,
  claimTop: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  claimBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 } as ViewStyle,
  claimBadgeTxt: { fontSize: 10.5 } as any,
  claimMsg: { fontSize: 13, lineHeight: 19, marginTop: 9 } as any,
  claimActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 11,
  } as ViewStyle,
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  } as ViewStyle,
  claimBtnTxt: { fontSize: 12 } as any,

  myClaimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    borderRadius: 14,
    marginTop: 18,
  } as ViewStyle,
  myClaimTxt: { flex: 1, fontSize: 13, lineHeight: 18 } as any,

  claimBox: { marginTop: 18 } as ViewStyle,

  textarea: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
    minHeight: 90,
  } as any,

  proofPick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  } as ViewStyle,
  proofPreviewWrap: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  proofPreview: { width: '100%', height: 150 } as any,
  proofRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
  } as ViewStyle,

  actionBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  btnTxt: { fontSize: 15 } as any,
});
