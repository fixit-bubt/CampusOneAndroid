import { Directory, File, Paths } from 'expo-file-system';
import { Linking } from 'react-native';
import { clearPeople } from './peopleService';
import { clearEngineDir, clearThumbDir, pdfCacheDir } from './pdf/pdfFiles';

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function calculateDirSize(dir: Directory): number {
  let size = 0;
  try {
    if (!dir.exists) return 0;
    const items = dir.list();
    for (const item of items) {
      if (item instanceof File) {
        size += item.size ?? 0;
      } else if (item instanceof Directory) {
        size += calculateDirSize(item);
      }
    }
  } catch {
    // transient file access error
  }
  return size;
}

export async function getAppCacheSize(): Promise<number> {
  try {
    const cacheDir = new Directory(Paths.cache);
    return calculateDirSize(cacheDir);
  } catch {
    return 0;
  }
}

export async function clearAppCache(): Promise<void> {
  try {
    clearEngineDir();
  } catch {}

  try {
    clearThumbDir();
  } catch {}

  try {
    const pDir = pdfCacheDir();
    if (pDir.exists) {
      for (const entry of pDir.list()) {
        if (entry instanceof File) entry.delete();
      }
    }
  } catch {}

  try {
    clearPeople();
  } catch {}
}

export function openSystemAppSettings(): void {
  Linking.openSettings().catch(() => {});
}
