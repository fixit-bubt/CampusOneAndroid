import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, Radius } from '../../theme';

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (assets: MediaLibrary.Asset[]) => void;
  onFallbackSystemPicker?: () => void;
  maxFiles?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2.5;
const NUM_COLUMNS = 3;
const TILE_SIZE = Math.floor((SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS);

/**
 * Reverse-Engineered CamScanner Gallery Sort Algorithm:
 * 1. Clusters assets into session groups based on temporal proximity (<= 5 min window or identical timestamp).
 * 2. Between session groups: ordered chronologically (newest session first by default, or oldest session first).
 * 3. Within each session group: ordered ascending by natural alphanumeric filename sequence
 *    (e.g., WA0001 -> WA0002 -> WA0003, Scan_1 -> Scan_2, IMG_0001 -> IMG_0002).
 *    This guarantees math assignment / notebook pages are displayed in 100% natural reading sequence (1 -> N)
 *    rather than scrambled by arbitrary database rowid order.
 * 4. Tiebreak: asset ID ascending.
 */
function sortAssetsCamScannerParity(
  assets: MediaLibrary.Asset[],
  order: 'newest' | 'oldest' = 'newest'
): MediaLibrary.Asset[] {
  if (!assets || assets.length <= 1) return assets || [];

  const naturalCompare = (aStr: string, bStr: string): number => {
    return (aStr || '').localeCompare(bStr || '', undefined, { numeric: true, sensitivity: 'base' });
  };

  // 1. Initial chronological sort descending to prepare for session clustering
  const items = [...assets].sort((a, b) => {
    const tA = a.creationTime || a.modificationTime || 0;
    const tB = b.creationTime || b.modificationTime || 0;
    if (tB !== tA) return tB - tA;
    const fn = naturalCompare(a.filename || '', b.filename || '');
    if (fn !== 0) return fn;
    return naturalCompare(a.id || '', b.id || '');
  });

  // 2. Cluster into session groups (photos taken/received within 5 minutes of each other)
  const SESSION_THRESHOLD_MS = 5 * 60 * 1000;
  let currentGroupId = 0;
  const itemMeta = new Map<string, { groupId: number; sessionTime: number }>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemTime = item.creationTime || item.modificationTime || 0;

    if (i === 0) {
      itemMeta.set(item.id, { groupId: currentGroupId, sessionTime: itemTime });
    } else {
      const prevItem = items[i - 1];
      const prevTime = prevItem.creationTime || prevItem.modificationTime || 0;
      let sessionTime = itemMeta.get(prevItem.id)?.sessionTime ?? itemTime;
      if (Math.abs(prevTime - itemTime) > SESSION_THRESHOLD_MS) {
        currentGroupId++;
        sessionTime = itemTime;
      }
      itemMeta.set(item.id, {
        groupId: currentGroupId,
        sessionTime,
      });
    }
  }

  // 3. Final sort:
  // - Between session groups: sorted by sessionTime (newest first or oldest first)
  // - Within each session group: sorted ascending by natural filename (Page 1 -> Page 2 -> Page 3...)
  return [...assets].sort((a, b) => {
    const metaA = itemMeta.get(a.id);
    const metaB = itemMeta.get(b.id);
    const gA = metaA ? metaA.groupId : 0;
    const gB = metaB ? metaB.groupId : 0;

    if (gA !== gB) {
      const sA = metaA ? metaA.sessionTime : 0;
      const sB = metaB ? metaB.sessionTime : 0;
      return order === 'newest' ? sB - sA : sA - sB;
    }

    // Same session group: arrange in natural reading sequence (WA0001 < WA0002 < WA0003...)
    const fnCompare = naturalCompare(a.filename || '', b.filename || '');
    if (fnCompare !== 0) return fnCompare;

    // Tiebreaker: ID ascending
    return naturalCompare(a.id || '', b.id || '');
  });
}

export function MediaPickerModal({
  visible,
  onClose,
  onConfirm,
  onFallbackSystemPicker,
  maxFiles = 50,
}: MediaPickerModalProps) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Selected asset list in the exact numbered order tapped
  const [selected, setSelected] = useState<MediaLibrary.Asset[]>([]);

  // Sorting: 'newest' (creationTime DESC) or 'oldest' (creationTime ASC)
  // CamScanner reverse-engineered parity: default to 'newest' so recent photos appear at top
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Album selection
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<MediaLibrary.Album | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);

  // Fullscreen swipeable preview (CamScanner GalleryPreviewActivity parity)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'all' | 'selected'>('all');
  const previewListRef = useRef<FlatList>(null);

  // Map of asset.id -> selected 1-based index
  const selectedIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    selected.forEach((item, idx) => {
      map.set(item.id, idx + 1);
    });
    return map;
  }, [selected]);

  const previewList = previewMode === 'selected' ? selected : assets;

  useEffect(() => {
    if (!visible) {
      setSelected([]);
      setPreviewIndex(null);
      return;
    }
    checkAndLoad();
  }, [visible, sortOrder, selectedAlbum]);

  useEffect(() => {
    if (previewIndex !== null && previewMode === 'selected') {
      if (selected.length === 0) {
        setPreviewIndex(null);
      } else if (previewIndex >= selected.length) {
        setPreviewIndex(selected.length - 1);
      }
    }
  }, [previewIndex, previewMode, selected.length]);

  const handleToggleSortOrder = useCallback(() => {
    const nextOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
    setSortOrder(nextOrder);
    setAssets((prev) => sortAssetsCamScannerParity(prev, nextOrder));
  }, [sortOrder]);

  async function checkAndLoad() {
    setLoading(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      const granted = perm.status === 'granted';
      setHasPermission(granted);
      if (!granted) {
        setLoading(false);
        return;
      }

      // Load albums once
      if (albums.length === 0) {
        try {
          const allAlbums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
          setAlbums(allAlbums.filter((a) => a.assetCount === undefined || a.assetCount > 0));
        } catch {
          // Non-fatal
        }
      }

      // Fetch assets with explicit chronological sort order
      const res = await MediaLibrary.getAssetsAsync({
        first: 120,
        mediaType: 'photo',
        sortBy: [['creationTime', sortOrder === 'oldest']],
        album: selectedAlbum?.id,
      });

      setAssets(sortAssetsCamScannerParity(res.assets, sortOrder));
      setEndCursor(res.endCursor);
      setHasNextPage(res.hasNextPage);
    } catch {
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!hasNextPage || loadingMore || !endCursor) return;
    setLoadingMore(true);
    try {
      const res = await MediaLibrary.getAssetsAsync({
        first: 80,
        after: endCursor,
        mediaType: 'photo',
        sortBy: [['creationTime', sortOrder === 'oldest']],
        album: selectedAlbum?.id,
      });
      setAssets((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newAssets = res.assets.filter((a) => !existingIds.has(a.id));
        return sortAssetsCamScannerParity(prev.concat(newAssets), sortOrder);
      });
      setEndCursor(res.endCursor);
      setHasNextPage(res.hasNextPage);
    } catch {
      // Non-fatal pagination failure
    } finally {
      setLoadingMore(false);
    }
  }

  const toggleSelect = useCallback((item: MediaLibrary.Asset) => {
    setSelected((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === item.id);
      if (existingIdx >= 0) {
        // Unselect: remove and adjust remaining numbers automatically
        return prev.filter((_, idx) => idx !== existingIdx);
      }
      // Select: append to end with next sequence number
      if (prev.length >= maxFiles) return prev;
      return prev.concat(item);
    });
  }, [maxFiles]);

  const handleConfirm = () => {
    if (!selected.length) return;
    const toImport = [...selected];
    setSelected([]);
    setPreviewIndex(null);
    onConfirm(toImport);
    onClose();
  };

  const renderItem = ({ item, index }: { item: MediaLibrary.Asset; index: number }) => {
    const orderNumber = selectedIndexMap.get(item.id);
    const isSelected = orderNumber !== undefined;

    return (
      <View
        style={[
          styles.tile,
          { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: C.surface2 },
          isSelected && { borderColor: C.brand, borderWidth: 2.5 },
        ]}
      >
        {/* Photo Body: Tapping opens CamScanner Fullscreen Swipeable Preview */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => {
            setPreviewMode('all');
            setPreviewIndex(index);
          }}
          activeOpacity={0.88}
        >
          <Image
            source={{ uri: item.uri }}
            style={styles.tileImage}
            resizeMode="cover"
          />
          {isSelected ? <View style={styles.selectedDimOverlay} /> : null}
        </TouchableOpacity>

        {/* CamScanner-Style Top-Left Numbered Square Checkbox */}
        <TouchableOpacity
          style={styles.badgeHitArea}
          onPress={() => toggleSelect(item)}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.badgeBox,
              isSelected
                ? { backgroundColor: C.brand, borderColor: '#ffffff' }
                : { backgroundColor: 'rgba(0, 0, 0, 0.40)', borderColor: 'rgba(255, 255, 255, 0.78)' },
            ]}
          >
            {isSelected ? (
              <Text style={styles.badgeNumberText}>{orderNumber}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        {/* Top Header with 58dp Segmented Bar (3 equal tabs: Cancel, Select Photo, Import) */}
        <View style={[styles.headerContainer, { borderBottomColor: C.border, backgroundColor: C.bg }]}>
          <View
            style={[
              styles.segmentedBar,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : C.surface2,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : C.border,
              },
            ]}
          >
            {/* Tab 1: Cancel */}
            <TouchableOpacity
              style={[styles.segmentTab, { borderRadius: 12 }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Feather name="x" size={16} color={C.text} style={{ marginRight: 6 }} />
              <Text style={[styles.segmentLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <View style={[styles.segmentDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.border }]} />

            {/* Tab 2: Select Photo / Album */}
            <TouchableOpacity
              style={[styles.segmentTab, { borderRadius: 12 }]}
              onPress={() => setShowAlbumPicker(true)}
              activeOpacity={0.7}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.segmentLabel,
                  { color: C.text, fontFamily: FontFamily.jakartaBold, maxWidth: '78%' },
                ]}
              >
                {selectedAlbum?.title || 'Select Photo'}
              </Text>
              <Feather name="chevron-down" size={14} color={C.brand} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <View style={[styles.segmentDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.border }]} />

            {/* Tab 3: Import */}
            <TouchableOpacity
              style={[
                styles.segmentTab,
                {
                  borderRadius: 12,
                  backgroundColor: selected.length > 0 ? C.brand : 'transparent',
                },
              ]}
              disabled={selected.length === 0}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Feather
                name="check"
                size={14}
                color={selected.length > 0 ? '#ffffff' : C.textMuted}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    color: selected.length > 0 ? '#ffffff' : C.textMuted,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                {selected.length > 0 ? `Import (${selected.length})` : 'Import'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Permission Denied State */}
        {hasPermission === false ? (
          <View style={styles.centerBox}>
            <View style={[styles.permIconCircle, { backgroundColor: C.surface2 }]}>
              <Feather name="image" size={32} color={C.brand} />
            </View>
            <Text style={[styles.permTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Photo Access Needed
            </Text>
            <Text style={[styles.permSub, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
              Grant photo permissions to select and arrange your notebook pages in exact numbered order.
            </Text>
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: C.brand }]}
              onPress={checkAndLoad}
              activeOpacity={0.85}
            >
              <Text style={[styles.permBtnText, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                Grant Permission
              </Text>
            </TouchableOpacity>

            {onFallbackSystemPicker ? (
              <TouchableOpacity
                style={[styles.fallbackBtn, { borderColor: C.border }]}
                onPress={() => {
                  onClose();
                  onFallbackSystemPicker();
                }}
                activeOpacity={0.8}
              >
                <Feather name="folder" size={15} color={C.text2} />
                <Text style={[styles.fallbackBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Open System Gallery
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={C.brand} />
            <Text style={[styles.loadingText, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
              Loading gallery photos…
            </Text>
          </View>
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            initialNumToRender={24}
            maxToRenderPerBatch={24}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={C.brand} />
                </View>
              ) : (
                <View style={{ height: insets.bottom + 68 }} />
              )
            }
            ListEmptyComponent={
              <View style={styles.centerBox}>
                <Feather name="inbox" size={36} color={C.textMuted} />
                <Text style={[styles.emptyText, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                  No photos found in this folder
                </Text>
              </View>
            }
          />
        )}

        {/* CamScanner-Parity Persistent Bottom Action Bar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: isDark ? C.surface : '#ffffff',
              borderTopColor: C.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {/* Left: Preview Action */}
          <TouchableOpacity
            style={styles.bottomBarPreviewBtn}
            disabled={selected.length === 0}
            onPress={() => {
              if (selected.length > 0) {
                setPreviewMode('selected');
                setPreviewIndex(0);
              }
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.bottomBarPreviewText,
                {
                  color: selected.length > 0 ? C.text : C.textMuted,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
            >
              {`Preview${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </Text>
          </TouchableOpacity>

          {/* Center: Sleek Sort Toggle Pill */}
          <TouchableOpacity
            style={[styles.bottomSortPill, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={handleToggleSortOrder}
            activeOpacity={0.8}
          >
            <Feather name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'} size={12} color={C.brand} />
            <Text style={[styles.bottomSortText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {sortOrder === 'newest' ? 'Newest' : 'Page 1 First'}
            </Text>
          </TouchableOpacity>

          {/* Right: Clear All when selected */}
          <View style={styles.bottomBarRight}>
            {selected.length > 0 ? (
              <TouchableOpacity onPress={() => setSelected([])} activeOpacity={0.7} style={styles.clearBtn}>
                <Text style={[styles.clearText, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                  Clear
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>
        </View>

        {/* Album Selector Modal */}
        <Modal visible={showAlbumPicker} transparent animationType="fade" onRequestClose={() => setShowAlbumPicker(false)}>
          <TouchableOpacity style={styles.albumModalBackdrop} activeOpacity={1} onPress={() => setShowAlbumPicker(false)}>
            <View style={[styles.albumSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.albumSheetHeader, { borderBottomColor: C.border }]}>
                <Text style={[styles.albumSheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Choose Album
                </Text>
                <TouchableOpacity onPress={() => setShowAlbumPicker(false)}>
                  <Feather name="x" size={18} color={C.text2} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.albumRow,
                  { borderBottomColor: C.border },
                  selectedAlbum === null && { backgroundColor: C.surface2 },
                ]}
                onPress={() => {
                  setSelectedAlbum(null);
                  setShowAlbumPicker(false);
                }}
              >
                <Feather name="image" size={18} color={selectedAlbum === null ? C.brand : C.text2} />
                <Text style={[styles.albumRowText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  All Photos
                </Text>
              </TouchableOpacity>

              {albums.map((alb) => {
                const active = selectedAlbum?.id === alb.id;
                return (
                  <TouchableOpacity
                    key={alb.id}
                    style={[
                      styles.albumRow,
                      { borderBottomColor: C.border },
                      active && { backgroundColor: C.surface2 },
                    ]}
                    onPress={() => {
                      setSelectedAlbum(alb);
                      setShowAlbumPicker(false);
                    }}
                  >
                    <Feather name="folder" size={18} color={active ? C.brand : C.text2} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[styles.albumRowText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {alb.title}
                      </Text>
                      <Text style={[styles.albumRowCount, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                        {`${alb.assetCount ?? 0} photos`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* CamScanner Fullscreen Swipeable Preview Modal (GalleryPreviewActivity parity) */}
        <Modal
          visible={previewIndex !== null}
          animationType="fade"
          onRequestClose={() => setPreviewIndex(null)}
          statusBarTranslucent
        >
          <View style={styles.previewRoot}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Preview Top Bar with 58dp Segmented Bar */}
            <View style={[styles.previewTopBar, { paddingTop: insets.top }]}>
              <View
                style={[
                  styles.segmentedBar,
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.10)',
                    borderColor: 'rgba(255, 255, 255, 0.16)',
                  },
                ]}
              >
                {/* Tab 1: Back */}
                <TouchableOpacity
                  style={[styles.segmentTab, { borderRadius: 12 }]}
                  onPress={() => setPreviewIndex(null)}
                  activeOpacity={0.7}
                >
                  <Feather name="arrow-left" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={[styles.segmentLabel, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                    Back
                  </Text>
                </TouchableOpacity>

                <View style={[styles.segmentDivider, { backgroundColor: 'rgba(255, 255, 255, 0.14)' }]} />

                {/* Tab 2: Counter */}
                <View style={styles.segmentTab}>
                  <Text style={[styles.segmentLabel, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                    {`${(previewIndex ?? 0) + 1} / ${previewList.length}`}
                  </Text>
                </View>

                <View style={[styles.segmentDivider, { backgroundColor: 'rgba(255, 255, 255, 0.14)' }]} />

                {/* Tab 3: Import */}
                <TouchableOpacity
                  style={[
                    styles.segmentTab,
                    {
                      borderRadius: 12,
                      backgroundColor: selected.length > 0 ? C.brand : 'transparent',
                    },
                  ]}
                  disabled={selected.length === 0}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="check"
                    size={14}
                    color={selected.length > 0 ? '#ffffff' : '#71717a'}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.segmentLabel,
                      {
                        color: selected.length > 0 ? '#ffffff' : '#71717a',
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                  >
                    {selected.length > 0 ? `Import (${selected.length})` : 'Import'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Fullscreen Horizontal Swipeable Pager */}
            <FlatList
              ref={previewListRef}
              style={{ flex: 1 }}
              data={previewList}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={previewIndex ?? 0}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  previewListRef.current?.scrollToIndex({ index: info.index, animated: false });
                }, 50);
              }}
              onMomentumScrollEnd={(e) => {
                const newIdx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                if (newIdx >= 0 && newIdx < previewList.length) {
                  setPreviewIndex(newIdx);
                }
              }}
              renderItem={({ item }) => (
                <View style={styles.previewSlide}>
                  <Image source={{ uri: item.uri }} style={styles.previewImage} resizeMode="contain" />
                </View>
              )}
              windowSize={3}
              maxToRenderPerBatch={3}
              initialNumToRender={2}
              removeClippedSubviews={Platform.OS === 'android'}
            />

            {/* Bottom Selected Pages Strip / Thumbnail Tray */}
            {selected.length > 0 ? (
              <View style={styles.selectedStrip}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedStripContent}
                >
                  {selected.map((item, idx) => {
                    const isCurrent = previewIndex !== null && previewList[previewIndex]?.id === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.selectedStripThumbCard,
                          isCurrent && { borderColor: C.brand, borderWidth: 2 },
                        ]}
                        onPress={() => {
                          if (previewMode === 'selected') {
                            setPreviewIndex(idx);
                            previewListRef.current?.scrollToIndex({ index: idx, animated: true });
                          } else {
                            const targetIdx = assets.findIndex((a) => a.id === item.id);
                            if (targetIdx >= 0) {
                              setPreviewIndex(targetIdx);
                              previewListRef.current?.scrollToIndex({ index: targetIdx, animated: true });
                            } else {
                              setPreviewMode('selected');
                              setPreviewIndex(idx);
                            }
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: item.uri }} style={styles.selectedStripImage} />
                        <View style={styles.selectedStripSeqBadge}>
                          <Text style={styles.selectedStripSeqText}>{idx + 1}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.selectedStripRemoveBtn}
                          onPress={() => toggleSelect(item)}
                          hitSlop={{ top: 6, left: 6, right: 6, bottom: 6 }}
                        >
                          <Feather name="x" size={11} color="#ffffff" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Bottom Action Bar: [✓] Select Toggle Button */}
            {previewIndex !== null && previewList[previewIndex] ? (
              (() => {
                const currentAsset = previewList[previewIndex];
                const orderNum = selectedIndexMap.get(currentAsset.id);
                const isCurrentSelected = orderNum !== undefined;
                return (
                  <View style={[styles.previewBottomBar, { paddingBottom: insets.bottom, height: 56 + insets.bottom }]}>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      style={styles.previewSelectBtn}
                      onPress={() => toggleSelect(currentAsset)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.previewCheckboxBox,
                          isCurrentSelected
                            ? { backgroundColor: C.brand, borderColor: '#ffffff' }
                            : { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.7)' },
                        ]}
                      >
                        {isCurrentSelected ? (
                          <Feather name="check" size={13} color="#ffffff" />
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.previewSelectText,
                          {
                            color: isCurrentSelected ? C.brand : 'rgba(255, 255, 255, 0.85)',
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                      >
                        {isCurrentSelected ? `Select (${orderNum})` : 'Select'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })()
            ) : null}
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  segmentedBar: {
    height: 58,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  segmentTab: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segmentDivider: {
    width: 1,
    height: 24,
  },
  segmentLabel: {
    fontSize: 13.5,
  },
  bottomBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  bottomBarPreviewBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 80,
    alignItems: 'flex-start',
  },
  bottomBarPreviewText: {
    fontSize: 14.5,
  },
  bottomSortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  bottomSortText: {
    fontSize: 12.5,
  },
  bottomBarRight: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  clearText: {
    fontSize: 13.5,
  },
  columnWrapper: {
    gap: GRID_GAP,
  },
  listContent: {
    gap: GRID_GAP,
  },
  tile: {
    overflow: 'hidden',
    position: 'relative',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  selectedDimOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
  },
  badgeHitArea: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 38,
    height: 38,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    zIndex: 10,
  },
  badgeBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
  },
  permIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  permSub: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  permBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  permBtnText: {
    fontSize: 14.5,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  fallbackBtnText: {
    fontSize: 13.5,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  albumModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  albumSheet: {
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '65%',
    overflow: 'hidden',
  },
  albumSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  albumSheetTitle: {
    fontSize: 16,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  albumRowText: {
    fontSize: 14.5,
  },
  albumRowCount: {
    fontSize: 12,
  },

  // CamScanner Preview Styles
  previewRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewTopBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 10,
  },
  previewSlide: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  selectedStrip: {
    height: 76,
    backgroundColor: 'rgba(12, 12, 12, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
  },
  selectedStripContent: {
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  selectedStripThumbCard: {
    width: 48,
    height: 58,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1f1f1f',
  },
  selectedStripImage: {
    width: '100%',
    height: '100%',
  },
  selectedStripSeqBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: '#5b85f7',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  selectedStripSeqText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  selectedStripRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewCheckboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSelectText: {
    fontSize: 15,
  },
});
