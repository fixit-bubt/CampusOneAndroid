// Photos to PDF. One A4 page per photo, scaled to fit inside the margin.
//
// Each photo is resized and re-encoded to JPEG by expo-image-manipulator,
// then embedded by pdf-lib. Only one photo's pixels are held at a time: the
// base64 goes out of scope as soon as the page is drawn, which is what keeps
// thirty 12MP photos from taking the app down.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PDFDocument } from 'pdf-lib';
import { PdfError, type ImagePreset } from './presets';
import { fitOnPage } from './pdfUtils';
import { savePdfBytes } from './pdfFiles';

export interface PhotoInput { uri: string; width: number; height: number; rotate: 0 | 90 | 180 | 270 }
export interface BuiltPdf { uri: string; bytes: number; pages: number }
export interface BuildOpts {
  name: string;
  onProgress?: (done: number, total: number) => void;
  isCancelled?: () => boolean;
}

export async function rasterisePhoto(photo: PhotoInput, preset: ImagePreset) {
  const longEdge = Math.max(photo.width, photo.height) || preset.maxDim;
  const ratio = longEdge > preset.maxDim ? preset.maxDim / longEdge : 1;
  const targetW = Math.max(1, Math.round((photo.width || preset.maxDim) * ratio));

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
  for (let i = 0; i < photos.length; i++) {
    if (opts.isCancelled?.()) throw new PdfError('cancelled');
    opts.onProgress?.(i, photos.length);

    const { base64, width, height } = await rasterisePhoto(photos[i], preset);
    const embedded = await pdf.embedJpg(base64);
    const box = fitOnPage(width, height);
    const page = pdf.addPage([box.pageW, box.pageH]);
    page.drawImage(embedded, { x: box.x, y: box.y, width: box.w, height: box.h });
  }
  opts.onProgress?.(photos.length, photos.length);

  if (opts.isCancelled?.()) throw new PdfError('cancelled');
  const bytes = await pdf.save();
  const saved = await savePdfBytes(bytes, opts.name);
  return { uri: saved.uri, bytes: saved.bytes, pages: photos.length };
}
