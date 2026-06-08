// Matches design screens-lostfound.jsx — LFDetail
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { LostFoundItem } from '../../types/database';

const CAT_COLOR: Record<string, string> = {
  Personal: '#4f6bed', Electronics: '#e08a2b', Documents: '#12915e', Other: '#5b6b86',
};
const CAT_ICON: Record<string, string> = {
  Personal: 'user', Electronics: 'phone', Documents: 'layers', Other: 'inbox',
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hrs ago`;
  return `${Math.floor(secs / 86400)} days ago`;
}

export function LostFoundDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const { itemId } = route.params;
  const id = itemId;

  const [item, setItem] = useState<LostFoundItem | null>(null);
  const [poster, setPoster] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [claimNote, setClaimNote] = useState('');
  const [showClaim, setShowClaim] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('lost_found_items')
        .select('*, profiles:poster_id(full_name, avatar_url)')
        .eq('id', id)
        .single();
      if (data) {
        const { profiles, ...rest } = data as any;
        setItem(rest as LostFoundItem);
        setPoster(profiles);
      }
    })();
  }, [id]);

  async function handleClaim() {
    if (!claimNote.trim() || busy || !item || !user) return;
    setBusy(true);
    await supabase.from('claims').insert({
      item_id: item.id,
      claimant_id: user.id,
      kind: item.type === 'Found' ? 'claim' : 'notify',
      message: claimNote.trim(),
    });
    setBusy(false);
    setShowClaim(false);
    setClaimNote('');
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

  const fg = CAT_COLOR[item.category] ?? '#5b6b86';
  const bg = `${fg}1e`;
  const isLost = item.type === 'Lost';
  const isMine = item.poster_id === user?.id;

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
          {/* Type badge overlay */}
          <View style={[styles.typeOverlay, isLost ? { backgroundColor: '#fbe7e5' } : { backgroundColor: '#e3f5ec' }]}>
            <View style={[styles.typeDot, { backgroundColor: isLost ? '#d63d35' : '#12915e' }]} />
            <Text style={[styles.typeText, { color: isLost ? '#d63d35' : '#12915e', fontFamily: FontFamily.jakartaBold }]}>
              {item.type}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {item.title}
        </Text>

        {/* Category pill */}
        <View style={[styles.catPill, { backgroundColor: bg }]}>
          <Icon name={CAT_ICON[item.category] ?? 'inbox'} size={13} color={fg} />
          <Text style={[styles.catPillTxt, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
            {item.category}
          </Text>
        </View>

        {/* Section: Details */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          DETAILS
        </Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
          {item.description}
        </Text>

        {/* Info grid: where + when */}
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

        {/* Actions */}
        {item.status === 'Resolved' ? (
          <View style={[styles.resolvedBanner, { backgroundColor: C.successBg }]}>
            <Icon name="check" size={16} color={C.success} />
            <Text style={[styles.resolvedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
              Resolved
            </Text>
          </View>
        ) : !isMine && (
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
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.brand, opacity: claimNote.trim() ? 1 : 0.5, marginTop: 12 }]}
                onPress={handleClaim}
                disabled={!claimNote.trim() || busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.btnRow}>
                    <Icon name="handshake" size={17} color="#fff" />
                    <Text style={[styles.btnTxt, { fontFamily: FontFamily.jakartaBold }]}>
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
                <Icon name="handshake" size={17} color="#fff" />
                <Text style={[styles.btnTxt, { fontFamily: FontFamily.jakartaBold }]}>
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

  infoCell: {
    flex: 1,
    padding: 14,
  } as ViewStyle,

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

  claimBox: { marginTop: 18 } as ViewStyle,

  textarea: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
    minHeight: 90,
  } as any,

  actionBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  btnTxt: { fontSize: 15, color: '#fff' } as any,
});
