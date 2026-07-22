// Safe external-link opener.
// Linking.openURL rejects when no app can handle the URL (bad scheme, no mail
// client, malformed value). Every call site used to ignore that, so a tap would
// silently do nothing. This wraps it: bare hosts get an https:// scheme, and
// failures are swallowed and reported via the boolean return.

import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Open an external URL safely.
 * - Adds `https://` to scheme-less values like "www.x.com" or "company.com/apply".
 * - Leaves real schemes (mailto:, tel:, https:, intent:, …) untouched.
 * - Never throws; returns false if the URL was empty or could not be opened.
 */
export async function openUrl(raw: string | null | undefined): Promise<boolean> {
  const url = (raw ?? '').trim();
  if (!url) return false;
  // A scheme is letters/digits/+/-/./ followed by ":" at the start.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
  const final = hasScheme ? url : `https://${url}`;
  try {
    await Linking.openURL(final);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open a URL in an in-app browser tab (Android Custom Tab / iOS SafariViewController)
 * so the user stays inside the app — used for previewing study files and docs.
 * Falls back to openUrl if the in-app browser can't handle it.
 */
export async function openInApp(raw: string | null | undefined): Promise<boolean> {
  const url = (raw ?? '').trim();
  if (!url) return false;
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
  const final = hasScheme ? url : `https://${url}`;
  try {
    await WebBrowser.openBrowserAsync(final);
    return true;
  } catch {
    return openUrl(final);
  }
}

/**
 * Build a wa.me link from a phone number, normalizing Bangladesh numbers to
 * full international form. Returns null when there aren't enough digits to be a
 * real number, so callers can hide the button instead of opening a dead
 * "invalid number" page.
 * - strips non-digits; drops a leading "00" international prefix
 * - keeps an existing "880…"; converts local "0…" → "880…"
 * - a bare 10-digit "1…" (missing the leading 0) → "880…"
 */
export function waHref(phone: string | null | undefined): string | null {
  let d = (phone ?? '').replace(/[^0-9]/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('880')) {
    // already international
  } else if (d.startsWith('0')) {
    d = '880' + d.slice(1);
  } else if (d.length === 10 && d.startsWith('1')) {
    d = '880' + d;
  }
  if (d.length < 11) return null;
  return `https://wa.me/${d}`;
}
