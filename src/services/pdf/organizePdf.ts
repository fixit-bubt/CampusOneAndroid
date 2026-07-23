// Reorder, rotate, delete and extract pages.
//
// Every operation is metadata level: pages are copied and their rotation flag
// is set. Nothing is re-encoded, so text stays selectable and the file does
// not grow.
import { PDFDocument, degrees } from 'pdf-lib';
import { PdfError } from './presets';
import { readBytes, savePdfBytes } from './pdfFiles';
import type { BuiltPdf } from './imagesToPdf';

export interface PageOp { orig: number; rotate: 0 | 90 | 180 | 270 }

async function loadSource(uri: string) {
  let bytes: Uint8Array;
  try {
    bytes = await readBytes(uri);
  } catch {
    throw new PdfError('corrupt');
  }
  try {
    return await PDFDocument.load(bytes);
  } catch (err: any) {
    const msg = `${err?.name ?? ''} ${err?.message ?? ''}`;
    throw new PdfError(/encrypt/i.test(msg) ? 'encrypted' : 'corrupt');
  }
}

export async function organizePdf(srcUri: string, ops: PageOp[], opts: { name: string }): Promise<BuiltPdf> {
  if (!ops.length) throw new PdfError('unknown');

  const src = await loadSource(srcUri);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, ops.map((o) => o.orig));

  copied.forEach((page, i) => {
    const delta = ops[i].rotate;
    if (delta) {
      const current = page.getRotation().angle || 0;
      page.setRotation(degrees((current + delta) % 360));
    }
    out.addPage(page);
  });

  const bytes = await out.save();
  const saved = await savePdfBytes(bytes, opts.name);
  return { uri: saved.uri, bytes: saved.bytes, pages: ops.length };
}
