// Service for preparing and powering the native-like in-app PDF viewer.
// Handles downloading remote notice PDFs, caching them offline, preparing
// the local pdf.js runtime in engineDir(), and bridging to the WebView.

import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { engineDir, safeFileName } from './pdfFiles';
import { buildViewerHtml } from './viewerHtml';

const MAX_CACHED_NOTICES = 5;

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Pure arithmetic base64 encoding without depending on global btoa
export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    let enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    let enc4 = b3 & 63;

    if (i + 1 >= len) {
      enc3 = 64;
      enc4 = 64;
    } else if (i + 2 >= len) {
      enc4 = 64;
    }

    result +=
      B64_CHARS[enc1] +
      B64_CHARS[enc2] +
      (enc3 < 64 ? B64_CHARS[enc3] : '=') +
      (enc4 < 64 ? B64_CHARS[enc4] : '=');
  }
  return result;
}

function noticesCacheDir(): Directory {
  const dir = new Directory(Paths.cache, 'pdf_notices');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

// Auto-purge old cached notice previews so temporary files never accumulate or eat device storage
export function pruneNoticesCache(): void {
  try {
    const dir = noticesCacheDir();
    const entries = dir.list();
    const files = entries.filter((e) => e instanceof File) as File[];
    if (files.length > MAX_CACHED_NOTICES) {
      const excess = files.slice(0, files.length - MAX_CACHED_NOTICES);
      for (const f of excess) {
        try { f.delete(); } catch { /* ignore */ }
      }
    }
  } catch {
    // Non-fatal cache maintenance
  }
}

// Generate a fast, stable alphanumeric hash from a URL for caching
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export interface PreparedViewer {
  htmlUri: string;
  engineDirUri: string;
}

export interface PreparedDocument {
  viewerRelativePath: string;
  localFileUri: string;
  engineFileUri: string;
  base64Data?: string;
  isCached: boolean;
}

// Ensure pdf.min.mjs and pdf.worker.min.mjs are present in engineDir(),
// and write a fresh viewer.html matching the current color scheme.
export async function prepareViewerEnvironment(isDark: boolean = true): Promise<PreparedViewer> {
  const dir = engineDir();

  const runtimeAssets = [
    { mod: require('../../../assets/pdfjs/pdf.min.mjs.txt'), name: 'pdf.min.mjs' },
    { mod: require('../../../assets/pdfjs/pdf.worker.min.mjs.txt'), name: 'pdf.worker.min.mjs' },
  ];

  for (const r of runtimeAssets) {
    const dest = new File(dir, r.name);
    if (!dest.exists || dest.size === 0) {
      const asset = Asset.fromModule(r.mod);
      await asset.downloadAsync();
      if (asset.localUri) {
        if (dest.exists) dest.delete();
        await new File(asset.localUri).copy(dest);
      }
    }
  }

  // Write viewer.html
  const viewerFile = new File(dir, 'viewer.html');
  if (viewerFile.exists) viewerFile.delete();
  viewerFile.create();
  viewerFile.write(buildViewerHtml(isDark));

  return {
    htmlUri: viewerFile.uri,
    engineDirUri: dir.uri,
  };
}

// Prepare a PDF document for display in the viewer:
// If it's a remote URL, download and cache it first.
// Copies to engineDir() and reads bytes for direct memory loading.
export async function prepareDocumentForViewer(
  fileUrlOrPath: string,
  suggestedName?: string,
  forceRefresh: boolean = false
): Promise<PreparedDocument> {
  const isRemote = /^https?:\/\//i.test(fileUrlOrPath);
  let localSourceFile: File;

  if (isRemote) {
    const cacheKey = hashUrl(fileUrlOrPath);
    const cleanName = safeFileName(suggestedName || 'notice.pdf');
    const cachedFile = new File(noticesCacheDir(), `${cacheKey}_${cleanName}`);

    if (forceRefresh && cachedFile.exists) {
      try { cachedFile.delete(); } catch { /* ignore */ }
    }

    if (!cachedFile.exists || cachedFile.size === 0) {
      // Download remote PDF to cache
      const downloaded = await File.downloadFileAsync(fileUrlOrPath, noticesCacheDir(), { idempotent: true });
      if (downloaded.uri !== cachedFile.uri) {
        if (cachedFile.exists) cachedFile.delete();
        await new File(downloaded.uri).copy(cachedFile);
        try { new File(downloaded.uri).delete(); } catch { /* ignore */ }
      }
      pruneNoticesCache();
    }

    localSourceFile = cachedFile;
  } else {
    // Local file path
    localSourceFile = new File(fileUrlOrPath);
  }

  if (!localSourceFile.exists) {
    throw new Error('PDF file could not be found or downloaded.');
  }

  // Copy into engineDir() under the fixed name 'active_viewer_doc.pdf'
  const targetInEngine = new File(engineDir(), 'active_viewer_doc.pdf');
  if (targetInEngine.exists) {
    targetInEngine.delete();
  }
  await localSourceFile.copy(targetInEngine);

  // Read bytes into memory for fast base64 passing (avoids any WebView file-access or XHR bugs)
  let base64Data: string | undefined;
  try {
    const rawBytes = await localSourceFile.bytes();
    // PDFs under 8MB can be safely passed in memory
    if (rawBytes.length > 0 && rawBytes.length <= 8 * 1024 * 1024) {
      base64Data = bytesToBase64(rawBytes);
    }
  } catch (err) {
    // Non-fatal: viewer will fallback to reading file directly via XHR
    console.warn('Could not read PDF bytes into memory, will use file path:', err);
  }

  return {
    viewerRelativePath: 'active_viewer_doc.pdf',
    engineFileUri: targetInEngine.uri,
    localFileUri: localSourceFile.uri,
    base64Data,
    isCached: true,
  };
}

export async function shareDownloadedPdf(fileUri: string, dialogTitle: string = 'Share BUBT Notice'): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not supported on this device.');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}
