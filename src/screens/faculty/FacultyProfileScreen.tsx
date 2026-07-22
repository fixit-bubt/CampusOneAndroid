// Faculty profile — photo, badges, research interest pills, qualifications,
// contact (Email / Call / WhatsApp), academic profiles (only links that
// exist), and the official bubt.edu.bd profile link.
import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { openUrl, waHref } from '../../utils/link';
import { useAuth } from '../../store/authStore';
import { FACULTY_ACCENT, BRANCH_ICON, shortDept, PersonBadges, type FacultyMember } from './facultyShared';

// No LinkedIn on these profiles.
const LINK_META: { key: string; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'scholar_url',      label: 'Google Scholar', icon: 'book' },
  { key: 'researchgate_url', label: 'ResearchGate',   icon: 'book-open' },
  { key: 'orcid_url',        label: 'ORCID',          icon: 'user-check' },
  { key: 'website_url',      label: 'Website',        icon: 'globe' },
];

interface FacultyFull extends FacultyMember {
  phone: string | null;
  qualifications: string[] | null;
  scholar_url: string | null;
  researchgate_url: string | null;
  orcid_url: string | null;
  website_url: string | null;
  profile_url: string | null;
  departments: { id: string; name: string; branch: string } | null;
}

export function FacultyProfileScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const facultyId: string = route.params?.facultyId ?? route.params?.id;
  const [member, setMember] = useState<FacultyFull | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!facultyId) { setFailed(true); return; }
    const [memberRes, saveRes] = await Promise.all([
      supabase.from('faculty').select('*, departments(id, name, branch)').eq('id', facultyId).maybeSingle(),
      supabase.from('faculty_bookmarks').select('faculty_id').eq('faculty_id', facultyId).eq('user_id', user?.id ?? '').maybeSingle(),
    ]);
    if (memberRes.error || !memberRes.data) { setFailed(true); return; }
    setMember(memberRes.data as FacultyFull);
    setSaved(!!saveRes.data);
  }, [facultyId, user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleSave() {
    if (!user || !member) return;
    const next = !saved;
    setSaved(next); // optimistic
    const { error } = next
      ? await supabase.from('faculty_bookmarks').insert({ faculty_id: facultyId, user_id: user.id })
      : await supabase.from('faculty_bookmarks').delete().eq('faculty_id', facultyId).eq('user_id', user.id);
    if (error && error.code !== '23505') {
      setSaved(!next); // rollback
      toast({ type: 'error', title: t.common.error });
    }
  }

  const openLink = (url: string) => {
    openUrl(url).then(ok => { if (!ok) toast({ type: 'error', title: t.common.error }); });
  };

  if (!member) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.sectors.faculty} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {failed
            ? <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>{t.common.notFound}</Text>
            : <ActivityIndicator color={C.brand} />}
        </View>
      </SafeAreaView>
    );
  }

  const interests = Array.isArray(member.research_interests) ? member.research_interests.filter(Boolean) : [];
  const quals = Array.isArray(member.qualifications) ? member.qualifications.filter(Boolean) : [];
  const links = LINK_META.filter(l => (member as Record<string, any>)[l.key]);
  const phoneDigits = (member.phone ?? '').replace(/[^0-9]/g, '');
  const waLink = waHref(member.phone);
  const dept = member.departments;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={member.name}
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity style={styles.iconBtn} onPress={toggleSave} activeOpacity={0.75}>
            <Feather name="star" size={21} color={saved ? Accent.gold : C.text2} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.headRow}>
            <Avatar uri={member.photo_url} name={member.name} size="xl" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{member.name}</Text>
              <Text style={[styles.designation, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{member.designation}</Text>
              {dept && (
                <TouchableOpacity
                  style={styles.deptLink}
                  onPress={() => navigation.navigate('FacultyDept', { deptId: dept.id })}
                  activeOpacity={0.7}
                >
                  <Feather name={BRANCH_ICON[dept.branch] ?? 'book-open'} size={13} color={FACULTY_ACCENT} />
                  <Text style={[styles.deptLinkTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>
                    {shortDept(dept.name)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <PersonBadges f={member} C={C} />
        </View>

        {/* Research interests */}
        {interests.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.researchInterests}</Text>
            <View style={styles.pills}>
              {interests.map((i, idx) => (
                <View key={`${i}-${idx}`} style={[styles.pill, { backgroundColor: `${FACULTY_ACCENT}1a` }]}>
                  <Text style={[styles.pillTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>{i}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Qualifications */}
        {quals.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.qualifications}</Text>
            <View style={{ gap: 10, marginTop: 11 }}>
              {quals.map((qual, i) => (
                <View key={i} style={styles.qualRow}>
                  <Feather name="award" size={15} color={C.textMuted} style={{ marginTop: 1.5 }} />
                  <Text style={[styles.qualTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{qual}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {interests.length === 0 && quals.length === 0 && (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              No research interests or qualifications are listed for this teacher on BUBT's site yet.
              Use the contact details to reach out directly.
            </Text>
          </View>
        )}

        {/* Contact */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.contact}</Text>
          {member.email ? (
            <>
              <TouchableOpacity
                style={[styles.emailBtn, { backgroundColor: Accent.blue }]}
                onPress={() => openLink(`mailto:${member.email}`)}
                activeOpacity={0.8}
              >
                <Feather name="mail" size={15} color={C.white} />
                <Text style={[styles.emailBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.email}</Text>
              </TouchableOpacity>
              <Text style={[styles.emailAddr, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{member.email}</Text>
            </>
          ) : (
            <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}>
              No email listed.
            </Text>
          )}
          {phoneDigits.length > 0 && (
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={[styles.phoneBtn, { backgroundColor: C.bg, borderColor: C.border, borderWidth: 1 }]}
                onPress={() => openLink(`tel:${member.phone}`)}
                activeOpacity={0.75}
              >
                <Feather name="phone" size={14} color={C.text} />
                <Text style={[styles.phoneBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.call}</Text>
              </TouchableOpacity>
              {waLink && (
                <TouchableOpacity
                  style={[styles.phoneBtn, { backgroundColor: C.success }]}
                  onPress={() => openLink(waLink)}
                  activeOpacity={0.8}
                >
                  <Feather name="message-circle" size={14} color={C.white} />
                  <Text style={[styles.phoneBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.whatsapp}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Academic profiles — only the links that exist */}
        {links.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.academicProfiles}</Text>
            <View style={{ gap: 8, marginTop: 11 }}>
              {links.map(l => (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.linkRow, { backgroundColor: C.bg, borderColor: C.border }]}
                  onPress={() => openLink((member as Record<string, any>)[l.key])}
                  activeOpacity={0.75}
                >
                  <Feather name={l.icon} size={16} color={C.textMuted} />
                  <Text style={[styles.linkTxt, { color: C.text, fontFamily: FontFamily.jakartaBold, flex: 1 }]}>{l.label}</Text>
                  <Feather name="external-link" size={14} color={C.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Official profile */}
        {member.profile_url && (
          <TouchableOpacity
            style={[styles.officialLink, { borderColor: C.border, backgroundColor: C.surface2 }]}
            onPress={() => openLink(member.profile_url!)}
            activeOpacity={0.75}
          >
            <Feather name="external-link" size={13} color={C.textMuted} />
            <Text style={[styles.officialTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              View official profile on bubt.edu.bd
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,
  iconBtn: { padding: 8 } as ViewStyle,

  card: { borderRadius: 16, borderWidth: 1, padding: 15 } as ViewStyle,
  cardTitle: { fontSize: 14 } as TextStyle,

  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 } as ViewStyle,
  name: { fontSize: 18, letterSpacing: -0.01 } as TextStyle,
  designation: { fontSize: 13, marginTop: 2 } as TextStyle,
  deptLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 } as ViewStyle,
  deptLinkTxt: { fontSize: 12.5 } as TextStyle,

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 } as ViewStyle,
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 } as ViewStyle,
  pillTxt: { fontSize: 12 } as TextStyle,

  qualRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 } as ViewStyle,
  qualTxt: { flex: 1, fontSize: 13, lineHeight: 19 } as TextStyle,

  emptyTxt: { fontSize: 12.5, lineHeight: 18 } as TextStyle,

  emailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, borderRadius: 12, marginTop: 11 } as ViewStyle,
  emailBtnTxt: { fontSize: 13.5 } as TextStyle,
  emailAddr: { fontSize: 11.5, textAlign: 'center', marginTop: 7 } as TextStyle,
  phoneRow: { flexDirection: 'row', gap: 8, marginTop: 9 } as ViewStyle,
  phoneBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 11 } as ViewStyle,
  phoneBtnTxt: { fontSize: 12.5 } as TextStyle,

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  linkTxt: { fontSize: 13 } as TextStyle,

  officialLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 11, marginTop: 12,
  } as ViewStyle,
  officialTxt: { fontSize: 12 } as TextStyle,
});
