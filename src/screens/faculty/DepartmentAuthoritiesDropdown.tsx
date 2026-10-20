// Department Authorities Dropdown Component.
// Universal 72dp Content Card Standard trigger that expands into clean 72dp teacher bars,
// matching the exact look and feel of the directory roster. Tapping any bar navigates
// directly to that authority's full teacher profile.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, UIManager, LayoutAnimation,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../../components/ui/Avatar';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { FontFamily, SectorColors, Radius } from '../../theme';
import { openUrl } from '../../utils/link';
import {
  getDepartmentAuthorities,
  type DepartmentAuthority,
} from './departmentAuthoritiesData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FACULTY_ACCENT = SectorColors.faculty;

interface Props {
  deptNumber?: string | null;
  deptName?: string | null;
  deptChairmanName?: string | null;
  roster: Array<{
    id: string;
    name: string;
    designation: string;
    photo_url?: string | null;
    email?: string | null;
    phone?: string | null;
    cell_phone?: string | null;
    room_number?: string | null;
    building?: string | null;
    counseling_hours?: string | null;
    is_chairman?: boolean;
  }>;
  navigation: any;
}

export function DepartmentAuthoritiesDropdown({
  deptNumber,
  deptName,
  deptChairmanName,
  roster,
  navigation,
}: Props) {
  const { C, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const authorities = getDepartmentAuthorities(
    deptNumber,
    deptName,
    deptChairmanName,
    roster
  );

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }

  const roleBadgeStyle = (type: DepartmentAuthority['roleType']): { bg: string; border: string; text: string; icon: keyof typeof Feather.glyphMap } => {
    switch (type) {
      case 'chairman':
        return {
          bg: C.infoBg,
          border: `${C.info}35`,
          text: C.info,
          icon: 'star',
        };
      case 'proctor':
        return {
          bg: C.warnBg,
          border: `${C.warn}35`,
          text: C.warn,
          icon: 'shield',
        };
      case 'dean':
        return {
          bg: isDark ? 'rgba(139, 92, 246, 0.16)' : '#ede9fe',
          border: isDark ? 'rgba(139, 92, 246, 0.35)' : '#ddd6fe',
          text: isDark ? '#a78bfa' : '#7c3aed',
          icon: 'award',
        };
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
        },
      ]}
    >
      {/* Universal 72dp Trigger Bar (minHeight: 72, padding: 14) */}
      <TouchableOpacity
        style={[
          styles.triggerBar,
          expanded && { borderBottomWidth: 1, borderBottomColor: C.border },
        ]}
        onPress={toggle}
        activeOpacity={0.75}
      >
        <View style={[styles.iconTile, { backgroundColor: `${FACULTY_ACCENT}14` }]}>
          <AnimatedIcon
            family="feather"
            name="shield"
            size={22}
            color={FACULTY_ACCENT}
            animation="entrance"
          />
        </View>

        <View style={styles.barCenter}>
          <Text
            style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
            numberOfLines={1}
          >
            Department Authorities
          </Text>
          <Text
            style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
            numberOfLines={1}
          >
            Chairman · Asst. Proctor · Dean
          </Text>
        </View>

        <View style={styles.rightSlot}>
          <View style={[styles.pillBadge, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Text style={[styles.pillBadgeTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {authorities.length} Roles
            </Text>
          </View>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={C.textMuted}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Accordion Body - Clean 72dp Bars */}
      {expanded && (
        <View style={styles.expandedBody}>
          <View style={styles.sectionHeader}>
            <Feather name="info" size={12} color={FACULTY_ACCENT} />
            <Text
              style={[
                styles.sectionHeaderText,
                { color: C.textMuted, fontFamily: FontFamily.jakartaBold },
              ]}
            >
              DEPARTMENT DECISION MAKERS (TAP TO VIEW PROFILE)
            </Text>
          </View>

          {authorities.map((auth, idx) => {
            const badge = roleBadgeStyle(auth.roleType);
            const cleanBuilding = auth.building
              ? auth.building.replace(/:\s*Martyr.*$/i, '').replace(/\(Main Building\)/i, '').trim()
              : null;
            const location = [
              cleanBuilding,
              auth.room ? (auth.room.toLowerCase().startsWith('rm') ? auth.room : `Rm ${auth.room}`) : null,
            ].filter(Boolean).join(' · ');

            return (
              <TouchableOpacity
                key={`${auth.roleType}-${idx}`}
                style={[
                  styles.authorityBar,
                  {
                    backgroundColor: C.surface2,
                    borderColor: C.border,
                  },
                ]}
                onPress={() => {
                  if (auth.facultyId) {
                    navigation.navigate('FacultyProfile', { facultyId: auth.facultyId });
                  } else if (auth.email) {
                    openUrl(`mailto:${auth.email}`);
                  }
                }}
                activeOpacity={0.75}
              >
                <Avatar uri={auth.photoUrl} name={auth.name} size="md" />

                <View style={styles.authorityInfoCol}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.authorityName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                      numberOfLines={1}
                    >
                      {auth.name}
                    </Text>

                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor: badge.bg,
                          borderColor: badge.border,
                        },
                      ]}
                    >
                      <Feather name={badge.icon} size={10} color={badge.text} />
                      <Text
                        style={[
                          styles.roleBadgeText,
                          { color: badge.text, fontFamily: FontFamily.jakartaBold },
                        ]}
                      >
                        {auth.badgeLabel}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.authorityDesig,
                      { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                    ]}
                    numberOfLines={1}
                  >
                    {auth.designation}
                  </Text>

                  <View style={styles.metaRow}>
                    <Feather name="zap" size={10} color={FACULTY_ACCENT} style={{ marginRight: 3.5 }} />
                    <Text
                      style={[
                        styles.powersSummary,
                        { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaMedium },
                      ]}
                      numberOfLines={1}
                    >
                      {auth.powers[0] || 'Department Leadership'}
                    </Text>
                    {location.length > 0 && (
                      <Text
                        style={[
                          styles.locationTxt,
                          { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
                        ]}
                        numberOfLines={1}
                      >
                        · {location}
                      </Text>
                    )}
                  </View>
                </View>

                <Feather name="chevron-right" size={17} color={C.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  } as ViewStyle,

  // Universal 72dp Trigger Bar (minHeight: 72, padding: 14)
  triggerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 72,
    padding: 14,
  } as ViewStyle,

  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  barCenter: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  barTitle: {
    fontSize: 14.5,
  } as TextStyle,

  barSubtitle: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,

  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,

  pillBadgeTxt: {
    fontSize: 11,
  } as TextStyle,

  // Expanded Accordion Content
  expandedBody: {
    padding: 12,
    paddingTop: 10,
  } as ViewStyle,

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  } as ViewStyle,

  sectionHeaderText: {
    fontSize: 10.5,
    letterSpacing: 0.5,
  } as TextStyle,

  // Universal 72dp Teacher Bar for Authorities
  authorityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 72,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,

  authorityInfoCol: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  } as ViewStyle,

  authorityName: {
    fontSize: 14,
    flex: 1,
  } as TextStyle,

  authorityDesig: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  } as ViewStyle,

  powersSummary: {
    fontSize: 11,
    flexShrink: 1,
  } as TextStyle,

  locationTxt: {
    fontSize: 11,
    flexShrink: 0,
  } as TextStyle,

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  } as ViewStyle,

  roleBadgeText: {
    fontSize: 10,
  } as TextStyle,
});
