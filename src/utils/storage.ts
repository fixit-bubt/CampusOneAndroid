// Storage utilities — Supabase file upload/URL logic.

import { File } from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { BUCKETS, IMAGE_QUALITY } from '../constants/app';

export type UploadResult =
  | { success: true; url: string; path: string }
  | { success: false; error: string };

/**
 * Upload a local file URI to a Supabase storage bucket.
 * Public buckets return a public URL. Private buckets return the storage path
 * as `url` — store it and sign it at view time with getSignedUrl.
 */
export async function uploadFile(
  bucket: string,
  localUri: string,
  remotePath: string,
  contentType = 'image/jpeg',
  bucketIsPublic = true,
): Promise<UploadResult> {
  try {
    // SDK 56: legacy readAsStringAsync is deprecated — new File API returns bytes directly.
    const bytes = await new File(localUri).bytes();

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

/** Upload a photo to the public `photos` bucket. Path: {folder}/{userId}/{timestamp}.jpg */
export async function uploadPhoto(
  localUri: string,
  folder: string,
  userId: string,
): Promise<UploadResult> {
  const timestamp = new Date().getTime();
  const path = `${folder}/${userId}/${timestamp}.jpg`;
  return uploadFile(BUCKETS.photos, localUri, path, 'image/jpeg');
}

/** Upload a proof document (private bucket). Returns the storage path; view via getSignedUrl. */
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

/** Delete a file from a bucket by its storage path. */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  await supabase.storage.from(bucket).remove([path]);
}

/** Get a short-lived signed URL for a private bucket file (60 min). */
export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
