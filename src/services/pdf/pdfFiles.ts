// Filesystem and share plumbing for the PDF Maker.
//
// Two cache folders, both under Paths.cache because everything here is
// transient: `pdfmaker` holds finished PDFs on their way to the share sheet,
// `pdfengine` holds the WebView engine and whatever file it is currently
// allowed to read. Cache is correct: once shared, the file is the OS's
// problem, and the system may reclaim the folder at any time.
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PdfError } from './presets';

export function pdfCacheDir(): Directory {
  const dir = new Directory(Paths.cache, 'pdfmaker');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function engineDir(): Directory {
  const dir = new Directory(Paths.cache, 'pdfengine');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

// Output names come from the student's own file names, so they can contain
// anything. Strip what a filesystem or a share target will choke on, and keep
// spaces and Bengali text intact.
export function safeFileName(name: string): string {
  const cleaned = (name ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f<>:"/\\|?*]/g, '-')
    .replace(/^\.+/, '')
    .trim();
  if (!cleaned || /^[-\s.]+$/.test(cleaned)) return 'document.pdf';
  if (cleaned.length <= 80) return cleaned;
  const ext = /\.[A-Za-z0-9]{1,5}$/.exec(cleaned)?.[0] ?? '';
  return cleaned.slice(0, 80 - ext.length) + ext;
}

export async function savePdfBytes(bytes: Uint8Array, filename: string): Promise<{ uri: string; bytes: number }> {
  const file = new File(pdfCacheDir(), safeFileName(filename));
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return { uri: file.uri, bytes: file.size };
}

export async function sharePdf(uri: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new PdfError('unknown');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}

export async function savePdfToDevice(
  sourceUri: string,
  suggestedName: string,
): Promise<{ success: boolean; cancelled?: boolean }> {
  const cleanBaseName = safeFileName(suggestedName).replace(/\.pdf$/i, '');
  const fileName = `${cleanBaseName}.pdf`;

  if (Platform.OS === 'android') {
    try {
      const permissions = await LegacyFS.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        return { success: false, cancelled: true };
      }

      const destUri = await LegacyFS.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        cleanBaseName,
        'application/pdf',
      );

      // Stream in 512 KB chunks so 20+ MB PDFs never allocate massive monolithic
      // base64 strings in Hermes heap on low-RAM Android devices.
      const CHUNK_SIZE = 512 * 1024;
      let totalSize = 0;
      try {
        const info = await LegacyFS.getInfoAsync(sourceUri);
        if (info.exists && typeof info.size === 'number') totalSize = info.size;
      } catch {
        totalSize = 0;
      }

      if (totalSize > CHUNK_SIZE) {
        let offset = 0;
        while (offset < totalSize) {
          const readLen = Math.min(CHUNK_SIZE, totalSize - offset);
          const chunk = await LegacyFS.readAsStringAsync(sourceUri, {
            encoding: LegacyFS.EncodingType.Base64,
            position: offset,
            length: readLen,
          });
          await LegacyFS.writeAsStringAsync(destUri, chunk, {
            encoding: LegacyFS.EncodingType.Base64,
            append: offset > 0,
          });
          offset += readLen;
        }
      } else {
        const base64 = await LegacyFS.readAsStringAsync(sourceUri, {
          encoding: LegacyFS.EncodingType.Base64,
        });
        await LegacyFS.writeAsStringAsync(destUri, base64, {
          encoding: LegacyFS.EncodingType.Base64,
        });
      }

      return { success: true };
    } catch (err) {
      console.warn('StorageAccessFramework failed, falling back:', err);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(sourceUri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
        });
        return { success: true };
      }
      throw err;
    }
  } else {
    // iOS
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(sourceUri, {
        mimeType: 'application/pdf',
        dialogTitle: fileName,
      });
      return { success: true };
    }
    return { success: false };
  }
}

// Files the engine folder owns. Anything else in there is a document being
// worked on, and is disposable.
export const ENGINE_RUNTIME = ['engine.html', 'viewer.html', 'pdf.min.mjs', 'pdf.worker.min.mjs'];
const ENGINE_SOURCE = 'source.pdf';
const ENGINE_SCAN_IMAGE = 'scan_source.jpg';
const LATEST_COVER_PDF = 'bubt_cover_page.pdf';
const LATEST_COVER_META = 'bubt_cover_meta.json';

// The WebView is only granted read access to engineDir(), so anything it must
// open is copied in first.
//
// The destination name is FIXED, never derived from the student's filename.
// A PDF called "pdf.min.mjs" would otherwise overwrite the vendored pdf.js
// runtime, which clearEngineDir() then preserves and prepareEngineFolder()
// declines to restore, so the tool would stay broken for good and the engine
// would import student-supplied bytes as a module. The engine never needs the
// real name: msg.path is its only consumer.
export async function copyIntoEngineDir(uri: string): Promise<string> {
  const dest = new File(engineDir(), ENGINE_SOURCE);
  if (dest.exists) dest.delete();
  await new File(uri).copy(dest);
  return dest.uri;
}

export async function copyScanImageIntoEngineDir(uri: string): Promise<string> {
  const dest = new File(engineDir(), ENGINE_SCAN_IMAGE);
  if (dest.exists) dest.delete();
  await new File(uri).copy(dest);
  return dest.uri;
}

export interface LatestCoverMeta {
  uri: string;
  label: string;
  updatedAt: number;
}

export async function saveLatestCoverPage(sourceUri: string, label: string): Promise<LatestCoverMeta> {
  const dir = pdfCacheDir();
  const pdfDest = new File(dir, LATEST_COVER_PDF);
  if (pdfDest.exists) pdfDest.delete();
  await new File(sourceUri).copy(pdfDest);

  const meta: LatestCoverMeta = {
    uri: pdfDest.uri,
    label: label.trim() || 'BUBT Cover Page',
    updatedAt: Date.now(),
  };
  const metaFile = new File(dir, LATEST_COVER_META);
  if (metaFile.exists) metaFile.delete();
  metaFile.create();
  metaFile.write(JSON.stringify(meta));
  return meta;
}

export function getLatestCoverPage(): LatestCoverMeta | null {
  try {
    const dir = pdfCacheDir();
    const pdfDest = new File(dir, LATEST_COVER_PDF);
    const metaFile = new File(dir, LATEST_COVER_META);
    if (!pdfDest.exists) return null;
    if (metaFile.exists) {
      const raw = metaFile.textSync?.() ?? '';
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.label === 'string') {
          return { uri: pdfDest.uri, label: parsed.label, updatedAt: parsed.updatedAt ?? 0 };
        }
      }
    }
    return { uri: pdfDest.uri, label: 'BUBT Cover Page', updatedAt: 0 };
  } catch {
    return null;
  }
}

export function clearLatestCoverPage(): void {
  try {
    const dir = pdfCacheDir();
    const pdfDest = new File(dir, LATEST_COVER_PDF);
    const metaFile = new File(dir, LATEST_COVER_META);
    if (pdfDest.exists) pdfDest.delete();
    if (metaFile.exists) metaFile.delete();
  } catch {
    // Non-fatal cleanup
  }
}

// Drop any document the engine was allowed to read, leaving its own runtime in
// place. Called when a tool unmounts or a different file is picked. Keeping by
// allowlist rather than by extension means nothing a student supplies can
// survive here by choosing a name.
export function clearEngineDir(): void {
  for (const entry of engineDir().list()) {
    if (entry instanceof File && !ENGINE_RUNTIME.includes(entry.name)) entry.delete();
  }
}

// Thumbnails go to disk rather than staying in memory as data URIs: a 200 page
// document would otherwise hold 200 base64 strings plus 200 decoded bitmaps
// that React Native's image cache will not evict.
export function thumbDir(): Directory {
  const dir = new Directory(Paths.cache, 'pdfthumbs');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

// `run` distinguishes one opened document from the next. Reusing a name across
// documents leaves the URI unchanged, and React Native caches images by URI, so
// page 3 of the previous file would still be on screen for page 3 of this one.
// In a tool whose whole job is choosing pages to delete from their pictures,
// that deletes the wrong pages.
export function saveThumbJpeg(bytes: Uint8Array, run: number, index: number): string {
  const file = new File(thumbDir(), `thumb-${run}-${index}.jpg`);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file.uri;
}

export function clearThumbDir(): void {
  for (const entry of thumbDir().list()) {
    if (entry instanceof File) entry.delete();
  }
}

export async function readBytes(uri: string): Promise<Uint8Array> {
  return await new File(uri).bytes();
}

