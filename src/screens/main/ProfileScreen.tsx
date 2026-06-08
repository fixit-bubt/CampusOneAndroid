// Matches design screens-profile.jsx — full Profile screen with accomplishments & badges
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Modal,
  StyleSheet, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { FontFamily, Layout } from '../../theme';
import type { SectorKey } from '../../theme';
import { supabase } from '../../lib/supabase';

// ── Role helpers ──────────────────────────────────────────────────────────────
const ROLE_COLOR = { student: '#2b5be3', staff: '#b9760a', admin: '#12915e' };
const ROLE_LABEL = { student: 'Student', staff: 'Staff', admin: 'Admin' };

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ── Accomplishment categories ─────────────────────────────────────────────────
const CATS: { id: string; label: string; icon: string; fg: string }[] = [
  { id: 'award',      label: 'Award',      icon: 'award',    fg: '#e08a2b' },
  { id: 'cert',       label: 'Certificate', icon: 'layers',  fg: '#2b5be3' },
  { id: 'project',    label: 'Project',    icon: 'study',    fg: '#8b5cf6' },
  { id: 'volunteer',  label: 'Volunteer',  icon: 'clubs',    fg: '#12915e' },
  { id: 'leadership', label: 'Leadership', icon: 'directory',fg: '#0e9c8a' },
  { id: 'research',   label: 'Research',   icon: 'study',    fg: '#ec4899' },
];

const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

// ── Static badge data ─────────────────────────────────────────────────────────
const BADGES = [
  { id: 'reporter',  icon: 'layers',   fg: '#2b5be3', en: 'Reporter',   earned: false, progress: { cur: 1, total: 5 } },
  { id: 'helper',    icon: 'clubs',    fg: '#12915e', en: 'Helper',      earned: true,  progress: null },
  { id: 'active',    icon: 'bell',     fg: '#e08a2b', en: 'Active',      earned: true,  progress: null },
  { id: 'studious',  icon: 'study',    fg: '#8b5cf6', en: 'Studious',    earned: false, progress: { cur: 3, total: 10 } },
];

// ── Contribution sector config ────────────────────────────────────────────────
const CONTRIB_CONFIG: { sector: SectorKey; en: string; table: string; field: string }[] = [
  { sector: 'reports',   en: 'Reports',    table: 'reports',         field: 'reporter_id' },
  { sector: 'clubs',     en: 'Clubs',      table: 'club_members',    field: 'user_id' },
  { sector: 'events',    en: 'Events',     table: 'event_rsvps',     field: 'user_id' },
  { sector: 'lostfound', en: 'Lost/Found', table: 'lost_found_items',field: 'poster_id' },
];

// ── BadgesRow ─────────────────────────────────────────────────────────────────
function BadgesRow({ badges, onPick, C }: { badges: typeof BADGES; onPick: (b: typeof BADGES[0]) => void; C: any }) {
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
          <Text style={[badgeStyles.name, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{b.en}</Text>
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
    backgroundColor: '#f0f2f6',
    position: 'relative',
  } as ViewStyle,
  prog: {
    position: 'absolute', bottom: -6, paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 20,
  } as ViewStyle,
  progTxt: { fontSize: 9 } as any,
  name: { fontSize: 10.5, textAlign: 'center', lineHeight: 14 } as any,
});

// ── BadgeSheet ────────────────────────────────────────────────────────────────
function BadgeSheet({ badge, C, onClose }: { badge: typeof BADGES[0] | null; C: any; onClose: () => void }) {
  if (!badge) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Badge</Text>
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <View style={[sheetStyles.bigMedal, badge.earned && { backgroundColor: badge.fg + '22', borderColor: badge.fg + '55', borderWidth: 2 }]}>
              <Icon name={badge.icon as any} size={38} color={badge.earned ? badge.fg : C.textMuted} />
            </View>
            <Text style={[sheetStyles.badgeName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{badge.en}</Text>
            <View style={{ marginTop: 10 }}>
              {badge.earned ? (
                <View style={[sheetStyles.earnedPill, { backgroundColor: '#e8f8f0' }]}>
                  <View style={[sheetStyles.earnedDot, { backgroundColor: '#12915e' }]} />
                  <Text style={[sheetStyles.earnedTxt, { color: '#12915e', fontFamily: FontFamily.jakartaBold }]}>Earned</Text>
                </View>
              ) : (
                badge.progress && (
                  <>
                    <View style={[sheetStyles.earnedPill, { backgroundColor: C.surface2 }]}>
                      <Text style={[sheetStyles.earnedTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {badge.progress.cur} / {badge.progress.total} · In progress
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

// ── AddSheet ──────────────────────────────────────────────────────────────────
function AddSheet({ C, onClose, onAdd }: { C: any; onClose: () => void; onAdd: (item: AccomplishmentItem) => void }) {
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
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Add accomplishment</Text>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
            {CATS.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[sheetStyles.typeChip, cat === c.id && { backgroundColor: c.fg, borderColor: c.fg }]}
                onPress={() => setCat(c.id)}
                activeOpacity={0.75}
              >
                <Icon name={c.icon as any} size={14} color={cat === c.id ? '#fff' : C.text2} />
                <Text style={[sheetStyles.typeChipTxt, { color: cat === c.id ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>TITLE</Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={title} onChangeText={setTitle}
            placeholder="e.g. Dean's List — Spring 2026" placeholderTextColor={C.textMuted}
          />

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>ORGANIZATION / DETAIL</Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={org} onChangeText={setOrg}
            placeholder="e.g. Coursera · Certificate" placeholderTextColor={C.textMuted}
          />

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>YEAR</Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={year} onChangeText={setYear} keyboardType="numeric" placeholder="2026" placeholderTextColor={C.textMuted}
          />

          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: ok ? C.brand : C.surface2, opacity: ok ? 1 : 0.5 }]}
            disabled={!ok} onPress={submit} activeOpacity={0.8}
          >
            <Icon name="check" size={18} color={ok ? '#fff' : C.textMuted} />
            <Text style={[sheetStyles.submitTxt, { color: ok ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>Add to profile</Text>
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
    borderWidth: 1, borderColor: '#ddd',
  } as ViewStyle,
  typeChipTxt: { fontSize: 12.5 } as any,
  bigMedal: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f6' } as ViewStyle,
  badgeName: { fontSize: 20, letterSpacing: -0.4, marginTop: 14 } as any,
  earnedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  earnedDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  earnedTxt: { fontSize: 12.5 } as any,
  progBar: { height: 7, borderRadius: 4, marginTop: 14, overflow: 'hidden', width: 200 } as ViewStyle,
  progFill: { height: '100%', borderRadius: 4 } as ViewStyle,
});

// ── AccomplishmentCard ────────────────────────────────────────────────────────
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

// ── RoleSwitch ────────────────────────────────────────────────────────────────
function RoleSwitch({ role, onRole, C }: { role: string; onRole: (r: string) => void; C: any }) {
  const roles: { id: 'student' | 'staff' | 'admin'; label: string }[] = [
    { id: 'student', label: 'Student' },
    { id: 'staff',   label: 'Staff' },
    { id: 'admin',   label: 'Admin' },
  ];
  return (
    <View style={[roleStyles.sw, { backgroundColor: C.surface2, borderColor: C.border }]}>
      {roles.map(r => {
        const active = role === r.id;
        const color = ROLE_COLOR[r.id];
        return (
          <TouchableOpacity
            key={r.id}
            style={[roleStyles.btn, active && { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }]}
            onPress={() => onRole(r.id)}
            activeOpacity={0.75}
          >
            <View style={[roleStyles.dot, { backgroundColor: active ? color : C.border }]} />
            <Text style={[roleStyles.txt, { color: active ? color : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{r.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const roleStyles = StyleSheet.create({
  sw: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 5, gap: 4 } as ViewStyle,
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 } as ViewStyle,
  dot: { width: 7, height: 7, borderRadius: 4 } as ViewStyle,
  txt: { fontSize: 13 } as any,
});

// ── ProfileScreen ─────────────────────────────────────────────────────────────
export function ProfileScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile, user, signOut, refreshProfile } = useAuth();

  const [role, setRole] = useState<string>(profile?.role ?? 'student');
  useEffect(() => { if (profile?.role) setRole(profile.role as any); }, [profile?.role]);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editIntake, setEditIntake] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');

  useEffect(() => {
    if (editMode) {
      setEditName(profile?.full_name ?? '');
      setEditDept(profile?.department ?? '');
      setEditIntake(profile?.intake ?? '');
      setEditSection(profile?.section ?? '');
      setEditWhatsapp(profile?.whatsapp ?? '');
    }
  }, [editMode]);

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

  function handleRoleView(r: string) {
    setRole(r);
    if (r === 'staff')  navigation.navigate('StaffDashboard');
    if (r === 'admin')  navigation.navigate('AdminDashboard');
  }

  async function handleSave() {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      full_name: editName,
      department: editDept,
      intake: editIntake,
      section: editSection,
      whatsapp: editWhatsapp,
    }).eq('id', user.id);
    if (error) { Alert.alert('Error', error.message); return; }
    await refreshProfile();
    setEditMode(false);
  }

  const roleHex = ROLE_COLOR[role as keyof typeof ROLE_COLOR] ?? '#2b5be3';
  const roleBg  = hexAlpha(roleHex, isDark ? 0.2 : 0.12);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Header row */}
      <View style={[styles.header, { paddingHorizontal: Layout.screenPadding }]}>
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Profile</Text>
        {isStudent && (
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: editMode ? C.brand : C.surface, borderColor: editMode ? C.brand : C.border }]}
            onPress={editMode ? handleSave : () => setEditMode(true)}
            activeOpacity={0.75}
          >
            <Icon name={editMode ? 'check' : 'sliders'} size={16} color={editMode ? '#fff' : C.text2} />
            <Text style={[styles.editTxt, { color: editMode ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {editMode ? 'Save' : 'Edit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
      >
        {/* Hero card */}
        <View style={[styles.hero, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.heroBand, { backgroundColor: C.brand50 ?? '#eef3ff' }]} />
          <View style={styles.heroRow}>
            <View style={[styles.avatarWrap, { borderColor: C.bg }]}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="lg" />
            </View>
            <View style={styles.heroInfo}>
              {editMode ? (
                <>
                  <TextInput
                    style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaBold }]}
                    value={editName} onChangeText={setEditName}
                    placeholder="Full name" placeholderTextColor={C.textMuted}
                  />
                  <TextInput
                    style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={editDept} onChangeText={setEditDept}
                    placeholder="Department" placeholderTextColor={C.textMuted}
                  />
                  <TextInput
                    style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={editIntake} onChangeText={setEditIntake}
                    placeholder="Intake" placeholderTextColor={C.textMuted}
                  />
                  <TextInput
                    style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={editSection} onChangeText={setEditSection}
                    placeholder="Section" placeholderTextColor={C.textMuted}
                  />
                  <TextInput
                    style={[styles.editInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={editWhatsapp} onChangeText={setEditWhatsapp}
                    placeholder="WhatsApp number" placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                  />
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={[styles.heroName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
                      {profile?.full_name ?? 'Campus Member'}
                    </Text>
                    <View style={[styles.verifyBadge, { backgroundColor: C.brand }]}>
                      <Icon name="check" size={9} color="#fff" />
                    </View>
                  </View>
                  <Text style={[styles.heroMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {profile?.department ?? '—'}{profile?.intake ? ` · Intake ${profile.intake}` : ''}
                    {profile?.section ? ` · Sec ${profile.section}` : ''}
                  </Text>
                  <View style={[styles.rolePill, { backgroundColor: roleBg }]}>
                    <View style={[styles.rolePillDot, { backgroundColor: roleHex }]} />
                    <Text style={[styles.rolePillTxt, { color: roleHex, fontFamily: FontFamily.jakartaBold }]}>
                      {ROLE_LABEL[role as keyof typeof ROLE_LABEL] ?? role}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Campus contributions (student only) */}
        {isStudent && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              CAMPUS CONTRIBUTIONS
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
                      {s.en}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Badges */}
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>BADGES</Text>
            <BadgesRow badges={BADGES} onPick={setFocusBadge} C={C} />
          </>
        )}

        {/* Non-student placeholder */}
        {!isStudent && (
          <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="award" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Accomplishment records</Text>
            <Text style={[styles.emptyText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Detailed accomplishments live on student profiles.
            </Text>
          </View>
        )}

        {/* View As — only visible to staff and admin */}
        {(profile?.role === 'staff' || profile?.role === 'admin') && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>VIEW AS</Text>
            <RoleSwitch role={role} onRole={handleRoleView} C={C} />
          </>
        )}

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={signOut}
          activeOpacity={0.8}
        >
          <Icon name="logout" size={17} color={C.danger ?? '#e2483d'} />
          <Text style={[styles.logoutTxt, { color: C.danger ?? '#e2483d', fontFamily: FontFamily.jakartaBold }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modals */}
      {focusBadge && <BadgeSheet badge={focusBadge} C={C} onClose={() => setFocusBadge(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 4 } as ViewStyle,
  title: { flex: 1, fontSize: 26, letterSpacing: -0.5 } as any,
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  editTxt: { fontSize: 13 } as any,

  scroll: { paddingBottom: 24 } as ViewStyle,

  hero: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginTop: 10 } as ViewStyle,
  heroBand: { height: 44 } as ViewStyle,
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 16, paddingBottom: 16, marginTop: -22 } as ViewStyle,
  avatarWrap: { borderRadius: 22, borderWidth: 3 } as ViewStyle,
  heroInfo: { flex: 1, paddingTop: 24 } as ViewStyle,
  heroName: { fontSize: 17, letterSpacing: -0.2 } as any,
  editInput: { height: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, fontSize: 13, marginBottom: 6 } as any,
  verifyBadge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  heroMeta: { fontSize: 12, marginTop: 2 } as any,
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 } as ViewStyle,
  rolePillDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  rolePillTxt: { fontSize: 12 } as any,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 24, marginBottom: 9, marginLeft: 4 } as any,

  contribGrid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  contribCell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth } as ViewStyle,
  contribNum: { fontSize: 20 } as any,
  contribLbl: { fontSize: 11, marginTop: 1 } as any,

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 14 } as ViewStyle,
  addBtnTxt: { fontSize: 14 } as any,

  acSecHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 } as ViewStyle,
  acSecIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  acSecLabel: { flex: 1, fontSize: 14 } as any,
  acSecCount: { fontSize: 12 } as any,
  acCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  emptyCard: { borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 8, paddingVertical: 32, marginTop: 16 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
  emptyText: { fontSize: 13, textAlign: 'center', maxWidth: 240 } as any,

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, borderWidth: 1, marginTop: 16 } as ViewStyle,
  logoutTxt: { fontSize: 15 } as any,
});
