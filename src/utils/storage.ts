// ─────────────────────────────────────────────────────────────────────────────
// Storage utilities — all Supabase file upload/URL logic in one place.
// Real devs never scatter upload code across multiple screens.
// ─────────────────────────────────────────────────────────────────────────────

import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { BUCKETS, IMAGE_QUALITY } from '../constants/app';

export type UploadResult =
  | { success: true; url: string; path: string }
  | { success: false; error: string };

/**
 * Upload a local file URI to a Supabase storage bucket.
 * Public buckets get a permanent public URL. Private buckets get the storage
 * PATH back as `url` — store that in the DB and sign it at view time with
 * getSignedUrl (a public URL on a private bucket would 403).
 */
export async function uploadFile(
  bucket: string,
  localUri: string,
  remotePath: string,
  contentType = 'image/jpeg',
  bucketIsPublic = true,
): Promise<UploadResult> {
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const { error } = await supabase.storage
      .from(bucket)
      .upload(remotePath, bytes, { contentType, upsert: true });

    if (error) return { success: false, error: error.message };

    if (!bucketIsPublic) return { success: true, url: remotePath, path: remotePath };

    const { data } = supabase.storage.from(bucket).getPublicUrl(remotePath);
    return { success: true, url: data.publicUrl, path: remotePath };
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Upload failed' };
  }
}

/**
 * Upload a photo to the public `photos` bucket.
 * Path format: {folder}/{userId}/{timestamp}.jpg
 */
export async function uploadPhoto(
  localUri: string,
  folder: string,
  userId: string,
): Promise<UploadResult> {
  const timestamp = new Date().getTime();
  const path = `${folder}/${userId}/${timestamp}.jpg`;
  return uploadFile(BUCKETS.photos, localUri, path, 'image/jpeg');
}

/**
 * Upload a proof document (private bucket). Returns the storage PATH —
 * store it and resolve with getSignedUrl(BUCKETS.proofs, path) to view.
 */
export async function uploadProof(
  localUri: string,
  userId: string,
  contentType = 'application/pdf',
): Promise<UploadResult> {
  const timestamp = new Date().getTime();
  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
  const path = `${userId}/${timestamp}.${ext}`;
  return uploadFile(BUCKETS.proofs, localUri, path, contentType, false);
}

/**
 * Delete a file from a bucket by its storage path.
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  await supabase.storage.from(bucket).remove([path]);
}

/**
 * Get a short-lived signed URL for a private bucket file (60 min).
 */
export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
