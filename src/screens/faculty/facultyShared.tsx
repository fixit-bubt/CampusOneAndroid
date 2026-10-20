// Shared faculty kit - types, sorting, branch icons, badges, and the
// high-density teacher card used by the directory, department, and saved views.
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { FontFamily, SectorColors, pillBg, Radius, Accent } from '../../theme';
import { openUrl } from '../../utils/link';
import { useT } from '../../i18n';
import type { Colors } from '../../theme';

export const FACULTY_ACCENT = SectorColors.faculty;

export interface FacultyCategory {
  id: string;
  name: string;
  shortName: string;
  icon: keyof typeof Feather.glyphMap;
  branches: string[];
  description: string;
}

export const FACULTY_CATEGORIES: FacultyCategory[] = [
  {
    id: 'engineering',
    name: 'Faculty of Engineering & Applied Sciences',
    shortName: 'Engineering & Applied Sciences',
    icon: 'cpu',
    branches: ['Engineering & Applied Sciences'],
    description: 'CSE, EEE, Civil, Textile & Data Science',
  },
  {
    id: 'business',
    name: 'Faculty of Business',
    shortName: 'Business',
    icon: 'briefcase',
    branches: ['Business'],
    description: 'Management, Accounting, Marketing & Finance',
  },
  {
    id: 'arts_humanities',
    name: 'Faculty of Arts & Humanities',
    shortName: 'Arts & Humanities',
    icon: 'book-open',
    branches: ['Arts & Humanities'],
    description: 'Department of English',
  },
  {
    id: 'social_sciences',
    name: 'Faculty of Social Sciences',
    shortName: 'Social Sciences',
    icon: 'globe',
    branches: ['Social Sciences', 'Science / Social Sciences'],
    description: 'Economics, Mathematics & Statistics',
  },
  {
    id: 'law',
    name: 'Faculty of Law',
    shortName: 'Law',
    icon: 'shield',
    branches: ['Law'],
    description: 'Department of Law & Justice',
  },
];

export interface FacultyPublication {
  title: string;
  venue?: string;
  year?: string | number;
  doi?: string;
  url?: string;
  authors?: string;
}

export interface FacultyMember {
  id: string;
  department_id: string;
  name: string;
  designation: string;
  email: string | null;
  phone?: string | null;
  cell_phone?: string | null;
  personal_email?: string | null;
  photo_url: string | null;
  short_code?: string | null;
  room_number?: string | null;
  building?: string | null;
  floor?: string | null;
  counseling_hours?: string | null;
  blood_group?: string | null;
  scopus_url?: string | null;
  scholar_url?: string | null;
  researchgate_url?: string | null;
  linkedin_url?: string | null;
  orcid_url?: string | null;
  website_url?: string | null;
  is_accepting_research?: boolean;
  research_interests: string[] | null;
  teaching_areas?: string[] | null;
  courses_taught?: string[] | null;
  qualifications?: string[] | null;
  publications?: FacultyPublication[] | null;
  academic_activities?: string[] | null;
  industrial_experience?: string | null;
  profile_url?: string | null;
  departmental_profile_url?: string | null;
  on_leave: boolean;
  is_chairman: boolean;
}

export interface Department {
  id: string;
  name: string;
  branch: string;
  dept_number: string;
  chairman: string | null;
}

export const BRANCH_ORDER = [
  'Engineering & Applied Sciences',
  'Business',
  'Science / Social Sciences',
  'Arts & Humanities',
  'Social Sciences',
  'Law',
];

export const BRANCH_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  'Engineering & Applied Sciences': 'cpu',
  'Business': 'briefcase',
  'Science / Social Sciences': 'pie-chart',
  'Arts & Humanities': 'book-open',
  'Social Sciences': 'globe',
  'Law': 'award',
};

export const shortDept = (name: string | null | undefined) =>
  (name ?? '').replace(/^Department of\s+/i, '');

// Pre-indexed rank order lookup for fast O(1) sorting
function rankIndex(desig = ''): number {
  const d = desig.toLowerCase();
  if (d.includes('associate professor')) return 2;
  if (d.includes('assistant professor')) return 3;
  if (d.includes('adjunct') || d.includes('visiting')) return 4;
  if (d.includes('professor')) return 1;
  if (d.includes('senior lecturer')) return 5;
  if (d.includes('lecturer')) return 6;
  if (d.includes('teaching assistant')) return 7;
  if (d.includes('demonstrator')) return 8;
  return 9;
}

export function sortFaculty<T extends FacultyMember>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.is_chairman !== b.is_chairman) return a.is_chairman ? -1 : 1;
    const r = rankIndex(a.designation) - rankIndex(b.designation);
    if (r !== 0) return r;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
}

export function interestsOf(f: FacultyMember): string[] {
  return Array.isArray(f.research_interests) ? f.research_interests.filter(Boolean) : [];
}

// Counseling status calculated against Dhaka time (UTC+6)
export function getCounselingStatus(counselingHours?: string | null, onLeave?: boolean): {
  active: boolean;
  label: string;
  tone: 'success' | 'info' | 'warn' | 'muted';
} | null {
  if (onLeave) {
    return { active: false, label: 'On study leave', tone: 'warn' };
  }
  if (!counselingHours || !counselingHours.trim()) return null;

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const dhaka = new Date(utc + 3600000 * 6);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayStr = days[dhaka.getDay()];
  const currentMins = dhaka.getHours() * 60 + dhaka.getMinutes();

  const lower = counselingHours.toLowerCase();
  const isToday = lower.includes(todayStr.toLowerCase());

  const timeMatch = counselingHours.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)\s*[-–]\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
  if (timeMatch && isToday) {
    let startH = parseInt(timeMatch[1], 10);
    const startM = parseInt(timeMatch[2] || '0', 10);
    const startAmpm = timeMatch[3].toUpperCase();
    if (startAmpm === 'PM' && startH < 12) startH += 12;
    if (startAmpm === 'AM' && startH === 12) startH = 0;
    const startTotal = startH * 60 + startM;

    let endH = parseInt(timeMatch[4], 10);
    const endM = parseInt(timeMatch[5] || '0', 10);
    const endAmpm = timeMatch[6].toUpperCase();
    if (endAmpm === 'PM' && endH < 12) endH += 12;
    if (endAmpm === 'AM' && endH === 12) endH = 0;
    const endTotal = endH * 60 + endM;

    if (currentMins >= startTotal && currentMins <= endTotal) {
      const remaining = endTotal - currentMins;
      return {
        active: true,
        label: remaining <= 60 ? `Counseling now (${remaining}m left)` : 'Counseling available now',
        tone: 'success',
      };
    }
    if (currentMins < startTotal) {
      return {
        active: false,
        label: `Counseling today at ${timeMatch[1]}:${timeMatch[2] || '00'} ${startAmpm}`,
        tone: 'info',
      };
    }
  }

  if (isToday) {
    return { active: false, label: 'Counseling scheduled today', tone: 'info' };
  }

  const firstSlot = counselingHours.split('|')[0].trim();
  return { active: false, label: firstSlot, tone: 'muted' };
}

export function PersonBadges({ f, C }: { f: FacultyMember; C: Colors }) {
  const t = useT();
  if (!f.is_chairman && !f.on_leave && !f.blood_group) return null;
  return (
    <View style={styles.badges}>
      {f.is_chairman && (
        <View style={[styles.badge, { backgroundColor: C.infoBg }]}>
          <Feather name="star" size={11} color={C.info} />
          <Text style={[styles.badgeTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>{t.faculty2.chairmanBadge}</Text>
        </View>
      )}
      {f.on_leave && (
        <View style={[styles.badge, { backgroundColor: C.warnBg }]}>
          <Feather name="send" size={11} color={C.warn} />
          <Text style={[styles.badgeTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>{t.manage.onLeave}</Text>
        </View>
      )}
      {f.blood_group && (
        <View style={[styles.badge, { backgroundColor: C.dangerBg }]}>
          <Feather name="droplet" size={11} color={C.danger} />
          <Text style={[styles.badgeTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>{f.blood_group}</Text>
        </View>
      )}
    </View>
  );
}

export interface TeacherBarProps {
  f: FacultyMember;
  deptName?: string | null;
  saved?: boolean;
  onToggleSave?: () => void;
  onOpen: () => void;
  C: Colors;
  goldColor?: string;
}

function TeacherBarComponent({
  f,
  deptName,
  saved,
  onToggleSave,
  onOpen,
  C,
  goldColor = Accent.gold,
}: TeacherBarProps) {
  const t = useT();
  const status = getCounselingStatus(f.counseling_hours, f.on_leave);
  const cleanBuilding = f.building
    ? f.building.replace(/:\s*Martyr.*$/i, '').replace(/\(Main Building\)/i, '').replace(/-/g, ' ').trim()
    : null;
  const location = [
    cleanBuilding,
    f.room_number ? (f.room_number.toLowerCase().startsWith('rm') ? f.room_number : `Rm ${f.room_number}`) : null,
  ].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={[styles.teacherBar, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={onOpen}
      activeOpacity={0.75}
    >
      <View style={styles.barAvatarWrap}>
        <Avatar uri={f.photo_url} name={f.name} size="md" />
        {status?.active && (
          <View style={[styles.activeDot, { backgroundColor: C.success, borderColor: C.surface }]} />
        )}
      </View>

      <View style={styles.barBody}>
        <View style={styles.barNameRow}>
          <Text style={[styles.barName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {f.name}
          </Text>
          {f.short_code ? (
            <View style={[styles.codeBadge, { backgroundColor: `${FACULTY_ACCENT}16` }]}>
              <Text style={[styles.codeBadgeTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaExtraBold }]}>
                {f.short_code}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.barDesig, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
          {f.designation}{deptName ? ` · ${shortDept(deptName)}` : ''}
        </Text>

        <View style={styles.barMetaRow}>
          {f.is_chairman ? (
            <View style={[styles.miniBadge, { backgroundColor: C.infoBg }]}>
              <Feather name="star" size={10} color={C.info} />
              <Text style={[styles.miniBadgeTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>
                {t.faculty2.chairmanBadge}
              </Text>
            </View>
          ) : null}

          {f.on_leave ? (
            <View style={[styles.miniBadge, { backgroundColor: C.warnBg }]}>
              <Text style={[styles.miniBadgeTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                {t.manage.onLeave}
              </Text>
            </View>
          ) : null}

          {status?.active ? (
            <View style={[styles.miniBadge, { backgroundColor: C.successBg }]}>
              <Text style={[styles.miniBadgeTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                {t.faculty2.counselingAvailableNow}
              </Text>
            </View>
          ) : null}

          {location.length > 0 && !f.on_leave && (
            <View style={styles.barLocRow}>
              <Icon name="pin" size={11} color={C.textMuted} />
              <Text style={[styles.barLocTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}

          {f.courses_taught && f.courses_taught.length > 0 && f.courses_taught[0] ? (
            <View style={[styles.miniBadge, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
              <Feather name="book" size={9} color={FACULTY_ACCENT} />
              <Text style={[styles.miniBadgeTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {f.courses_taught[0].split(/\s*[-–—:]\s*/)[0].trim()}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.barRightSlot}>
        {onToggleSave && saved !== undefined ? (
          <TouchableOpacity style={styles.starTouch} onPress={onToggleSave} hitSlop={10} activeOpacity={0.7}>
            <AnimatedIcon
              name="star"
              size={17}
              color={saved ? goldColor : C.textMuted}
              animation={saved ? 'spring' : 'none'}
            />
          </TouchableOpacity>
        ) : (
          <Icon name="chevR" size={16} color={C.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export const TeacherBar = React.memo(TeacherBarComponent);

interface FacultyCardProps {
  f: FacultyMember;
  deptName?: string | null;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
  onContact?: () => void;
  C: Colors;
  goldColor: string;
  isDark?: boolean;
}

export function FacultyCard({
  f,
  deptName,
  saved,
  onToggleSave,
  onOpen,
  onContact,
  C,
  goldColor,
  isDark = false,
}: FacultyCardProps) {
  const t = useT();
  const interests = interestsOf(f);
  const status = getCounselingStatus(f.counseling_hours, f.on_leave);
  const cleanBuilding = f.building
    ? f.building.replace(/:\s*Martyr.*$/i, '').replace(/\(Main Building\)/i, '').replace(/-/g, ' ').trim()
    : null;
  const location = [
    cleanBuilding,
    f.room_number ? (f.room_number.toLowerCase().startsWith('rm') ? f.room_number : `Room ${f.room_number}`) : null,
    f.floor ? `(${f.floor})` : null,
  ].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={onOpen}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          <Avatar uri={f.photo_url} name={f.name} size="md" />
          {status?.active && (
            <View style={[styles.activeDot, { backgroundColor: C.success, borderColor: C.surface }]} />
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
              {f.name}
            </Text>
            {f.short_code ? (
              <View style={[styles.codeBadge, { backgroundColor: `${FACULTY_ACCENT}18` }]}>
                <Text style={[styles.codeBadgeTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {f.short_code}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.cardDesig, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {f.designation}{deptName ? ` · ${shortDept(deptName)}` : ''}
          </Text>

          {location.length > 0 ? (
            <View style={styles.locRow}>
              <Icon name="pin" size={12} color={C.textMuted} />
              <Text style={[styles.locTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}

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
                numberOfLines={1}
              >
                {status.label}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={onToggleSave} activeOpacity={0.75} hitSlop={8}>
          <Feather name="star" size={18} color={saved ? goldColor : C.textMuted} />
        </TouchableOpacity>
      </View>

      <PersonBadges f={f} C={C} />

      {interests.length > 0 && (
        <View style={styles.pills}>
          {interests.slice(0, 3).map(i => (
            <View key={i} style={[styles.pill, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
              <Text style={[styles.pillTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {i}
              </Text>
            </View>
          ))}
          {interests.length > 3 && (
            <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.pillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                +{interests.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      {f.courses_taught && f.courses_taught.length > 0 && (
        <View style={styles.pills}>
          {f.courses_taught.filter(Boolean).slice(0, 2).map((c, idx) => (
            <View key={`${c}-${idx}`} style={[styles.pill, { backgroundColor: C.surface2, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
              <Feather name="book" size={10} color={FACULTY_ACCENT} />
              <Text style={[styles.pillTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {c.split(/\s*[-–—:]\s*/)[0].trim()}
              </Text>
            </View>
          ))}
          {f.courses_taught.filter(Boolean).length > 2 && (
            <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.pillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                +{f.courses_taught.filter(Boolean).length - 2} courses
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.cardFoot, { borderTopColor: C.border }]}>
        <View style={styles.footActions}>
          {f.email ? (
            <TouchableOpacity
              style={[styles.footActionBtn, { backgroundColor: C.surface2 }]}
              onPress={() => openUrl(`mailto:${f.email}`)}
              activeOpacity={0.7}
            >
              <Feather name="mail" size={13} color={C.text2} />
              <Text style={[styles.footActionTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.faculty2.email}</Text>
            </TouchableOpacity>
          ) : null}

          {onContact ? (
            <TouchableOpacity
              style={[styles.footActionBtn, { backgroundColor: C.surface2 }]}
              onPress={onContact}
              activeOpacity={0.7}
            >
              <Feather name="phone" size={13} color={C.text2} />
              <Text style={[styles.footActionTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.faculty2.contact}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Icon name="chevR" size={16} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  } as ViewStyle,
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  } as ViewStyle,
  avatarWrap: {
    position: 'relative',
  } as ViewStyle,
  activeDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  } as ViewStyle,
  cardBody: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  } as ViewStyle,
  cardName: {
    fontSize: 15,
    flexShrink: 1,
  } as TextStyle,
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  } as ViewStyle,
  codeBadgeTxt: {
    fontSize: 10.5,
    letterSpacing: 0.4,
  } as TextStyle,
  cardDesig: {
    fontSize: 12.5,
    marginTop: 2,
  } as TextStyle,
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  } as ViewStyle,
  locTxt: {
    fontSize: 11.5,
  } as TextStyle,
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
  } as ViewStyle,
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  statusTxt: {
    fontSize: 11,
  } as TextStyle,
  saveBtn: {
    padding: 4,
  } as ViewStyle,

  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  } as ViewStyle,
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  } as ViewStyle,
  badgeTxt: {
    fontSize: 11,
  } as TextStyle,

  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  } as ViewStyle,
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    maxWidth: '100%',
  } as ViewStyle,
  pillTxt: {
    fontSize: 11,
  } as TextStyle,

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
  } as ViewStyle,
  footActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  footActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  } as ViewStyle,
  footActionTxt: {
    fontSize: 12,
  } as TextStyle,

  // Universal 72dp Content Card Standard (44dp avatar + 14dp top + 14dp bottom = 72dp)
  teacherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 13,
  } as ViewStyle,
  barAvatarWrap: {
    position: 'relative',
  } as ViewStyle,
  barBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,
  barNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  barName: {
    fontSize: 14.5,
    flexShrink: 1,
  } as TextStyle,
  barDesig: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  barMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  } as ViewStyle,
  miniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  } as ViewStyle,
  miniBadgeTxt: {
    fontSize: 10,
  } as TextStyle,
  barLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  } as ViewStyle,
  barLocTxt: {
    fontSize: 11,
  } as TextStyle,
  barRightSlot: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  } as ViewStyle,
  starTouch: {
    padding: 6,
  } as ViewStyle,
});
