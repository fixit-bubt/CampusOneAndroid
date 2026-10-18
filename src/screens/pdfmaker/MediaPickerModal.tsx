import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  type ViewStyle,
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

  // Selected asset list in the exact order clicked
  const [selected, setSelected] = useState<MediaLibrary.Asset[]>([]);

  // Sorting: 'newest' (creationTime DESC) or 'oldest' (creationTime ASC, page 1 first)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('oldest');

  // Album selection
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<MediaLibrary.Album | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);

  // Lightbox preview
  const [previewAsset, setPreviewAsset] = useState<MediaLibrary.Asset | null>(null);

  // Map of asset.id -> selected 1-based index
  const selectedIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    selected.forEach((item, idx) => {
      map.set(item.id, idx + 1);
    });
    return map;
  }, [selected]);

  useEffect(() => {
    if (!visible) return;
    checkAndLoad();
  }, [visible, sortOrder, selectedAlbum]);

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
          setAlbums(allAlbums.filter((a) => a.assetCount > 0));
        } catch {
          // Non-fatal
        }
      }

      // Fetch assets with explicit chronological sort order
      const res = await MediaLibrary.getAssetsAsync({
        first: 90,
        mediaType: 'photo',
        sortBy: [['creationTime', sortOrder === 'oldest']],
        album: selectedAlbum?.id,
      });

      setAssets(res.assets);
      setEndCursor(res.endCursor);
      setHasNextPage(res.hasNextPage);
    } catch (err) {
      // Permission denied or query error
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
        first: 60,
        after: endCursor,
        mediaType: 'photo',
        sortBy: [['creationTime', sortOrder === 'oldest']],
        album: selectedAlbum?.id,
      });
      setAssets((prev) => prev.concat(res.assets));
      setEndCursor(res.endCursor);
      setHasNextPage(res.hasNextPage);
    } catch {
      // Non-fatal pagination failure
    } finally {
      setLoadingMore(false);
    }
  }

  const toggleSelect = (item: MediaLibrary.Asset) => {
    const existingIdx = selected.findIndex((s) => s.id === item.id);
    if (existingIdx >= 0) {
      // Unselect: remove and adjust remaining numbers automatically
      setSelected((prev) => prev.filter((_, idx) => idx !== existingIdx));
    } else {
      // Select: append to end with next sequence number
      if (selected.length >= maxFiles) return;
      setSelected((prev) => prev.concat(item));
    }
  };

  const handleConfirm = () => {
    if (!selected.length) return;
    onConfirm(selected);
    onClose();
  };

  const renderItem = ({ item }: { item: MediaLibrary.Asset }) => {
    const orderNumber = selectedIndexMap.get(item.id);
    const isSelected = orderNumber !== undefined;

    return (
      <TouchableOpacity
        style={[
          styles.tile,
          { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: C.surface2 },
          isSelected && { borderColor: C.brand, borderWidth: 2.5 },
        ]}
        onPress={() => toggleSelect(item)}
        onLongPress={() => setPreviewAsset(item)}
        activeOpacity={0.82}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.tileImage}
          resizeMode="cover"
        />

        {isSelected ? (
          <View style={styles.selectedDimOverlay} />
        ) : null}

        {/* CamScanner-Style Top-Right Numbered Badge */}
        <View
          style={[
            styles.badgeBox,
            isSelected
              ? { backgroundColor: C.brand, borderColor: C.white }
              : { backgroundColor: 'rgba(0,0,0,0.42)', borderColor: 'rgba(255,255,255,0.7)' },
          ]}
        >
          {isSelected ? (
            <Text style={styles.badgeNumberText}>{orderNumber}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        {/* Top Header matching CamScanner layout */}
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={22} color={C.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.albumDropdownBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={() => setShowAlbumPicker(true)}
            activeOpacity={0.8}
          >
            <Text numberOfLines={1} style={[styles.albumTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {selectedAlbum?.title || 'Select Photo'}
            </Text>
            <Feather name="chevron-down" size={16} color={C.brand} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.importBtn,
              { backgroundColor: selected.length > 0 ? C.brand : C.surface3 },
            ]}
            disabled={selected.length === 0}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.importBtnText,
                { color: selected.length > 0 ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold },
              ]}
            >
              {`Import (${selected.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sub-Header Toolbar: Chronological Sort & Status */}
        <View style={[styles.subBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity
            style={[styles.sortPill, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={() => setSortOrder((prev) => (prev === 'oldest' ? 'newest' : 'oldest'))}
            activeOpacity={0.8}
          >
            <Feather name={sortOrder === 'oldest' ? 'arrow-down' : 'arrow-up'} size={13} color={C.brand} />
            <Text style={[styles.sortText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {sortOrder === 'oldest' ? 'Page 1 First (Oldest)' : 'Newest First'}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {selected.length > 0 ? (
              <TouchableOpacity onPress={() => setSelected([])} activeOpacity={0.7}>
                <Text style={[styles.clearText, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.hintText, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                Tap in page order
              </Text>
            )}
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
              <Text style={[styles.permBtnText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
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
                <View style={{ height: insets.bottom + 16 }} />
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

        {/* Bottom Floating Confirm Bar when items selected */}
        {selected.length > 0 ? (
          <View
            style={[
              styles.floatingBottomBar,
              {
                backgroundColor: isDark ? 'rgba(18, 18, 18, 0.96)' : 'rgba(255, 255, 255, 0.96)',
                borderTopColor: C.border,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
              },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.bottomCountText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {`${selected.length} Page${selected.length > 1 ? 's' : ''} Selected`}
              </Text>
              <Text style={[styles.bottomSeqText, { color: C.brand, fontFamily: FontFamily.jakartaMedium }]}>
                Ready to compile in exact order
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.bottomImportBtn, { backgroundColor: C.brand }]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Feather name="check" size={16} color={C.white} />
              <Text style={[styles.bottomImportBtnText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                Import Now
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
                        {`${alb.assetCount} photos`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Long-press Lightbox Full Preview Modal */}
        <Modal visible={previewAsset !== null} transparent animationType="fade" onRequestClose={() => setPreviewAsset(null)}>
          <View style={styles.lightboxRoot}>
            <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setPreviewAsset(null)}>
              <Feather name="x" size={24} color="#ffffff" />
            </TouchableOpacity>
            {previewAsset ? (
              <Image source={{ uri: previewAsset.uri }} style={styles.lightboxImg} resizeMode="contain" />
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    maxWidth: SCREEN_WIDTH * 0.52,
  },
  albumTitle: {
    fontSize: 14.5,
  },
  importBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  importBtnText: {
    fontSize: 13.5,
  },
  subBar: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 12,
  },
  hintText: {
    fontSize: 12,
  },
  clearText: {
    fontSize: 12.5,
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
    backgroundColor: 'rgba(91, 133, 247, 0.22)',
  },
  badgeBox: {
    position: 'absolute',
    top: 6,
    right: 6,
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
  floatingBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomCountText: {
    fontSize: 14.5,
  },
  bottomSeqText: {
    fontSize: 12,
  },
  bottomImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bottomImportBtnText: {
    fontSize: 14,
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
  lightboxRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lightboxImg: {
    width: SCREEN_WIDTH * 0.95,
    height: '80%',
  },
});
