// Photos to PDF. Reverse-engineered 5-stage mobile document scanner and
// assignment compiler: auto boundary detection, 4-corner perspective warp,
// illumination division shadow removal, gamma 5/6 LUT, 1.5x chroma boost,
// asymmetric 3-zone unsharp mask, Whiteout eraser studio, ID Card 2-in-1,
// Book 2-page split, 1-tap BUBT Cover Page prepend, and signature ink stamp.
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, SectorColors } from '../../theme';
import {
  IMAGE_PRESETS,
  DEFAULT_PRESET,
  LIMITS,
  PdfError,
  DEFAULT_LAYOUT_MODE,
  DEFAULT_FILTER_MODE,
  DEFAULT_SCAN_PAGE_MODE,
  DEFAULT_TARGET_SIZE,
  type PresetKey,
  type LayoutMode,
  type FilterMode,
  type ScanPageMode,
  type TargetSizeKey,
} from '../../services/pdf/presets';
import { moveItem, baseName, isHeicFile } from '../../services/pdf/pdfUtils';
import { buildImagesPdf, type BuiltPdf, type PhotoInput } from '../../services/pdf/imagesToPdf';
import {
  sharePdf,
  savePdfToDevice,
  getLatestCoverPage,
  type LatestCoverMeta,
} from '../../services/pdf/pdfFiles';
import { useRasterEngine } from '../../services/pdf/rasterEngine';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import {
  Notice,
  NoticeText,
  ProgressPanel,
  ResultPanel,
  ThumbGrid,
  ThumbCard,
  SegmentToggle,
  PrivacyNote,
  usePdfErrorText,
} from './components';
import { PageStudioModal, type PageStudioResult } from './PageStudioModal';
import { MediaPickerModal } from './MediaPickerModal';
import * as MediaLibrary from 'expo-media-library/legacy';

interface Item extends PhotoInput {
  id: number;
  name: string;
  previewUri?: string | null;
}

let seq = 0;

function defaultDocName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `Assignment_${y}${m}${day}`;
}

export function ToolImagesScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const errorText = usePdfErrorText();
  const { engine, host } = useRasterEngine();

  const [items, setItems] = useState<Item[]>([]);
  const [docTitle, setDocTitle] = useState(defaultDocName);
  const [preset, setPreset] = useState<PresetKey>(DEFAULT_PRESET);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(DEFAULT_LAYOUT_MODE);
  const [filterMode, setFilterMode] = useState<FilterMode>(DEFAULT_FILTER_MODE);
  const [scanMode, setScanMode] = useState<ScanPageMode>(DEFAULT_SCAN_PAGE_MODE);
  const [targetSize, setTargetSize] = useState<TargetSizeKey>(DEFAULT_TARGET_SIZE);
  const [autoCrop, setAutoCrop] = useState(true);
  const [stampAcademic, setStampAcademic] = useState(false);
  const [latestCover, setLatestCover] = useState<LatestCoverMeta | null>(() => getLatestCoverPage());
  const [prependCover, setPrependCover] = useState<boolean>(() => Boolean(getLatestCoverPage()));
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [studioIndex, setStudioIndex] = useState<number | null>(null);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, pass: 1 });
  const [result, setResult] = useState<BuiltPdf | null>(null);
  const [previewModal, setPreviewModal] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    const refreshCover = () => {
      const meta = getLatestCoverPage();
      setLatestCover((prev) => {
        if (!prev && meta) setPrependCover(true);
        return meta;
      });
    };
    refreshCover();
    const unsub = navigation?.addListener?.('focus', refreshCover);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [navigation]);

  const update = (fn: (prev: Item[]) => Item[]) => {
    setItems(fn);
    setResult(null);
  };

  function addAssets(assets: ImagePicker.ImagePickerAsset[]) {
    const accepted: Item[] = [];
    let heic = 0;
    let tooBig = 0;
    const now = Date.now();

    assets.forEach((a, index) => {
      const name = a.fileName ?? `photo-${now}-${index + 1}.jpg`;
      if (isHeicFile(name, a.mimeType)) {
        heic++;
        return;
      }
      if ((a.fileSize ?? 0) > LIMITS.images.maxBytes) {
        tooBig++;
        return;
      }
      accepted.push({
        id: ++seq,
        uri: a.uri,
        width: a.width ?? 0,
        height: a.height ?? 0,
        rotate: 0,
        name,
      });
    });

    if (heic) toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.errors.heic });
    if (tooBig) toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.errors.skippedBig(tooBig) });

    const room = LIMITS.images.maxFiles - items.length;
    if (room <= 0) {
      toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.errors.tooManyFiles(LIMITS.images.maxFiles) });
      return;
    }
    if (accepted.length > room) {
      toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.errors.tooManyFiles(LIMITS.images.maxFiles) });
    }
    const added = accepted.slice(0, room);
    if (!added.length) return;
    update((prev) => prev.concat(added));
  }

  function addMediaAssets(assets: MediaLibrary.Asset[]) {
    const accepted: Item[] = [];
    let heic = 0;
    const now = Date.now();

    assets.forEach((a, index) => {
      const name = a.filename || `photo-${now}-${index + 1}.jpg`;
      if (isHeicFile(name, undefined)) {
        heic++;
        return;
      }
      accepted.push({
        id: ++seq,
        uri: a.uri,
        width: a.width ?? 0,
        height: a.height ?? 0,
        rotate: 0,
        name,
      });
    });

    if (heic) {
      toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.errors.heic });
    }

    const room = LIMITS.images.maxFiles - items.length;
    if (room <= 0) {
      toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.errors.tooManyFiles(LIMITS.images.maxFiles) });
      return;
    }
    const added = accepted.slice(0, room);
    if (!added.length) return;
    update((prev) => prev.concat(added));
    toast({
      type: 'success',
      title: t.pdfmaker.tools.imagesTitle,
      message: `${added.length} page${added.length > 1 ? 's' : ''} added in exact selection sequence.`,
    });
  }

  function pickFromLibrary() {
    setMediaPickerVisible(true);
  }

  async function pickFromSystemLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.images.permission });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (res.canceled || !res.assets?.length) return;

    // Automatically sort multi-selected assets by filename / natural sequence
    const sorted = res.assets.length > 1
      ? res.assets.slice().sort((a, b) => {
          const na = a.fileName || '';
          const nb = b.fileName || '';
          return na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' });
        })
      : res.assets;

    addAssets(sorted);
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.images.cameraPermission });
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (res.canceled || !res.assets?.length) return;
    addAssets(res.assets);

    // Continuous Batch Camera loop: prompt to immediately capture next page
    setTimeout(() => {
      Alert.alert(
        t.pdfmaker.images.batchCapture,
        t.pdfmaker.images.batchPrompt(items.length + res.assets.length),
        [
          { text: t.pdfmaker.images.batchDone, style: 'cancel' },
          { text: t.pdfmaker.images.batchNext, onPress: () => { pickFromCamera(); } },
        ],
        { cancelable: true },
      );
    }, 400);
  }

  async function pickSignature() {
    if (signatureUri) {
      setSignatureUri(null);
      setResult(null);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      toast({ type: 'error', title: t.pdfmaker.tools.imagesTitle, message: t.pdfmaker.images.permission });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (res.canceled || !res.assets?.length) return;
    setSignatureUri(res.assets[0].uri);
    setResult(null);
  }

  const removeAt = (i: number) => update((prev) => prev.filter((_, n) => n !== i));
  const rotateAt = (i: number) =>
    update((prev) =>
      prev.map((it, n) =>
        n === i
          ? {
              ...it,
              rotate: ((it.rotate + 90) % 360) as PhotoInput['rotate'],
              quad: null,
              previewUri: null,
            }
          : it,
      ),
    );
  const moveTo = (from: number, to: number) => update((prev) => moveItem(prev, from, to));
  const reset = () => {
    setItems([]);
    setResult(null);
  };

  const applyStudioChanges = (idx: number, res: PageStudioResult) => {
    update((prev) =>
      prev.map((it, n) =>
        n === idx
          ? {
              ...it,
              rotate: res.rotate,
              filter: res.filter,
              quad: res.quad,
              whiteoutStrokes: res.whiteoutStrokes,
              previewUri: res.previewDataUri ?? it.previewUri ?? null,
            }
          : it,
      ),
    );
  };

  async function generate() {
    if (!items.length || busy) return;
    setBusy(true);
    setResult(null);
    cancelRef.current = false;
    setProgress({ done: 0, total: items.length, pass: 1 });

    const cleanTitle = (docTitle.trim() || baseName(items[0].name)).replace(/\.pdf$/i, '');
    try {
      const out = await buildImagesPdf(items, IMAGE_PRESETS[preset], {
        name: `${cleanTitle}.pdf`,
        layoutMode,
        filterMode,
        autoCrop,
        scanMode,
        targetSize,
        prependCoverUri: prependCover && latestCover ? latestCover.uri : null,
        signatureUri,
        engine,
        footerText: stampAcademic ? 'BUBT CampusOne' : undefined,
        onProgress: (done, total, pass) => setProgress({ done, total, pass: pass ?? 1 }),
        isCancelled: () => cancelRef.current,
      });
      setResult(out);
    } catch (err) {
      const code = err instanceof PdfError ? err.code : 'unknown';
      if (code !== 'cancelled') {
        toast({ type: 'error', title: t.pdfmaker.errors.couldNotCreate, message: errorText(code) });
      }
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!result) return;
    try {
      await sharePdf(result.uri, t.pdfmaker.common.shareTitle);
    } catch {
      toast({ type: 'error', title: t.pdfmaker.errors.couldNotCreate, message: t.pdfmaker.errors.unknown });
    }
  }

  async function saveToDownloads() {
    if (!result) return;
    try {
      const res = await savePdfToDevice(result.uri, finalName);
      if (res.success) {
        toast({ type: 'success', title: t.pdfmaker.common.savedToDevice });
      }
    } catch {
      toast({ type: 'error', title: t.pdfmaker.errors.couldNotCreate, message: t.pdfmaker.errors.unknown });
    }
  }

  const finalName = `${(docTitle.trim() || 'Assignment').replace(/\.pdf$/i, '')}.pdf`;

  const filterChips: { key: FilterMode; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
    { key: 'magic', label: t.pdfmaker.images.filterMagic, icon: 'zap' },
    { key: 'bleed_erase', label: t.pdfmaker.images.filterBleedErase, icon: 'feather' },
    { key: 'bw', label: t.pdfmaker.images.filterBw, icon: 'file-text' },
    { key: 'whiteboard', label: t.pdfmaker.images.filterWhiteboard, icon: 'monitor' },
    { key: 'grayscale', label: t.pdfmaker.images.filterGrayscale, icon: 'sliders' },
    { key: 'original', label: t.pdfmaker.images.filterOriginal, icon: 'image' },
  ];

  const renderCoverCard = () => {
    if (latestCover) {
      return (
        <View style={[styles.coverCard, { backgroundColor: C.surface, borderColor: prependCover ? C.brand : C.border }]}>
          <TouchableOpacity
            style={styles.coverToggleMain}
            onPress={() => {
              setPrependCover(!prependCover);
              setResult(null);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.stampCheck,
                {
                  borderColor: prependCover ? C.brand : C.border,
                  backgroundColor: prependCover ? C.brand : 'transparent',
                },
              ]}
            >
              {prependCover ? <Feather name="check" size={13} color={C.white} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.coverTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.images.prependCoverTitle}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.coverSub, { color: prependCover ? C.brand : C.text3, fontFamily: FontFamily.jakartaMedium }]}
              >
                {t.pdfmaker.images.prependCoverReady(latestCover.label)}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.coverEditPill, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={() => navigation.navigate('CoverPageForm')}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={13} color={C.text2} />
            <Text style={[styles.coverEditText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.editCoverBtn}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.coverCard, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => navigation.navigate('CoverPageForm')}
        activeOpacity={0.8}
      >
        <View style={[styles.coverIcon, { backgroundColor: C.surface2 }]}>
          <Feather name="file-text" size={20} color={SectorColors.coverpage} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.coverTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {t.pdfmaker.images.attachCover}
          </Text>
          <Text style={[styles.coverSub, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
            {t.pdfmaker.images.prependCoverEmpty}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={C.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {host}
      <SubBar title={t.pdfmaker.tools.imagesTitle} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <>
            <TouchableOpacity
              style={[styles.dropZone, { borderColor: C.border2, backgroundColor: C.surface }]}
              onPress={pickFromLibrary}
              activeOpacity={0.8}
            >
              <Feather name="image" size={26} color={SectorColors.pdfmaker} />
              <Text style={[styles.dropTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.images.addPhotos}
              </Text>
              <Text style={[styles.dropHint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.images.hint}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cameraAction58, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={pickFromCamera}
              activeOpacity={0.8}
            >
              <Feather name="camera" size={18} color={C.brand} />
              <Text style={[styles.cameraActionText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.images.camera}
              </Text>
            </TouchableOpacity>

            {renderCoverCard()}

            <PrivacyNote />
          </>
        ) : (
          <>
            {renderCoverCard()}

            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.docName}
            </Text>
            <View style={[styles.nameInputBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="type" size={16} color={C.text3} />
              <TextInput
                style={[styles.nameInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={docTitle}
                onChangeText={(v) => {
                  setDocTitle(v);
                  setResult(null);
                }}
                placeholder={t.pdfmaker.images.docNamePlaceholder}
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.images.addPhotos}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {items.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => {
                      update((prev) =>
                        prev.slice().sort((a, b) =>
                          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
                        ),
                      );
                      toast({ type: 'success', title: 'Pages Arranged', message: 'Sorted by page number/filename' });
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    activeOpacity={0.7}
                  >
                    <Feather name="bar-chart-2" size={13} color={C.brand} />
                    <Text style={{ color: C.brand, fontSize: 12.5, fontFamily: FontFamily.jakartaBold }}>
                      Sort (1→N)
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <Text style={[styles.countBadge, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.images.count(items.length)}
                  {scanMode === 'book_split' ? ` (${items.length * 2} pgs)` : ''}
                  {prependCover && latestCover ? ' + Cover' : ''}
                </Text>
              </View>
            </View>

            <View style={[styles.toolbar58, { backgroundColor: C.surface, borderColor: C.border }]}>
              <TouchableOpacity
                style={[styles.toolbarItem, { backgroundColor: C.surface2 }]}
                onPress={pickFromLibrary}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color={C.brand} />
                <Text style={[styles.toolbarItemText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.images.addMore}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolbarItem, { backgroundColor: C.surface2 }]}
                onPress={pickFromCamera}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={16} color={C.brand} />
                <Text style={[styles.toolbarItemText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.images.camera}
                </Text>
              </TouchableOpacity>
              {items.length > 1 ? (
                <TouchableOpacity
                  style={[styles.toolbarItem, { backgroundColor: C.surface2 }]}
                  onPress={() => update((prev) => prev.slice().reverse())}
                  activeOpacity={0.8}
                >
                  <Feather name="repeat" size={15} color={C.brand} />
                  <Text style={[styles.toolbarItemText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.pdfmaker.images.reverseOrder}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.toolbarItem,
                  { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)' },
                ]}
                onPress={reset}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={16} color={C.danger} />
                <Text style={[styles.toolbarItemText, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.images.clearAll}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 6 Reverse-Engineered Scanner Filter Modes */}
            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.filter}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollRow}
            >
              {filterChips.map((fc) => {
                const active = filterMode === fc.key;
                return (
                  <TouchableOpacity
                    key={fc.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? C.brand : C.surface,
                        borderColor: active ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setFilterMode(fc.key);
                      setResult(null);
                    }}
                    activeOpacity={0.85}
                  >
                    <Feather name={fc.icon} size={14} color={active ? C.white : C.text2} />
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: active ? C.white : C.text,
                          fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {fc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={[styles.hint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
              {t.pdfmaker.images.filterHint}
            </Text>

            {/* Pro Scan Mode: Single Page | ID Card 2-in-1 | Book 2-Page Split */}
            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.scanMode}
            </Text>
            <SegmentToggle
              value={scanMode}
              onChange={(v) => {
                setScanMode(v);
                setResult(null);
              }}
              options={[
                { value: 'single' as ScanPageMode, label: t.pdfmaker.images.scanModeSingle },
                { value: 'id_card' as ScanPageMode, label: t.pdfmaker.images.scanModeIdCard },
                { value: 'book_split' as ScanPageMode, label: t.pdfmaker.images.scanModeBookSplit },
              ]}
            />
            <Text style={[styles.hint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
              {scanMode === 'id_card'
                ? t.pdfmaker.images.scanModeHintIdCard
                : scanMode === 'book_split'
                  ? t.pdfmaker.images.scanModeHintBook
                  : t.pdfmaker.images.scanModeHintSingle}
            </Text>

            {/* Auto-Crop & Spiral Cleanup Toggle */}
            <TouchableOpacity
              style={[styles.stampToggleRow, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => {
                setAutoCrop(!autoCrop);
                setResult(null);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.stampCheck,
                  {
                    borderColor: autoCrop ? C.brand : C.border,
                    backgroundColor: autoCrop ? C.brand : 'transparent',
                  },
                ]}
              >
                {autoCrop ? <Feather name="check" size={13} color={C.white} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stampText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.images.autoCropTitle}
                </Text>
                <Text style={[styles.toggleSub, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.pdfmaker.images.autoCropSub}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.layout}
            </Text>
            <SegmentToggle
              value={layoutMode}
              onChange={(v) => {
                setLayoutMode(v);
                setResult(null);
              }}
              options={[
                { value: 'borderless' as LayoutMode, label: t.pdfmaker.images.layoutBorderless },
                { value: 'smart_fit' as LayoutMode, label: t.pdfmaker.images.layoutSmartFit },
                { value: 'adaptive' as LayoutMode, label: t.pdfmaker.images.layoutAdaptive },
              ]}
            />
            <Text style={[styles.hint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
              {t.pdfmaker.images.layoutHint}
            </Text>

            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.quality}
            </Text>
            <SegmentToggle
              value={preset}
              onChange={(v) => {
                setPreset(v);
                setResult(null);
              }}
              options={[
                { value: 'high' as PresetKey, label: t.pdfmaker.images.qualityHigh },
                { value: 'balanced' as PresetKey, label: t.pdfmaker.images.qualityBalanced },
                { value: 'compact' as PresetKey, label: t.pdfmaker.images.qualityCompact },
              ]}
            />
            <Text style={[styles.hint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
              {t.pdfmaker.images.qualityNote}
            </Text>

            {/* Target File Size Cap */}
            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.targetSize}
            </Text>
            <SegmentToggle
              value={targetSize}
              onChange={(v) => {
                setTargetSize(v);
                setResult(null);
              }}
              options={[
                { value: 'none' as TargetSizeKey, label: t.pdfmaker.images.targetSizeNone },
                { value: '5mb' as TargetSizeKey, label: t.pdfmaker.images.targetSize5mb },
                { value: '2mb' as TargetSizeKey, label: t.pdfmaker.images.targetSize2mb },
              ]}
            />

            {/* Handwritten Signature Ink Stamp */}
            <TouchableOpacity
              style={[
                styles.stampToggleRow,
                {
                  backgroundColor: C.surface,
                  borderColor: signatureUri ? C.brand : C.border,
                },
              ]}
              onPress={pickSignature}
              activeOpacity={0.8}
            >
              <View style={[styles.sigIconBox, { backgroundColor: C.surface2 }]}>
                <Feather name={signatureUri ? 'check-circle' : 'edit-3'} size={16} color={signatureUri ? C.brand : C.text2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stampText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.images.signatureTitle}
                </Text>
                <Text
                  style={[
                    styles.toggleSub,
                    {
                      color: signatureUri ? C.brand : C.text3,
                      fontFamily: FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {signatureUri ? t.pdfmaker.images.signatureAttached : t.pdfmaker.images.signatureSub}
                </Text>
              </View>
              <Feather name={signatureUri ? 'x' : 'plus'} size={17} color={signatureUri ? C.danger : C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stampToggleRow, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => {
                setStampAcademic(!stampAcademic);
                setResult(null);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.stampCheck,
                  {
                    borderColor: stampAcademic ? C.brand : C.border,
                    backgroundColor: stampAcademic ? C.brand : 'transparent',
                  },
                ]}
              >
                {stampAcademic ? <Feather name="check" size={13} color={C.white} /> : null}
              </View>
              <Text style={[styles.stampText, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.images.academicStamp}
              </Text>
            </TouchableOpacity>

            <ThumbGrid>
              {items.map((it, i) => {
                const hasCustomStudio = Boolean(
                  it.quad || (it.whiteoutStrokes && it.whiteoutStrokes.length) || it.filter,
                );
                return (
                  <ThumbCard
                    key={it.id}
                    uri={it.previewUri || it.uri}
                    caption={it.name}
                    index={i}
                    total={items.length}
                    rotate={it.previewUri ? 0 : it.rotate}
                    badgeLabel={hasCustomStudio ? t.pdfmaker.images.editBadge : null}
                    onEdit={() => setStudioIndex(i)}
                    onFirst={() => moveTo(i, 0)}
                    onPrev={() => moveTo(i, i - 1)}
                    onNext={() => moveTo(i, i + 1)}
                    onRotate={() => rotateAt(i)}
                    onRemove={() => removeAt(i)}
                  />
                );
              })}
            </ThumbGrid>

            {busy ? (
              <ProgressPanel
                label={progress.pass === 2 ? t.pdfmaker.images.optimizing : t.pdfmaker.images.building}
                done={progress.done}
                total={progress.total}
                onCancel={() => {
                  cancelRef.current = true;
                }}
              />
            ) : null}

            {result ? (
              <ResultPanel
                title={t.pdfmaker.images.ready}
                bytesAfter={result.bytes}
                pages={result.pages}
                onPreview={() => setPreviewModal(true)}
                onShare={share}
                onSaveDevice={saveToDownloads}
                onReset={reset}
              />
            ) : !busy ? (
              <TouchableOpacity
                style={[styles.cta, { backgroundColor: C.brand }]}
                onPress={generate}
                activeOpacity={0.85}
              >
                <Feather name="file-plus" size={17} color={C.white} />
                <Text style={[styles.ctaText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.images.create}
                </Text>
              </TouchableOpacity>
            ) : null}

            <Notice tone="info">
              <NoticeText>{t.pdfmaker.images.gridHint}</NoticeText>
            </Notice>
            <PrivacyNote />
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Full-Screen Interactive Page Studio Modal */}
      <PageStudioModal
        visible={studioIndex !== null && studioIndex >= 0 && studioIndex < items.length}
        target={
          studioIndex !== null && items[studioIndex]
            ? {
                index: studioIndex,
                uri: items[studioIndex].uri,
                width: items[studioIndex].width,
                height: items[studioIndex].height,
                rotate: items[studioIndex].rotate,
                filter: items[studioIndex].filter,
                quad: items[studioIndex].quad,
                whiteoutStrokes: items[studioIndex].whiteoutStrokes,
              }
            : null
        }
        defaultFilter={filterMode}
        autoCropDefault={autoCrop}
        engine={engine}
        onClose={() => setStudioIndex(null)}
        onApply={applyStudioChanges}
      />

      {/* In-App PDF Preview Inspection Modal */}
      <CampusPdfViewerModal
        visible={previewModal}
        onClose={() => setPreviewModal(false)}
        title={finalName}
        subtitle={t.pdfmaker.images.ready}
        fileUrl={result?.uri ?? null}
        fileName={finalName}
      />

      {/* CamScanner-Style In-App Numbered Photo Picker */}
      <MediaPickerModal
        visible={mediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onConfirm={addMediaAssets}
        onFallbackSystemPicker={pickFromSystemLibrary}
        maxFiles={LIMITS.images.maxFiles - items.length}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, gap: 12 } as ViewStyle,
  dropZone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 34,
    paddingHorizontal: 20,
  } as ViewStyle,
  dropTitle: { fontSize: 16 },
  dropHint: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  cameraAction58: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  cameraActionText: { fontSize: 14.5 },
  coverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  coverToggleMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  } as ViewStyle,
  coverEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  coverEditText: { fontSize: 12 } as TextStyle,
  coverIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  coverTitle: { fontSize: 14.5 },
  coverSub: { fontSize: 12, marginTop: 1 },
  nameInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  nameInput: { flex: 1, fontSize: 14.5, height: '100%' } as TextStyle,
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  } as ViewStyle,
  countBadge: { fontSize: 13 },
  toolbar58: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  } as ViewStyle,
  toolbarItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: '100%',
    borderRadius: 12,
  } as ViewStyle,
  toolbarItemText: { fontSize: 13.5 },
  filterScrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  } as ViewStyle,
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
  } as ViewStyle,
  filterChipText: { fontSize: 13 } as TextStyle,
  label: { fontSize: 14, marginTop: 2 },
  hint: { fontSize: 12 },
  stampToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  stampCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  sigIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stampText: { fontSize: 14 },
  toggleSub: { fontSize: 11.5, marginTop: 1 } as TextStyle,
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
  } as ViewStyle,
  ctaText: { fontSize: 15 },
});
