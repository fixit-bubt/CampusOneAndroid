import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  FlatList, ScrollView, StyleSheet, Keyboard, KeyboardAvoidingView,
  Platform, type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { FontFamily, Layout, SectorColors, pillBg } from '../../theme';
import { DHAKA_AREAS, type DhakaAreaInfo } from '../../constants/dhakaAreas';
import { LocationPickerModal } from '../location/LocationPickerModal';
import { useT } from '../../i18n';
import type { Coordinates } from '../../services/locationService';
import { findMasterLocationByName } from '../../constants/dhakaMasterLocations';
import { resolveHospitalLocation } from '../../constants/dhakaHospitalCoords';

interface AreaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedArea: string;
  onSelectArea: (area: string, subLocation?: string, coords?: Coordinates) => void;
  title?: string;
  areaCounts?: Record<string, number>;
  allowAll?: boolean;
  initialTab?: 'all' | 'hospital' | 'area';
}

interface IndexedAreaItem extends DhakaAreaInfo {
  _searchKey: string;
}

const INDEXED_AREAS: IndexedAreaItem[] = DHAKA_AREAS.map(a => ({
  ...a,
  _searchKey: `${a.name.toLowerCase()} ${a.nameBn} ${(a.subLocation || '').toLowerCase()} ${a.zone.toLowerCase()} ${a.zoneBn} ${(a.keywords || []).join(' ').toLowerCase()}`,
}));

interface ZoneSummary {
  id: string;
  name: string;
  nameBn: string;
  subtitle: string;
  hospitals: IndexedAreaItem[];
  areas: IndexedAreaItem[];
}

const ZONE_METAS = [
  {
    id: 'mirpur',
    name: 'Mirpur & Campus',
    nameBn: 'মিরপুর ও ক্যাম্পাস এলাকা',
    subtitle: 'Mirpur 1, 2, 6, 10, Rupnagar, Pallabi',
  },
  {
    id: 'dhanmondi',
    name: 'Dhanmondi & West',
    nameBn: 'ধানমন্ডি ও পশ্চিম ঢাকা',
    subtitle: 'Panthapath, Green Rd, Shyamoli, Mohammadpur',
  },
  {
    id: 'shahbagh',
    name: 'Shahbagh & Central',
    nameBn: 'শাহবাগ ও কেন্দ্রীয় ঢাকা',
    subtitle: 'Agargaon, Farmgate, Tejgaon, Moghbazar',
  },
  {
    id: 'mohakhali',
    name: 'Mohakhali & Gulshan',
    nameBn: 'মহাখালী ও গুলশান',
    subtitle: 'Banani, Gulshan, Baridhara, Bashundhara',
  },
  {
    id: 'uttara',
    name: 'Uttara & North',
    nameBn: 'উত্তরা ও উত্তর ঢাকা',
    subtitle: 'Uttara Sectors, Airport, Ashkona, Diabari',
  },
  {
    id: 'old_dhaka',
    name: 'Old Dhaka & Sadarghat',
    nameBn: 'পুরান ঢাকা ও সদরঘাট',
    subtitle: 'Wari, Lalbagh, Armanitola, Chawkbazar',
  },
  {
    id: 'motijheel',
    name: 'Motijheel & East',
    nameBn: 'মতিঝিল ও পূর্ব ঢাকা',
    subtitle: 'Khilgaon, Rampura, Banasree, Jatrabari',
  },
  {
    id: 'suburbs',
    name: 'Greater Dhaka & Suburbs',
    nameBn: 'বৃহত্তর ঢাকা ও শহরতলি',
    subtitle: 'Savar, Gazipur, Keraniganj, Narayanganj',
  },
];

const ZONE_DATA: ZoneSummary[] = ZONE_METAS.map(meta => {
  const matching = INDEXED_AREAS.filter(a => {
    const z = a.zone.toLowerCase();
    if (meta.id === 'mirpur') return z.includes('mirpur');
    if (meta.id === 'dhanmondi') return z.includes('dhanmondi');
    if (meta.id === 'shahbagh') return z.includes('shahbagh');
    if (meta.id === 'mohakhali') return z.includes('mohakhali');
    if (meta.id === 'uttara') return z.includes('uttara');
    if (meta.id === 'old_dhaka') return z.includes('old dhaka');
    if (meta.id === 'motijheel') return z.includes('motijheel');
    return z.includes('greater') || z.includes('suburbs');
  });

  return {
    ...meta,
    hospitals: matching.filter(a => a.type === 'hospital'),
    areas: matching.filter(a => a.type !== 'hospital'),
  };
});

// -------------------------------------------------------------
// AREA SECTION BAR COMPONENT (Explore-style with Line & Stats)
// -------------------------------------------------------------
const AreaSectionBar = memo(function AreaSectionBar({
  zone,
  isOpen,
  onToggle,
  onSelectArea,
  onSelectHospital,
  selectedArea,
  C,
  isDark,
}: {
  zone: ZoneSummary;
  isOpen: boolean;
  onToggle: () => void;
  onSelectArea: (area: string, subLocation?: string) => void;
  onSelectHospital: (hospital: string, subLocation?: string) => void;
  selectedArea: string;
  C: any;
  isDark: boolean;
}) {
  const isSelected = selectedArea.trim().toLowerCase() === zone.name.trim().toLowerCase();
  const activeColor = SectorColors.blood;
  const activeBorderColor = isOpen
    ? (isDark ? `${activeColor}85` : `${activeColor}65`)
    : isSelected
      ? activeColor
      : C.border;

  return (
    <View style={styles.zoneWrapper}>
      {/* 72dp Explore-style Area Bar */}
      <TouchableOpacity
        style={[
          styles.areaCardBar,
          {
            backgroundColor: isSelected
              ? (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)')
              : C.surface,
            borderColor: activeBorderColor,
            borderWidth: isOpen || isSelected ? 1.5 : 1,
          },
        ]}
        onPress={onToggle}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.itemIconBox,
            {
              backgroundColor: pillBg(activeColor, isDark),
            },
          ]}
        >
          <AnimatedIcon
            family="feather"
            name="map-pin"
            size={20}
            color={activeColor}
            animation={isOpen ? 'spring' : 'entrance'}
          />
        </View>

        <View style={styles.itemInfoStack}>
          <Text
            style={[
              styles.areaName,
              {
                color: C.text,
                fontFamily: FontFamily.jakartaBold,
              },
            ]}
            numberOfLines={1}
          >
            {zone.name}
          </Text>
          <Text
            style={[
              styles.areaSubName,
              { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
            ]}
            numberOfLines={1}
          >
            {zone.subtitle}
          </Text>
        </View>

        {/* 1px Vertical Divider Line (Explore Screen Pattern) */}
        <View style={[styles.verticalDivider, { backgroundColor: C.border }]} />

        {/* Stat Column (Explore Screen Pattern) */}
        <View style={styles.statCol}>
          <Text
            style={[
              styles.statVal,
              {
                color: activeColor,
                fontFamily: FontFamily.jakartaExtraBold,
              },
            ]}
          >
            {zone.hospitals.length}
          </Text>
          <Text
            style={[
              styles.statSub,
              {
                color: C.textMuted,
                fontFamily: FontFamily.jakartaBold,
              },
            ]}
          >
            HOSPITALS
          </Text>
        </View>

        {/* Far Right Animated Chevron */}
        <View style={styles.chevronWrap}>
          <AnimatedIcon
            family="feather"
            name={isOpen ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={isOpen ? activeColor : C.textMuted}
            animation={isOpen ? 'spring' : 'none'}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Child Container: Select Entire Area + Hospitals (Explore-style with Left Accent Line) */}
      {isOpen && (
        <View style={styles.expandedChildContainer}>
          {/* Select Entire Area Card (72dp) */}
          <TouchableOpacity
            style={[
              styles.childHospitalCard,
              {
                backgroundColor: isSelected
                  ? (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)')
                  : C.surface,
                borderColor: isSelected ? activeColor : C.border,
                borderLeftColor: activeColor,
              },
            ]}
            onPress={() => onSelectArea(zone.name, zone.name)}
            activeOpacity={0.72}
          >
            <View
              style={[
                styles.childIconBox,
                {
                  backgroundColor: pillBg(activeColor, isDark),
                },
              ]}
            >
              <AnimatedIcon family="feather" name="map" size={18} color={activeColor} animation="entrance" />
            </View>
            <View style={styles.childInfoStack}>
              <Text
                style={[
                  styles.childHospitalName,
                  { color: C.text, fontFamily: FontFamily.jakartaBold },
                ]}
                numberOfLines={1}
              >
                Select Entire {zone.name}
              </Text>
              <Text
                style={[
                  styles.childHospitalSub,
                  { color: C.textMuted, fontFamily: FontFamily.bnRegular },
                ]}
                numberOfLines={1}
              >
                {zone.nameBn} · সকল হাসপাতাল ও এলাকা
              </Text>
            </View>
            {isSelected ? (
              <AnimatedIcon family="feather" name="check-circle" size={18} color={activeColor} animation="spring" />
            ) : (
              <Feather name="chevron-right" size={16} color={activeColor} />
            )}
          </TouchableOpacity>

          {/* Hospitals inside this Area (Each 72dp with Explore Left Stripe & Restored Hospital Colors) */}
          {zone.hospitals.map((h, idx) => {
            const isHospSelected = selectedArea.trim().toLowerCase() === h.name.trim().toLowerCase();
            const subtitleText = h.subLocation ? `${h.subLocation} · ${h.nameBn}` : h.nameBn;

            return (
              <TouchableOpacity
                key={h.name}
                style={[
                  styles.childHospitalCard,
                  {
                    backgroundColor: isHospSelected
                      ? (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)')
                      : C.surface,
                    borderColor: isHospSelected ? activeColor : C.border,
                    borderLeftColor: activeColor,
                  },
                ]}
                onPress={() => onSelectHospital(h.name, h.subLocation || zone.name)}
                activeOpacity={0.72}
              >
                <View
                  style={[
                    styles.childIconBox,
                    {
                      backgroundColor: pillBg(activeColor, isDark),
                    },
                  ]}
                >
                  <AnimatedIcon
                    family="mci"
                    name="hospital-building"
                    size={20}
                    color={isDark ? '#ffffff' : activeColor}
                    animation="entrance"
                    delay={idx * 25}
                  />
                </View>
                <View style={styles.childInfoStack}>
                  <Text
                    style={[
                      styles.childHospitalName,
                      { color: C.text, fontFamily: FontFamily.jakartaBold },
                    ]}
                    numberOfLines={1}
                  >
                    {h.name}
                  </Text>
                  <Text
                    style={[
                      styles.childHospitalSub,
                      { color: C.textMuted, fontFamily: FontFamily.bnRegular },
                    ]}
                    numberOfLines={1}
                  >
                    {subtitleText}
                  </Text>
                </View>
                {isHospSelected ? (
                  <AnimatedIcon family="feather" name="check-circle" size={18} color={activeColor} animation="spring" />
                ) : (
                  <Feather name="chevron-right" size={16} color={activeColor} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
});

// -------------------------------------------------------------
// SEARCH RESULT ITEM COMPONENT (72dp with Explore Left Stripe)
// -------------------------------------------------------------
const SearchResultRow = memo(function SearchResultRow({
  item,
  isSelected,
  onSelect,
  C,
  isDark,
}: {
  item: DhakaAreaInfo;
  isSelected: boolean;
  onSelect: (name: string, subLocation?: string) => void;
  C: any;
  isDark: boolean;
}) {
  const isHospital = item.type === 'hospital';
  const subtitleText = item.subLocation ? `${item.subLocation} · ${item.nameBn}` : item.nameBn;
  const activeColor = SectorColors.blood;

  return (
    <TouchableOpacity
      style={[
        styles.childHospitalCard,
        {
          backgroundColor: isSelected
            ? (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)')
            : C.surface,
          borderColor: isSelected ? activeColor : C.border,
          borderLeftColor: activeColor,
        },
      ]}
      onPress={() => onSelect(item.name, item.subLocation)}
      activeOpacity={0.72}
    >
      <View
        style={[
          styles.childIconBox,
          {
            backgroundColor: pillBg(activeColor, isDark),
          },
        ]}
      >
        {isHospital ? (
          <AnimatedIcon family="mci" name="hospital-building" size={20} color={isDark ? '#ffffff' : activeColor} animation="entrance" />
        ) : (
          <AnimatedIcon family="feather" name="map-pin" size={18} color={activeColor} animation="entrance" />
        )}
      </View>

      <View style={styles.childInfoStack}>
        <Text
          style={[
            styles.childHospitalName,
            {
              color: C.text,
              fontFamily: FontFamily.jakartaBold,
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[
            styles.childHospitalSub,
            { color: C.textMuted, fontFamily: FontFamily.bnRegular },
          ]}
          numberOfLines={1}
        >
          {subtitleText}
        </Text>
      </View>

      {isSelected ? (
        <AnimatedIcon family="feather" name="check-circle" size={18} color={activeColor} animation="spring" />
      ) : (
        <Feather name="chevron-right" size={16} color={activeColor} />
      )}
    </TouchableOpacity>
  );
});

// -------------------------------------------------------------
// MAIN MODAL COMPONENT
// -------------------------------------------------------------
export function AreaPickerModal({
  visible,
  onClose,
  selectedArea,
  onSelectArea,
  title = 'Hospitals & Areas',
}: AreaPickerModalProps) {
  const { C, isDark } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [openZoneId, setOpenZoneId] = useState<string | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      // Auto-open the zone if the currently selected area belongs to it
      if (selectedArea && selectedArea !== 'All') {
        const found = INDEXED_AREAS.find(a => a.name.toLowerCase() === selectedArea.toLowerCase());
        if (found) {
          const zMatch = ZONE_METAS.find(m => found.zone.toLowerCase().includes(m.id));
          if (zMatch) setOpenZoneId(zMatch.id);
        }
      }
    }
  }, [visible, selectedArea]);

  const toggleZone = useCallback((zoneId: string) => {
    setOpenZoneId(prev => (prev === zoneId ? null : zoneId));
  }, []);

  const handleSelect = useCallback((areaName: string, subLoc?: string, explicitCoords?: Coordinates) => {
    let resolvedCoords = explicitCoords;
    if (!resolvedCoords && areaName && areaName !== 'All') {
      const match = findMasterLocationByName(areaName) || resolveHospitalLocation(areaName, subLoc);
      if (match?.coords) {
        resolvedCoords = match.coords;
      }
    }
    onSelectArea(areaName, subLoc, resolvedCoords);
    onClose();
  }, [onSelectArea, onClose]);

  // Fast search results
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return INDEXED_AREAS.filter(a => a._searchKey.includes(q));
  }, [search]);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Grab Handle */}
            <View style={[styles.handle, { backgroundColor: C.border }]} />

            {/* Header: Standardized "Hospitals & Areas" */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: pillBg(SectorColors.blood, isDark) }]}>
                  <AnimatedIcon family="feather" name="map-pin" size={17} color={SectorColors.blood} animation="entrance" />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {title}
                  </Text>
                  <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    Select hospital or area in Dhaka
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={16} color={C.text2} />
              </TouchableOpacity>
            </View>

            {/* 58dp Clean Interactive Map & GPS Trigger */}
            <TouchableOpacity
              style={[
                styles.mapTriggerCard58,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => setMapPickerOpen(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.mapTriggerIconWrap, { backgroundColor: pillBg(SectorColors.blood, isDark) }]}>
                <AnimatedIcon family="feather" name="map" size={18} color={SectorColors.blood} animation="entrance" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mapTriggerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Pick Hospital or Area on Map
                </Text>
                <Text style={[styles.mapTriggerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Pinpoint exact location or auto-detect with device GPS
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={SectorColors.blood} />
            </TouchableOpacity>

            {/* Search Box (Standard 58dp) */}
            <View style={[styles.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <TouchableOpacity
                onPress={() => searchInputRef.current?.focus()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AnimatedIcon family="feather" name="search" size={18} color={SectorColors.blood} animation="entrance" />
              </TouchableOpacity>
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder="Search hospital or area (e.g. DMCH, Mirpur, Square)..."
                placeholderTextColor={C.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                multiline={false}
                numberOfLines={1}
                returnKeyType="search"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={14} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content: Search Results OR Area Bars (Explore Pattern) */}
            {search.trim().length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={item => `${item.type}_${item.name}`}
                renderItem={({ item }) => (
                  <SearchResultRow
                    item={item}
                    isSelected={selectedArea.trim().toLowerCase() === item.name.trim().toLowerCase()}
                    onSelect={handleSelect}
                    C={C}
                    isDark={isDark}
                  />
                )}
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                initialNumToRender={8}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <AnimatedIcon family="feather" name="map-pin" size={28} color={SectorColors.blood} animation="entrance" />
                    <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      No locations found
                    </Text>
                    <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                      Try typing a different hospital name or area keyword.
                    </Text>
                  </View>
                }
              />
            ) : (
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                {ZONE_DATA.map(zone => (
                  <AreaSectionBar
                    key={zone.id}
                    zone={zone}
                    isOpen={openZoneId === zone.id}
                    onToggle={() => toggleZone(zone.id)}
                    onSelectArea={handleSelect}
                    onSelectHospital={handleSelect}
                    selectedArea={selectedArea}
                    C={C}
                    isDark={isDark}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Embedded Location & Hospital Map Picker Modal */}
      {mapPickerOpen && (
        <LocationPickerModal
          visible={mapPickerOpen}
          onClose={() => setMapPickerOpen(false)}
          initialPlaceName={selectedArea !== 'All' ? selectedArea : undefined}
          initialCoords={selectedArea !== 'All' ? findMasterLocationByName(selectedArea)?.coords : undefined}
          onSelectLocation={loc => {
            const locName = loc.name || loc.formattedAddress || 'Selected Location';
            const subLoc = loc.zone || loc.subText;
            handleSelect(locName, subLoc, loc.coords);
            setMapPickerOpen(false);
          }}
          title="Pick Hospital or Area"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  } as ViewStyle,
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    maxHeight: '88%',
  } as ViewStyle,
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  } as ViewStyle,
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headerTitle: {
    fontSize: 16,
  } as TextStyle,
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  } as TextStyle,
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // 58dp Map Trigger Card
  mapTriggerCard58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  } as ViewStyle,
  mapTriggerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  mapTriggerTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    includeFontPadding: false,
  } as TextStyle,
  mapTriggerSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    includeFontPadding: false,
  } as TextStyle,

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 12,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  } as TextStyle,

  // Scroll Content
  listScroll: {
    maxHeight: 520,
  } as ViewStyle,
  listContent: {
    paddingBottom: 24,
  } as ViewStyle,

  // Zone Wrapper
  zoneWrapper: {
    marginBottom: 10,
  } as ViewStyle,

  // Standalone Card Bars (Standard 72dp Content Row: 44dp icon + 28dp padding)
  areaCardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
  } as ViewStyle,
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  itemInfoStack: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 6,
  } as ViewStyle,
  areaName: {
    fontSize: 14.5,
  } as TextStyle,
  areaSubName: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,

  // Explore Screen Pattern: 1px Vertical Divider Line
  verticalDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
  } as ViewStyle,

  // Explore Screen Pattern: Stat Column
  statCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  } as ViewStyle,
  statVal: {
    fontSize: 14,
    lineHeight: 17,
  } as TextStyle,
  statSub: {
    fontSize: 8.5,
    letterSpacing: 0.5,
    marginTop: 1,
  } as TextStyle,

  chevronWrap: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Expanded Child Container for Hospitals inside the Area
  expandedChildContainer: {
    marginTop: 8,
    paddingLeft: 8,
    gap: 8,
  } as ViewStyle,

  // Child Hospital Card (Explore-style 72dp Content Row with 4.5dp Left Stripe)
  childHospitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    marginBottom: 8,
  } as ViewStyle,
  childIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  childInfoStack: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  childHospitalName: {
    fontSize: 14,
  } as TextStyle,
  childHospitalSub: {
    fontSize: 11.5,
    marginTop: 2,
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
});
