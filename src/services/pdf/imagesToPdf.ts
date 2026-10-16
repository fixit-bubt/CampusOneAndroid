// Photos to PDF. One A4 page per photo, scaled to fit inside the margin.
//
// Each photo is resized and re-encoded to JPEG by expo-image-manipulator,
// then embedded by pdf-lib. Only one photo's pixels are held at a time: the
// base64 goes out of scope as soon as the page is drawn, which is what keeps
// thirty 12MP photos from taking the app down.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PdfError, type ImagePreset, type LayoutMode } from './presets';
import { layoutDocumentPage } from './pdfUtils';
import { savePdfBytes } from './pdfFiles';

export interface PhotoInput { uri: string; width: number; height: number; rotate: 0 | 90 | 180 | 270 }
export interface BuiltPdf { uri: string; bytes: number; pages: number }
export interface BuildOpts {
  name: string;
  layoutMode?: LayoutMode;
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

export async function buildImagesPdf(
  photos: PhotoInput[],
  preset: ImagePreset,
  opts: BuildOpts,
): Promise<BuiltPdf> {
  if (!photos.length) throw new PdfError('unknown');

  const pdf = await PDFDocument.create();
  let font: any = null;
  if (opts.headerText || opts.footerText) {
    try {
      font = await pdf.embedFont(StandardFonts.Helvetica);
    } catch {
      // Font embedding is non-fatal
    }
  }

  const layout = opts.layoutMode ?? 'borderless';

  for (let i = 0; i < photos.length; i++) {
    if (opts.isCancelled?.()) throw new PdfError('cancelled');
    opts.onProgress?.(i, photos.length);

    const { base64, width, height } = await rasterisePhoto(photos[i], preset);
    const embedded = await pdf.embedJpg(base64);
    const box = layoutDocumentPage(width, height, layout);
    const page = pdf.addPage([box.pageW, box.pageH]);
    page.drawImage(embedded, { x: box.x, y: box.y, width: box.w, height: box.h });

    // Optional Academic Stamping (Header & Page Numbering)
    if (font && (opts.headerText || opts.footerText)) {
      const textColor = rgb(0.3, 0.3, 0.35);
      if (opts.headerText) {
        page.drawText(opts.headerText, {
          x: 16,
          y: box.pageH - 18,
          size: 8,
          font,
          color: textColor,
        });
      }
      if (opts.footerText) {
        const pageLabel = `Page ${i + 1} of ${photos.length}`;
        const footerStr = opts.footerText ? `${opts.footerText} · ${pageLabel}` : pageLabel;
        const textWidth = font.widthOfTextAtSize(footerStr, 8);
        page.drawText(footerStr, {
          x: Math.max(16, (box.pageW - textWidth) / 2),
          y: 12,
          size: 8,
          font,
          color: textColor,
        });
      }
    }
  }
  opts.onProgress?.(photos.length, photos.length);

  if (opts.isCancelled?.()) throw new PdfError('cancelled');
  const bytes = await pdf.save();
  const saved = await savePdfBytes(bytes, opts.name);
  return { uri: saved.uri, bytes: saved.bytes, pages: photos.length };
}
