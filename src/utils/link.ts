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
