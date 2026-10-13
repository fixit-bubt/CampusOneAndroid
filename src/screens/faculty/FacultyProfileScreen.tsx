// Faculty profile - high-density institutional dossier: photo, routine code,
// badges, office room location, real-time counseling hours tracker,
// academic & publication links (Scholar, ResearchGate, Scopus), qualifications,
// research paper collaboration email drafter, and ContactSheet integration.
import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { FontFamily, Layout, Accent, Radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { openUrl } from '../../utils/link';
import { useAuth } from '../../store/authStore';
import {
  FACULTY_ACCENT, BRANCH_ICON, shortDept, PersonBadges,
  getCounselingStatus, type FacultyMember,
} from './facultyShared';

const LINK_META: { key: string; label: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { key: 'scholar_url',      label: 'Google Scholar', icon: 'book',       color: '#4285F4' },
  { key: 'researchgate_url', label: 'ResearchGate',   icon: 'book-open',  color: '#00CCBB' },
  { key: 'scopus_url',        label: 'Scopus Profile', icon: 'award',      color: '#FF6F00' },
  { key: 'linkedin_url',     label: 'LinkedIn',       icon: 'linkedin',   color: '#0A66C2' },
  { key: 'orcid_url',        label: 'ORCID',          icon: 'user-check', color: '#A6CE39' },
  { key: 'website_url',      label: 'Website',        icon: 'globe',      color: '#6366F1' },
];

interface FacultyFull extends FacultyMember {
  departments: { id: string; name: string; branch: string; dept_number: string } | null;
}

function resolveFacultyProfileUrl(member: FacultyFull | null): string | null {
  if (!member) return null;
  const shortCode = member.short_code?.trim().toUpperCase();
  const deptName = member.departments?.name?.toLowerCase() || '';

  let deptSlug = 'department-of-computer-science-engineering';
  if (deptName.includes('electrical')) deptSlug = 'department-of-electrical-electronic-engineering';
  else if (deptName.includes('civil')) deptSlug = 'department-of-civil-engineering';
  else if (deptName.includes('textile')) deptSlug = 'department-of-textile-engineering';
  else if (deptName.includes('data science')) deptSlug = 'department-of-data-science-engineering';
  else if (deptName.includes('management')) deptSlug = 'department-of-management';
  else if (deptName.includes('accounting')) deptSlug = 'department-of-accounting';
  else if (deptName.includes('marketing')) deptSlug = 'department-of-marketing';
  else if (deptName.includes('finance')) deptSlug = 'department-of-finance';
  else if (deptName.includes('mathematics') || deptName.includes('statistics')) deptSlug = 'department-of-mathematics-statistics';
  else if (deptName.includes('law')) deptSlug = 'department-of-law-justice';
  else if (deptName.includes('english')) deptSlug = 'department-of-english';
  else if (deptName.includes('economics')) deptSlug = 'department-of-economics';

  if (shortCode) {
    return `https://www.bubt.edu.bd/department/${deptSlug}/faculty/profile/${shortCode}`;
  }

  if (member.profile_url) {
    if (member.profile_url.includes('cse.bubt.edu.bd')) {
      return null;
    }
    return member.profile_url;
  }

  return null;
}

export function FacultyProfileScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user, profile } = useAuth();
  const facultyId: string = route.params?.facultyId ?? route.params?.id;

  const [member, setMember] = useState<FacultyFull | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);

  // Proposal drafter form
  const [proposalTopic, setProposalTopic] = useState('');
  const [proposalBrief, setProposalBrief] = useState('');

  const load = useCallback(async () => {
    if (!facultyId) { setFailed(true); return; }
    const [memberRes, saveRes] = await Promise.all([
      supabase.from('faculty').select('*, departments(id, name, branch, dept_number)').eq('id', facultyId).maybeSingle(),
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
    setSaved(next);
    const { error } = next
      ? await supabase.from('faculty_bookmarks').insert({ faculty_id: facultyId, user_id: user.id })
      : await supabase.from('faculty_bookmarks').delete().eq('faculty_id', facultyId).eq('user_id', user.id);
    if (error && error.code !== '23505') {
      setSaved(!next);
      toast({ type: 'error', title: t.common.error });
    }
  }

  const openLink = (url: string) => {
    let target = url;
    if (target.includes('cse.bubt.edu.bd') || target.includes('/faculty/profile/')) {
      const resolved = resolveFacultyProfileUrl(member);
      if (resolved) target = resolved;
    }
    openUrl(target).then(ok => { if (!ok) toast({ type: 'error', title: t.common.error }); });
  };

  async function copyLocation(text: string) {
    await Clipboard.setStringAsync(text);
    toast({ type: 'success', title: t.faculty2.copied });
  }

  function handleSendProposal() {
    if (!member?.email) {
      toast({ type: 'error', title: 'No email found for this teacher' });
      return;
    }
    const studentName = profile?.full_name || 'Student';
    const studentId = profile?.student_id || '';
    const intake = profile?.intake || '';
    const section = profile?.section || '';
    const topic = proposalTopic.trim() || 'Research Manuscript Guidance';

    const subject = encodeURIComponent(
      `[BUBT Research Collaboration] ${topic} - ${studentName}${studentId ? ` (${studentId})` : ''}`
    );
    const body = encodeURIComponent(
      `Dear ${member.name},\n\n` +
      `I hope this email finds you well. I am a student in the ${member.departments?.name || 'Department'}` +
      `${intake ? ` (Intake ${intake}${section ? `, Section ${section}` : ''})` : ''}.\n\n` +
      `Our team is preparing a research manuscript focused on "${topic}". Having reviewed your published research and specialization, we would be honored to receive your guidance and explore potential paper co-authorship for submission to an indexed conference/journal.\n\n` +
      (proposalBrief.trim() ? `Research Brief:\n${proposalBrief.trim()}\n\n` : '') +
      `Could we meet during your scheduled counseling hours to briefly discuss our methodology?\n\n` +
      `Respectfully,\n` +
      `${studentName}\n` +
      (studentId ? `Student ID: ${studentId}\n` : '') +
      `BUBT`
    );

    setShowProposalModal(false);
    openUrl(`mailto:${member.email}?subject=${subject}&body=${body}`);
  }

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
  const dept = member.departments;
  const status = getCounselingStatus(member.counseling_hours, member.on_leave);

  const locationString = [
    member.building,
    member.room_number ? `Room ${member.room_number}` : null,
    member.floor ? member.floor : null,
  ].filter(Boolean).join(' · ');

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
        {/* Hero Card */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.headRow}>
            <View style={styles.avatarWrap}>
              <Avatar uri={member.photo_url} name={member.name} size="xl" />
              {status?.active && (
                <View style={[styles.activeDot, { backgroundColor: C.success, borderColor: C.surface }]} />
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {member.name}
                </Text>
              </View>

              <Text style={[styles.designation, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {member.designation}
              </Text>

              <View style={styles.metaBadgeRow}>
                {dept ? (
                  <TouchableOpacity
                    style={[styles.deptLink, { backgroundColor: `${FACULTY_ACCENT}14` }]}
                    onPress={() => navigation.navigate('FacultyDept', { deptId: dept.id })}
                    activeOpacity={0.7}
                  >
                    <Feather name={BRANCH_ICON[dept.branch] ?? 'book-open'} size={12} color={FACULTY_ACCENT} />
                    <Text style={[styles.deptLinkTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {shortDept(dept.name)}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {member.short_code ? (
                  <View style={[styles.codeBadge, { backgroundColor: C.surface2 }]}>
                    <Text style={[styles.codeBadgeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
                      Code: {member.short_code}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <PersonBadges f={member} C={C} />
        </View>

        {/* Office Location Card */}
        {locationString.length > 0 ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Feather name="map-pin" size={16} color={FACULTY_ACCENT} />
                <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.faculty2.campusOfficeLocation}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: C.surface2 }]}
                onPress={() => copyLocation(locationString)}
                activeOpacity={0.7}
              >
                <Feather name="copy" size={12} color={C.text2} />
                <Text style={[styles.copyBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.copy}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.locBox, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.locMainTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {member.building ? member.building : 'Main Campus'}
                {member.room_number ? ` · Room ${member.room_number}` : ''}
              </Text>
              {member.floor ? (
                <Text style={[styles.locSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {member.floor}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Counseling & Tutoring Hours (CH/TuH) */}
        {member.counseling_hours ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Feather name="clock" size={16} color={C.brand} />
                <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.faculty2.counselingHoursTitle}
                </Text>
              </View>

              {status ? (
                <View
                  style={[
                    styles.statusPill,
                    status.tone === 'success' && { backgroundColor: C.successBg },
                    status.tone === 'warn' && { backgroundColor: C.warnBg },
                    status.tone === 'info' && { backgroundColor: C.infoBg },
                    status.tone === 'muted' && { backgroundColor: C.surface2 },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      status.tone === 'success' && { backgroundColor: C.success },
                      status.tone === 'warn' && { backgroundColor: C.warn },
                      status.tone === 'info' && { backgroundColor: C.info },
                      status.tone === 'muted' && { backgroundColor: C.textMuted },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusTxt,
                      status.tone === 'success' && { color: C.success },
                      status.tone === 'warn' && { color: C.warn },
                      status.tone === 'info' && { color: C.info },
                      status.tone === 'muted' && { color: C.textMuted },
                      { fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.counselingBox, { backgroundColor: C.surface2 }]}>
              {member.counseling_hours.split('|').map((slot, i) => (
                <View key={i} style={styles.counselingSlotRow}>
                  <Feather name="calendar" size={13} color={C.textMuted} style={{ marginTop: 2 }} />
                  <Text style={[styles.counselingSlotTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                    {slot.trim()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Research & Publications */}
        {interests.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="book" size={16} color={FACULTY_ACCENT} />
              <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.faculty2.researchAreasTitle}
              </Text>
            </View>
            <View style={styles.pills}>
              {interests.map((i, idx) => (
                <View key={`${i}-${idx}`} style={[styles.pill, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
                  <Text style={[styles.pillTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
                    {i}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Qualifications */}
        {quals.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="award" size={16} color={C.brand} />
              <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.faculty2.qualifications}
              </Text>
            </View>
            <View style={{ gap: 10, marginTop: 11 }}>
              {quals.map((qual, i) => (
                <View key={i} style={styles.qualRow}>
                  <Feather name="check-circle" size={14} color={C.brand} style={{ marginTop: 2.5 }} />
                  <Text style={[styles.qualTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                    {qual}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Academic & Publication Links */}
        {links.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.faculty2.academicProfilesTitle}
            </Text>
            <View style={styles.linkGrid}>
              {links.map(l => (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.linkGridItem, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => openLink((member as Record<string, any>)[l.key])}
                  activeOpacity={0.75}
                >
                  <Feather name={l.icon} size={15} color={l.color || C.textMuted} />
                  <Text style={[styles.linkGridTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {l.label}
                  </Text>
                  <Feather name="external-link" size={12} color={C.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Official bubt.edu.bd profile */}
        {(() => {
          const effectiveProfileUrl = resolveFacultyProfileUrl(member) || member.profile_url;
          if (!effectiveProfileUrl) return null;
          return (
            <TouchableOpacity
              style={[styles.officialLink, { borderColor: C.border, backgroundColor: C.surface2 }]}
              onPress={() => openLink(effectiveProfileUrl)}
              activeOpacity={0.75}
            >
              <Feather name="external-link" size={13} color={C.textMuted} />
              <Text style={[styles.officialTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                View official profile on bubt.edu.bd
              </Text>
            </TouchableOpacity>
          );
        })()}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Action Dock */}
      <View style={[styles.bottomDock, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[styles.proposalBtn, { backgroundColor: `${FACULTY_ACCENT}15`, borderColor: `${FACULTY_ACCENT}40` }]}
          onPress={() => setShowProposalModal(true)}
          activeOpacity={0.8}
        >
          <Feather name="edit-3" size={16} color={FACULTY_ACCENT} />
          <Text style={[styles.proposalBtnTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]}>
            {t.faculty2.draftPaperProposal}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.contactBtn, { backgroundColor: FACULTY_ACCENT }]}
          onPress={() => setShowContact(true)}
          activeOpacity={0.85}
        >
          <Feather name="phone-call" size={16} color="#fff" />
          <Text style={[styles.contactBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
            {t.faculty2.contact}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Institutional Contact Sheet */}
      <ContactSheet
        visible={showContact}
        name={member.name}
        title={member.designation}
        roleSubtitle={dept?.name}
        avatarUri={member.photo_url}
        phone={member.phone}
        email={member.email}
        whatsAppMessage={`Hello ${member.name}, I am a student of BUBT contacting you regarding academic consultation.`}
        onClose={() => setShowContact(false)}
      />

      {/* Draft Research Proposal Modal */}
      <Modal visible={showProposalModal} transparent animationType="slide" onRequestClose={() => setShowProposalModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          behavior="padding"
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowProposalModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.faculty2.proposalModalTitle}
                </Text>
                <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  To: {member.name} ({member.email || 'No email'})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowProposalModal(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.faculty2.proposedTopic}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.faculty2.proposedTopicPlaceholder}
                placeholderTextColor={C.textMuted}
                value={proposalTopic}
                onChangeText={setProposalTopic}
              />

              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 12 }]}>
                {t.faculty2.methodologySummary}
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.faculty2.methodologyPlaceholder}
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={4}
                value={proposalBrief}
                onChangeText={setProposalBrief}
              />

              <View style={[styles.noticeBox, { backgroundColor: C.surface2 }]}>
                <Feather name="info" size={14} color={FACULTY_ACCENT} style={{ marginTop: 2 }} />
                <Text style={[styles.noticeTxt, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
                  {t.faculty2.proposalNotice}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.sendProposalBtn, { backgroundColor: FACULTY_ACCENT }]}
                onPress={handleSendProposal}
                activeOpacity={0.85}
              >
                <Feather name="mail" size={17} color="#fff" />
                <Text style={[styles.sendProposalTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.faculty2.openInEmailApp}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 30 } as ViewStyle,
  iconBtn: { padding: 8 } as ViewStyle,

  card: { borderRadius: 16, borderWidth: 1, padding: 15 } as ViewStyle,
  cardTitle: { fontSize: 14 } as TextStyle,
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as ViewStyle,
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 } as ViewStyle,
  avatarWrap: { position: 'relative' } as ViewStyle,
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  } as ViewStyle,
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  name: { fontSize: 18.5, letterSpacing: -0.01, flexShrink: 1 } as TextStyle,
  designation: { fontSize: 13, marginTop: 2 } as TextStyle,
  metaBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 } as ViewStyle,
  deptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  } as ViewStyle,
  deptLinkTxt: { fontSize: 11.5 } as TextStyle,
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  } as ViewStyle,
  codeBadgeTxt: { fontSize: 11 } as TextStyle,

  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  } as ViewStyle,
  copyBtnTxt: { fontSize: 11.5 } as TextStyle,

  locBox: {
    padding: 12,
    borderRadius: 12,
  } as ViewStyle,
  locMainTxt: { fontSize: 14 } as TextStyle,
  locSubTxt: { fontSize: 12, marginTop: 3 } as TextStyle,

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusTxt: { fontSize: 11 } as TextStyle,

  counselingBox: {
    padding: 12,
    borderRadius: 12,
    gap: 6,
  } as ViewStyle,
  counselingSlotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  } as ViewStyle,
  counselingSlotTxt: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  } as TextStyle,

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 } as ViewStyle,
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 } as ViewStyle,
  pillTxt: { fontSize: 12 } as TextStyle,

  qualRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 } as ViewStyle,
  qualTxt: { flex: 1, fontSize: 13, lineHeight: 19 } as TextStyle,

  linkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 11,
  } as ViewStyle,
  linkGridItem: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
  } as ViewStyle,
  linkGridTxt: { fontSize: 12.5, flex: 1 } as TextStyle,

  officialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 12,
  } as ViewStyle,
  officialTxt: { fontSize: 12 } as TextStyle,

  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: 1,
  } as ViewStyle,
  proposalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  proposalBtnTxt: { fontSize: 13.5 } as TextStyle,
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 48,
    borderRadius: 14,
  } as ViewStyle,
  contactBtnTxt: { fontSize: 14 } as TextStyle,

  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '85%',
  } as ViewStyle,
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  } as ViewStyle,
  modalTitle: { fontSize: 17 } as TextStyle,
  modalSub: { fontSize: 12.5, marginTop: 2 } as TextStyle,
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, marginBottom: 6 } as TextStyle,
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  } as TextStyle,
  textArea: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  } as TextStyle,
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 16,
  } as ViewStyle,
  noticeTxt: { fontSize: 12, lineHeight: 17, flex: 1 } as TextStyle,
  sendProposalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
  } as ViewStyle,
  sendProposalTxt: { fontSize: 14.5 } as TextStyle,
});
