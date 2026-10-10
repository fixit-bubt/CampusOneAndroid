import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { IMAGE_QUALITY, MAX_FILE_SIZE_MB, MAX_IMAGE_SIZE_MB } from '../constants/app';

export type ImagePreset = 'avatar' | 'standard' | 'document' | 'compact';

export interface PresetConfig {
  maxDim: number;
  quality: number;
}

export const IMAGE_PRESETS: Record<ImagePreset, PresetConfig> = {
  // Avatars & portraits: 512px max edge, crisp retina clarity (~30-60 KB)
  avatar: { maxDim: 512, quality: 0.80 },
  // General feeds, reports, marketplace, lost & found, club posts (~150-300 KB)
  standard: { maxDim: 1440, quality: IMAGE_QUALITY || 0.75 },
  // Routine tables & handwritten study notes: higher resolution & contrast (~250-500 KB)
  document: { maxDim: 1800, quality: 0.82 },
  // Chatbot query attachments & quick previews (~80-150 KB)
  compact: { maxDim: 1024, quality: 0.70 },
};

export interface CompressOptions {
  preset?: ImagePreset;
  maxDim?: number;
  quality?: number;
  knownWidth?: number;
  knownHeight?: number;
}

export interface CompressedResult {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
}

function resolveDimensions(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null)
    );
  });
}

/**
 * Compresses and downscales a local image URI according to the selected preset.
 * Strips camera EXIF bloat and re-encodes to optimized JPEG.
 * If compression fails, gracefully falls back to the original URI without crashing.
 */
export async function compressImage(
  localUri: string,
  options: CompressOptions = {}
): Promise<CompressedResult> {
  // Remote URLs or data URLs require no local compression
  if (!localUri || localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return { uri: localUri, width: 0, height: 0, sizeBytes: 0 };
  }

  const presetConfig = IMAGE_PRESETS[options.preset ?? 'standard'];
  const maxDim = options.maxDim ?? presetConfig.maxDim;
  const quality = options.quality ?? presetConfig.quality;

  try {
    let width = options.knownWidth;
    let height = options.knownHeight;

    if (!width || !height) {
      const resolved = await resolveDimensions(localUri);
      if (resolved) {
        width = resolved.width;
        height = resolved.height;
      }
    }

    const ctx = ImageManipulator.manipulate(localUri);

    if (width && height) {
      const longEdge = Math.max(width, height);
      if (longEdge > maxDim) {
        const ratio = maxDim / longEdge;
        const targetW = Math.max(1, Math.round(width * ratio));
        ctx.resize({ width: targetW });
      }
    } else {
      // Fallback if dimensions are unknown: resize width to maxDim
      ctx.resize({ width: maxDim });
    }

    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: quality,
    });

    let sizeBytes = 0;
    try {
      sizeBytes = new File(saved.uri).size ?? 0;
    } catch {
      sizeBytes = 0;
    }

    return {
      uri: saved.uri,
      width: saved.width,
      height: saved.height,
      sizeBytes,
    };
  } catch {
    // Graceful fallback to original file on any unexpected failure
    let fallbackSize = 0;
    try {
      fallbackSize = new File(localUri).size ?? 0;
    } catch {
      fallbackSize = 0;
    }

    return {
      uri: localUri,
      width: options.knownWidth ?? 0,
      height: options.knownHeight ?? 0,
      sizeBytes: fallbackSize,
    };
  }
}

/** Check if a file is an image by MIME type or extension */
export function isImageFile(pathOrUri: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('image/')) return true;
  const clean = pathOrUri.split(/[#?]/)[0].toLowerCase();
  return /\.(jpg|jpeg|png|webp|heic|heif|bmp)$/.test(clean);
}

/** Get size in bytes of a local file */
export async function getLocalFileSize(uri: string): Promise<number> {
  try {
    const file = new File(uri);
    return file.size ?? 0;
  } catch {
    return 0;
  }
}

/** Validate whether a local file is within the maximum size budget */
export async function validateFileSize(
  uri: string,
  maxBytes: number = MAX_FILE_SIZE_MB * 1024 * 1024
): Promise<{ ok: boolean; sizeBytes: number }> {
  const size = await getLocalFileSize(uri);
  return { ok: size <= maxBytes, sizeBytes: size };
}

export const LIMITS = {
  maxImageBytes: MAX_IMAGE_SIZE_MB * 1024 * 1024,
  maxDocumentBytes: MAX_FILE_SIZE_MB * 1024 * 1024,
};
