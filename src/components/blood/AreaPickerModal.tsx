import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  FlatList, StyleSheet, Keyboard, KeyboardAvoidingView,
  Animated, Platform, type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { DHAKA_AREAS, type DhakaAreaInfo } from '../../constants/dhakaAreas';
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

type TypeFilterTab = 'all' | 'hospital' | 'area';

type FlatListItem =
  | { type: 'all_option'; id: 'all_option' }
  | { type: 'custom_query'; id: 'custom_query'; query: string }
  | { type: 'zone_header'; id: string; zone: string; count: number }
  | { type: 'area_item'; id: string; item: DhakaAreaInfo };

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
  const [activeTab, setActiveTab] = useState<TypeFilterTab>(initialTab);
  const [trackWidth, setTrackWidth] = useState(0);
  const searchInputRef = useRef<TextInput>(null);

  const initialIndex = initialTab === 'hospital' ? 1 : initialTab === 'area' ? 2 : 0;
  const slideAnim = useRef(new Animated.Value(initialIndex)).current;

  useEffect(() => {
    if (visible) {
      setSearch('');
      const startingTab = initialTab || 'all';
      setActiveTab(startingTab);
      const startingIdx = startingTab === 'hospital' ? 1 : startingTab === 'area' ? 2 : 0;
      slideAnim.setValue(startingIdx);
    }
  }, [visible, initialTab, slideAnim]);

  const switchTab = useCallback((tab: TypeFilterTab) => {
    setActiveTab(tab);
    const targetIdx = tab === 'hospital' ? 1 : tab === 'area' ? 2 : 0;
    Animated.spring(slideAnim, {
      toValue: targetIdx,
      useNativeDriver: true,
      tension: 130,
      friction: 8,
    }).start();
  }, [slideAnim]);

  // Count totals for badges
  const totalHospitals = useMemo(() => DHAKA_AREAS.filter(a => a.type === 'hospital').length, []);
  const totalAreas = useMemo(() => DHAKA_AREAS.filter(a => a.type === 'area').length, []);

  // Filter pipeline: Search query + Category Tab
  const filteredAreas = useMemo(() => {
    let list = DHAKA_AREAS;

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
      const matchSub = a.subLocation ? a.subLocation.toLowerCase().includes(q) : false;
      const matchZone = a.zone.toLowerCase().includes(q) || a.zoneBn.includes(q);
      const matchKeywords = (a.keywords || []).some(k => k.toLowerCase().includes(q));
      return matchName || matchNameBn || matchSub || matchZone || matchKeywords;
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

  // High-performance FlatList items array
  const listData = useMemo<FlatListItem[]>(() => {
    const items: FlatListItem[] = [];

    // "All Locations" option at the top if allowed
    if (allowAll && !search && activeTab === 'all') {
      items.push({ type: 'all_option', id: 'all_option' });
    }

    // Custom search query option if query doesn't match an exact item
    const trimmed = search.trim();
    if (trimmed.length > 1 && !DHAKA_AREAS.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) {
      items.push({ type: 'custom_query', id: 'custom_query', query: trimmed });
    }

    // Grouped zones
    const zones = Object.keys(grouped);
    for (const zone of zones) {
      items.push({
        type: 'zone_header',
        id: `header_${zone}`,
        zone,
        count: grouped[zone].length,
      });
      for (const item of grouped[zone]) {
        items.push({
          type: 'area_item',
          id: `item_${item.name}`,
          item,
        });
      }
    }

    return items;
  }, [allowAll, search, activeTab, grouped]);

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
  const tabWidth = trackWidth > 0 ? (trackWidth - 6) / 3 : 0;

  const renderItem = ({ item }: { item: FlatListItem }) => {
    if (item.type === 'all_option') {
      return (
        <TouchableOpacity
          style={[
            styles.areaCardBar,
            {
              backgroundColor: !isFiltered
                ? (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)')
                : C.surface,
              borderColor: !isFiltered ? SectorColors.blood : C.border,
              borderWidth: !isFiltered ? 1.5 : 1,
            },
          ]}
          onPress={handleClear}
          activeOpacity={0.72}
        >
          <View
            style={[
              styles.itemIconBox,
              {
                backgroundColor: !isFiltered
                  ? (isDark ? 'rgba(199, 52, 74, 0.22)' : 'rgba(199, 52, 74, 0.1)')
                  : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
              },
            ]}
          >
            <Icon name="grid" size={15} color={!isFiltered ? SectorColors.blood : C.text2} />
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
      return (
        <View style={styles.zoneHeaderRow}>
          <Text style={[styles.zoneTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {item.zone.toUpperCase()}
          </Text>
          <View style={[styles.zoneCountBadge, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.zoneCountTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {item.count}
            </Text>
          </View>
        </View>
      );
    }

    // item.type === 'area_item'
    const areaItem = item.item;
    const isSelected = selectedArea.trim().toLowerCase() === areaItem.name.trim().toLowerCase();
    const count = areaCounts ? areaCounts[areaItem.name] : undefined;
    const isHospital = areaItem.type === 'hospital';
    const subtitleText = areaItem.subLocation ? `${areaItem.subLocation} · ${areaItem.nameBn}` : areaItem.nameBn;

    return (
      <TouchableOpacity
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
        onPress={() => handleSelect(areaItem.name)}
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
            <Feather name="activity" size={15} color={SectorColors.blood} />
          ) : (
            <Icon name="pin" size={15} color={isSelected ? SectorColors.blood : C.text2} />
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
            {areaItem.name}
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
  };

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
              placeholder="Search hospital or area (e.g. DMCH, Mirpur)..."
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

          {/* Single Clean Segment Filter Tabs (All / Hospitals / Areas) with Snappy Indicator */}
          <View
            style={[styles.segmentTrack, { backgroundColor: C.surface2, borderColor: C.border }]}
            onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
          >
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  styles.segmentIndicator,
                  {
                    width: tabWidth,
                    backgroundColor: SectorColors.blood,
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 1, 2],
                          outputRange: [0, tabWidth, tabWidth * 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={styles.segmentBtn}
              onPress={() => switchTab('all')}
              activeOpacity={0.8}
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
              style={styles.segmentBtn}
              onPress={() => switchTab('hospital')}
              activeOpacity={0.8}
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
              style={styles.segmentBtn}
              onPress={() => switchTab('area')}
              activeOpacity={0.8}
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

          {/* High-Performance Virtualized FlatList */}
          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            initialNumToRender={14}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              filteredAreas.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Feather name="map-pin" size={28} color={C.textMuted} />
                  <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    No locations found
                  </Text>
                  <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    Try typing a different hospital name or area keyword.
                  </Text>
                </View>
              ) : null
            }
          />
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

  // Single Segment Bar with Sliding Indicator
  segmentTrack: {
    flexDirection: 'row',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 10,
    position: 'relative',
    alignItems: 'center',
  } as ViewStyle,
  segmentIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 9,
    shadowColor: SectorColors.blood,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  segmentBtn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 9,
    zIndex: 1,
  } as ViewStyle,
  segmentBtnTxt: {
    fontSize: 11.5,
  } as TextStyle,

  // Virtualized List Scroll
  listScroll: {
    maxHeight: 480,
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
