import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  FlatList, StyleSheet, Keyboard, KeyboardAvoidingView,
  Animated, Platform, Dimensions, type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';
import { FontFamily, Layout, SectorColors, pillBg } from '../../theme';
import { DHAKA_AREAS, type DhakaAreaInfo } from '../../constants/dhakaAreas';
import { SegmentedTabs, type TabItem } from '../ui/SegmentedTabs';
import { useT } from '../../i18n';

interface AreaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedArea: string;
  onSelectArea: (area: string) => void;
  title?: string;
  areaCounts?: Record<string, number>;
  allowAll?: boolean;
  initialTab?: 'all' | 'hospital' | 'area';
}

type TypeFilterTab = 'hospital' | 'area';

type FlatListItem =
  | { type: 'all_option'; id: 'all_option' }
  | { type: 'custom_query'; id: 'custom_query'; query: string }
  | { type: 'zone_header'; id: string; zone: string; count: number }
  | { type: 'area_item'; id: string; item: DhakaAreaInfo };

// -------------------------------------------------------------
// MODULE-LEVEL PRE-COMPUTED DATA (Zero allocations during tab switch)
// -------------------------------------------------------------
interface IndexedAreaItem extends DhakaAreaInfo {
  _searchKey: string;
}

const INDEXED_AREAS: IndexedAreaItem[] = DHAKA_AREAS.map(a => ({
  ...a,
  _searchKey: `${a.name.toLowerCase()} ${a.nameBn} ${(a.subLocation || '').toLowerCase()} ${a.zone.toLowerCase()} ${a.zoneBn} ${(a.keywords || []).join(' ').toLowerCase()}`,
}));

function buildFlatZoneItems(items: IndexedAreaItem[], includeAllOption: boolean): FlatListItem[] {
  const result: FlatListItem[] = [];
  if (includeAllOption) {
    result.push({ type: 'all_option', id: 'all_option' });
  }
  const grouped: Record<string, IndexedAreaItem[]> = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!grouped[item.zone]) grouped[item.zone] = [];
    grouped[item.zone].push(item);
  }
  const zones = Object.keys(grouped);
  for (let z = 0; z < zones.length; z++) {
    const zone = zones[z];
    const groupItems = grouped[zone];
    result.push({
      type: 'zone_header',
      id: `header_${zone}`,
      zone,
      count: groupItems.length,
    });
    for (let j = 0; j < groupItems.length; j++) {
      result.push({
        type: 'area_item',
        id: `item_${groupItems[j].name}`,
        item: groupItems[j],
      });
    }
  }
  return result;
}

const STATIC_HOSPITAL_ITEMS_WITH_ALL = buildFlatZoneItems(INDEXED_AREAS.filter(a => a.type === 'hospital'), true);
const STATIC_HOSPITAL_ITEMS_NO_ALL = buildFlatZoneItems(INDEXED_AREAS.filter(a => a.type === 'hospital'), false);
const STATIC_AREA_ITEMS_WITH_ALL = buildFlatZoneItems(INDEXED_AREAS.filter(a => a.type === 'area'), true);
const STATIC_AREA_ITEMS_NO_ALL = buildFlatZoneItems(INDEXED_AREAS.filter(a => a.type === 'area'), false);

const keyExtractor = (item: FlatListItem) => item.id;

// -------------------------------------------------------------
// MEMOIZED ITEM COMPONENTS (Zero re-renders on scroll)
// -------------------------------------------------------------
const AllOptionRow = memo(function AllOptionRow({
  isFiltered,
  onPress,
  C,
  isDark,
}: {
  isFiltered: boolean;
  onPress: () => void;
  C: any;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.areaCardBar,
        {
          backgroundColor: !isFiltered
            ? pillBg(SectorColors.blood, isDark)
            : C.surface,
          borderColor: !isFiltered ? SectorColors.blood : C.border,
          borderWidth: !isFiltered ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View
        style={[
          styles.itemIconBox,
          {
            backgroundColor: !isFiltered
              ? (isDark ? 'rgba(199, 52, 74, 0.28)' : 'rgba(199, 52, 74, 0.14)')
              : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
          },
        ]}
      >
        <Icon name="grid" size={17} color={!isFiltered ? SectorColors.blood : C.text2} />
      </View>

      <View style={styles.itemInfoStack}>
        <Text
          style={[
            styles.areaName,
            {
              color: !isFiltered ? SectorColors.blood : C.text,
              fontFamily: FontFamily.jakartaBold,
            },
          ]}
          numberOfLines={1}
        >
          All Locations
        </Text>
        <Text style={[styles.areaSubName, { color: C.textMuted, fontFamily: FontFamily.bnRegular }]}>
          সকল এলাকা ও হাসপাতাল
        </Text>
      </View>

      {!isFiltered ? (
        <Feather name="check-circle" size={18} color={SectorColors.blood} />
      ) : (
        <Feather name="chevron-right" size={14} color={C.border} />
      )}
    </TouchableOpacity>
  );
});

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
      <View style={[styles.zoneCountBadge, { backgroundColor: C.surface2 }]}>
        <Text style={[styles.zoneCountTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
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
  onSelect: (name: string) => void;
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
            ? pillBg(SectorColors.blood, isDark)
            : C.surface,
          borderColor: isSelected ? SectorColors.blood : C.border,
          borderWidth: isSelected ? 1.5 : 1,
        },
      ]}
      onPress={() => onSelect(item.name)}
      activeOpacity={0.72}
    >
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
          <MaterialCommunityIcons name="hospital-building" size={20} color={SectorColors.blood} />
        ) : (
          <Icon name="pin" size={17} color={isSelected ? SectorColors.blood : C.text2} />
        )}
      </View>

      <View style={styles.itemInfoStack}>
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
  allowAll = true,
  initialTab = 'all',
}: AreaPickerModalProps) {
  const { C, isDark } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const startingTab: TypeFilterTab = initialTab === 'area' ? 'area' : 'hospital';
  const [activeTab, setActiveTab] = useState<TypeFilterTab>(startingTab);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      const tabToUse: TypeFilterTab = initialTab === 'area' ? 'area' : 'hospital';
      setActiveTab(tabToUse);
    }
  }, [visible, initialTab]);

  const switchTab = useCallback((tab: TypeFilterTab) => {
    setActiveTab(tab);
  }, []);

  const PICKER_TABS: TabItem<TypeFilterTab>[] = useMemo(() => [
    { id: 'hospital', label: 'Hospitals', color: SectorColors.blood },
    { id: 'area',     label: 'Areas',     color: SectorColors.blood },
  ], []);

  // Fast pre-indexed search (active when user types in search box)
  const searchListData = useMemo<FlatListItem[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    let pool = INDEXED_AREAS;
    if (activeTab === 'hospital') {
      pool = pool.filter(a => a.type === 'hospital');
    } else if (activeTab === 'area') {
      pool = pool.filter(a => a.type === 'area');
    }

    const matched = pool.filter(a => a._searchKey.includes(q));
    const result: FlatListItem[] = [];

    if (!pool.some(a => a.name.toLowerCase() === q)) {
      result.push({ type: 'custom_query', id: 'custom_query', query: search.trim() });
    }

    const grouped: Record<string, IndexedAreaItem[]> = {};
    for (let i = 0; i < matched.length; i++) {
      const item = matched[i];
      if (!grouped[item.zone]) grouped[item.zone] = [];
      grouped[item.zone].push(item);
    }

    const zones = Object.keys(grouped);
    for (let z = 0; z < zones.length; z++) {
      const zone = zones[z];
      const items = grouped[zone];
      result.push({
        type: 'zone_header',
        id: `header_${zone}`,
        zone,
        count: items.length,
      });
      for (let j = 0; j < items.length; j++) {
        result.push({
          type: 'area_item',
          id: `item_${items[j].name}`,
          item: items[j],
        });
      }
    }

    return result;
  }, [search, activeTab]);

  const handleSelect = useCallback((areaName: string) => {
    onSelectArea(areaName);
    onClose();
  }, [onSelectArea, onClose]);

  const handleClear = useCallback(() => {
    onSelectArea('All');
    onClose();
  }, [onSelectArea, onClose]);

  const isFiltered = Boolean(selectedArea && selectedArea !== 'All');

  const renderItem = useCallback(({ item }: { item: FlatListItem }) => {
    if (item.type === 'all_option') {
      return (
        <AllOptionRow
          isFiltered={isFiltered}
          onPress={handleClear}
          C={C}
          isDark={isDark}
        />
      );
    }

    if (item.type === 'custom_query') {
      return (
        <TouchableOpacity
          style={[styles.customRow, { backgroundColor: C.surface2, borderColor: SectorColors.blood }]}
          onPress={() => handleSelect(item.query)}
          activeOpacity={0.75}
        >
          <View style={[styles.itemIconBox, { backgroundColor: `${SectorColors.blood}18` }]}>
            <Icon name="pin" size={15} color={SectorColors.blood} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Filter by &ldquo;{item.query}&rdquo;
            </Text>
            <Text style={[styles.customSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              Custom hospital, clinic, or local landmark
            </Text>
          </View>
          <Feather name="arrow-right" size={15} color={SectorColors.blood} />
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
  }, [isFiltered, handleClear, handleSelect, selectedArea, areaCounts, C, isDark]);

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
              <Feather name="search" size={18} color={C.textMuted} />
            </TouchableOpacity>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              placeholder={
                activeTab === 'hospital'
                  ? 'Search hospital or clinic (e.g. DMCH, Square)...'
                  : 'Search area or neighborhood (e.g. Mirpur, Uttara)...'
              }
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

          {/* Clean Dual Filter Tabs (Hospitals / Areas) */}
          <View style={{ marginBottom: 12 }}>
            <SegmentedTabs<TypeFilterTab>
              size="sm"
              tabs={PICKER_TABS}
              activeTab={activeTab}
              onTabChange={switchTab}
            />
          </View>

          {/* Virtualized Lists: Search Results OR Pre-Mounted Dual Tab Panes */}
          {search.trim().length > 0 ? (
            <FlatList
              data={searchListData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={3}
              removeClippedSubviews={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Feather name="map-pin" size={28} color={C.textMuted} />
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
            <View style={styles.listScroll}>
              <View style={[styles.tabPane, activeTab === 'hospital' ? styles.tabPaneVisible : styles.tabPaneHidden]}>
                <FlatList
                  data={allowAll ? STATIC_HOSPITAL_ITEMS_WITH_ALL : STATIC_HOSPITAL_ITEMS_NO_ALL}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  contentContainerStyle={styles.listContent}
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  windowSize={3}
                  removeClippedSubviews={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                />
              </View>
              <View style={[styles.tabPane, activeTab === 'area' ? styles.tabPaneVisible : styles.tabPaneHidden]}>
                <FlatList
                  data={allowAll ? STATIC_AREA_ITEMS_WITH_ALL : STATIC_AREA_ITEMS_NO_ALL}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  contentContainerStyle={styles.listContent}
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  windowSize={3}
                  removeClippedSubviews={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  backdrop: {
    ...StyleSheet.absoluteFill,
  } as ViewStyle,
  sheet: {
    maxHeight: '85%',
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
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  // Virtualized List Scroll
  listScroll: {
    maxHeight: 480,
  } as ViewStyle,
  tabPane: {
    height: '100%',
    width: '100%',
  } as ViewStyle,
  tabPaneVisible: {
    display: 'flex',
  } as ViewStyle,
  tabPaneHidden: {
    display: 'none',
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
    marginBottom: 10,
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

  // Zone Headers in FlatList
  zoneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  } as ViewStyle,
  countTxt: {
    fontSize: 11,
  } as TextStyle,
});
