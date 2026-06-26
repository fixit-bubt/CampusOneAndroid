import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Modal,
  StyleSheet, Switch, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { FontFamily, Layout, Accent } from '../../theme';
import type { SectorKey } from '../../theme';
import { supabase } from '../../lib/supabase';
import { uploadPhoto } from '../../utils/storage';
import { useToast } from '../../components/ui/Toast';

const ROLE_TOKEN = { student: 'roleStudent', staff: 'roleStaff', admin: 'roleAdmin' } as const;

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const CATS: { id: string; label: string; icon: string; fg: string }[] = [
  { id: 'award',      label: '',      icon: 'award',    fg: Accent.amber },
  { id: 'cert',       label: '', icon: 'layers',  fg: Accent.blue },
  { id: 'project',    label: '',    icon: 'study',    fg: Accent.purple },
  { id: 'volunteer',  label: '',  icon: 'clubs',    fg: Accent.green },
  { id: 'leadership', label: '', icon: 'directory',fg: Accent.teal },
  { id: 'research',   label: '',   icon: 'study',    fg: Accent.pink },
];

const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

const CAT_LABELS = (t: any): Record<string, string> => ({
  award: t.mainx.catAward, cert: t.mainx.catCertificate, project: t.mainx.catProject,
  volunteer: t.mainx.catVolunteer, leadership: t.mainx.catLeadership, research: t.mainx.catResearch,
});

const BADGE_LABELS = (t: any): Record<string, string> => ({
  reporter: t.mainx.badgeReporter, helper: t.mainx.badgeHelper,
  active: t.mainx.badgeActive, studious: t.mainx.badgeStudious,
});

const CONTRIB_LABELS = (t: any): Record<string, string> => ({
  reports: t.mainx.contribReports, clubs: t.mainx.contribClubs,
  events: t.mainx.contribEvents, lostfound: t.mainx.contribLostfound,
});

const BADGES = [
  { id: 'reporter',  icon: 'layers',   fg: Accent.blue, en: '', earned: false, progress: { cur: 1, total: 5 } },
  { id: 'helper',    icon: 'clubs',    fg: Accent.green, en: '', earned: true,  progress: null },
  { id: 'active',    icon: 'bell',     fg: Accent.amber, en: '', earned: true,  progress: null },
  { id: 'studious',  icon: 'study',    fg: Accent.purple, en: '', earned: false, progress: { cur: 3, total: 10 } },
];

const CONTRIB_CONFIG: { sector: SectorKey; en: string; table: string; field: string }[] = [
  { sector: 'reports',   en: '', table: 'reports',         field: 'reporter_id' },
  { sector: 'clubs',     en: '', table: 'club_members',    field: 'user_id' },
  { sector: 'events',    en: '', table: 'event_rsvps',     field: 'user_id' },
  { sector: 'lostfound', en: '', table: 'lost_found_items',field: 'poster_id' },
];

function BadgesRow({ badges, onPick, C, t }: { badges: typeof BADGES; onPick: (b: typeof BADGES[0]) => void; C: any; t: any }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 4, paddingVertical: 4 }}>
      {badges.map(b => (
        <TouchableOpacity
          key={b.id}
          style={[badgeStyles.wrap, !b.earned && { opacity: 0.6 }]}
          onPress={() => onPick(b)}
          activeOpacity={0.75}
        >
          <View style={[badgeStyles.medal, b.earned && { backgroundColor: b.fg + '22', borderColor: b.fg + '55', borderWidth: 2 }]}>
            <Icon name={b.icon as any} size={24} color={b.earned ? b.fg : C.textMuted} />
            {!b.earned && b.progress && (
              <View style={[badgeStyles.prog, { backgroundColor: C.surface }]}>
                <Text style={[badgeStyles.progTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {b.progress.cur}/{b.progress.total}
                </Text>
              </View>
            )}
          </View>
          <Text style={[badgeStyles.name, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{BADGE_LABELS(t)[b.id]}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const badgeStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, width: 68 } as ViewStyle,
  medal: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Accent.grayBg,
    position: 'relative',
  } as ViewStyle,
  prog: {
    position: 'absolute', bottom: -6, paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 20,
  } as ViewStyle,
  progTxt: { fontSize: 9 } as any,
  name: { fontSize: 10.5, textAlign: 'center', lineHeight: 14 } as any,
});

function BadgeSheet({ badge, C, onClose, t }: { badge: typeof BADGES[0] | null; C: any; onClose: () => void; t: any }) {
  if (!badge) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.mainx.badge}</Text>
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <View style={[sheetStyles.bigMedal, badge.earned && { backgroundColor: badge.fg + '22', borderColor: badge.fg + '55', borderWidth: 2 }]}>
              <Icon name={badge.icon as any} size={38} color={badge.earned ? badge.fg : C.textMuted} />
            </View>
            <Text style={[sheetStyles.badgeName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{BADGE_LABELS(t)[badge.id]}</Text>
            <View style={{ marginTop: 10 }}>
              {badge.earned ? (
                <View style={[sheetStyles.earnedPill, { backgroundColor: Accent.greenBg }]}>
                  <View style={[sheetStyles.earnedDot, { backgroundColor: Accent.green }]} />
                  <Text style={[sheetStyles.earnedTxt, { color: Accent.green, fontFamily: FontFamily.jakartaBold }]}>{t.mainx.earned}</Text>
                </View>
              ) : (
                badge.progress && (
                  <>
                    <View style={[sheetStyles.earnedPill, { backgroundColor: C.surface2 }]}>
                      <Text style={[sheetStyles.earnedTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {t.mainx.inProgressLine(badge.progress.cur, badge.progress.total)}
                      </Text>
                    </View>
                    <View style={[sheetStyles.progBar, { backgroundColor: C.surface2 }]}>
                      <View style={[sheetStyles.progFill, { backgroundColor: badge.fg, width: `${badge.progress.cur / badge.progress.total * 100}%` as any }]} />
                    </View>
                  </>
                )
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AddSheet({ C, onClose, onAdd, t }: { C: any; onClose: () => void; onAdd: (item: AccomplishmentItem) => void; t: any }) {
  const [cat, setCat] = useState('award');
  const [title, setTitle] = useState('');
  const [org, setOrg] = useState('');
  const [year, setYear] = useState('');
  const ok = title.trim().length > 0;

  function submit() {
    if (!ok) return;
    onAdd({ id: `tmp-${Date.now()}`, cat, title: title.trim(), org: org.trim(), year: year.trim() || '—' });
    setTitle(''); setOrg(''); setYear(''); setCat('award');
    onClose();
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.mainx.addAccomplishment}</Text>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.mainx.fieldType}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
            {CATS.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[sheetStyles.typeChip, { borderColor: C.border }, cat === c.id && { backgroundColor: c.fg, borderColor: c.fg }]}
                onPress={() => setCat(c.id)}
                activeOpacity={0.75}
              >
                <Icon name={c.icon as any} size={14} color={cat === c.id ? '#fff' : C.text2} />
                <Text style={[sheetStyles.typeChipTxt, { color: cat === c.id ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>{CAT_LABELS(t)[c.id]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.mainx.fieldTitle}</Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={title} onChangeText={setTitle}
            placeholder="e.g. Dean's List — Spring 2026" placeholderTextColor={C.textMuted}
          />

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.mainx.fieldOrgDetail}</Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={org} onChangeText={setOrg}
            placeholder="e.g. Coursera · Certificate" placeholderTextColor={C.textMuted}
          />

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.mainx.fieldYear}</Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={year} onChangeText={setYear} keyboardType="numeric" placeholder={t.mainx.yearPlaceholder} placeholderTextColor={C.textMuted}
          />

          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: ok ? C.brand : C.surface2, opacity: ok ? 1 : 0.5 }]}
            disabled={!ok} onPress={submit} activeOpacity={0.8}
          >
            <Icon name="check" size={18} color={ok ? '#fff' : C.textMuted} />
            <Text style={[sheetStyles.submitTxt, { color: ok ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.mainx.addToProfile}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' } as ViewStyle,
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingTop: 10, paddingBottom: 36, maxHeight: '92%' } as ViewStyle,
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 } as ViewStyle,
  sheetTitle: { fontSize: 18, letterSpacing: -0.3, marginBottom: 14 } as any,
  flabel: { fontSize: 11, letterSpacing: 0.7, marginBottom: 7, marginTop: 14, marginLeft: 2 } as any,
  input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 } as any,
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginTop: 22 } as ViewStyle,
  submitTxt: { fontSize: 15 } as any,
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,
  typeChipTxt: { fontSize: 12.5 } as any,
  bigMedal: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Accent.grayBg } as ViewStyle,
  badgeName: { fontSize: 20, letterSpacing: -0.4, marginTop: 14 } as any,
  earnedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  earnedDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  earnedTxt: { fontSize: 12.5 } as any,
  progBar: { height: 7, borderRadius: 4, marginTop: 14, overflow: 'hidden', width: 200 } as ViewStyle,
  progFill: { height: '100%', borderRadius: 4 } as ViewStyle,
});

interface AccomplishmentItem {
  id: string;
  cat: string;
  title: string;
  org: string;
  year: string;
}

function AccompCard({ a, editMode, onDelete, C, isDark }: { a: AccomplishmentItem; editMode: boolean; onDelete: (id: string) => void; C: any; isDark: boolean }) {
  const catInfo = CAT_MAP[a.cat] ?? CATS[0];
  const iconBg = hexAlpha(catInfo.fg, isDark ? 0.18 : 0.12);
  return (
    <View style={accompStyles.row}>
      <View style={[accompStyles.catIcon, { backgroundColor: iconBg }]}>
        <Icon name={catInfo.icon as any} size={18} color={catInfo.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[accompStyles.itemTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>{a.title}</Text>
        {a.org ? <Text style={[accompStyles.itemOrg, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>{a.org}</Text> : null}
      </View>
      {editMode ? (
        <TouchableOpacity style={accompStyles.delBtn} onPress={() => onDelete(a.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={16} color={C.text2} />
        </TouchableOpacity>
      ) : (
        <Text style={[accompStyles.yearTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{a.year}</Text>
      )}
    </View>
  );
}
const accompStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15 } as ViewStyle,
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  itemTitle: { fontSize: 13.5, lineHeight: 18 } as any,
  itemOrg: { fontSize: 12, marginTop: 2 } as any,
  yearTxt: { fontSize: 12.5, flexShrink: 0 } as any,
  delBtn: { padding: 4 } as ViewStyle,
});

export function ProfileScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { profile, user, refreshProfile } = useAuth();

  const [role, setRole] = useState<string>(profile?.role ?? 'student');
  useEffect(() => { if (profile?.role) setRole(profile.role as any); }, [profile?.role]);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editIntake, setEditIntake] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editProgram, setEditProgram] = useState('');
  const [editBlood, setEditBlood] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDirVisible, setEditDirVisible] = useState(true);
  const [editShowWa, setEditShowWa] = useState(false);
  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (editMode) {
      setEditName(profile?.full_name ?? '');
      setEditDept(profile?.department ?? '');
      setEditIntake(profile?.intake ?? '');
      setEditSection(profile?.section ?? '');
      setEditWhatsapp(profile?.whatsapp ?? '');
      setEditStudentId(profile?.student_id ?? '');
      setEditProgram(profile?.program ?? '');
      setEditBlood(profile?.blood_group ?? '');
      setEditPhone(profile?.phone ?? '');
      setEditAddress(profile?.address ?? '');
      setEditDirVisible(profile?.directory_visible ?? true);
      setEditShowWa(profile?.show_whatsapp ?? false);
      setPickedAvatar(null);
    }
  }, [editMode]);

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({ type: 'info', title: t.mainx.permissionRequired, message: t.mainx.mediaPermissionBody });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPickedAvatar(result.assets[0].uri);
  }

  const [focusBadge, setFocusBadge] = useState<typeof BADGES[0] | null>(null);
  const [contrib, setContrib] = useState<Record<string, number>>({});

  const isStudent = role === 'student';

  const loadContrib = useCallback(async () => {
    if (!user) return;
    const counts: Record<string, number> = {};
    for (const cfg of CONTRIB_CONFIG) {
      const { count } = await supabase
        .from(cfg.table)
        .select('*', { count: 'exact', head: true })
        .eq(cfg.field, user.id);
      counts[cfg.sector] = count ?? 0;
    }
    setContrib(counts);
  }, [user]);

  useEffect(() => { loadContrib(); }, [loadContrib]);

  async function handleSave() {
    if (!user || savingRef.current) return;
    if (!editName.trim()) { toast({ type: 'error', title: t.common.error, message: 'Full name is required' }); return; }
    savingRef.current = true;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        full_name: editName.trim(),
        department: editDept.trim(),
        whatsapp: editWhatsapp.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      };
      if (isStudent) {
        payload.intake = editIntake.trim();
        payload.section = editSection.trim();
        payload.student_id = editStudentId.trim();
        payload.program = editProgram.trim();
        payload.blood_group = editBlood;
        payload.directory_visible = editDirVisible;
        payload.show_whatsapp = editShowWa;
      }
      // Save profile fields first — the important data must persist even if the
      // (optional) avatar upload fails. Avatar upload is best-effort.
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) { toast({ type: 'error', title: 'Error', message: error.message }); return; }

      if (pickedAvatar) {
        const up = await uploadPhoto(pickedAvatar, 'avatars', user.id);
        if (up.success) {
          await supabase.from('profiles').update({ avatar_url: up.url }).eq('id', user.id);
        } else {
          toast({ type: 'info', title: 'Saved', message: 'Profile saved. Photo upload failed — please try the photo again later.' });
        }
      }
      await refreshProfile();
      setEditMode(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const roleHex = C[ROLE_TOKEN[role as keyof typeof ROLE_TOKEN] ?? 'roleStudent'];
  const roleBg  = hexAlpha(roleHex, isDark ? 0.2 : 0.12);
  const ROLE_LABEL: Record<string, string> = {
    student: t.mainx.roleStudent, staff: t.mainx.roleStaff, admin: t.mainx.roleAdmin,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Header with back + edit */}
      <View style={[styles.header, { paddingHorizontal: Layout.screenPadding }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.tabs.profile}
        </Text>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: editMode ? C.brand : C.surface, borderColor: editMode ? C.brand : C.border }]}
          onPress={editMode ? handleSave : () => setEditMode(true)}
          disabled={saving}
          activeOpacity={0.75}
        >
          {saving
            ? <ActivityIndicator size="small" color={C.white} />
            : <Icon name={editMode ? 'check' : 'sliders'} size={16} color={editMode ? C.white : C.text2} />}
          <Text style={[styles.editTxt, { color: editMode ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
            {editMode ? t.common.save : t.common.edit}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
      >
        {/* Hero card */}
        <View style={[styles.hero, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.heroBand, { backgroundColor: C.brand50 }]} />
          <View style={styles.heroContent}>
            <TouchableOpacity
              style={[styles.avatarWrap, { borderColor: C.bg }]}
              onPress={editMode ? pickAvatar : undefined}
              activeOpacity={editMode ? 0.7 : 1}
            >
              <Avatar uri={pickedAvatar ?? profile?.avatar_url} name={profile?.full_name} size="xl" />
              {editMode && (
                <View style={[styles.avatarEditBadge, { backgroundColor: C.brand, borderColor: C.bg }]}>
                  <Feather name="camera" size={13} color={C.white} />
                </View>
              )}
            </TouchableOpacity>

            {editMode ? (
              <View style={styles.editFields}>
                <TextInput
                  style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaBold }]}
                  value={editName} onChangeText={setEditName}
                  placeholder={t.mainx.fullNamePlaceholder} placeholderTextColor={C.textMuted}
                />
                <TextInput
                  style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={editDept} onChangeText={setEditDept}
                  placeholder={t.mainx.departmentPlaceholder} placeholderTextColor={C.textMuted}
                />
                {isStudent && (
                  <>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                      value={editStudentId} onChangeText={setEditStudentId}
                      placeholder="Student ID" placeholderTextColor={C.textMuted}
                      keyboardType="number-pad"
                    />
                    <TextInput
                      style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                      value={editProgram} onChangeText={setEditProgram}
                      placeholder="Program (e.g. B.Sc. in CSE)" placeholderTextColor={C.textMuted}
                    />
                    <View style={styles.editRow}>
                      <TextInput
                        style={[styles.editInput, styles.editHalf, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                        value={editIntake} onChangeText={setEditIntake}
                        placeholder={t.mainx.intakePlaceholder} placeholderTextColor={C.textMuted}
                      />
                      <TextInput
                        style={[styles.editInput, styles.editHalf, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                        value={editSection} onChangeText={setEditSection}
                        placeholder={t.mainx.sectionPlaceholder} placeholderTextColor={C.textMuted}
                      />
                    </View>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                      value={editBlood} onChangeText={setEditBlood}
                      placeholder="Blood Group (e.g. O+)" placeholderTextColor={C.textMuted}
                      autoCapitalize="characters"
                    />
                  </>
                )}
                <TextInput
                  style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={editWhatsapp} onChangeText={setEditWhatsapp}
                  placeholder={t.mainx.whatsappPlaceholder} placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={editPhone} onChangeText={setEditPhone}
                  placeholder="Phone" placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={editAddress} onChangeText={setEditAddress}
                  placeholder="Present Address" placeholderTextColor={C.textMuted}
                />
                {isStudent && (
                  <View style={[styles.toggleCard, { backgroundColor: C.bg, borderColor: C.border }]}>
                    <View style={styles.toggleRow}>
                      <Text style={[styles.toggleLbl, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                        {t.mainx.showInDirectory}
                      </Text>
                      <Switch value={editDirVisible} onValueChange={setEditDirVisible} trackColor={{ true: C.brand }} />
                    </View>
                    <View style={[styles.toggleDivider, { backgroundColor: C.border }]} />
                    <View style={styles.toggleRow}>
                      <Text style={[styles.toggleLbl, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                        {t.mainx.showWhatsapp}
                      </Text>
                      <Switch value={editShowWa} onValueChange={setEditShowWa} trackColor={{ true: C.brand }} />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.heroInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.heroName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
                    {profile?.full_name ?? t.mainx.campusMember}
                  </Text>
                  <View style={[styles.verifyBadge, { backgroundColor: C.brand }]}>
                    <Icon name="check" size={10} color={C.white} />
                  </View>
                </View>
                <Text style={[styles.heroMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {profile?.department ?? '—'}{profile?.intake ? ` · Intake ${profile.intake}` : ''}
                  {profile?.section ? ` · Sec ${profile.section}` : ''}
                </Text>
                {(profile?.student_id || profile?.blood_group || profile?.program) ? (
                  <Text style={[styles.heroMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {profile?.student_id ? `ID ${profile.student_id}` : ''}
                    {profile?.program ? `${profile?.student_id ? ' · ' : ''}${profile.program}` : ''}
                    {profile?.blood_group ? `${profile?.student_id || profile?.program ? ' · ' : ''}Blood ${profile.blood_group}` : ''}
                  </Text>
                ) : null}
                <View style={[styles.rolePill, { backgroundColor: roleBg }]}>
                  <View style={[styles.rolePillDot, { backgroundColor: roleHex }]} />
                  <Text style={[styles.rolePillTxt, { color: roleHex, fontFamily: FontFamily.jakartaBold }]}>
                    {ROLE_LABEL[role] ?? role}
                  </Text>
                </View>
                {(profile?.phone || profile?.whatsapp) ? (
                  <View style={styles.contactRow}>
                    <Feather name="phone" size={13} color={C.textMuted} />
                    <Text style={[styles.contactTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {profile?.phone || profile?.whatsapp}
                    </Text>
                  </View>
                ) : null}
                {profile?.address ? (
                  <View style={styles.contactRow}>
                    <Feather name="map-pin" size={13} color={C.textMuted} />
                    <Text style={[styles.contactTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {profile.address}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>

        {/* Campus contributions (student only) */}
        {isStudent && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.mainx.campusContributions}
            </Text>
            <View style={[styles.contribGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
              {CONTRIB_CONFIG.map((s, i) => (
                <View key={s.sector} style={[styles.contribCell, { borderBottomColor: C.border }, i % 2 === 0 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border }]}>
                  <SectorIcon sector={s.sector} size="sm" dark={isDark} />
                  <View>
                    <Text style={[styles.contribNum, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {contrib[s.sector] ?? 0}
                    </Text>
                    <Text style={[styles.contribLbl, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {CONTRIB_LABELS(t)[s.sector]}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Badges */}
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>BADGES</Text>
            <BadgesRow badges={BADGES} onPick={setFocusBadge} C={C} t={t} />
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {focusBadge && <BadgeSheet badge={focusBadge} C={C} onClose={() => setFocusBadge(null)} t={t} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 4, gap: 10 } as ViewStyle,
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  title: { flex: 1, fontSize: 22, letterSpacing: -0.3 } as any,
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  editTxt: { fontSize: 13 } as any,

  scroll: { paddingBottom: 24 } as ViewStyle,

  hero: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginTop: 10 } as ViewStyle,
  heroBand: { height: 56 } as ViewStyle,
  heroContent: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, marginTop: -36 } as ViewStyle,
  avatarWrap: { borderRadius: 40, borderWidth: 3 } as ViewStyle,
  heroInfo: { alignItems: 'center', paddingTop: 10 } as ViewStyle,
  heroName: { fontSize: 19, letterSpacing: -0.2 } as any,
  verifyBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  heroMeta: { fontSize: 13, marginTop: 3, textAlign: 'center' } as any,
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8 } as ViewStyle,
  rolePillDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  rolePillTxt: { fontSize: 12 } as any,
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 } as ViewStyle,
  contactTxt: { fontSize: 12.5 } as any,

  editFields: { width: '100%', paddingTop: 12 } as ViewStyle,
  editInput: { height: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14, marginBottom: 8 } as any,
  editRow: { flexDirection: 'row', gap: 8 } as ViewStyle,
  editHalf: { flex: 1 } as ViewStyle,
  toggleCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 } as ViewStyle,
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
  toggleDivider: { height: StyleSheet.hairlineWidth, marginVertical: 10 } as ViewStyle,
  toggleLbl: { fontSize: 13, flex: 1, marginRight: 8 } as any,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 24, marginBottom: 9, marginLeft: 4 } as any,

  contribGrid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  contribCell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth } as ViewStyle,
  contribNum: { fontSize: 20 } as any,
  contribLbl: { fontSize: 11, marginTop: 1 } as any,

  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
});
