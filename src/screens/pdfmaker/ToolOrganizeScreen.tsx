// Organize pages: reorder, rotate, delete and extract.
//
// The rebuild is native pdf-lib and lossless. The page pictures come from the
// hidden raster engine, one page at a time so tiles appear as they land
// instead of the screen freezing until the last one.
import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { LIMITS, THUMB_MAX_DIM, PdfError } from '../../services/pdf/presets';
import { moveItem, baseName, parseRanges, isPdfFile } from '../../services/pdf/pdfUtils';
import { organizePdf, type PageOp } from '../../services/pdf/organizePdf';
import type { BuiltPdf } from '../../services/pdf/imagesToPdf';
import { sharePdf } from '../../services/pdf/pdfFiles';
import { useRasterEngine } from '../../services/pdf/rasterEngine';
import {
  Notice, NoticeText, ProgressPanel, ResultPanel, ThumbGrid, ThumbCard, PrivacyNote, usePdfErrorText,
} from './components';

interface Page { orig: number; uri?: string; rotate: 0 | 90 | 180 | 270; keep: boolean }

export function ToolOrganizeScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const errorText = usePdfErrorText();
  const { engine, host } = useRasterEngine();

  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BuiltPdf | null>(null);
  const [range, setRange] = useState('');
  // Set on unmount and on "choose another", so a thumbnail loop that is still
  // running does not write into a screen that has moved on.
  const abandoned = useRef(false);

  useEffect(() => () => { abandoned.current = true; engine.close(); }, [engine]);

  function reset() {
    abandoned.current = true;
    setFile(null);
    setPages([]);
    setResult(null);
    setRange('');
    setLoading(null);
    engine.close();
  }

  async function open() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const picked = res.assets[0];

    if (!isPdfFile(picked.name, picked.mimeType)) {
      toast({ type: 'error', title: t.pdfmaker.tools.organizeTitle, message: t.pdfmaker.errors.pdfsOnly });
      return;
    }
    if ((picked.size ?? 0) > LIMITS.organize.maxBytes) {
      toast({ type: 'error', title: t.pdfmaker.tools.organizeTitle, message: t.pdfmaker.errors.tooLarge });
      return;
    }

    setResult(null);
    setRange('');
    setPages([]);
    setFile({ uri: picked.uri, name: picked.name });
    abandoned.current = false;
    setLoading({ done: 0, total: 0 });

    try {
      const { pages: count } = await engine.open(picked.uri, picked.name);
      if (count > LIMITS.organize.maxPages) {
        toast({ type: 'error', title: t.pdfmaker.tools.organizeTitle, message: t.pdfmaker.errors.tooManyPages });
        reset();
        return;
      }
      setPages(Array.from({ length: count }, (_, i) => ({ orig: i, rotate: 0 as const, keep: true })));
      setLoading({ done: 0, total: count });

      for (let n = 1; n <= count; n++) {
        if (abandoned.current) return;
        const base64 = await engine.thumb(n, THUMB_MAX_DIM);
        if (abandoned.current) return;
        setPages((prev) =>
          prev.map((p) => (p.orig === n - 1 ? { ...p, uri: `data:image/jpeg;base64,${base64}` } : p)));
        setLoading({ done: n, total: count });
      }
    } catch (err) {
      const code = err instanceof PdfError ? err.code : 'unknown';
      if (code !== 'cancelled') {
        toast({ type: 'error', title: t.pdfmaker.tools.organizeTitle, message: errorText(code) });
      }
      reset();
    } finally {
      setLoading(null);
    }
  }

  const update = (fn: (prev: Page[]) => Page[]) => { setPages(fn); setResult(null); };
  const moveTo = (from: number, to: number) => update((prev) => moveItem(prev, from, to));
  const rotateAt = (i: number) =>
    update((prev) => prev.map((p, n) => (n === i ? { ...p, rotate: ((p.rotate + 90) % 360) as Page['rotate'] } : p)));
  const toggleAt = (i: number) => update((prev) => prev.map((p, n) => (n === i ? { ...p, keep: !p.keep } : p)));

  // The range is read against ORIGINAL page numbers, which is what each tile's
  // caption shows, so reordering first does not change what a range means.
  function applyRange() {
    const wanted = parseRanges(range, pages.length);
    if (!wanted) {
      toast({ type: 'error', title: t.pdfmaker.tools.organizeTitle, message: t.pdfmaker.organize.badRange(pages.length) });
      return;
    }
    update((prev) => prev.map((p) => ({ ...p, keep: wanted.has(p.orig + 1) })));
    toast({ type: 'success', title: t.pdfmaker.organize.keeping(wanted.size) });
  }

  async function build() {
    if (!file || busy) return;
    const kept = pages.filter((p) => p.keep);
    if (!kept.length) {
      toast({ type: 'error', title: t.pdfmaker.tools.organizeTitle, message: t.pdfmaker.organize.noPages });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const ops: PageOp[] = kept.map((p) => ({ orig: p.orig, rotate: p.rotate }));
      const out = await organizePdf(file.uri, ops, { name: `${baseName(file.name)}-organized.pdf` });
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

  const keptCount = pages.filter((p) => p.keep).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.pdfmaker.tools.organizeTitle} onBack={() => navigation.goBack()} />
      {host}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {!file ? (
          <>
            <TouchableOpacity
              style={[styles.dropZone, { borderColor: C.border2, backgroundColor: C.surface }]}
              onPress={open}
              activeOpacity={0.8}
            >
              <Feather name="grid" size={26} color={SectorColors.pdfmaker} />
              <Text style={[styles.dropTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.organize.open}
              </Text>
              <Text style={[styles.dropHint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.organize.hint}
              </Text>
            </TouchableOpacity>
            <PrivacyNote />
          </>
        ) : (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                onPress={reset}
                activeOpacity={0.8}
              >
                <Feather name="file-text" size={14} color={C.text2} />
                <Text style={[styles.smallBtnText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.organize.chooseAnother}
                </Text>
              </TouchableOpacity>
              {pages.length > 0 ? (
                <Text style={[styles.count, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.pdfmaker.organize.kept(keptCount, pages.length)}
                </Text>
              ) : null}
            </View>

            {loading ? (
              <ProgressPanel label={t.pdfmaker.organize.reading} done={loading.done} total={loading.total} />
            ) : null}

            {pages.length > 0 ? (
              <View style={styles.rangeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.pdfmaker.organize.keepOnly}
                  </Text>
                  <TextInput
                    value={range}
                    onChangeText={setRange}
                    placeholder={t.pdfmaker.organize.rangePlaceholder}
                    placeholderTextColor={C.textMuted}
                    inputMode="numeric"
                    style={[styles.input, { borderColor: C.border, backgroundColor: C.surface, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.applyBtn, { borderColor: C.border, backgroundColor: C.surface, opacity: range.trim() ? 1 : 0.4 }]}
                  onPress={applyRange}
                  disabled={!range.trim()}
                  activeOpacity={0.8}
                >
                  <Feather name="scissors" size={14} color={C.text2} />
                  <Text style={[styles.smallBtnText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {t.pdfmaker.organize.apply}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <ThumbGrid>
              {pages.map((p, i) => (
                <ThumbCard
                  key={p.orig}
                  uri={p.uri}
                  caption={`${t.pdfmaker.organize.pageLabel(p.orig + 1)}${p.keep ? '' : ` (${t.pdfmaker.organize.removedSuffix})`}`}
                  index={i}
                  total={pages.length}
                  rotate={p.rotate}
                  dimmed={!p.keep}
                  keep={p.keep}
                  onToggle={() => toggleAt(i)}
                  onFirst={() => moveTo(i, 0)}
                  onPrev={() => moveTo(i, i - 1)}
                  onNext={() => moveTo(i, i + 1)}
                  onRotate={() => rotateAt(i)}
                />
              ))}
            </ThumbGrid>

            {pages.length > 0 ? (
              <Notice tone="info"><NoticeText>{t.pdfmaker.organize.lossless}</NoticeText></Notice>
            ) : null}

            {busy ? <ProgressPanel label={t.pdfmaker.organize.building} done={0} total={0} /> : null}

            {result ? (
              <ResultPanel
                title={t.pdfmaker.organize.ready}
                bytesAfter={result.bytes}
                pages={result.pages}
                onShare={share}
                onReset={reset}
              />
            ) : !busy && !loading && pages.length > 0 ? (
              <TouchableOpacity style={[styles.cta, { backgroundColor: C.brand }]} onPress={build} activeOpacity={0.85}>
                <Feather name="save" size={17} color={C.white} />
                <Text style={[styles.ctaText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.organize.save(keptCount)}
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
  rangeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 } as ViewStyle,
  label: { fontSize: 14, marginBottom: 5 },
  input: { height: 42, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontSize: 14 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1 } as ViewStyle,
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 } as ViewStyle,
  ctaText: { fontSize: 15 },
});
