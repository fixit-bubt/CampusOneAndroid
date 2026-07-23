// Merge PDFs and photos into one file. PDF pages are copied as they are, so
// their text stays selectable; photos become A4 pages.
import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { LIMITS, PdfError } from '../../services/pdf/presets';
import { moveItem, baseName, isHeicFile, isPdfFile, isImageFile } from '../../services/pdf/pdfUtils';
import { mergeToPdf, type MergeItem } from '../../services/pdf/mergePdf';
import type { BuiltPdf } from '../../services/pdf/imagesToPdf';
import { sharePdf } from '../../services/pdf/pdfFiles';
import {
  Notice, NoticeText, ProgressPanel, ResultPanel, FileRow, PrivacyNote, usePdfErrorText,
} from './components';

interface Item { id: number; item: MergeItem; size: number }

let seq = 0;

// The picker gives no dimensions for an image, and rasterisePhoto needs them
// to work out the scale, so ask the image itself.
function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export function ToolMergeScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const errorText = usePdfErrorText();

  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<BuiltPdf | null>(null);
  const cancelRef = useRef(false);

  const update = (fn: (prev: Item[]) => Item[]) => { setItems(fn); setResult(null); };

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;

    const accepted: Item[] = [];
    let heic = 0;
    let badType = 0;
    let tooBig = 0;

    for (const a of res.assets) {
      if (isHeicFile(a.name, a.mimeType)) { heic++; continue; }
      const pdf = isPdfFile(a.name, a.mimeType);
      const img = !pdf && isImageFile(a.name, a.mimeType);
      if (!pdf && !img) { badType++; continue; }
      const size = a.size ?? 0;
      if (size > LIMITS.merge.maxBytes) { tooBig++; continue; }

      if (pdf) {
        accepted.push({ id: ++seq, size, item: { kind: 'pdf', uri: a.uri, name: a.name } });
      } else {
        try {
          const { width, height } = await imageSize(a.uri);
          accepted.push({ id: ++seq, size, item: { kind: 'image', uri: a.uri, name: a.name, width, height } });
        } catch {
          badType++;
        }
      }
    }

    if (heic) toast({ type: 'error', title: t.pdfmaker.tools.mergeTitle, message: t.pdfmaker.errors.heic });
    if (badType) toast({ type: 'error', title: t.pdfmaker.tools.mergeTitle, message: t.pdfmaker.merge.unsupported });
    if (tooBig) toast({ type: 'error', title: t.pdfmaker.tools.mergeTitle, message: t.pdfmaker.errors.skippedBig(tooBig) });

    const room = LIMITS.merge.maxFiles - items.length;
    if (room <= 0 || accepted.length > room) {
      toast({ type: 'error', title: t.pdfmaker.tools.mergeTitle, message: t.pdfmaker.errors.tooManyFiles(LIMITS.merge.maxFiles) });
    }
    if (room <= 0) return;

    // The size cap has to apply to the queue, not to each file: ten files just
    // under the per-file limit would still be far more than the phone can hold
    // once pdf-lib has copied every page.
    const added: Item[] = [];
    let running = items.reduce((n, i) => n + i.size, 0);
    let overflow = 0;
    for (const candidate of accepted.slice(0, room)) {
      if (running + candidate.size > LIMITS.merge.maxBytes) { overflow++; continue; }
      running += candidate.size;
      added.push(candidate);
    }
    if (overflow) {
      toast({ type: 'error', title: t.pdfmaker.tools.mergeTitle, message: t.pdfmaker.errors.skippedBig(overflow) });
    }
    if (!added.length) return;
    update((prev) => prev.concat(added));
  }

  const moveTo = (from: number, to: number) => update((prev) => moveItem(prev, from, to));
  const removeAt = (i: number) => update((prev) => prev.filter((_, n) => n !== i));
  const reset = () => { setItems([]); setResult(null); };

  async function merge() {
    if (busy) return;
    if (items.length < 2) {
      toast({ type: 'error', title: t.pdfmaker.tools.mergeTitle, message: t.pdfmaker.merge.needTwo });
      return;
    }
    setBusy(true);
    setResult(null);
    cancelRef.current = false;
    setProgress({ done: 0, total: items.length });
    try {
      const out = await mergeToPdf(items.map((i) => i.item), {
        name: `${baseName(items[0].item.name)}-merged.pdf`,
        onProgress: (done, total) => setProgress({ done, total }),
        isCancelled: () => cancelRef.current,
      });
      setResult(out);
    } catch (err) {
      const code = err instanceof PdfError ? err.code : 'unknown';
      if (code === 'cancelled') return;
      const detail = err instanceof PdfError ? err.detail : undefined;
      toast({
        type: 'error',
        title: detail ? t.pdfmaker.errors.couldNotRead(detail) : t.pdfmaker.errors.couldNotCreate,
        message: errorText(code, detail),
      });
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

  const totalBytes = items.reduce((n, i) => n + i.size, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.pdfmaker.tools.mergeTitle} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <>
            <TouchableOpacity
              style={[styles.dropZone, { borderColor: C.border2, backgroundColor: C.surface }]}
              onPress={pick}
              activeOpacity={0.8}
            >
              <Feather name="file-plus" size={26} color={SectorColors.pdfmaker} />
              <Text style={[styles.dropTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.merge.add}
              </Text>
              <Text style={[styles.dropHint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.merge.hint}
              </Text>
            </TouchableOpacity>
            <PrivacyNote />
          </>
        ) : (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                onPress={pick}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color={C.text2} />
                <Text style={[styles.smallBtnText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.merge.addMore}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                onPress={reset}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={14} color={C.text2} />
                <Text style={[styles.smallBtnText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.images.clearAll}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.count, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.merge.count(items.length)}
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              {items.map((it, i) => (
                <FileRow
                  key={it.id}
                  name={it.item.name}
                  size={it.size}
                  kind={it.item.kind}
                  note={it.item.kind === 'image' ? t.pdfmaker.merge.imageNote : null}
                  index={i}
                  total={items.length}
                  onFirst={() => moveTo(i, 0)}
                  onPrev={() => moveTo(i, i - 1)}
                  onNext={() => moveTo(i, i + 1)}
                  onRemove={() => removeAt(i)}
                />
              ))}
            </View>

            <Notice tone="info"><NoticeText>{t.pdfmaker.merge.hint}</NoticeText></Notice>

            {busy ? (
              <ProgressPanel
                label={t.pdfmaker.merge.merging}
                done={progress.done}
                total={progress.total}
                onCancel={() => { cancelRef.current = true; }}
              />
            ) : null}

            {result ? (
              <ResultPanel
                title={t.pdfmaker.merge.ready}
                bytesBefore={totalBytes}
                bytesAfter={result.bytes}
                pages={result.pages}
                onShare={share}
                onReset={reset}
              />
            ) : !busy ? (
              <TouchableOpacity style={[styles.cta, { backgroundColor: C.brand }]} onPress={merge} activeOpacity={0.85}>
                <Feather name="layers" size={17} color={C.white} />
                <Text style={[styles.ctaText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.merge.action(items.length)}
                </Text>
              </TouchableOpacity>
            ) : null}

            <PrivacyNote />
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
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
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 } as ViewStyle,
  ctaText: { fontSize: 15 },
});
