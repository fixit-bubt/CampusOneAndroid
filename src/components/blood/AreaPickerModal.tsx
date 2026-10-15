import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  FlatList, StyleSheet, Keyboard, KeyboardAvoidingView,
  Platform, type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { FontFamily, Layout } from '../../theme';
import { DHAKA_AREAS, type DhakaAreaInfo } from '../../constants/dhakaAreas';
import { LocationPickerModal } from '../location/LocationPickerModal';
import { useT } from '../../i18n';

interface AreaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedArea: string;
  onSelectArea: (area: string, subLocation?: string) => void;
  title?: string;
  areaCounts?: Record<string, number>;
  allowAll?: boolean;
  initialTab?: 'all' | 'hospital' | 'area';
}

type FlatListItem =
  | { type: 'custom_query'; id: 'custom_query'; query: string }
  | { type: 'zone_header'; id: string; zone: string; count: number }
  | { type: 'area_item'; id: string; item: DhakaAreaInfo };

interface IndexedAreaItem extends DhakaAreaInfo {
  _searchKey: string;
}

const ZONE_ORDER: string[] = [
  'Mirpur & Campus Vicinity',
  'Dhanmondi, Panthapath & West',
  'Shahbagh, Agargaon & Central',
  'Mohakhali, Banani & Gulshan',
  'Uttara, Airport & North',
  'Old Dhaka & Historic Quarters',
  'Motijheel, Khilgaon & East',
  'Greater Dhaka & Suburbs',
];

const INDEXED_AREAS: IndexedAreaItem[] = DHAKA_AREAS.map(a => ({
  ...a,
  _searchKey: `${a.name.toLowerCase()} ${a.nameBn} ${(a.subLocation || '').toLowerCase()} ${a.zone.toLowerCase()} ${a.zoneBn} ${(a.keywords || []).join(' ').toLowerCase()}`,
}));

function buildFlatZoneItems(items: IndexedAreaItem[]): FlatListItem[] {
  const result: FlatListItem[] = [];
  const grouped: Record<string, IndexedAreaItem[]> = {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!grouped[item.zone]) grouped[item.zone] = [];
    grouped[item.zone].push(item);
  }

  const zoneKeys = [...ZONE_ORDER];
  for (const k of Object.keys(grouped)) {
    if (!zoneKeys.includes(k)) zoneKeys.push(k);
  }

  for (let z = 0; z < zoneKeys.length; z++) {
    const zone = zoneKeys[z];
    const groupItems = grouped[zone];
    if (!groupItems || groupItems.length === 0) continue;

    result.push({
      type: 'zone_header',
      id: `header_${zone}`,
      zone,
      count: groupItems.length,
    });

    const hospitals = groupItems.filter(i => i.type === 'hospital');
    const areas = groupItems.filter(i => i.type !== 'hospital');
    const sortedGroup = [...hospitals, ...areas];

    for (let j = 0; j < sortedGroup.length; j++) {
      result.push({
        type: 'area_item',
        id: `item_${sortedGroup[j].type}_${sortedGroup[j].name}`,
        item: sortedGroup[j],
      });
    }
  }

  return result;
}

const STATIC_UNIFIED_ITEMS: FlatListItem[] = buildFlatZoneItems(INDEXED_AREAS);

const keyExtractor = (item: FlatListItem) => item.id;

// -------------------------------------------------------------
// MEMOIZED ITEM COMPONENTS
// -------------------------------------------------------------
const ZoneHeaderRow = memo(function ZoneHeaderRow({
  zone,
  count,
  C,
}: {
  zone: string;
  count: number;
  C: any;
}) {
  return (
    <View style={styles.zoneHeaderRow}>
      <Text style={[styles.zoneTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
        {zone.toUpperCase()}
      </Text>
      <View style={[styles.zoneCountBadge, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
        <Text style={[styles.zoneCountTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
          {count}
        </Text>
      </View>
    </View>
  );
});

const AreaItemRow = memo(function AreaItemRow({
  item,
  isSelected,
  count,
  onSelect,
  C,
  isDark,
}: {
  item: DhakaAreaInfo;
  isSelected: boolean;
  count?: number;
  onSelect: (name: string, subLocation?: string) => void;
  C: any;
  isDark: boolean;
}) {
  const isHospital = item.type === 'hospital';
  const subtitleText = item.subLocation ? `${item.subLocation} · ${item.nameBn}` : item.nameBn;

  return (
    <TouchableOpacity
      style={[
        styles.areaCardBar,
        {
          backgroundColor: isSelected
            ? (isDark ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc')
            : C.surface,
          borderColor: isSelected
            ? (isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.20)')
            : C.border,
          borderWidth: 1,
        },
      ]}
      onPress={() => onSelect(item.name, item.subLocation)}
      activeOpacity={0.72}
    >
      <View
        style={[
          styles.itemIconBox,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2,
            borderColor: C.border,
            borderWidth: 1,
          },
        ]}
      >
        {isHospital ? (
          <AnimatedIcon family="mci" name="hospital-building" size={20} color={C.text} animation="spring" />
        ) : (
          <AnimatedIcon family="feather" name="map-pin" size={17} color={C.text2} animation="spring" />
        )}
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
          {item.name}
        </Text>
        <Text
          style={[
            styles.areaSubName,
            { color: C.textMuted, fontFamily: FontFamily.bnRegular },
          ]}
          numberOfLines={1}
        >
          {subtitleText}
        </Text>
      </View>

      <View style={styles.itemRight}>
        {count !== undefined && count > 0 && (
          <View style={[styles.countPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
            <Text
              style={[
                styles.countTxt,
                {
                  color: C.text2,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
            >
              {count}
            </Text>
          </View>
        )}
        {isSelected ? (
          <AnimatedIcon family="feather" name="check-circle" size={18} color={C.text} animation="spring" />
        ) : (
          <Feather name="chevron-right" size={14} color={C.border} />
        )}
      </View>
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
  title,
  areaCounts,
}: AreaPickerModalProps) {
  const { C, isDark } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
    }
  }, [visible]);

  // Fast pre-indexed search across all 252 items (both hospitals and areas)
  const searchListData = useMemo<FlatListItem[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const matched = INDEXED_AREAS.filter(a => a._searchKey.includes(q));
    const result: FlatListItem[] = [];

    if (!INDEXED_AREAS.some(a => a.name.toLowerCase() === q)) {
      result.push({ type: 'custom_query', id: 'custom_query', query: search.trim() });
    }

    const grouped: Record<string, IndexedAreaItem[]> = {};
    for (let i = 0; i < matched.length; i++) {
      const item = matched[i];
      if (!grouped[item.zone]) grouped[item.zone] = [];
      grouped[item.zone].push(item);
    }

    const zoneKeys = [...ZONE_ORDER];
    for (const k of Object.keys(grouped)) {
      if (!zoneKeys.includes(k)) zoneKeys.push(k);
    }

    for (let z = 0; z < zoneKeys.length; z++) {
      const zone = zoneKeys[z];
      const items = grouped[zone];
      if (!items || items.length === 0) continue;

      result.push({
        type: 'zone_header',
        id: `header_${zone}`,
        zone,
        count: items.length,
      });

      const hospitals = items.filter(i => i.type === 'hospital');
      const areas = items.filter(i => i.type !== 'hospital');
      const sortedGroup = [...hospitals, ...areas];

      for (let j = 0; j < sortedGroup.length; j++) {
        result.push({
          type: 'area_item',
          id: `item_${sortedGroup[j].type}_${sortedGroup[j].name}`,
          item: sortedGroup[j],
        });
      }
    }

    return result;
  }, [search]);

  const handleSelect = useCallback((areaName: string, subLoc?: string) => {
    onSelectArea(areaName, subLoc);
    onClose();
  }, [onSelectArea, onClose]);

  const renderItem = useCallback(({ item }: { item: FlatListItem }) => {
    if (item.type === 'custom_query') {
      return (
        <TouchableOpacity
          style={[styles.customRow, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => handleSelect(item.query)}
          activeOpacity={0.75}
        >
          <View style={[styles.itemIconBox, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
            <AnimatedIcon family="feather" name="map-pin" size={15} color={C.text2} animation="spring" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Select &ldquo;{item.query}&rdquo;
            </Text>
            <Text style={[styles.customSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              Custom hospital, clinic, or local landmark
            </Text>
          </View>
          <Feather name="arrow-right" size={15} color={C.text2} />
        </TouchableOpacity>
      );
    }

    if (item.type === 'zone_header') {
      return <ZoneHeaderRow zone={item.zone} count={item.count} C={C} />;
    }

    const areaItem = item.item;
    const isSelected = selectedArea.trim().toLowerCase() === areaItem.name.trim().toLowerCase();
    const count = areaCounts ? areaCounts[areaItem.name] : undefined;

    return (
      <AreaItemRow
        item={areaItem}
        isSelected={isSelected}
        count={count}
        onSelect={handleSelect}
        C={C}
        isDark={isDark}
      />
    );
  }, [handleSelect, selectedArea, areaCounts, C, isDark]);

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

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                <AnimatedIcon family="feather" name="map-pin" size={17} color={C.text} animation="spring" />
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
            <View style={[styles.mapTriggerIconWrap, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2, borderColor: C.border, borderWidth: 1 }]}>
              <AnimatedIcon family="feather" name="map" size={18} color={C.text} animation="float" loop={true} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mapTriggerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Pick Hospital or Area on Map
              </Text>
              <Text style={[styles.mapTriggerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Pinpoint exact location or auto-detect with device GPS
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.textMuted} />
          </TouchableOpacity>

          {/* Search Box with Clear Button (Standard 58dp) */}
          <View style={[styles.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <TouchableOpacity
              onPress={() => searchInputRef.current?.focus()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AnimatedIcon family="feather" name="search" size={18} color={C.textMuted} animation="spring" />
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

          {/* Unified Virtualized List with 8 Geographic Area & Hospital Zones */}
          <FlatList
            data={search.trim().length > 0 ? searchListData : STATIC_UNIFIED_ITEMS}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <AnimatedIcon family="feather" name="map-pin" size={28} color={C.textMuted} animation="spring" />
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  No locations found
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  Try typing a different hospital name or area keyword.
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
      </Modal>

      {/* Embedded Location & Hospital Map Picker Modal */}
      {mapPickerOpen && (
        <LocationPickerModal
          visible={mapPickerOpen}
          onClose={() => setMapPickerOpen(false)}
          onSelectLocation={loc => {
            const locName = loc.name || loc.formattedAddress || 'Selected Location';
            const subLoc = loc.zone || loc.subText;
            handleSelect(locName, subLoc);
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

  // Virtualized List Scroll
  listScroll: {
    maxHeight: 520,
  } as ViewStyle,
  listContent: {
    paddingBottom: 24,
  } as ViewStyle,

  // Custom Search Query Row
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,
  customTitle: {
    fontSize: 14,
  } as TextStyle,
  customSub: {
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

  // Zone Headers in FlatList
  zoneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 2,
  } as ViewStyle,
  zoneTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
  } as TextStyle,
  zoneCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  } as ViewStyle,
  zoneCountTxt: {
    fontSize: 10.5,
  } as TextStyle,

  // Standalone Card Bars (Standard 72dp Content Row: 44dp icon + 28dp padding)
  areaCardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
  } as ViewStyle,
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  itemInfoStack: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  areaName: {
    fontSize: 14,
  } as TextStyle,
  areaSubName: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  } as ViewStyle,
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  } as ViewStyle,
  countTxt: {
    fontSize: 11,
  } as TextStyle,
});
