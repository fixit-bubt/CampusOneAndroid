// Merge PDFs and photos into one file, in the order the student arranged.
//
// PDF pages are copied, not re-encoded, so text stays selectable and nothing
// loses quality. Photos take the same path as the Photos to PDF tool.
import { PDFDocument } from 'pdf-lib';
import { PdfError, IMAGE_PRESETS, DEFAULT_PRESET, LIMITS } from './presets';
import { fitOnPage } from './pdfUtils';
import { readBytes, savePdfBytes } from './pdfFiles';
import { rasterisePhoto, type BuiltPdf, type BuildOpts } from './imagesToPdf';

export type MergeItem =
  | { kind: 'pdf'; uri: string; name: string }
  | { kind: 'image'; uri: string; name: string; width: number; height: number };

// pdf-lib throws EncryptedPDFError for password protected files. Never pass
// ignoreEncryption: it "succeeds" and then writes broken output.
async function loadSource(uri: string, name: string) {
  let bytes: Uint8Array;
  try {
    bytes = await readBytes(uri);
  } catch {
    throw new PdfError('corrupt', name);
  }
  try {
    return await PDFDocument.load(bytes);
  } catch (err: any) {
    const msg = `${err?.name ?? ''} ${err?.message ?? ''}`;
    throw new PdfError(/encrypt/i.test(msg) ? 'encrypted' : 'corrupt', name);
  }
}

export async function mergeToPdf(items: MergeItem[], opts: BuildOpts): Promise<BuiltPdf> {
  if (items.length < 2) throw new PdfError('unknown');

  const out = await PDFDocument.create();
  for (let i = 0; i < items.length; i++) {
    if (opts.isCancelled?.()) throw new PdfError('cancelled');
    opts.onProgress?.(i, items.length);
    const item = items[i];

    if (item.kind === 'pdf') {
      const src = await loadSource(item.uri, item.name);
      let copied;
      try {
        copied = await out.copyPages(src, src.getPageIndices());
      } catch {
        // Merging PDFs whose form fields share names can fail here.
        throw new PdfError('corrupt', item.name);
      }
      // Checked while copying rather than up front: page counts are not known
      // until each file is parsed, and pdf-lib holds every copied page in
      // memory, so an unbounded merge is an out-of-memory crash.
      if (out.getPageCount() + copied.length > LIMITS.merge.maxPages) {
        throw new PdfError('too-many-pages', item.name);
      }
      copied.forEach((p) => out.addPage(p));
    } else {
      const { base64, width, height } = await rasterisePhoto(
        { uri: item.uri, width: item.width, height: item.height, rotate: 0 },
        IMAGE_PRESETS[DEFAULT_PRESET],
      );
      const embedded = await out.embedJpg(base64);
      const box = fitOnPage(width, height);
      const page = out.addPage([box.pageW, box.pageH]);
      page.drawImage(embedded, { x: box.x, y: box.y, width: box.w, height: box.h });
    }
  }
  opts.onProgress?.(items.length, items.length);

  if (opts.isCancelled?.()) throw new PdfError('cancelled');
  const bytes = await out.save();
  const saved = await savePdfBytes(bytes, opts.name);
  return { uri: saved.uri, bytes: saved.bytes, pages: out.getPageCount() };
}
