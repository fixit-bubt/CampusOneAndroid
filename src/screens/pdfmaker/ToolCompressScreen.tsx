// Compress a PDF to fit an upload limit.
//
// The only tool that needs the raster engine end to end: the engine draws each
// page, pdf-lib embeds it at the page's original point size. Honest about the
// trade-off, so a text-heavy file is gated behind a warning and a result that
// is not actually smaller is never offered.
import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { formatFileSize } from '../../utils/format';
import {
  LIMITS, COMPRESS_TARGETS, TEXT_HEAVY_CHARS_PER_PAGE, PdfError, type CompressTargetKey,
} from '../../services/pdf/presets';
import { baseName, isPdfFile } from '../../services/pdf/pdfUtils';
import { compressPdf, type CompressResult } from '../../services/pdf/compressPdf';
import { sharePdf } from '../../services/pdf/pdfFiles';
import { useRasterEngine } from '../../services/pdf/rasterEngine';
import {
  Notice, NoticeText, ProgressPanel, ResultPanel, SegmentToggle, PrivacyNote, usePdfErrorText,
} from './components';

interface Doc { uri: string; name: string; size: number; pages: number; texty: boolean }

export function ToolCompressScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const errorText = usePdfErrorText();
  const { engine, host } = useRasterEngine();

  const [doc, setDoc] = useState<Doc | null>(null);
  const [target, setTarget] = useState<CompressTargetKey>('2mb');
  const [opening, setOpening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, pass: 1 });
  const [result, setResult] = useState<CompressResult | null>(null);
  const [noGain, setNoGain] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => () => { engine.close(); }, [engine]);

  function clear() {
    setDoc(null);
    setResult(null);
    setNoGain(false);
    setAcknowledged(false);
    setProgress({ done: 0, total: 0, pass: 1 });
    cancelRef.current = false;
    engine.close();
  }

  async function open() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const picked = res.assets[0];

    if (!isPdfFile(picked.name, picked.mimeType)) {
      toast({ type: 'error', title: t.pdfmaker.tools.compressTitle, message: t.pdfmaker.errors.pdfsOnly });
      return;
    }
    if ((picked.size ?? 0) > LIMITS.compress.maxBytes) {
      toast({ type: 'error', title: t.pdfmaker.tools.compressTitle, message: t.pdfmaker.errors.tooLarge });
      return;
    }

    // Some Android providers report no size. Falling back to 0 would make the
    // "is it actually smaller" guard true for every result, so read the file.
    let size = picked.size ?? 0;
    if (!size) {
      try { size = new File(picked.uri).size; } catch { size = 0; }
    }
    if (size > LIMITS.compress.maxBytes) {
      toast({ type: 'error', title: t.pdfmaker.tools.compressTitle, message: t.pdfmaker.errors.tooLarge });
      return;
    }

    setResult(null);
    setNoGain(false);
    setAcknowledged(false);
    // Opening parses the file and samples five pages for text, which takes
    // seconds on a big scan. Without a visible state the drop zone looks dead
    // and a second tap would collide with the first open.
    setOpening(true);
    try {
      const { pages, textChars } = await engine.open(picked.uri);
      if (pages > LIMITS.compress.maxPages) {
        toast({ type: 'error', title: t.pdfmaker.tools.compressTitle, message: t.pdfmaker.errors.tooManyPages });
        engine.close();
        return;
      }
      setDoc({
        uri: picked.uri,
        name: picked.name,
        size,
        pages,
        texty: textChars > TEXT_HEAVY_CHARS_PER_PAGE,
      });
    } catch (err) {
      const code = err instanceof PdfError ? err.code : 'unknown';
      if (code !== 'cancelled') {
        toast({ type: 'error', title: t.pdfmaker.tools.compressTitle, message: errorText(code) });
      }
    } finally {
      setOpening(false);
    }
  }

  async function compress() {
    if (!doc || busy) return;
    setBusy(true);
    setResult(null);
    setNoGain(false);
    cancelRef.current = false;
    try {
      const out = await compressPdf(engine, {
        pageCount: doc.pages,
        sourceBytes: doc.size,
        target: COMPRESS_TARGETS[target],
        name: `${baseName(doc.name)}-compressed.pdf`,
        onProgress: (done, total, pass) => setProgress({ done, total, pass }),
        isCancelled: () => cancelRef.current,
      });
      setResult(out);
    } catch (err) {
      const code = err instanceof PdfError ? err.code : 'unknown';
      if (code === 'already-optimized') {
        // Shown in place rather than only as a toast: no file is offered, and
        // the student needs to understand why.
        setNoGain(true);
      } else if (code !== 'cancelled') {
        toast({ type: 'error', title: t.pdfmaker.tools.compressTitle, message: errorText(code) });
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

  const needsAck = !!doc?.texty && !acknowledged;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.pdfmaker.tools.compressTitle} onBack={() => navigation.goBack()} />
      {host}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {!doc ? (
          <>
            <TouchableOpacity
              style={[styles.dropZone, { borderColor: C.border2, backgroundColor: C.surface, opacity: opening ? 0.5 : 1 }]}
              onPress={open}
              disabled={opening}
              activeOpacity={0.8}
            >
              <Feather name="minimize-2" size={26} color={SectorColors.pdfmaker} />
              <Text style={[styles.dropTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.compress.open}
              </Text>
              <Text style={[styles.dropHint, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.compress.hint}
              </Text>
            </TouchableOpacity>
            {opening ? <ProgressPanel label={t.pdfmaker.compress.opening} done={0} total={0} /> : null}
            <Notice tone="info"><NoticeText>{t.pdfmaker.compress.worksBest}</NoticeText></Notice>
            <PrivacyNote />
          </>
        ) : (
          <>
            <View style={[styles.fileCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.fileIcon, { backgroundColor: C.surface2 }]}>
                <Feather name="file-text" size={17} color={C.text2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[styles.fileName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {doc.name}
                </Text>
                <Text style={[styles.meta, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                  {formatFileSize(doc.size)}   {t.pdfmaker.common.pages(doc.pages)}
                </Text>
              </View>
              <TouchableOpacity onPress={clear} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.link, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.common.change}
                </Text>
              </TouchableOpacity>
            </View>

            {doc.texty ? (
              <Notice tone="warn">
                <NoticeText bold>{t.pdfmaker.compress.textyTitle}</NoticeText>
                <NoticeText>{t.pdfmaker.compress.textyBody}</NoticeText>
                {needsAck ? (
                  <TouchableOpacity
                    style={[styles.ackBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                    onPress={() => setAcknowledged(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.ackText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {t.pdfmaker.compress.textyAck}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </Notice>
            ) : null}

            <Text style={[styles.label, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.compress.target}
            </Text>
            <SegmentToggle
              value={target}
              onChange={(v) => { setTarget(v); setResult(null); setNoGain(false); }}
              options={[
                { value: '2mb' as CompressTargetKey, label: t.pdfmaker.compress.target2mb },
                { value: '5mb' as CompressTargetKey, label: t.pdfmaker.compress.target5mb },
              ]}
            />

            {!busy && !result ? (
              <Notice tone="warn"><NoticeText>{t.pdfmaker.compress.rasterWarning}</NoticeText></Notice>
            ) : null}

            {busy ? (
              <ProgressPanel
                label={progress.pass > 1 ? t.pdfmaker.compress.workingPass(progress.pass) : t.pdfmaker.compress.working}
                done={progress.done}
                total={progress.total}
                onCancel={() => { cancelRef.current = true; }}
              />
            ) : null}

            {noGain ? (
              <Notice tone="warn"><NoticeText>{t.pdfmaker.errors.alreadyOptimized}</NoticeText></Notice>
            ) : null}

            {result ? (
              <ResultPanel
                title={t.pdfmaker.compress.ready}
                bytesBefore={doc.size}
                bytesAfter={result.bytes}
                pages={result.pages}
                warning={result.missedTarget ? t.pdfmaker.compress.missed(formatFileSize(result.bytes)) : null}
                onShare={share}
                onReset={clear}
              />
            ) : !busy ? (
              <TouchableOpacity
                style={[styles.cta, { backgroundColor: C.brand, opacity: needsAck ? 0.4 : 1 }]}
                onPress={compress}
                disabled={needsAck}
                activeOpacity={0.85}
              >
                <Feather name="minimize-2" size={17} color={C.white} />
                <Text style={[styles.ctaText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {t.pdfmaker.compress.action}
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
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 14, padding: 11 } as ViewStyle,
  fileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  fileName: { fontSize: 14 },
  meta: { fontSize: 12.5 },
  link: { fontSize: 13 },
  label: { fontSize: 14, marginTop: 2 },
  ackBtn: { alignSelf: 'flex-start', marginTop: 8, height: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  ackText: { fontSize: 13 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 } as ViewStyle,
  ctaText: { fontSize: 15 },
});
