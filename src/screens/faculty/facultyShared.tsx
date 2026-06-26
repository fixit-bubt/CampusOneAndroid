// Shared faculty kit — types, sorting, branch icons, badges, and the
// teacher card used by the directory, department, and saved views.
import {
  View, Text, TouchableOpacity, StyleSheet,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../../components/ui/Avatar';
import { FontFamily, SectorColors } from '../../theme';
import { openUrl } from '../../utils/link';
import type { Colors } from '../../theme';

export const FACULTY_ACCENT = SectorColors.faculty;

export interface FacultyMember {
  id: string;
  department_id: string;
  name: string;
  designation: string;
  email: string | null;
  research_interests: string[] | null;
  on_leave: boolean;
  is_chairman: boolean;
  photo_url: string | null;
}

export interface Department {
  id: string;
  name: string;
  branch: string;
  chairman: string | null;
}

// Only branches that exist are shown.
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

// Rank order within a department (chairman always first).
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

export function PersonBadges({ f, C }: { f: FacultyMember; C: Colors }) {
  if (!f.is_chairman && !f.on_leave) return null;
  return (
    <View style={styles.badges}>
      {f.is_chairman && (
        <View style={[styles.badge, { backgroundColor: C.infoBg }]}>
          <Feather name="star" size={11} color={C.info} />
          <Text style={[styles.badgeTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>Chairman</Text>
        </View>
      )}
      {f.on_leave && (
        <View style={[styles.badge, { backgroundColor: C.warnBg }]}>
          <Feather name="send" size={11} color={C.warn} />
          <Text style={[styles.badgeTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>On leave</Text>
        </View>
      )}
    </View>
  );
}

interface FacultyCardProps {
  f: FacultyMember;
  deptName?: string | null;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
  C: Colors;
  goldColor: string;
}

export function FacultyCard({ f, deptName, saved, onToggleSave, onOpen, C, goldColor }: FacultyCardProps) {
  const interests = interestsOf(f);
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.cardTop}>
        <TouchableOpacity onPress={onOpen} activeOpacity={0.75}>
          <Avatar uri={f.photo_url} name={f.name} size="md" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cardBody} onPress={onOpen} activeOpacity={0.75}>
          <Text style={[styles.cardName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {f.name}
          </Text>
          <Text style={[styles.cardDesig, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {f.designation}
          </Text>
          {deptName ? (
            <Text style={[styles.cardDept, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              {shortDept(deptName)}
            </Text>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={onToggleSave} activeOpacity={0.75} hitSlop={6}>
          <Feather name="star" size={19} color={saved ? goldColor : C.textMuted} />
        </TouchableOpacity>
      </View>

      <PersonBadges f={f} C={C} />

      {interests.length > 0 && (
        <View style={styles.pills}>
          {interests.slice(0, 3).map(i => (
            <View key={i} style={[styles.pill, { backgroundColor: `${FACULTY_ACCENT}1a` }]}>
              <Text style={[styles.pillTxt, { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>{i}</Text>
            </View>
          ))}
          {interests.length > 3 && (
            <View style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.pillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>+{interests.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.cardFoot, { borderTopColor: C.border }]}>
        {f.email ? (
          <TouchableOpacity
            style={styles.emailLink}
            onPress={() => openUrl(`mailto:${f.email}`)}
            activeOpacity={0.7}
          >
            <Feather name="mail" size={13} color={C.textMuted} />
            <Text style={[styles.emailTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Email</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.emailTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>No email listed</Text>
        )}
        <TouchableOpacity
          style={[styles.profileBtn, { backgroundColor: C.surface2 }]}
          onPress={onOpen}
          activeOpacity={0.75}
        >
          <Text style={[styles.profileBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Profile</Text>
          <Feather name="arrow-right" size={13} color={C.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 13 } as ViewStyle,
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 } as ViewStyle,
  cardBody: { flex: 1, minWidth: 0 } as ViewStyle,
  cardName: { fontSize: 14.5 } as TextStyle,
  cardDesig: { fontSize: 12, marginTop: 2 } as TextStyle,
  cardDept: { fontSize: 11.5, marginTop: 1 } as TextStyle,
  saveBtn: { padding: 4 } as ViewStyle,

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 } as ViewStyle,
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 999 } as ViewStyle,
  badgeTxt: { fontSize: 11 } as TextStyle,

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 } as ViewStyle,
  pill: { paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 999, maxWidth: '100%' } as ViewStyle,
  pillTxt: { fontSize: 11 } as TextStyle,

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
  } as ViewStyle,
  emailLink: { flexDirection: 'row', alignItems: 'center', gap: 5 } as ViewStyle,
  emailTxt: { fontSize: 12 } as TextStyle,
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 } as ViewStyle,
  profileBtnTxt: { fontSize: 12.5 } as TextStyle,
});
