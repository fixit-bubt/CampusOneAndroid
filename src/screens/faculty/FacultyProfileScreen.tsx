// Matches design screens-d.jsx — FacultyProfile (centered avatar + academic links)
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Linking, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

const ACADEMIC_LINKS = ['Google Scholar', 'ResearchGate', 'LinkedIn', 'ORCID'];
const ACADEMIC_LINK_KEYS: Record<string, string> = {
  'Google Scholar': 'scholar_url',
  'ResearchGate':   'researchgate_url',
  'LinkedIn':       'linkedin_url',
  'ORCID':          'orcid_url',
};

interface Faculty {
  id: string;
  name: string;
  designation: string;
  email: string | null;
  phone: string | null;
  room_no: string | null;
  office_hours: string | null;
  research_interests: string[] | string | null;
  on_leave: boolean;
  photo_url: string | null;
  scholar_url: string | null;
  researchgate_url: string | null;
  linkedin_url: string | null;
  orcid_url: string | null;
  departments: { name: string; branch?: string } | null;
}

export function FacultyProfileScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const facultyId: string = route.params?.facultyId ?? route.params?.id;
  const [member, setMember] = useState<Faculty | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!facultyId) return;
    (async () => {
      const [memberRes, saveRes] = await Promise.all([
        supabase.from('faculty').select('*, departments(name, branch)').eq('id', facultyId).single(),
        supabase.from('faculty_bookmarks').select('faculty_id').eq('faculty_id', facultyId).eq('user_id', user?.id ?? '').maybeSingle(),
      ]);
      if (memberRes.data) setMember(memberRes.data as Faculty);
      setSaved(!!saveRes.data);
    })();
  }, [facultyId, user?.id]);

  async function toggleSave() {
    if (!user || !member) return;
    if (saved) {
      await supabase.from('faculty_bookmarks').delete().eq('faculty_id', facultyId).eq('user_id', user.id);
    } else {
      await supabase.from('faculty_bookmarks').insert({ faculty_id: facultyId, user_id: user.id });
    }
    setSaved(!saved);
  }

  if (!member) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Faculty" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

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
        {/* Centered hero */}
        <View style={styles.hero}>
          <Avatar name={member.name} size="xl" />
          <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{member.name}</Text>
          <Text style={[styles.designation, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]}>{member.designation}</Text>
          <Text style={[styles.department, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{member.departments?.name ?? ''}</Text>
        </View>

        {/* Contact Info */}
        {(member.email || member.phone || member.room_no || member.office_hours) && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>CONTACT</Text>
            <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
              {member.email ? (
                <View style={[styles.infoCell, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}>
                  <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Email</Text>
                  <Text style={[styles.infoCellVal, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{member.email}</Text>
                </View>
              ) : null}
              {member.phone ? (
                <View style={[styles.infoCell, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}>
                  <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Phone</Text>
                  <Text style={[styles.infoCellVal, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{member.phone}</Text>
                </View>
              ) : null}
              {member.room_no ? (
                <View style={[styles.infoCell, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}>
                  <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Room</Text>
                  <Text style={[styles.infoCellVal, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{member.room_no}</Text>
                </View>
              ) : null}
              {member.office_hours ? (
                <View style={styles.infoCell}>
                  <Text style={[styles.infoCellLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Office Hours</Text>
                  <Text style={[styles.infoCellVal, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{member.office_hours}</Text>
                </View>
              ) : null}
            </View>
          </>
        )}

        {/* Specialization */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>SPECIALIZATION</Text>
        <View style={[styles.specCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.specText, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
            {Array.isArray(member.research_interests) ? member.research_interests.join(', ') : (member.research_interests ?? '')}
          </Text>
        </View>

        {/* Academic links */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>ACADEMIC LINKS</Text>
        <View style={styles.linksList}>
          {ACADEMIC_LINKS.map(link => {
            const url = (member as Record<string, any>)[ACADEMIC_LINK_KEYS[link]] ?? null;
            return (
              <TouchableOpacity
                key={link}
                style={[styles.linkCard, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => url ? Linking.openURL(url) : null}
                activeOpacity={url ? 0.75 : 1}
              >
                <Feather name="globe" size={18} color={C.brand} />
                <Text style={[styles.linkName, { color: C.text, fontFamily: FontFamily.jakartaBold, flex: 1 }]}>{link}</Text>
                <Icon name="chevR" size={17} color={C.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>

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

  hero: { alignItems: 'center', paddingTop: 6 } as ViewStyle,
  name: { fontSize: 19, marginTop: 12, letterSpacing: -0.01 } as any,
  designation: { fontSize: 13.5, marginTop: 2 } as any,
  department: { fontSize: 12.5, marginTop: 2 } as any,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 18, marginBottom: 9 } as any,
  specCard: { padding: 14, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  specText: { fontSize: 14 } as any,

  infoGrid: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginTop: 12 } as ViewStyle,
  infoCell: { padding: 12 } as ViewStyle,
  infoCellLabel: { fontSize: 11, marginBottom: 4 } as any,
  infoCellVal: { fontSize: 12.5 } as any,

  linksList: { gap: 8 } as ViewStyle,
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  linkName: { fontSize: 14 } as any,
});
