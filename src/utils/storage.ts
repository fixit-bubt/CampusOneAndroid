// Storage utilities - Supabase file upload/URL logic with auto-compression.

import { File } from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { BUCKETS, MAX_FILE_SIZE_MB, MAX_IMAGE_SIZE_MB } from '../constants/app';
import { compressImage, isImageFile, type ImagePreset } from './imageCompress';

export type UploadResult =
  | { success: true; url: string; path: string }
  | { success: false; error: string };

export interface UploadOptions {
  preset?: ImagePreset;
  skipCompression?: boolean;
  knownWidth?: number;
  knownHeight?: number;
}

/**
 * Upload a local file URI to a Supabase storage bucket.
 * Public buckets return a public URL. Private buckets return the storage path
 * as `url` - store it and sign it at view time with getSignedUrl.
 *
 * Automatically compresses and normalizes images to optimized JPEG
 * to ensure healthy app storage and fast network transfers.
 */
export async function uploadFile(
  bucket: string,
  localUri: string,
  remotePath: string,
  contentType = 'image/jpeg',
  bucketIsPublic = true,
  options: UploadOptions = {},
): Promise<UploadResult> {
  try {
    let uploadUri = localUri;
    let uploadContentType = contentType;

    const isImage = isImageFile(localUri, contentType) && contentType !== 'image/svg+xml';

    // Automatically compress image uploads if not opted out
    if (isImage && !options.skipCompression) {
      const compressed = await compressImage(localUri, {
        preset: options.preset ?? 'standard',
        knownWidth: options.knownWidth,
        knownHeight: options.knownHeight,
      });
      uploadUri = compressed.uri;
      uploadContentType = 'image/jpeg';
    }

    // SDK 56: legacy readAsStringAsync is deprecated - new File API returns bytes directly.
    const bytes = await new File(uploadUri).bytes();

    // Guard against runaway uploads
    const maxBytes = (isImage ? MAX_IMAGE_SIZE_MB : MAX_FILE_SIZE_MB) * 1024 * 1024;
    if (bytes.length > maxBytes) {
      const limitMb = isImage ? MAX_IMAGE_SIZE_MB : MAX_FILE_SIZE_MB;
      return { success: false, error: `File size exceeds ${limitMb}MB limit` };
    }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(remotePath, bytes, { contentType: uploadContentType, upsert: true });

    if (error) return { success: false, error: error.message };

    if (!bucketIsPublic) return { success: true, url: remotePath, path: remotePath };

    const { data } = supabase.storage.from(bucket).getPublicUrl(remotePath);
    return { success: true, url: data.publicUrl, path: remotePath };
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Upload failed' };
  }
}

/**
 * Upload a photo to the public `photos` bucket with automatic compression.
 * Path: {folder}/{userId}/{timestamp}.jpg
 */
export async function uploadPhoto(
  localUri: string,
  folder: string,
  userId: string,
  preset?: ImagePreset,
): Promise<UploadResult> {
  const timestamp = new Date().getTime();
  const path = `${folder}/${userId}/${timestamp}.jpg`;
  const resolvedPreset: ImagePreset = preset ?? (
    folder === 'avatars' || folder === 'faculty' ? 'avatar' :
    folder === 'chatbot' ? 'compact' :
    folder === 'routines' ? 'document' : 'standard'
  );
  return uploadFile(BUCKETS.photos, localUri, path, 'image/jpeg', true, { preset: resolvedPreset });
}

/**
 * Upload a proof document (private bucket) with automatic compression for images.
 * Returns the storage path; view via getSignedUrl.
 */
export async function uploadProof(
  localUri: string,
  userId: string,
  contentType = 'image/jpeg',
): Promise<UploadResult> {
  const timestamp = new Date().getTime();
  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
  const path = `${userId}/${timestamp}.${ext}`;
  return uploadFile(BUCKETS.proofs, localUri, path, contentType, false, { preset: 'standard' });
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
