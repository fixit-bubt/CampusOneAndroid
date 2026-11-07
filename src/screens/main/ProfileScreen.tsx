import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { LogoMark } from '../../components/ui/Logo';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { EditProfileModal } from '../../components/profile/EditProfileModal';
import { FontFamily, Layout, Accent } from '../../theme';
import type { SectorKey } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { getCacheSync, getCache, setCache, withTimeout } from '../../services/cacheService';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

const ROLE_TOKEN = { student: 'roleStudent', staff: 'roleStaff', admin: 'roleAdmin' } as const;

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const CATS: { id: string; label: string; icon: string; fg: string }[] = [
  { id: 'award',      label: '', icon: 'award',     fg: Accent.amber },
  { id: 'cert',       label: '', icon: 'layers',    fg: Accent.blue },
  { id: 'project',    label: '', icon: 'study',     fg: Accent.purple },
  { id: 'volunteer',  label: '', icon: 'clubs',     fg: Accent.green },
  { id: 'leadership', label: '', icon: 'directory', fg: Accent.teal },
  { id: 'research',   label: '', icon: 'study',     fg: Accent.pink },
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

interface Badge {
  id: string; icon: string; fg: string; en: string;
  earned: boolean; progress: { cur: number; total: number } | null;
}

const CONTRIB_CONFIG: { sector: SectorKey; en: string; table: string; field: string }[] = [
  { sector: 'reports',   en: '', table: 'reports',          field: 'reporter_id' },
  { sector: 'clubs',     en: '', table: 'club_members',     field: 'user_id' },
  { sector: 'events',    en: '', table: 'event_rsvps',      field: 'user_id' },
  { sector: 'lostfound', en: '', table: 'lost_found_items', field: 'poster_id' },
];

function BadgesRow({ badges, onPick, C, t }: { badges: Badge[]; onPick: (b: Badge) => void; C: any; t: any }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -4 }}
      contentContainerStyle={{ gap: 12, paddingHorizontal: 4, paddingVertical: 4 }}
    >
      {badges.map(b => (
        <TouchableOpacity
          key={b.id}
          style={[badgeStyles.wrap, !b.earned && { opacity: 0.55 }]}
          onPress={() => onPick(b)}
          activeOpacity={0.75}
        >
          <View
            style={[
              badgeStyles.medal,
              { backgroundColor: C.surface, borderColor: b.earned ? C.brand : C.border, borderWidth: 1 },
            ]}
          >
            <Icon name={b.icon as any} size={26} color={b.earned ? C.brand : C.textMuted} />
            {!b.earned && b.progress && (
              <View style={[badgeStyles.prog, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                <Text style={[badgeStyles.progTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {b.progress.cur}/{b.progress.total}
                </Text>
              </View>
            )}
          </View>
          <Text style={[badgeStyles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {BADGE_LABELS(t)[b.id]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, width: 72 } as ViewStyle,
  medal: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  } as ViewStyle,
  prog: {
    position: 'absolute',
    bottom: -6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  } as ViewStyle,
  progTxt: { fontSize: 8.5 } as TextStyle,
  name: { fontSize: 11, textAlign: 'center', lineHeight: 14 } as TextStyle,
});

function BadgeSheet({ badge, C, onClose, t }: { badge: Badge | null; C: any; onClose: () => void; t: any }) {
  if (!badge) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.mainx.badge}
          </Text>
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <View
              style={[
                sheetStyles.bigMedal,
                { backgroundColor: C.surface2, borderColor: badge.earned ? C.brand : C.border, borderWidth: 1.5 },
              ]}
            >
              <Icon name={badge.icon as any} size={38} color={badge.earned ? C.brand : C.textMuted} />
            </View>
            <Text style={[sheetStyles.badgeName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {BADGE_LABELS(t)[badge.id]}
            </Text>
            <View style={{ marginTop: 12 }}>
              {badge.earned ? (
                <View style={[sheetStyles.earnedPill, { backgroundColor: C.successBg ?? 'rgba(52, 211, 153, 0.12)' }]}>
                  <View style={[sheetStyles.earnedDot, { backgroundColor: Accent.green }]} />
                  <Text style={[sheetStyles.earnedTxt, { color: Accent.green, fontFamily: FontFamily.jakartaBold }]}>
                    {t.mainx.earned}
                  </Text>
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
                      <View
                        style={[
                          sheetStyles.progFill,
                          {
                            backgroundColor: C.brand,
                            width: `${(badge.progress.cur / badge.progress.total) * 100}%` as any,
                          },
                        ]}
                      />
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

function AddSheet({
  C,
  onClose,
  onAdd,
  t,
}: {
  C: any;
  onClose: () => void;
  onAdd: (item: AccomplishmentItem) => void;
  t: any;
}) {
  const [cat, setCat] = useState('award');
  const [title, setTitle] = useState('');
  const [org, setOrg] = useState('');
  const [year, setYear] = useState('');
  const ok = title.trim().length > 0;

  function submit() {
    if (!ok) return;
    onAdd({
      id: `tmp-${Date.now()}`,
      cat,
      title: title.trim(),
      org: org.trim(),
      year: year.trim() || '-',
    });
    setTitle('');
    setOrg('');
    setYear('');
    setCat('award');
    onClose();
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={sheetStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[sheetStyles.handle, { backgroundColor: C.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            {t.mainx.addAccomplishment}
          </Text>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.mainx.fieldType}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
          >
            {CATS.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[
                  sheetStyles.typeChip,
                  { borderColor: C.border, backgroundColor: C.surface2 },
                  cat === c.id && { backgroundColor: C.brand, borderColor: C.brand },
                ]}
                onPress={() => setCat(c.id)}
                activeOpacity={0.75}
              >
                <Icon name={c.icon as any} size={14} color={cat === c.id ? '#ffffff' : C.text2} />
                <Text
                  style={[
                    sheetStyles.typeChipTxt,
                    { color: cat === c.id ? '#ffffff' : C.text2, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {CAT_LABELS(t)[c.id]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.mainx.fieldTitle}
          </Text>
          <View style={[sheetStyles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <TextInput
              style={[sheetStyles.input, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t.mainx.titlePlaceholder ?? "Award or Certificate Title"}
              placeholderTextColor={C.textMuted}
            />
          </View>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.mainx.fieldOrgDetail}
          </Text>
          <View style={[sheetStyles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <TextInput
              style={[sheetStyles.input, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={org}
              onChangeText={setOrg}
              placeholder={t.mainx.orgPlaceholder ?? "Issuing Organization"}
              placeholderTextColor={C.textMuted}
            />
          </View>

          <Text style={[sheetStyles.flabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.mainx.fieldYear}
          </Text>
          <View style={[sheetStyles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <TextInput
              style={[sheetStyles.input, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={year}
              onChangeText={setYear}
              keyboardType="numeric"
              placeholder={t.mainx.yearPlaceholder ?? 'YYYY'}
              placeholderTextColor={C.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[sheetStyles.submitBtn, { backgroundColor: ok ? C.brand : C.surface2, opacity: ok ? 1 : 0.5 }]}
            disabled={!ok}
            onPress={submit}
            activeOpacity={0.8}
          >
            <Icon name="check" size={17} color={ok ? '#ffffff' : C.textMuted} />
            <Text style={[sheetStyles.submitTxt, { color: ok ? '#ffffff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.mainx.addToProfile}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: '92%',
  } as ViewStyle,
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 } as ViewStyle,
  sheetTitle: { fontSize: 18, letterSpacing: -0.2, marginBottom: 12 } as TextStyle,
  flabel: { fontSize: 11, letterSpacing: 0.6, marginBottom: 6, marginTop: 12, marginLeft: 2 } as TextStyle,
  inputBar: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  } as ViewStyle,
  input: { fontSize: 14, paddingVertical: 0 } as TextStyle,
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 16,
    marginTop: 20,
  } as ViewStyle,
  submitTxt: { fontSize: 15 } as TextStyle,
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  typeChipTxt: { fontSize: 12 } as TextStyle,
  bigMedal: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  badgeName: { fontSize: 19, letterSpacing: -0.3, marginTop: 12 } as TextStyle,
  earnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  } as ViewStyle,
  earnedDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  earnedTxt: { fontSize: 12 } as TextStyle,
  progBar: { height: 6, borderRadius: 3, marginTop: 12, overflow: 'hidden', width: 180 } as ViewStyle,
  progFill: { height: '100%', borderRadius: 3 } as ViewStyle,
});

interface AccomplishmentItem {
  id: string;
  cat: string;
  title: string;
  org: string;
  year: string;
}

function AccompCard({
  a,
  onDelete,
  C,
}: {
  a: AccomplishmentItem;
  onDelete?: (id: string) => void;
  C: any;
}) {
  const catInfo = CAT_MAP[a.cat] ?? CATS[0];
  return (
    <View style={accompStyles.row}>
      <View style={accompStyles.catIcon}>
        <Icon name={catInfo.icon as any} size={28} color={C.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[accompStyles.itemTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
          {a.title}
        </Text>
        {a.org ? (
          <Text style={[accompStyles.itemOrg, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {a.org}
          </Text>
        ) : null}
      </View>
      <Text style={[accompStyles.yearTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
        {a.year}
      </Text>
      {onDelete ? (
        <TouchableOpacity style={accompStyles.delBtn} onPress={() => onDelete(a.id)} hitSlop={8}>
          <Feather name="trash-2" size={15} color={C.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const accompStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
  } as ViewStyle,
  catIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  itemTitle: { fontSize: 14, lineHeight: 19 } as TextStyle,
  itemOrg: { fontSize: 12, marginTop: 2 } as TextStyle,
  yearTxt: { fontSize: 12, flexShrink: 0 } as TextStyle,
  delBtn: { padding: 4 } as ViewStyle,
});

export function ProfileScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { profile, user, refreshProfile } = useAuth();

  const [role, setRole] = useState<string>(profile?.role ?? 'student');
  useEffect(() => {
    if (profile?.role) setRole(profile.role as any);
  }, [profile?.role]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [focusBadge, setFocusBadge] = useState<Badge | null>(null);
  const [contrib, setContrib] = useState<Record<string, number>>({});
  const [accomplishments, setAccomplishments] = useState<AccomplishmentItem[]>([]);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const socialLinks = useMemo(() => {
    if (!profile?.expertise) return null;
    try {
      const parsed = JSON.parse(profile.expertise);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          facebook: parsed.facebook || '',
          instagram: parsed.instagram || '',
          telegram: parsed.telegram || '',
          linkedin: parsed.linkedin || '',
        };
      }
    } catch {
      return null;
    }
    return null;
  }, [profile?.expertise]);

  const isStudent = role === 'student';

  const CACHE_CONTRIB_KEY = (uid: string) => `profile_contrib_${uid}`;
  const CACHE_ACCOMP_KEY = (uid: string) => `profile_accomp_${uid}`;

  const loadContrib = useCallback(async () => {
    if (!user) return;
    const cacheKey = CACHE_CONTRIB_KEY(user.id);
    const cached = getCacheSync<Record<string, number>>(cacheKey) ?? await getCache<Record<string, number>>(cacheKey);
    if (cached) {
      setContrib(cached);
    }
    const head = { count: 'exact' as const, head: true };
    try {
      const [rep, clb, evt, lf, mat, qb, book] = await withTimeout(
        Promise.all([
          supabase.from('reports').select('*', head).eq('reporter_id', user.id).is('deleted_at', null),
          supabase.from('club_members').select('*', head).eq('user_id', user.id),
          supabase.from('event_rsvps').select('*', head).eq('user_id', user.id),
          supabase.from('lost_found_items').select('*', head).eq('poster_id', user.id).is('deleted_at', null),
          supabase.from('study_materials').select('*', head).eq('uploaded_by', user.id),
          supabase.from('study_question_bank').select('*', head).eq('uploaded_by', user.id),
          supabase.from('study_books').select('*', head).eq('added_by', user.id),
        ]),
        5000
      );
      const counts = {
        reports:   rep.count ?? 0,
        clubs:     clb.count ?? 0,
        events:    evt.count ?? 0,
        lostfound: lf.count ?? 0,
        study:     (mat.count ?? 0) + (qb.count ?? 0) + (book.count ?? 0),
      };
      setContrib(counts);
      setCache(cacheKey, counts);
    } catch {}
  }, [user]);

  const loadAccomplishments = useCallback(async () => {
    if (!user) return;
    const cacheKey = CACHE_ACCOMP_KEY(user.id);
    const cached = getCacheSync<AccomplishmentItem[]>(cacheKey) ?? await getCache<AccomplishmentItem[]>(cacheKey);
    if (cached) {
      setAccomplishments(cached);
    }
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('accomplishments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        5000
      );
      if (!error && data) {
        const mapped = (data as any[]).map(a => ({
          id: a.id,
          cat: a.category,
          title: a.title,
          org: a.org ?? '',
          year: a.year ?? '-',
        }));
        setAccomplishments(mapped);
        setCache(cacheKey, mapped);
      }
    } catch {}
  }, [user]);

  const loadOnFocus = useCallback(() => {
    loadContrib();
    loadAccomplishments();
  }, [loadContrib, loadAccomplishments]);
  useFocusRefresh(loadOnFocus);

  const computedBadges = useMemo(() => {
    const mk = (id: string, icon: string, fg: string, cur: number, total: number) => ({
      id, icon, fg, en: '', earned: cur >= total, progress: cur >= total ? null : { cur, total },
    });
    return [
      mk('reporter', 'layers', Accent.blue,   contrib.reports ?? 0,                        5),
      mk('helper',   'clubs',  Accent.green,  contrib.lostfound ?? 0,                       3),
      mk('active',   'bell',   Accent.amber,  (contrib.clubs ?? 0) + (contrib.events ?? 0), 5),
      mk('studious', 'study',  Accent.purple, contrib.study ?? 0,                          10),
    ];
  }, [contrib]);

  async function addAccomplishment(item: AccomplishmentItem) {
    if (!user) return;
    const { data, error } = await supabase
      .from('accomplishments')
      .insert({
        user_id: user.id,
        category: item.cat,
        title: item.title,
        org: item.org || null,
        year: item.year === '-' ? null : item.year,
      })
      .select()
      .single();
    if (error || !data) {
      toast({ type: 'error', title: t.common.error, message: error?.message });
      return;
    }
    const updated = [
      { id: data.id, cat: data.category, title: data.title, org: data.org ?? '', year: data.year ?? '-' },
      ...accomplishments,
    ];
    setAccomplishments(updated);
    setCache(CACHE_ACCOMP_KEY(user.id), updated);
  }

  async function deleteAccomplishment(id: string) {
    if (!user) return;
    const prev = accomplishments;
    const updated = accomplishments.filter(a => a.id !== id);
    setAccomplishments(updated);
    setCache(CACHE_ACCOMP_KEY(user.id), updated);
    const { error } = await supabase.from('accomplishments').delete().eq('id', id);
    if (error) {
      setAccomplishments(prev);
      setCache(CACHE_ACCOMP_KEY(user.id), prev);
      toast({ type: 'error', title: t.common.error, message: error.message });
    }
  }


  const roleHex = C[ROLE_TOKEN[role as keyof typeof ROLE_TOKEN] ?? 'roleStudent'];
  const roleBg  = hexAlpha(roleHex, isDark ? 0.2 : 0.12);
  const ROLE_LABEL: Record<string, string> = {
    student: t.mainx.roleStudent,
    staff: t.mainx.roleStaff,
    admin: t.mainx.roleAdmin,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Default SubBar Header (60dp Standard) */}
      <SubBar
        title={t.tabs.profile}
        onBack={() => navigation.goBack()}
        rightSlot={<LogoMark size={28} shadow={false} />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
      >
        {/* Varsity Cover & Identity Card (140dp Cover Banner) */}
        <View style={[styles.hero, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.heroBand}>
            <LinearGradient
              colors={isDark ? ['#081736', '#0f265c', '#121212'] : ['#dbeafe', '#bfdbfe', '#ffffff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Top rim highlight */}
            <View
              style={[
                styles.heroBandRim,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)' },
              ]}
            />
          </View>

          <View style={styles.heroContent}>
            {/* Elevated 84dp Avatar */}
            <View style={[styles.avatarWrap, { borderColor: C.surface }]}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="xl" />
              <View
                style={[
                  styles.avatarStatusDot,
                  { backgroundColor: isDark ? '#34d399' : '#059669', borderColor: C.surface },
                ]}
              />
            </View>

            {/* Profile Info Block */}
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.heroName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
                  {profile?.full_name ?? t.mainx.campusMember}
                </Text>
                <View style={[styles.verifyBadge, { backgroundColor: isDark ? '#5b85f7' : '#275EFE' }]}>
                  <Feather name="check" size={11} color="#ffffff" />
                </View>
              </View>

              {/* Program & Department */}
              <Text style={[styles.heroProgram, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {profile?.program ? profile.program : (profile?.department ? `Department of ${profile.department}` : 'BUBT Campus Member')}
              </Text>

              {/* Student ID */}
              {profile?.student_id ? (
                <Text style={[styles.heroId, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                  {`Student ID: ${profile.student_id}`}
                </Text>
              ) : null}

              {/* Varsity Chips */}
              <View style={styles.heroChipsRow}>
                {profile?.intake ? (
                  <View style={[styles.heroChip, { backgroundColor: C.surface2, borderColor: C.border }]}>
                    <Text style={[styles.heroChipTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {`Intake ${profile.intake}`}
                    </Text>
                  </View>
                ) : null}
                {profile?.section ? (
                  <View style={[styles.heroChip, { backgroundColor: C.surface2, borderColor: C.border }]}>
                    <Text style={[styles.heroChipTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {`Sec ${profile.section}`}
                    </Text>
                  </View>
                ) : null}
                {profile?.blood_group ? (
                  <View
                    style={[
                      styles.heroChip,
                      {
                        backgroundColor: isDark ? 'rgba(248, 113, 113, 0.12)' : '#fef2f2',
                        borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : '#fee2e2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.heroChipTxt,
                        { color: isDark ? '#f87171' : '#dc2626', fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {`Blood ${profile.blood_group}`}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.heroChip, { backgroundColor: roleBg, borderColor: hexAlpha(roleHex, 0.3) }]}>
                  <Text style={[styles.heroChipTxt, { color: roleHex, fontFamily: FontFamily.jakartaBold }]}>
                    {ROLE_LABEL[role] ?? role}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: C.brand }]}
                  onPress={() => setEditModalOpen(true)}
                  activeOpacity={0.82}
                >
                  <Feather name="edit-3" size={15} color="#ffffff" />
                  <Text style={[styles.primaryActionTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Academic & Contact Credentials Card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          ACADEMIC & CONTACT CREDENTIALS
        </Text>
        <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {/* Email */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Feather name="mail" size={24} color={C.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Campus Email
              </Text>
              <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                {user?.email ?? 'Not available'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: C.border }]} />

          {/* Phone */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Feather name="phone" size={24} color={C.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Phone Number
              </Text>
              <Text style={[styles.infoValue, { color: profile?.phone ? C.text : C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                {profile?.phone || 'Not added'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: C.border }]} />

          {/* WhatsApp */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Feather name="message-circle" size={24} color={C.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                WhatsApp Direct
              </Text>
              <Text style={[styles.infoValue, { color: profile?.whatsapp ? C.text : C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                {profile?.whatsapp || 'Not added'}
              </Text>
            </View>
          </View>

          {profile?.address ? (
            <>
              <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Feather name="map-pin" size={24} color={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Present Address
                  </Text>
                  <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {profile.address}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {socialLinks?.facebook ? (
            <>
              <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Feather name="facebook" size={24} color={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Facebook
                  </Text>
                  <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {socialLinks.facebook}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {socialLinks?.instagram ? (
            <>
              <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Feather name="instagram" size={24} color={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Instagram
                  </Text>
                  <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {socialLinks.instagram}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {socialLinks?.telegram ? (
            <>
              <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Feather name="send" size={24} color={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Telegram
                  </Text>
                  <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {socialLinks.telegram}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {socialLinks?.linkedin ? (
            <>
              <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Feather name="globe" size={24} color={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    LinkedIn / Portfolio
                  </Text>
                  <Text style={[styles.infoValue, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {socialLinks.linkedin}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Campus contributions (student only) */}
        {isStudent && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.mainx.campusContributions}
            </Text>
            <View style={[styles.contribGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
              {CONTRIB_CONFIG.map((s, i) => (
                <View
                  key={s.sector}
                  style={[
                    styles.contribCell,
                    { borderBottomColor: C.border },
                    i % 2 === 0 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border },
                  ]}
                >
                  <SectorIcon sector={s.sector} size="sm" dark={isDark} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contribNum, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {contrib[s.sector] ?? 0}
                    </Text>
                    <Text style={[styles.contribLbl, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {CONTRIB_LABELS(t)[s.sector]}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Badges */}
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
              {t.mainx.badges}
            </Text>
            <BadgesRow badges={computedBadges} onPick={setFocusBadge} C={C} t={t} />
          </>
        )}

        {/* Accomplishments */}
        <View style={styles.accompHeader}>
          <Text
            style={[
              styles.sectionLabel,
              { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginBottom: 0 },
            ]}
          >
            {t.mainx.accomplishmentsSection}
          </Text>
          <TouchableOpacity
            onPress={() => setAddSheetOpen(true)}
            hitSlop={8}
            style={[styles.addAccompBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          >
            <Feather name="plus" size={14} color={C.brand} />
            <Text style={[styles.addAccompTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {accomplishments.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="award" size={24} color={C.textMuted} />
            <Text style={[styles.emptyAccomp, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.mainx.noAccomplishments}
            </Text>
          </View>
        ) : (
          <View style={[styles.accompList, { backgroundColor: C.surface, borderColor: C.border }]}>
            {accomplishments.map((a, i) => (
              <View key={a.id} style={i > 0 ? [styles.accompDivider, { borderTopColor: C.border }] : undefined}>
                <AccompCard a={a} onDelete={deleteAccomplishment} C={C} />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Profile Modal (Decoupled, Zero-Bloat) */}
      <EditProfileModal
        visible={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        profile={profile}
        user={user}
        onSaved={async () => {
          await refreshProfile();
        }}
      />

      {addSheetOpen && (
        <AddSheet C={C} t={t} onClose={() => setAddSheetOpen(false)} onAdd={addAccomplishment} />
      )}

      {focusBadge && <BadgeSheet badge={focusBadge} C={C} onClose={() => setFocusBadge(null)} t={t} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  hero: {
    borderRadius: 20,
    borderWidth: 1.2,
    overflow: 'hidden',
    marginTop: 0,
    marginBottom: 8,
  } as ViewStyle,
  heroBand: {
    height: 140,
    position: 'relative',
    overflow: 'hidden',
  } as ViewStyle,
  heroBandRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  } as ViewStyle,
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: -44,
  } as ViewStyle,
  avatarWrap: {
    borderRadius: 44,
    borderWidth: 4,
    position: 'relative',
  } as ViewStyle,
  avatarStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  } as ViewStyle,

  heroInfo: {
    alignItems: 'center',
    paddingTop: 10,
    width: '100%',
  } as ViewStyle,
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  heroName: {
    fontSize: 19.5,
    letterSpacing: -0.3,
    lineHeight: 26,
    textAlign: 'center',
  } as TextStyle,
  verifyBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  heroProgram: {
    fontSize: 13.5,
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 18,
  } as TextStyle,
  heroId: {
    fontSize: 12.5,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 16,
  } as TextStyle,

  heroChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  } as ViewStyle,
  heroChip: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  heroChipTxt: {
    fontSize: 11,
    lineHeight: 15,
  } as TextStyle,

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    width: '100%',
  } as ViewStyle,
  primaryActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  primaryActionTxt: {
    fontSize: 14,
  } as TextStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  } as TextStyle,

  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  } as ViewStyle,
  infoIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  infoLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  } as TextStyle,
  infoValue: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  } as TextStyle,
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  } as ViewStyle,

  contribGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  contribCell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  contribNum: { fontSize: 20 } as TextStyle,
  contribLbl: { fontSize: 11.5, marginTop: 1 } as TextStyle,

  accompHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
    marginRight: 2,
  } as ViewStyle,
  addAccompBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  addAccompTxt: {
    fontSize: 11.5,
  } as TextStyle,
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  emptyAccomp: { fontSize: 13, textAlign: 'center' } as TextStyle,
  accompList: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  accompDivider: { borderTopWidth: StyleSheet.hairlineWidth } as ViewStyle,
});
