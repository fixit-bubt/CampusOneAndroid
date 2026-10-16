// Photos to PDF. Advanced mobile document scanner and assignment compiler:
// Borderless A4 edge-to-edge layout, multi-shot batch camera, document naming,
// academic page numbering, and in-app PDF inspection.
import { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, type ViewStyle, type TextStyle,
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
  IMAGE_PRESETS, DEFAULT_PRESET, LIMITS, PdfError,
  type PresetKey, type LayoutMode, DEFAULT_LAYOUT_MODE,
} from '../../services/pdf/presets';
import { moveItem, baseName, isHeicFile } from '../../services/pdf/pdfUtils';
import { buildImagesPdf, type BuiltPdf, type PhotoInput } from '../../services/pdf/imagesToPdf';
import { sharePdf } from '../../services/pdf/pdfFiles';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import {
  Notice, NoticeText, ProgressPanel, ResultPanel, ThumbGrid, ThumbCard,
  SegmentToggle, PrivacyNote, usePdfErrorText,
} from './components';

interface Item extends PhotoInput { id: number; name: string }

let seq = 0;

function defaultDocName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `Assignment_${y}${m}${day}`;
}

export function ToolImagesScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const errorText = usePdfErrorText();

  const [items, setItems] = useState<Item[]>([]);
  const [docTitle, setDocTitle] = useState(defaultDocName);
  const [preset, setPreset] = useState<PresetKey>(DEFAULT_PRESET);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(DEFAULT_LAYOUT_MODE);
  const [stampAcademic, setStampAcademic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<BuiltPdf | null>(null);
  const [previewModal, setPreviewModal] = useState(false);
  const cancelRef = useRef(false);

  const update = (fn: (prev: Item[]) => Item[]) => { setItems(fn); setResult(null); };

  function addAssets(assets: ImagePicker.ImagePickerAsset[]) {
    const accepted: Item[] = [];
    let heic = 0;
    let tooBig = 0;
    const now = Date.now();

    assets.forEach((a, index) => {
      const name = a.fileName ?? `photo-${now}-${index + 1}.jpg`;
      if (isHeicFile(name, a.mimeType)) { heic++; return; }
      if ((a.fileSize ?? 0) > LIMITS.images.maxBytes) { tooBig++; return; }
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

  async function pickFromLibrary() {
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
    addAssets(res.assets);
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

  const removeAt = (i: number) => update((prev) => prev.filter((_, n) => n !== i));
  const rotateAt = (i: number) =>
    update((prev) => prev.map((it, n) => (n === i ? { ...it, rotate: ((it.rotate + 90) % 360) as PhotoInput['rotate'] } : it)));
  const moveTo = (from: number, to: number) => update((prev) => moveItem(prev, from, to));
  const reset = () => { setItems([]); setResult(null); };

  async function generate() {
    if (!items.length || busy) return;
    setBusy(true);
    setResult(null);
    cancelRef.current = false;
    setProgress({ done: 0, total: items.length });

    const cleanTitle = (docTitle.trim() || baseName(items[0].name)).replace(/\.pdf$/i, '');
    try {
      const out = await buildImagesPdf(items, IMAGE_PRESETS[preset], {
        name: `${cleanTitle}.pdf`,
        layoutMode,
        footerText: stampAcademic ? 'BUBT CampusOne' : undefined,
        onProgress: (done, total) => setProgress({ done, total }),
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
      await sharePdf(result.uri, t.pdfmaker.common.saveDevice);
      toast({ type: 'success', title: t.pdfmaker.common.savedToDevice });
    } catch {
      toast({ type: 'error', title: t.pdfmaker.errors.couldNotCreate, message: t.pdfmaker.errors.unknown });
    }
  }

  const finalName = `${(docTitle.trim() || 'Assignment').replace(/\.pdf$/i, '')}.pdf`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
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

            <View style={styles.actionRow}>
              <SmallBtn icon="camera" label={t.pdfmaker.images.camera} onPress={pickFromCamera} />
            </View>

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
                  {t.pdfmaker.images.coverAttached}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <PrivacyNote />
          </>
        ) : (
          <>
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
                  {t.pdfmaker.images.coverAttached}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.docName}
            </Text>
            <View style={[styles.nameInputBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="type" size={16} color={C.text3} />
              <TextInput
                style={[styles.nameInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={docTitle}
                onChangeText={(v) => { setDocTitle(v); setResult(null); }}
                placeholder={t.pdfmaker.images.docNamePlaceholder}
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.actionRow}>
              <SmallBtn icon="plus" label={t.pdfmaker.images.addMore} onPress={pickFromLibrary} />
              <SmallBtn icon="camera" label={t.pdfmaker.images.camera} onPress={pickFromCamera} />
              <SmallBtn icon="trash-2" label={t.pdfmaker.images.clearAll} onPress={reset} />
              <Text style={[styles.count, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.images.count(items.length)}
              </Text>
            </View>

            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.layout}
            </Text>
            <SegmentToggle
              value={layoutMode}
              onChange={(v) => { setLayoutMode(v); setResult(null); }}
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
              onChange={(v) => { setPreset(v); setResult(null); }}
              options={[
                { value: 'high' as PresetKey, label: t.pdfmaker.images.qualityHigh },
                { value: 'balanced' as PresetKey, label: t.pdfmaker.images.qualityBalanced },
                { value: 'compact' as PresetKey, label: t.pdfmaker.images.qualityCompact },
              ]}
            />
            <Text style={[styles.hint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
              {t.pdfmaker.images.qualityNote}
            </Text>

            <TouchableOpacity
              style={[styles.stampToggleRow, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => { setStampAcademic(!stampAcademic); setResult(null); }}
              activeOpacity={0.8}
            >
              <View style={[styles.stampCheck, { borderColor: stampAcademic ? C.brand : C.border, backgroundColor: stampAcademic ? C.brand : 'transparent' }]}>
                {stampAcademic ? <Feather name="check" size={13} color={C.white} /> : null}
              </View>
              <Text style={[styles.stampText, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.images.academicStamp}
              </Text>
            </TouchableOpacity>

            <ThumbGrid>
              {items.map((it, i) => (
                <ThumbCard
                  key={it.id}
                  uri={it.uri}
                  caption={it.name}
                  index={i}
                  total={items.length}
                  rotate={it.rotate}
                  onFirst={() => moveTo(i, 0)}
                  onPrev={() => moveTo(i, i - 1)}
                  onNext={() => moveTo(i, i + 1)}
                  onRotate={() => rotateAt(i)}
                  onRemove={() => removeAt(i)}
                />
              ))}
            </ThumbGrid>

            {busy ? (
              <ProgressPanel
                label={t.pdfmaker.images.building}
                done={progress.done}
                total={progress.total}
                onCancel={() => { cancelRef.current = true; }}
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

            <Notice tone="info"><NoticeText>{t.pdfmaker.images.gridHint}</NoticeText></Notice>
            <PrivacyNote />
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* In-App PDF Preview Inspection Modal */}
      <CampusPdfViewerModal
        visible={previewModal}
        onClose={() => setPreviewModal(false)}
        title={finalName}
        subtitle={t.pdfmaker.images.ready}
        fileUrl={result?.uri ?? null}
        fileName={finalName}
      />
    </SafeAreaView>
  );
}

function SmallBtn({
  icon, label, onPress,
}: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void }) {
  const { C } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.smallBtn, { borderColor: C.border, backgroundColor: C.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Feather name={icon} size={14} color={C.text2} />
      <Text style={[styles.smallBtnText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, gap: 12 } as ViewStyle,
  dropZone: { alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 2, borderStyle: 'dashed', borderRadius: 18, paddingVertical: 34, paddingHorizontal: 20 } as ViewStyle,
  dropTitle: { fontSize: 16 },
  dropHint: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  coverCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 72, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  coverIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  coverTitle: { fontSize: 15 },
  coverSub: { fontSize: 12.5, marginTop: 1 },
  nameInputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 58, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  nameInput: { flex: 1, fontSize: 14.5, height: '100%' } as TextStyle,
  actionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  smallBtnText: { fontSize: 13 },
  count: { fontSize: 13, marginLeft: 'auto' },
  label: { fontSize: 14, marginTop: 2 },
  hint: { fontSize: 12 },
  stampToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  stampCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  stampText: { fontSize: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 58, borderRadius: 16 } as ViewStyle,
  ctaText: { fontSize: 15 },
});
