// Edit club details + transfer presidency.
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

interface Member {
  user_id: string;
  role: string;
  profiles: { full_name: string };
}

const CATEGORIES = ['Tech', 'Cultural', 'Sports', 'Professional', 'Social'];

export function ClubManageScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { clubId } = route.params ?? {};
  const id = clubId;
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [category, setCategory] = useState('Tech');
  const [advisor, setAdvisor] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [confirm, setConfirm] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [clubRes, membersRes] = await Promise.all([
        supabase.from('clubs').select('name, tagline, about, category, faculty_advisor_id, cover_url').eq('id', id).single(),
        supabase.from('club_members').select('*, profiles:profiles!user_id(full_name)').eq('club_id', id),
      ]);
      if (clubRes.data) {
        setName(clubRes.data.name ?? '');
        setTagline(clubRes.data.tagline ?? '');
        setAbout(clubRes.data.about ?? '');
        // Fall back to a valid category; 'other' isn't in CATEGORIES and the
        // club_update_details RPC rejects it.
        setCategory(clubRes.data.category && CATEGORIES.includes(clubRes.data.category)
          ? clubRes.data.category : 'Tech');
        setAdvisor(clubRes.data.faculty_advisor_id ?? null);
        setCoverUrl(clubRes.data.cover_url ?? null);
      }
      if (membersRes.data) setMembers(membersRes.data as any);
      setLoading(false);
    })();
  }, [id]);

  if (!clubId) return null; // after hooks — Rules of Hooks

  async function saveChanges() {
    if (!name.trim()) return;
    setSaving(true);
    // club_update_details RPC — RLS-safe edit path.
    // Omitted args fall back to the SQL defaults (null) - same result as
    // passing null, which the generated arg types don't allow.
    const { error } = await supabase.rpc('club_update_details', {
      p_club_id: id,
      p_name: name.trim(),
      p_tagline: tagline.trim() || undefined,
      p_about: about.trim() || undefined,
      p_category: category,
      p_advisor: advisor ?? undefined,
      p_cover_url: coverUrl ?? undefined,
    });
    setSaving(false);
    if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
    navigation.goBack();
  }

  async function transferPresidency(memberId: string) {
    setSaving(true);
    const { error } = await supabase.rpc('club_set_president', {
      p_club_id: id,
      p_user_id: memberId,
    });
    setSaving(false);
    if (error) { toast({ type: 'error', title: t.common.error, message: t.clubs2.transferFailed(error.message) }); return; }
    setConfirm(null);
    navigation.goBack();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.clubs2.manageClub} onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.clubs2.manageClub} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Club details section */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.clubs2.clubDetailsSection}</Text>

        <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.clubs2.nameLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
          value={name}
          onChangeText={setName}
          placeholder={t.clubs2.clubNamePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.clubs2.taglineLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
          value={tagline}
          onChangeText={setTagline}
          placeholder={t.clubs2.taglinePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.clubs2.aboutLabel}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
          value={about}
          onChangeText={setAbout}
          placeholder={t.clubs2.aboutPlaceholder}
          placeholderTextColor={C.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 12 }]}>{t.clubs2.categoryLabel}</Text>
        <View style={styles.catRow}>
          {CATEGORIES.map(c => {
            const on = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, on
                  ? { backgroundColor: C.brand, borderColor: C.brand }
                  : { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setCategory(c)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.brand, opacity: name.trim() && !saving ? 1 : 0.5 }]}
          onPress={saveChanges}
          disabled={!name.trim() || saving}
          activeOpacity={0.85}
        >
          <Icon name="check" size={18} color={C.white} />
          <Text style={[styles.saveBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{t.clubs2.saveChanges}</Text>
        </TouchableOpacity>

        {/* Transfer presidency — the club_set_president RPC requires a global
            admin, so only show it to admins (presidents/VPs would always fail). */}
        {profile?.role === 'admin' && (
        <>
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.clubs2.transferPresidencySection}</Text>
        <View style={[styles.membersCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {members.map((m, i) => {
            const isPresident = m.role === 'president';
            return (
              <View key={m.user_id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={styles.memberRow}>
                  <Avatar name={(m as any).profiles?.full_name} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.memberName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {(m as any).profiles?.full_name ?? t.clubs2.memberFallback}
                    </Text>
                    <Text style={[styles.memberRole, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {m.role}
                    </Text>
                  </View>
                  {isPresident ? (
                    <View style={[styles.pres, { backgroundColor: C.infoBg }]}>
                      <View style={[styles.presDot, { backgroundColor: C.info }]} />
                      <Text style={[styles.presTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>{t.clubs2.president}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.makeBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                      onPress={() => setConfirm(m)}
                      activeOpacity={0.75}
                    >
                      <Icon name="clubs" size={14} color={C.text} />
                      <Text style={[styles.makeBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.clubs2.makePresident}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        </>
        )}

        <View style={{ height: 26 }} />
      </ScrollView>

      {/* Confirm transfer modal */}
      <Modal visible={!!confirm} transparent animationType="slide" onRequestClose={() => setConfirm(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setConfirm(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.clubs2.transferQuestion}</Text>
          <Text style={[styles.sheetBody, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.clubs2.transferBodyPrefix}<Text style={{ fontFamily: FontFamily.jakartaBold }}>{(confirm as any)?.profiles?.full_name}</Text>{t.clubs2.transferBodySuffix}
          </Text>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: C.brand }]}
            onPress={() => confirm && transferPresidency(confirm.user_id)}
            activeOpacity={0.85}
          >
            <Icon name="check" size={18} color={C.white} />
            <Text style={[styles.confirmTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{t.clubs2.confirmTransfer}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 20, marginBottom: 10 } as any,
  fieldLabel: { fontSize: 13, marginBottom: 6 } as any,
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 } as TextStyle,
  textarea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 90, marginBottom: 0 } as TextStyle,
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, marginTop: 16 } as ViewStyle,
  saveBtnTxt: { fontSize: 15 } as any,
  membersCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14 } as ViewStyle,
  memberName: { fontSize: 14 } as any,
  memberRole: { fontSize: 12, marginTop: 1 } as any,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  pres: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 } as ViewStyle,
  presDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  presTxt: { fontSize: 11 } as any,
  makeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  makeBtnTxt: { fontSize: 12 } as any,
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 } as ViewStyle,
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  catChipTxt: { fontSize: 12 } as any,
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' } as ViewStyle,
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 } as ViewStyle,
  sheetTitle: { fontSize: 16, marginBottom: 10 } as any,
  sheetBody: { fontSize: 14, lineHeight: 21, marginBottom: 16 } as any,
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 } as ViewStyle,
  confirmTxt: { fontSize: 15 } as any,
});
