import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  ScrollView, StyleSheet, Keyboard, KeyboardAvoidingView, Platform,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
}

export function AreaPickerModal({
  visible,
  onClose,
  selectedArea,
  onSelectArea,
  title,
  areaCounts,
  allowAll = true,
}: AreaPickerModalProps) {
  const { C } = useTheme();
  const t = useT();
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filteredAreas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DHAKA_AREAS;
    return DHAKA_AREAS.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.nameBn.includes(q) ||
      a.zone.toLowerCase().includes(q) ||
      a.zoneBn.includes(q)
    );
  }, [search]);

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
        <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          {/* Grab Handle */}
          <View style={[styles.handle, { backgroundColor: C.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: `${SectorColors.blood}1e` }]}>
                <Icon name="pin" size={16} color={SectorColors.blood} />
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

          {/* Search Box */}
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
              placeholder={t.blood2.searchAreaInput}
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

          {/* Quick Clear / All Button */}
          {allowAll && (
            <View style={styles.quickBar}>
              <TouchableOpacity
                style={[
                  styles.quickAllBtn,
                  !isFiltered
                    ? { backgroundColor: SectorColors.blood, borderColor: SectorColors.blood }
                    : { backgroundColor: C.surface2, borderColor: C.border },
                ]}
                onPress={handleClear}
                activeOpacity={0.75}
              >
                <Text style={[styles.quickAllTxt, { color: !isFiltered ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.blood2.filterLocationAll}
                </Text>
              </TouchableOpacity>
              {isFiltered && (
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: C.border }]}
                  onPress={handleClear}
                  activeOpacity={0.75}
                >
                  <Feather name="rotate-ccw" size={12} color={C.textMuted} />
                  <Text style={[styles.clearTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {t.blood2.clearAreaFilter}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Area List */}
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
                <Icon name="pin" size={15} color={SectorColors.blood} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.customTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Filter by &ldquo;{search.trim()}&rdquo;
                  </Text>
                  <Text style={[styles.customSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    Custom landmark or specific address
                  </Text>
                </View>
                <Feather name="arrow-right" size={15} color={SectorColors.blood} />
              </TouchableOpacity>
            )}

            {Object.keys(grouped).map(zone => (
              <View key={zone} style={styles.zoneBlock}>
                <Text style={[styles.zoneTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {zone.toUpperCase()}
                </Text>
                <View style={[styles.zoneCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  {grouped[zone].map((item, idx) => {
                    const isSelected = selectedArea.toLowerCase() === item.name.toLowerCase() ||
                      (selectedArea !== 'All' && item.name.toLowerCase().includes(selectedArea.toLowerCase()));
                    const count = areaCounts ? areaCounts[item.name] : undefined;

                    return (
                      <TouchableOpacity
                        key={item.name}
                        style={[
                          styles.areaRow,
                          idx > 0 && [styles.rowBorder, { borderTopColor: C.border }],
                          isSelected && { backgroundColor: `${SectorColors.blood}12` },
                        ]}
                        onPress={() => handleSelect(item.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.areaLeft}>
                          <Icon name="pin" size={14} color={isSelected ? SectorColors.blood : C.textMuted} />
                          <View>
                            <Text style={[styles.areaName, { color: isSelected ? SectorColors.blood : C.text, fontFamily: FontFamily.jakartaBold }]}>
                              {item.name}
                            </Text>
                            <Text style={[styles.areaSubName, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                              {item.nameBn}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.areaRight}>
                          {count !== undefined && count > 0 && (
                            <View style={[styles.countPill, { backgroundColor: C.surface }]}>
                              <Text style={[styles.countTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                                {count}
                              </Text>
                            </View>
                          )}
                          {isSelected && (
                            <Feather name="check" size={16} color={SectorColors.blood} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
    maxHeight: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: Layout.screenPadding,
  } as ViewStyle,
  handle: {
    width: 36,
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
    width: 36,
    height: 36,
    borderRadius: 10,
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
    fontSize: 13.5,
    paddingVertical: 0,
  } as TextStyle,
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  } as ViewStyle,
  quickAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,
  quickAllTxt: {
    fontSize: 12,
  } as TextStyle,
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  clearTxt: {
    fontSize: 11,
  } as TextStyle,
  listScroll: {
    maxHeight: 460,
  } as ViewStyle,
  listContent: {
    paddingBottom: 24,
  } as ViewStyle,
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
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
  zoneBlock: {
    marginBottom: 14,
  } as ViewStyle,
  zoneTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 4,
  } as TextStyle,
  zoneCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
  } as ViewStyle,
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  areaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,
  areaName: {
    fontSize: 13.5,
  } as TextStyle,
  areaSubName: {
    fontSize: 10.5,
    marginTop: 1,
  } as TextStyle,
  areaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  } as ViewStyle,
  countTxt: {
    fontSize: 10.5,
  } as TextStyle,
});
