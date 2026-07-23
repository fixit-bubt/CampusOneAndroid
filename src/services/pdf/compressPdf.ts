// Compress by rebuilding the PDF with every page re-encoded as a JPEG.
//
// This is a raster compressor. It works well on scans, whose pages are
// already images, and badly on text documents, where keeping text as vectors
// wins. Two guards keep that from being a nasty surprise: the screen warns
// before running on a text-heavy file, and a result that is not actually
// smaller is thrown away rather than offered.
import { PDFDocument } from 'pdf-lib';
import { PdfError, MAX_COMPRESS_PASSES, COMPRESS_LONG_EDGE, MIN_QUALITY } from './presets';
import { nextQuality, nextLongEdge } from './pdfUtils';
import { savePdfBytes } from './pdfFiles';
import type { EngineHandle } from './rasterEngine';

export interface CompressResult { uri: string; bytes: number; pages: number; missedTarget: boolean }

export interface CompressArgs {
  pageCount: number;
  sourceBytes: number;
  target: { bytes: number; quality: number };
  name: string;
  onProgress?: (done: number, total: number, pass: number) => void;
  isCancelled?: () => boolean;
}

// One full pass: render every page at (longEdge, quality) and assemble. Each
// page keeps its original point size so the output paginates identically, and
// only one page's pixels are alive at a time.
async function onePass(engine: EngineHandle, args: CompressArgs, longEdge: number, quality: number, pass: number) {
  const pdf = await PDFDocument.create();
  for (let n = 1; n <= args.pageCount; n++) {
    if (args.isCancelled?.()) throw new PdfError('cancelled');
    args.onProgress?.(n - 1, args.pageCount, pass);
    const { base64, wPt, hPt } = await engine.render(n, longEdge, quality);
    const embedded = await pdf.embedJpg(base64);
    const page = pdf.addPage([wPt, hPt]);
    page.drawImage(embedded, { x: 0, y: 0, width: wPt, height: hPt });
  }
  args.onProgress?.(args.pageCount, args.pageCount, pass);
  const bytes = await pdf.save();
  return { bytes, size: bytes.length };
}

export async function compressPdf(engine: EngineHandle, args: CompressArgs): Promise<CompressResult> {
  let longEdge = COMPRESS_LONG_EDGE;
  let quality = args.target.quality;
  let best: { bytes: Uint8Array; size: number } | null = null;

  for (let pass = 1; pass <= MAX_COMPRESS_PASSES; pass++) {
    const out = await onePass(engine, args, longEdge, quality, pass);
    if (!best || out.size < best.size) best = out;
    if (out.size <= args.target.bytes) break;
    if (pass === MAX_COMPRESS_PASSES) break;

    // Walk quality down toward the target first. Resolution only drops once
    // quality has bottomed out: losing pixels hurts legibility more than JPEG
    // artefacts do.
    const q = nextQuality(quality, out.size, args.target.bytes);
    if (q <= MIN_QUALITY + 0.001 && quality <= MIN_QUALITY + 0.001) {
      longEdge = nextLongEdge(longEdge, out.size, args.target.bytes);
    }
    quality = q;
  }

  if (!best) throw new PdfError('unknown');
  // Rasterising a text page costs far more than the vector text it replaces,
  // so compressing can inflate a file. Never hand that back.
  if (best.size >= args.sourceBytes) throw new PdfError('already-optimized');

  const saved = await savePdfBytes(best.bytes, args.name);
  return {
    uri: saved.uri,
    bytes: saved.bytes,
    pages: args.pageCount,
    missedTarget: best.size > args.target.bytes * 1.1,
  };
}
