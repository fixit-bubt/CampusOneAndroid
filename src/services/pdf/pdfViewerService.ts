// Service for preparing and powering the native-like in-app PDF viewer.
// Handles downloading remote notice PDFs, caching them offline, preparing
// the local pdf.js runtime in engineDir(), and bridging to the WebView.

import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { engineDir, safeFileName } from './pdfFiles';
import { buildViewerHtml } from './viewerHtml';

function noticesCacheDir(): Directory {
  const dir = new Directory(Paths.cache, 'pdf_notices');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
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
    if (!dest.exists) {
      const asset = Asset.fromModule(r.mod);
      await asset.downloadAsync();
      if (asset.localUri) {
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
// Then copy it into engineDir() as 'active_viewer_doc.pdf' so viewer.html can read it over file://.
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

  return {
    viewerRelativePath: './active_viewer_doc.pdf',
    localFileUri: localSourceFile.uri,
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

