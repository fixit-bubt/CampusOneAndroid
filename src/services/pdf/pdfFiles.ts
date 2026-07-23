// Filesystem and share plumbing for the PDF Maker.
//
// Two cache folders, both under Paths.cache because everything here is
// transient: `pdfmaker` holds finished PDFs on their way to the share sheet,
// `pdfengine` holds the WebView engine and whatever file it is currently
// allowed to read. Cache is correct: once shared, the file is the OS's
// problem, and the system may reclaim the folder at any time.
import { Directory, File, Paths } from 'expo-file-system';
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

// Files the engine folder owns. Anything else in there is a document being
// worked on, and is disposable.
export const ENGINE_RUNTIME = ['engine.html', 'pdf.min.mjs', 'pdf.worker.min.mjs'];
const ENGINE_SOURCE = 'source.pdf';

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

export function saveThumbJpeg(bytes: Uint8Array, index: number): string {
  const file = new File(thumbDir(), `thumb-${index}.jpg`);
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
