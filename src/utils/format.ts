// Format utilities — pure functions, no side effects.

/** "2025-06-08T14:30:00Z" → "Jun 8, 2025" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "2025-06-08" → "08 Jun 2025" (for schedules / events) */
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Relative time: "3m ago", "2d ago" */
export function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000; // seconds
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

/** "14:30" → "2:30 PM" */
export function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** 1200 → "৳ 1,200" */
export function formatPrice(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD')}`;
}

/** Truncate long text for previews. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/** "john doe" → "John Doe" */
export function titleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "john_doe" → "John Doe" (for DB enum values) */
export function enumToLabel(value: string): string {
  return titleCase(value.replace(/_/g, ' '));
}

/** Format file size: 1048576 → "1.0 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** "A+" → safe selector class (for blood group icons) */
export function bloodGroupSlug(bg: string): string {
  return bg.replace('+', 'pos').replace('-', 'neg').toLowerCase();
}

/** Local YYYY-MM-DD for "today" (avoids the UTC off-by-one for UTC+6 users). */
export function localToday(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
}

/**
 * Validate a YYYY-MM-DD string: correct shape, a real calendar date (rejects
 * 2026-13-40 / 2026-02-31), and today-or-future when allowPast is false.
 */
export function isValidDate(s: string, allowPast = false): boolean {
  const str = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  // round-trip check rejects impossible dates that JS would roll over
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
  if (!allowPast && str < localToday()) return false;
  return true;
}
