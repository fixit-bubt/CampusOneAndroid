// Edit club details + transfer presidency.
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, KeyboardAvoidingView, Platform, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { fetchPeople } from '../../services/peopleService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';

interface Member {
  user_id: string;
  role: string;
  profiles: { full_name: string } | null;
}

const FORM_CATEGORIES = ['Tech', 'Cultural', 'Sports', 'Professional', 'Social'] as const;
type FormCategory = typeof FORM_CATEGORIES[number];

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Tech: 'cpu',
  Cultural: 'music',
  Sports: 'activity',
  Professional: 'briefcase',
  Social: 'users',
};

export function ClubManageScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { clubId } = route.params ?? {};
  const id = clubId;

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [category, setCategory] = useState<FormCategory>('Tech');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
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
        supabase.from('club_members').select('*').eq('club_id', id),
      ]);
      if (clubRes.data) {
        setName(clubRes.data.name ?? '');
        setTagline(clubRes.data.tagline ?? '');
        setAbout(clubRes.data.about ?? '');
        const validCat = clubRes.data.category && (FORM_CATEGORIES as readonly string[]).includes(clubRes.data.category)
          ? (clubRes.data.category as FormCategory)
          : 'Tech';
        setCategory(validCat);
        setAdvisor(clubRes.data.faculty_advisor_id ?? null);
        setCoverUrl(clubRes.data.cover_url ?? null);
      }
      if (membersRes.data) {
        const people = await fetchPeople((membersRes.data as any[]).map(m => m.user_id));
        setMembers((membersRes.data as any[]).map(m => ({
          ...m,
          profiles: people[m.user_id] ? { full_name: people[m.user_id].full_name } : null,
        })) as any);
      }
      setLoading(false);
    })();
  }, [id]);

  if (!clubId) return null;

  async function saveChanges() {
    if (!name.trim()) return;
    setSaving(true);
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
    if (error) {
      toast({ type: 'error', title: t.common.error, message: error.message });
      return;
    }
    toast({ type: 'success', title: 'Saved', message: 'Club details updated.' });
    navigation.goBack();
  }

  async function transferPresidency(memberId: string) {
    setSaving(true);
    const { error } = await supabase.rpc('club_set_president', {
      p_club_id: id,
      p_user_id: memberId,
    });
    setSaving(false);
    if (error) {
      toast({ type: 'error', title: t.common.error, message: t.clubs2.transferFailed(error.message) });
      return;
    }
    setConfirm(null);
    toast({ type: 'success', title: 'Handover Complete', message: 'New president appointed.' });
    navigation.goBack();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.clubs2.manageClub} onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.clubs2.manageClub} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Club Identity */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.clubs2.clubDetailsSection.toUpperCase()}
          </Text>

          {/* Field: Club Name (58dp) */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 10 }]}>
            CLUB NAME
          </Text>
          <TextInput
            style={[
              styles.bar58,
              styles.input58,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={name}
            onChangeText={setName}
            placeholder={t.clubs2.clubNamePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Field: Tagline (58dp) */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            TAGLINE
          </Text>
          <TextInput
            style={[
              styles.bar58,
              styles.input58,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={tagline}
            onChangeText={setTagline}
            placeholder={t.clubs2.taglinePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Field: Category Dropdown Bar (58dp) */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            CATEGORY
          </Text>
          <TouchableOpacity
            style={[
              styles.bar58,
              styles.dropdownBar,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => setCategoryModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={styles.barLeft}>
              <Feather
                name={CATEGORY_ICONS[category] ?? 'layers'}
                size={28}
                color={C.text}
              />
              <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {category}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* Field: About Section */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            ABOUT CLUB
          </Text>
          <TextInput
            style={[
              styles.textarea,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={about}
            onChangeText={setAbout}
            placeholder={t.clubs2.aboutPlaceholder}
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Save Changes CTA Button (58dp) */}
          <TouchableOpacity
            style={[
              styles.bar58,
              styles.saveBtn58,
              { backgroundColor: C.brand, opacity: name.trim() && !saving ? 1 : 0.55, marginTop: 20 },
            ]}
            onPress={saveChanges}
            disabled={!name.trim() || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Text style={[styles.saveBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                {t.clubs2.saveChanges}
              </Text>
            )}
          </TouchableOpacity>

          {/* Section 2: Presidency Transfer (Admin Only) */}
          {profile?.role === 'admin' && members.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 28 }]}>
                {t.clubs2.transferPresidencySection.toUpperCase()}
              </Text>

              <View style={[styles.membersCard, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10 }]}>
                {members.map((m, i) => {
                  const isPresident = m.role === 'president';
                  return (
                    <View key={m.user_id}>
                      {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                      <View style={styles.memberRow}>
                        <Avatar name={(m as any).profiles?.full_name} size="sm" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.memberName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {(m as any).profiles?.full_name ?? t.clubs2.memberFallback}
                          </Text>
                          <Text style={[styles.memberRole, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                            {m.role}
                          </Text>
                        </View>
                        {isPresident ? (
                          <View style={[styles.presBadge, { backgroundColor: C.infoBg }]}>
                            <View style={[styles.presDot, { backgroundColor: C.info }]} />
                            <Text style={[styles.presTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>
                              {t.clubs2.president}
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.makeBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                            onPress={() => setConfirm(m)}
                            activeOpacity={0.75}
                          >
                            <Feather name="award" size={13} color={C.brand} />
                            <Text style={[styles.makeBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                              Handover
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Bottom Sheet (58dp Bars) */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCategoryModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 14 }]}>
              Select Club Category
            </Text>

            <View style={{ gap: 8 }}>
              {FORM_CATEGORIES.map(cat => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.bar58,
                      styles.dropdownBar,
                      {
                        backgroundColor: isSelected ? C.surface2 : C.bg,
                        borderColor: isSelected ? C.text : C.border,
                      },
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setCategoryModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.barLeft}>
                      <Feather
                        name={CATEGORY_ICONS[cat] ?? 'layers'}
                        size={28}
                        color={C.text}
                      />
                      <Text
                        style={[
                          styles.barTitle,
                          {
                            color: C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm Transfer Modal */}
      <Modal visible={!!confirm} transparent animationType="slide" onRequestClose={() => setConfirm(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setConfirm(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.clubs2.transferQuestion}
          </Text>
          <Text style={[styles.sheetBody, { color: C.text2, fontFamily: FontFamily.jakartaMedium, marginTop: 8 }]}>
            {t.clubs2.transferBodyPrefix}
            <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>
              {(confirm as any)?.profiles?.full_name}
            </Text>
            {t.clubs2.transferBodySuffix}
          </Text>
          <TouchableOpacity
            style={[styles.bar58, styles.saveBtn58, { backgroundColor: C.brand, marginTop: 18 }]}
            onPress={() => confirm && transferPresidency(confirm.user_id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {t.clubs2.confirmTransfer}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  // Universal 58dp Bar Standard
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  dropdownBar: {
    justifyContent: 'space-between',
    marginTop: 6,
  } as ViewStyle,
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  } as ViewStyle,
  barTitle: {
    fontSize: 14.5,
  } as TextStyle,
  input58: {
    fontSize: 14.5,
    marginTop: 6,
  } as TextStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as TextStyle,
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
  } as TextStyle,
  dot10: {
    width: 10,
    height: 10,
    borderRadius: 5,
  } as ViewStyle,

  textarea: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14.5,
    minHeight: 100,
    marginTop: 6,
  } as TextStyle,

  saveBtn58: {
    justifyContent: 'center',
  } as ViewStyle,
  saveBtnTxt: {
    fontSize: 15.5,
  } as TextStyle,

  membersCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
  } as ViewStyle,
  memberName: {
    fontSize: 14,
  } as TextStyle,
  memberRole: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  } as TextStyle,
  divider: {
    height: StyleSheet.hairlineWidth,
  } as ViewStyle,

  presBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  presDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  presTxt: {
    fontSize: 11,
  } as TextStyle,

  makeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  makeBtnTxt: {
    fontSize: 12,
  } as TextStyle,

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 36,
  } as ViewStyle,
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#888',
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 18,
  } as TextStyle,
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,
});
