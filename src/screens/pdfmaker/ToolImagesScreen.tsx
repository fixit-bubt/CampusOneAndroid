// Photos to PDF. The main student workflow: photograph the pages of a
// handwritten assignment, put them in order, get one A4 PDF.
import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { IMAGE_PRESETS, DEFAULT_PRESET, LIMITS, PdfError, type PresetKey } from '../../services/pdf/presets';
import { moveItem, baseName, isHeicFile } from '../../services/pdf/pdfUtils';
import { buildImagesPdf, type BuiltPdf, type PhotoInput } from '../../services/pdf/imagesToPdf';
import { sharePdf } from '../../services/pdf/pdfFiles';
import {
  Notice, NoticeText, ProgressPanel, ResultPanel, ThumbGrid, ThumbCard,
  SegmentToggle, PrivacyNote, usePdfErrorText,
} from './components';

interface Item extends PhotoInput { id: number; name: string }

let seq = 0;

export function ToolImagesScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const errorText = usePdfErrorText();

  const [items, setItems] = useState<Item[]>([]);
  const [preset, setPreset] = useState<PresetKey>(DEFAULT_PRESET);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<BuiltPdf | null>(null);
  const cancelRef = useRef(false);

  // Any edit invalidates a built PDF, so it is cleared rather than left to be
  // shared after the list it came from changed.
  const update = (fn: (prev: Item[]) => Item[]) => { setItems(fn); setResult(null); };

  function addAssets(assets: ImagePicker.ImagePickerAsset[]) {
    const accepted: Item[] = [];
    let heic = 0;
    let tooBig = 0;

    for (const a of assets) {
      const name = a.fileName ?? `photo-${Date.now()}.jpg`;
      if (isHeicFile(name, a.mimeType)) { heic++; continue; }
      if ((a.fileSize ?? 0) > LIMITS.images.maxBytes) { tooBig++; continue; }
      accepted.push({
        id: ++seq,
        uri: a.uri,
        width: a.width ?? 0,
        height: a.height ?? 0,
        rotate: 0,
        name,
      });
    }

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
    // quality 1: the chosen preset does the compressing, and compressing twice
    // loses detail for nothing.
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
    try {
      const out = await buildImagesPdf(items, IMAGE_PRESETS[preset], {
        name: `${baseName(items[0].name)}.pdf`,
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
            <PrivacyNote />
          </>
        ) : (
          <>
            <View style={styles.actionRow}>
              <SmallBtn icon="plus" label={t.pdfmaker.images.addMore} onPress={pickFromLibrary} />
              <SmallBtn icon="camera" label={t.pdfmaker.images.camera} onPress={pickFromCamera} />
              <SmallBtn icon="trash-2" label={t.pdfmaker.images.clearAll} onPress={reset} />
              <Text style={[styles.count, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.images.count(items.length)}
              </Text>
            </View>

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
                onShare={share}
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

            <Notice tone="info"><NoticeText>{t.pdfmaker.images.hint}</NoticeText></Notice>
            <PrivacyNote />
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
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
  actionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  smallBtnText: { fontSize: 13 },
  count: { fontSize: 13, marginLeft: 'auto' },
  label: { fontSize: 14, marginTop: 2 },
  hint: { fontSize: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 } as ViewStyle,
  ctaText: { fontSize: 15 },
});
