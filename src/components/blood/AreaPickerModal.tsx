import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  ScrollView, StyleSheet, Keyboard, KeyboardAvoidingView,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { DHAKA_AREAS, QUICK_CAMPUS_AREAS, type DhakaAreaInfo } from '../../constants/dhakaAreas';
import { useT } from '../../i18n';

interface AreaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedArea: string;
  onSelectArea: (area: string) => void;
  title?: string;
  areaCounts?: Record<string, number>;
  allowAll?: boolean;
}

type TypeFilterTab = 'all' | 'hospital' | 'area';

export function AreaPickerModal({
  visible,
  onClose,
  selectedArea,
  onSelectArea,
  title,
  areaCounts,
  allowAll = true,
}: AreaPickerModalProps) {
  const { C, isDark } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TypeFilterTab>('all');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setActiveTab('all');
    }
  }, [visible]);

  // Count totals for badges
  const totalHospitals = useMemo(() => DHAKA_AREAS.filter(a => a.type === 'hospital').length, []);
  const totalAreas = useMemo(() => DHAKA_AREAS.filter(a => a.type === 'area').length, []);

  // Filter pipeline: Search query + Category Tab
  const filteredAreas = useMemo(() => {
    let list = DHAKA_AREAS;

    // Filter by type tab if not 'all'
    if (activeTab === 'hospital') {
      list = list.filter(a => a.type === 'hospital');
    } else if (activeTab === 'area') {
      list = list.filter(a => a.type === 'area');
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter(a => {
      const matchName = a.name.toLowerCase().includes(q);
      const matchNameBn = a.nameBn.includes(q);
      const matchZone = a.zone.toLowerCase().includes(q) || a.zoneBn.includes(q);
      const matchKeywords = (a.keywords || []).some(k => k.toLowerCase().includes(q));
      return matchName || matchNameBn || matchZone || matchKeywords;
    });
  }, [search, activeTab]);

  // Group by zone
  const grouped = useMemo(() => {
    const map: Record<string, DhakaAreaInfo[]> = {};
    filteredAreas.forEach(a => {
      if (!map[a.zone]) map[a.zone] = [];
      map[a.zone].push(a);
    });
    return map;
  }, [filteredAreas]);

  if (!visible) return null;

  function handleSelect(areaName: string) {
    onSelectArea(areaName);
    onClose();
  }

  function handleClear() {
    onSelectArea('All');
    onClose();
  }

  const isFiltered = selectedArea && selectedArea !== 'All';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Grab Handle */}
          <View style={[styles.handle, { backgroundColor: C.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: `${SectorColors.blood}18` }]}>
                <Icon name="pin" size={17} color={SectorColors.blood} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {title ?? t.blood2.selectAreaTitle}
                </Text>
                <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {t.blood2.selectAreaSub}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: C.surface2 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color={C.text2} />
            </TouchableOpacity>
          </View>

          {/* Search Box with Clear Button */}
          <View style={[styles.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <TouchableOpacity
              onPress={() => searchInputRef.current?.focus()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="search" size={15} color={C.textMuted} />
            </TouchableOpacity>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              placeholder="Search hospital, clinic, or area (e.g. DMCH, Mirpur)..."
              placeholderTextColor={C.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={14} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Segment Filter Pills (All / Hospitals / Areas) */}
          <View style={styles.segmentTrack}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'all'
                  ? [styles.segmentBtnActive, { backgroundColor: SectorColors.blood, borderColor: SectorColors.blood }]
                  : [styles.segmentBtnInactive, { backgroundColor: C.surface2, borderColor: C.border }],
              ]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.segmentBtnTxt,
                  { color: activeTab === 'all' ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                All ({DHAKA_AREAS.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'hospital'
                  ? [styles.segmentBtnActive, { backgroundColor: SectorColors.blood, borderColor: SectorColors.blood }]
                  : [styles.segmentBtnInactive, { backgroundColor: C.surface2, borderColor: C.border }],
              ]}
              onPress={() => setActiveTab('hospital')}
              activeOpacity={0.75}
            >
              <Feather
                name="activity"
                size={12}
                color={activeTab === 'hospital' ? '#fff' : SectorColors.blood}
              />
              <Text
                style={[
                  styles.segmentBtnTxt,
                  { color: activeTab === 'hospital' ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                Hospitals ({totalHospitals})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'area'
                  ? [styles.segmentBtnActive, { backgroundColor: SectorColors.blood, borderColor: SectorColors.blood }]
                  : [styles.segmentBtnInactive, { backgroundColor: C.surface2, borderColor: C.border }],
              ]}
              onPress={() => setActiveTab('area')}
              activeOpacity={0.75}
            >
              <Icon
                name="pin"
                size={12}
                color={activeTab === 'area' ? '#fff' : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentBtnTxt,
                  { color: activeTab === 'area' ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                Areas ({totalAreas})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Campus Chips Bar (Top frequency locations) */}
          <View style={styles.quickChipsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsContent}
              keyboardShouldPersistTaps="handled"
            >
              {allowAll && (
                <TouchableOpacity
                  style={[
                    styles.quickChip,
                    !isFiltered
                      ? [styles.quickChipActive, { backgroundColor: `${SectorColors.blood}20`, borderColor: SectorColors.blood }]
                      : [styles.quickChipInactive, { backgroundColor: C.surface2, borderColor: C.border }],
                  ]}
                  onPress={handleClear}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.quickChipTxt,
                      { color: !isFiltered ? SectorColors.blood : C.textMuted, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    All Locations
                  </Text>
                </TouchableOpacity>
              )}

              {QUICK_CAMPUS_AREAS.filter(x => x !== 'All').map(chipName => {
                const isChipSelected = selectedArea.trim().toLowerCase() === chipName.trim().toLowerCase();
                const isChipHospital = chipName.includes('Hospital') || chipName.includes('DMCH');
                return (
                  <TouchableOpacity
                    key={chipName}
                    style={[
                      styles.quickChip,
                      isChipSelected
                        ? [styles.quickChipActive, { backgroundColor: `${SectorColors.blood}20`, borderColor: SectorColors.blood }]
                        : [styles.quickChipInactive, { backgroundColor: C.surface2, borderColor: C.border }],
                    ]}
                    onPress={() => handleSelect(chipName)}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 11, marginRight: 2 }}>{isChipHospital ? '🏥' : '📍'}</Text>
                    <Text
                      style={[
                        styles.quickChipTxt,
                        { color: isChipSelected ? SectorColors.blood : C.text, fontFamily: isChipSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium },
                      ]}
                      numberOfLines={1}
                    >
                      {chipName.split('(')[0].trim()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Area / Hospital List in Standalone Card Bars */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Custom query option if not matched exactly */}
            {search.trim().length > 1 && !DHAKA_AREAS.some(a => a.name.toLowerCase() === search.trim().toLowerCase()) && (
              <TouchableOpacity
                style={[styles.customRow, { backgroundColor: C.surface2, borderColor: SectorColors.blood }]}
                onPress={() => handleSelect(search.trim())}
                activeOpacity={0.75}
              >
                <View style={[styles.itemIconBox, { backgroundColor: `${SectorColors.blood}18` }]}>
                  <Icon name="pin" size={15} color={SectorColors.blood} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.customTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Filter by &ldquo;{search.trim()}&rdquo;
                  </Text>
                  <Text style={[styles.customSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    Custom hospital, clinic, or local landmark
                  </Text>
                </View>
                <Feather name="arrow-right" size={15} color={SectorColors.blood} />
              </TouchableOpacity>
            )}

            {/* Zero results message */}
            {filteredAreas.length === 0 && (
              <View style={styles.emptyContainer}>
                <Feather name="map-pin" size={28} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  No locations found
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  Try typing a different hospital name or area keyword.
                </Text>
              </View>
            )}

            {/* Grouped Zones with Individual Standalone Card Bars */}
            {Object.keys(grouped).map(zone => (
              <View key={zone} style={styles.zoneBlock}>
                <View style={styles.zoneHeaderRow}>
                  <Text style={[styles.zoneTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {zone.toUpperCase()}
                  </Text>
                  <View style={[styles.zoneCountBadge, { backgroundColor: C.surface2 }]}>
                    <Text style={[styles.zoneCountTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      {grouped[zone].length}
                    </Text>
                  </View>
                </View>

                {grouped[zone].map(item => {
                  const isSelected = selectedArea.trim().toLowerCase() === item.name.trim().toLowerCase();
                  const count = areaCounts ? areaCounts[item.name] : undefined;
                  const isHospital = item.type === 'hospital';

                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.areaCardBar,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)')
                            : C.surface,
                          borderColor: isSelected ? SectorColors.blood : C.border,
                          borderWidth: isSelected ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => handleSelect(item.name)}
                      activeOpacity={0.72}
                    >
                      {/* Left Icon Badge */}
                      <View
                        style={[
                          styles.itemIconBox,
                          {
                            backgroundColor: isHospital
                              ? (isDark ? 'rgba(199, 52, 74, 0.22)' : 'rgba(199, 52, 74, 0.1)')
                              : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                          },
                        ]}
                      >
                        {isHospital ? (
                          <Feather name="activity" size={15} color={SectorColors.blood} />
                        ) : (
                          <Icon name="pin" size={15} color={isSelected ? SectorColors.blood : C.text2} />
                        )}
                      </View>

                      {/* Title & Bengali Subtitle Stack */}
                      <View style={styles.itemInfoStack}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={[
                              styles.areaName,
                              {
                                color: isSelected ? SectorColors.blood : C.text,
                                fontFamily: FontFamily.jakartaBold,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {isHospital && (
                            <View style={[styles.typePill, { backgroundColor: `${SectorColors.blood}15` }]}>
                              <Text style={[styles.typePillTxt, { color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }]}>
                                Hospital
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.areaSubName,
                            { color: C.textMuted, fontFamily: FontFamily.bnRegular },
                          ]}
                          numberOfLines={1}
                        >
                          {item.nameBn}
                        </Text>
                      </View>

                      {/* Right Counter / Checkmark */}
                      <View style={styles.itemRight}>
                        {count !== undefined && count > 0 && (
                          <View style={[styles.countPill, { backgroundColor: isSelected ? `${SectorColors.blood}20` : C.surface2 }]}>
                            <Text
                              style={[
                                styles.countTxt,
                                {
                                  color: isSelected ? SectorColors.blood : C.textMuted,
                                  fontFamily: FontFamily.jakartaBold,
                                },
                              ]}
                            >
                              {count}
                            </Text>
                          </View>
                        )}
                        {isSelected ? (
                          <Feather name="check-circle" size={18} color={SectorColors.blood} />
                        ) : (
                          <Feather name="chevron-right" size={14} color={C.border} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View style={{ height: 28 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  } as ViewStyle,
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: Layout.screenPadding,
  } as ViewStyle,
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  } as ViewStyle,
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headerTitle: {
    fontSize: 16,
  } as TextStyle,
  headerSub: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    paddingVertical: 0,
  } as TextStyle,

  // Segment Tabs
  segmentTrack: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  } as ViewStyle,
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  segmentBtnActive: {} as ViewStyle,
  segmentBtnInactive: {} as ViewStyle,
  segmentBtnTxt: {
    fontSize: 11.5,
  } as TextStyle,

  // Quick Chips
  quickChipsWrapper: {
    marginBottom: 12,
  } as ViewStyle,
  quickChipsContent: {
    gap: 6,
    paddingVertical: 2,
  } as ViewStyle,
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  quickChipActive: {} as ViewStyle,
  quickChipInactive: {} as ViewStyle,
  quickChipTxt: {
    fontSize: 11.5,
  } as TextStyle,

  // List Scroll
  listScroll: {
    maxHeight: 460,
  } as ViewStyle,
  listContent: {
    paddingBottom: 20,
  } as ViewStyle,

  // Custom Search Query Row
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  } as ViewStyle,
  customTitle: {
    fontSize: 13.5,
  } as TextStyle,
  customSub: {
    fontSize: 11,
    marginTop: 1,
  } as TextStyle,

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 15,
  } as TextStyle,
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  } as TextStyle,

  // Zone Blocks
  zoneBlock: {
    marginBottom: 14,
  } as ViewStyle,
  zoneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  } as ViewStyle,
  zoneTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
  } as TextStyle,
  zoneCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  } as ViewStyle,
  zoneCountTxt: {
    fontSize: 10,
  } as TextStyle,

  // Standalone Card Bars
  areaCardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
  } as ViewStyle,
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  } as ViewStyle,
  itemInfoStack: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  areaName: {
    fontSize: 13.5,
    flexShrink: 1,
  } as TextStyle,
  typePill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  } as ViewStyle,
  typePillTxt: {
    fontSize: 9.5,
  } as TextStyle,
  areaSubName: {
    fontSize: 11,
    marginTop: 2,
  } as TextStyle,
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  } as ViewStyle,
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  } as ViewStyle,
  countTxt: {
    fontSize: 11,
  } as TextStyle,
});
