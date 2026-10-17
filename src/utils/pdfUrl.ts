// Universal PDF URL Normalizer & Validator.
// Ensures relative, storage, and legacy server URLs are mapped to live, working HTTPS endpoints.

export const BUBT_STORAGE_BASE = 'https://www.bubt.edu.bd/storage/';
export const BUBT_UPLOADS_BASE = 'https://www.bubt.edu.bd/uploads/';
export const CAMPUS_ONE_WEB_BASE = 'https://campusonebubt.vercel.app';

/**
 * Normalizes any raw PDF URL, relative path, or storage key into a valid, reachable URI.
 * - Leaves local device paths (`file://`, `content://`, `/data/`) untouched for offline Cover Pages & PDF Maker.
 * - Rewrites stale/decommissioned Vercel domains to `campusonebubt.vercel.app`.
 * - Prepends official BUBT base URLs to crawler relative paths (`notices/*`, `uploads/*`, `storage/*`).
 */
export function normalizePdfUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  if (!cleaned) return null;

  // 1. Explicit local file schemes (Cover Page, PDF Maker tools, local cache)
  if (
    cleaned.startsWith('file://') ||
    cleaned.startsWith('content://') ||
    cleaned.startsWith('/data/') ||
    cleaned.startsWith('/storage/emulated/')
  ) {
    return cleaned;
  }

  // 2. Full HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(cleaned)) {
    // Rewrite legacy domains
    if (cleaned.includes('fixit-campus-theta.vercel.app')) {
      return cleaned.replace('fixit-campus-theta.vercel.app', 'campusonebubt.vercel.app');
    }
    if (cleaned.includes('campus-theta.vercel.app')) {
      return cleaned.replace('campus-theta.vercel.app', 'campusonebubt.vercel.app');
    }
    return cleaned;
  }

  // 3. BUBT notices / storage relative paths
  if (cleaned.startsWith('notices/') || cleaned.startsWith('storage/')) {
    const stripped = cleaned.replace(/^storage\//, '').replace(/^\/+/, '');
    return `${BUBT_STORAGE_BASE}${stripped}`;
  }

  // 4. BUBT uploads relative paths
  if (cleaned.startsWith('uploads/')) {
    const stripped = cleaned.replace(/^uploads\//, '').replace(/^\/+/, '');
    return `${BUBT_UPLOADS_BASE}${stripped}`;
  }

  // 5. Root-relative paths (e.g. `/announcements/exam-routine.pdf` or `/bubt-academic-calendar-summer-2026.pdf`)
  if (cleaned.startsWith('/')) {
    return `${CAMPUS_ONE_WEB_BASE}${cleaned}`;
  }

  // 6. Bare filename fallback
  if (/\.pdf$/i.test(cleaned)) {
    return `${CAMPUS_ONE_WEB_BASE}/${cleaned}`;
  }

  return cleaned;
}

/**
 * Checks whether the given URI is a remote web document requiring internet streaming.
 */
export function isRemotePdfUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return /^https?:\/\//i.test(uri.trim());
}

/**
 * Builds the high-reliability Google Docs Viewer embed URL for seamless in-app streaming.
 */
export function buildGoogleDocsViewerUrl(remoteUrl: string): string {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(remoteUrl.trim())}`;
}
