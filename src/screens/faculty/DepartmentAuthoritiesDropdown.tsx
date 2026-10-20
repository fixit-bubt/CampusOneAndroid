// Department Authorities Dropdown Component.
// Universal 72dp Content Card Standard trigger that expands into an actionable
// breakdown of the department's Chairman, Assistant Proctor, and Faculty Dean,
// showing students exactly who holds what authority and what they can approve.

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

// Enable LayoutAnimation on Android
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

      {/* Expanded Accordion Body */}
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
              KEY DECISION MAKERS FOR THIS DEPARTMENT
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
              <View
                key={`${auth.roleType}-${idx}`}
                style={[
                  styles.authCard,
                  {
                    backgroundColor: C.surface2,
                    borderColor: C.border,
                  },
                ]}
              >
                {/* Top Info Row */}
                <View style={styles.cardTopRow}>
                  <Avatar uri={auth.photoUrl} name={auth.name} size="sm" />

                  <View style={styles.cardInfoCol}>
                    <Text
                      style={[styles.cardName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                      numberOfLines={1}
                    >
                      {auth.name}
                    </Text>
                    <Text
                      style={[
                        styles.cardDesig,
                        { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                      ]}
                      numberOfLines={1}
                    >
                      {auth.designation}
                    </Text>

                    {location.length > 0 && (
                      <View style={styles.locationRow}>
                        <Feather name="map-pin" size={10} color={C.textMuted} />
                        <Text
                          style={[
                            styles.locationText,
                            { color: C.text2, fontFamily: FontFamily.jakartaRegular },
                          ]}
                          numberOfLines={1}
                        >
                          {location}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Role Badge */}
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

                {/* Powers / What they handle box */}
                <View style={[styles.powersBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.powersTitleRow}>
                    <Feather name="zap" size={11} color={FACULTY_ACCENT} />
                    <Text
                      style={[
                        styles.powersTitle,
                        { color: C.textMuted, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      Authorised to approve:
                    </Text>
                  </View>

                  {auth.powers.map((p, pIdx) => (
                    <View key={pIdx} style={styles.powerItemRow}>
                      <Text style={[styles.powerBullet, { color: FACULTY_ACCENT }]}>•</Text>
                      <Text
                        style={[
                          styles.powerItemText,
                          { color: C.text, fontFamily: FontFamily.jakartaRegular },
                        ]}
                      >
                        {p}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActionsRow}>
                  {auth.email && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={() => openUrl(`mailto:${auth.email}`)}
                      activeOpacity={0.7}
                    >
                      <Feather name="mail" size={12} color={C.text} />
                      <Text
                        style={[
                          styles.actionBtnTxt,
                          { color: C.text, fontFamily: FontFamily.jakartaMedium },
                        ]}
                      >
                        Email
                      </Text>
                    </TouchableOpacity>
                  )}

                  {auth.phone && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={() => openUrl(`tel:${auth.phone}`)}
                      activeOpacity={0.7}
                    >
                      <Feather name="phone" size={12} color={C.text} />
                      <Text
                        style={[
                          styles.actionBtnTxt,
                          { color: C.text, fontFamily: FontFamily.jakartaMedium },
                        ]}
                      >
                        Call
                      </Text>
                    </TouchableOpacity>
                  )}

                  {auth.facultyId && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: `${FACULTY_ACCENT}12`,
                          borderColor: `${FACULTY_ACCENT}28`,
                        },
                      ]}
                      onPress={() =>
                        navigation.navigate('FacultyProfile', { facultyId: auth.facultyId })
                      }
                      activeOpacity={0.7}
                    >
                      <Feather name="user" size={12} color={FACULTY_ACCENT} />
                      <Text
                        style={[
                          styles.actionBtnTxt,
                          { color: FACULTY_ACCENT, fontFamily: FontFamily.jakartaBold },
                        ]}
                      >
                        View Profile
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
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
    padding: 14,
    paddingTop: 12,
  } as ViewStyle,

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  } as ViewStyle,

  sectionHeaderText: {
    fontSize: 11,
    letterSpacing: 0.5,
  } as TextStyle,

  authCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  } as ViewStyle,

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,

  cardInfoCol: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  cardName: {
    fontSize: 13.5,
  } as TextStyle,

  cardDesig: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  } as ViewStyle,

  locationText: {
    fontSize: 11,
  } as TextStyle,

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  } as ViewStyle,

  roleBadgeText: {
    fontSize: 10.5,
  } as TextStyle,

  // Powers box
  powersBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 9,
    marginTop: 9,
  } as ViewStyle,

  powersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  } as ViewStyle,

  powersTitle: {
    fontSize: 11,
  } as TextStyle,

  powerItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  } as ViewStyle,

  powerBullet: {
    fontSize: 13,
    lineHeight: 16,
  } as TextStyle,

  powerItemText: {
    fontSize: 12,
    lineHeight: 16.5,
    flex: 1,
  } as TextStyle,

  // Action buttons
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  } as ViewStyle,

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
  } as ViewStyle,

  actionBtnTxt: {
    fontSize: 11.5,
  } as TextStyle,
});
