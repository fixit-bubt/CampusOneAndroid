// Photos to PDF. Runs the 5-stage document scanner pipeline in the local
// WebView engine (auto-crop, perspective homography warp, illumination
// division shadow removal, gamma 5/6 LUT, 1.5x chroma boost, and 3-zone
// asymmetric unsharp mask) with fallback to expo-image-manipulator when
// invoked headlessly.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  PdfError,
  SCAN_SIZE_TARGETS,
  MIN_QUALITY,
  type ImagePreset,
  type LayoutMode,
  type FilterMode,
  type ScanPageMode,
  type TargetSizeKey,
  type ScanQuad,
  type WhiteoutStroke,
} from './presets';
import { layoutDocumentPage, layoutIdCardPair, nextQuality } from './pdfUtils';
import { readBytes, savePdfBytes } from './pdfFiles';
import type { EngineHandle } from './rasterEngine';

export interface PhotoInput {
  uri: string;
  width: number;
  height: number;
  rotate: 0 | 90 | 180 | 270;
  filter?: FilterMode;
  quad?: ScanQuad | null;
  whiteoutStrokes?: WhiteoutStroke[];
}

export interface BuiltPdf {
  uri: string;
  bytes: number;
  pages: number;
}

export interface BuildOpts {
  name: string;
  layoutMode?: LayoutMode;
  filterMode?: FilterMode;
  autoCrop?: boolean;
  scanMode?: ScanPageMode;
  targetSize?: TargetSizeKey;
  prependCoverUri?: string | null;
  signatureUri?: string | null;
  engine?: EngineHandle | null;
  headerText?: string;
  footerText?: string;
  onProgress?: (done: number, total: number) => void;
  isCancelled?: () => boolean;
}

export async function rasterisePhoto(photo: PhotoInput, preset: ImagePreset) {
  const hasDimensions = photo.width > 0 && photo.height > 0;
  const longEdge = hasDimensions ? Math.max(photo.width, photo.height) : preset.maxDim;
  const ratio = longEdge > preset.maxDim ? preset.maxDim / longEdge : 1;
  const targetW = hasDimensions
    ? Math.max(1, Math.round(photo.width * ratio))
    : preset.maxDim;

  const ctx = ImageManipulator.manipulate(photo.uri);
  // resize takes the width and derives the height from the aspect ratio.
  ctx.resize({ width: targetW });
  if (photo.rotate) ctx.rotate(photo.rotate);

  let saved;
  try {
    const image = await ctx.renderAsync();
    saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: preset.quality, base64: true });
  } catch {
    throw new PdfError('unsupported-image');
  }
  if (!saved.base64) throw new PdfError('unsupported-image');
  return { base64: saved.base64, width: saved.width, height: saved.height };
}

export async function scanOrRasterisePhoto(
  photo: PhotoInput,
  preset: ImagePreset,
  opts?: {
    engine?: EngineHandle | null;
    filterMode?: FilterMode;
    autoCrop?: boolean;
    splitHalf?: 'left' | 'right' | null;
  },
): Promise<{ base64: string; width: number; height: number }> {
  const engine = opts?.engine;
  if (engine?.scanPhoto) {
    try {
      const scanned = await engine.scanPhoto({
        uri: photo.uri,
        rotate: photo.rotate,
        maxDim: preset.maxDim,
        quality: preset.quality,
        filter: photo.filter ?? opts?.filterMode ?? 'magic',
        autoCrop: photo.quad ? false : (opts?.autoCrop ?? true),
        quad: photo.quad ?? null,
        whiteoutStrokes: photo.whiteoutStrokes ?? [],
        splitHalf: opts?.splitHalf ?? null,
      });
      if (scanned?.base64) {
        return { base64: scanned.base64, width: scanned.width, height: scanned.height };
      }
    } catch (err) {
      if (err instanceof PdfError && err.code === 'cancelled') throw err;
    }
  }
  return rasterisePhoto(photo, preset);
}

interface ScannedSlice {
  base64: string;
  width: number;
  height: number;
}

function drawAcademicOverlays(
  page: any,
  box: { pageW: number; pageH: number },
  font: any,
  headerText: string | undefined,
  footerText: string | undefined,
  pageNum: number,
  totalLogicalPages: number,
  sigImage: { embedded: any; width: number; height: number } | null,
  footerReservePt: number,
) {
  if (sigImage && sigImage.embedded && typeof page.drawImage === 'function') {
    const maxSigW = 104;
    const maxSigH = 42;
    const scale = Math.min(maxSigW / Math.max(1, sigImage.width), maxSigH / Math.max(1, sigImage.height));
    const sw = Math.round(sigImage.width * scale);
    const sh = Math.round(sigImage.height * scale);
    page.drawImage(sigImage.embedded, {
      x: Math.max(20, box.pageW - sw - 24),
      y: Math.max(8, footerReservePt + 8),
      width: sw,
      height: sh,
    });
  }

  if (font && typeof page.drawText === 'function' && (headerText || footerText)) {
    const textColor = rgb(0.28, 0.28, 0.33);
    if (headerText) {
      page.drawText(headerText, {
        x: 18,
        y: box.pageH - 16,
        size: 8,
        font,
        color: textColor,
      });
    }
    if (footerText) {
      const pageLabel = `Page ${pageNum} of ${totalLogicalPages}`;
      const footerStr = `${footerText} · ${pageLabel}`;
      const textWidth = typeof font.widthOfTextAtSize === 'function' ? font.widthOfTextAtSize(footerStr, 8) : 120;
      page.drawText(footerStr, {
        x: Math.max(16, (box.pageW - textWidth) / 2),
        y: 9,
        size: 8,
        font,
        color: textColor,
      });
    }
  }
}

export async function buildImagesPdf(
  photos: PhotoInput[],
  preset: ImagePreset,
  opts: BuildOpts,
): Promise<BuiltPdf> {
  if (!photos.length) throw new PdfError('unknown');

  const scanMode: ScanPageMode = opts.scanMode ?? 'single';
  const targetBytes = opts.targetSize ? SCAN_SIZE_TARGETS[opts.targetSize] : 0;
  const expectedSlices = scanMode === 'book_split' ? photos.length * 2 : photos.length;

  // Tune initial preset if an explicit file-size cap (e.g. < 2 MB) is active
  let activePreset: ImagePreset = { ...preset };
  if (targetBytes > 0 && expectedSlices > 0) {
    const budgetPerSlice = (targetBytes * 0.88) / expectedSlices;
    if (budgetPerSlice < 140_000) {
      activePreset = {
        ...activePreset,
        maxDim: Math.min(activePreset.maxDim, 1754),
        quality: Math.max(MIN_QUALITY, Math.min(activePreset.quality, 0.64)),
      };
    } else if (budgetPerSlice < 260_000) {
      activePreset = {
        ...activePreset,
        maxDim: Math.min(activePreset.maxDim, 2200),
        quality: Math.max(MIN_QUALITY, Math.min(activePreset.quality, 0.76)),
      };
    }
  }

  let extractedSig: { base64: string; width: number; height: number } | null = null;
  if (opts.signatureUri && opts.engine?.extractSignature) {
    try {
      extractedSig = await opts.engine.extractSignature(opts.signatureUri);
    } catch {
      extractedSig = null;
    }
  }

  const buildPass = async (passPreset: ImagePreset, reportProgress: boolean): Promise<{ bytes: Uint8Array; pages: number }> => {
    const pdf = await PDFDocument.create();

    // Optional Page 1: Lossless vector BUBT Cover Page auto-prepend
    let prependedCount = 0;
    if (opts.prependCoverUri && typeof (PDFDocument as any).load === 'function' && typeof (pdf as any).copyPages === 'function') {
      try {
        const coverBytes = await readBytes(opts.prependCoverUri);
        const coverDoc = await PDFDocument.load(coverBytes);
        const copied = await pdf.copyPages(coverDoc, coverDoc.getPageIndices());
        copied.forEach((p: any) => pdf.addPage(p));
        prependedCount = copied.length;
      } catch {
        // Non-fatal if cover file was removed
      }
    }

    let font: any = null;
    if ((opts.headerText || opts.footerText) && typeof (pdf as any).embedFont === 'function') {
      try {
        font = await pdf.embedFont(StandardFonts.Helvetica);
      } catch {
        font = null;
      }
    }

    let sigEmbedded: { embedded: any; width: number; height: number } | null = null;
    if (extractedSig && typeof (pdf as any).embedPng === 'function') {
      try {
        const emb = await (pdf as any).embedPng(extractedSig.base64);
        sigEmbedded = { embedded: emb, width: extractedSig.width, height: extractedSig.height };
      } catch {
        sigEmbedded = null;
      }
    }

    const layout = opts.layoutMode ?? 'borderless';
    const footerReservePt = font && opts.footerText ? 28 : 0;
    const headerReservePt = font && opts.headerText ? 22 : 0;

    if (scanMode === 'id_card') {
      const totalCardPages = Math.ceil(photos.length / 2);
      let logicalIdx = 0;
      for (let i = 0; i < photos.length; i += 2) {
        if (opts.isCancelled?.()) throw new PdfError('cancelled');
        if (reportProgress) opts.onProgress?.(i, photos.length);
        logicalIdx++;

        const topSlice = await scanOrRasterisePhoto(photos[i], passPreset, {
          engine: opts.engine,
          filterMode: opts.filterMode,
          autoCrop: opts.autoCrop,
          splitHalf: null,
        });
        let botSlice: ScannedSlice | null = null;
        if (i + 1 < photos.length) {
          if (opts.isCancelled?.()) throw new PdfError('cancelled');
          if (reportProgress) opts.onProgress?.(i + 1, photos.length);
          botSlice = await scanOrRasterisePhoto(photos[i + 1], passPreset, {
            engine: opts.engine,
            filterMode: opts.filterMode,
            autoCrop: opts.autoCrop,
            splitHalf: null,
          });
        }

        const topEmb = await pdf.embedJpg(topSlice.base64);
        const botEmb = botSlice ? await pdf.embedJpg(botSlice.base64) : null;
        const pairBox = layoutIdCardPair(
          topSlice.width,
          topSlice.height,
          botSlice?.width,
          botSlice?.height,
          footerReservePt,
        );
        const page = pdf.addPage([pairBox.pageW, pairBox.pageH]);
        page.drawImage(topEmb, {
          x: pairBox.top.x,
          y: pairBox.top.y,
          width: pairBox.top.w,
          height: pairBox.top.h,
        });
        if (botEmb && pairBox.bottom) {
          page.drawImage(botEmb, {
            x: pairBox.bottom.x,
            y: pairBox.bottom.y,
            width: pairBox.bottom.w,
            height: pairBox.bottom.h,
          });
        }
        drawAcademicOverlays(
          page,
          { pageW: pairBox.pageW, pageH: pairBox.pageH },
          font,
          opts.headerText,
          opts.footerText,
          logicalIdx,
          totalCardPages,
          sigEmbedded,
          footerReservePt,
        );
      }
      if (reportProgress) opts.onProgress?.(photos.length, photos.length);
      if (opts.isCancelled?.()) throw new PdfError('cancelled');
      const outBytes = await pdf.save();
      return { bytes: outBytes, pages: prependedCount + totalCardPages };
    }

    const totalLogicalPages = scanMode === 'book_split' ? photos.length * 2 : photos.length;
    let logicalPageNum = 0;

    for (let i = 0; i < photos.length; i++) {
      if (opts.isCancelled?.()) throw new PdfError('cancelled');
      if (reportProgress) opts.onProgress?.(i, photos.length);

      const halves: ('left' | 'right' | null)[] = scanMode === 'book_split' ? ['left', 'right'] : [null];
      for (const half of halves) {
        const s = await scanOrRasterisePhoto(photos[i], passPreset, {
          engine: opts.engine,
          filterMode: opts.filterMode,
          autoCrop: opts.autoCrop,
          splitHalf: half,
        });
        logicalPageNum++;
        const embedded = await pdf.embedJpg(s.base64);
        const box = layoutDocumentPage(s.width, s.height, layout, {
          preserveAspect: true,
          footerReservePt,
          headerReservePt,
        });
        const page = pdf.addPage([box.pageW, box.pageH]);
        page.drawImage(embedded, { x: box.x, y: box.y, width: box.w, height: box.h });
        drawAcademicOverlays(
          page,
          box,
          font,
          opts.headerText,
          opts.footerText,
          logicalPageNum,
          totalLogicalPages,
          sigEmbedded,
          footerReservePt,
        );
      }
    }
    if (reportProgress) opts.onProgress?.(photos.length, photos.length);

    if (opts.isCancelled?.()) throw new PdfError('cancelled');
    const outBytes = await pdf.save();
    return { bytes: outBytes, pages: prependedCount + logicalPageNum };
  };

  let built = await buildPass(activePreset, true);

  // If a strict target size (e.g. < 2 MB) was requested and the first pass
  // exceeded it, run one adaptive step-down pass to guarantee compliance.
  if (targetBytes > 0 && built.bytes.length > targetBytes && opts.engine?.scanPhoto) {
    const steppedQuality = nextQuality(activePreset.quality, built.bytes.length, targetBytes * 0.92);
    const steppedDim = built.bytes.length > targetBytes * 1.45
      ? Math.max(1400, Math.round(activePreset.maxDim * 0.78))
      : activePreset.maxDim;
    built = await buildPass(
      { key: activePreset.key, maxDim: steppedDim, quality: steppedQuality },
      false,
    );
  }

  const saved = await savePdfBytes(built.bytes, opts.name);
  return { uri: saved.uri, bytes: saved.bytes, pages: built.pages };
}

