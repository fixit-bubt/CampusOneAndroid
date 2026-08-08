// Annex tab — BUBT's student portal (results, routine, attendance) embedded
// in-app via WebView. We never see the student's portal password: the login
// form is the portal's own page, rendered as-is.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, BackHandler, Linking, ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../../components/ui/Icon';
import { LoadError } from '../../components/ui/LoadState';
import { FontFamily, Layout } from '../../theme';

const ANNEX_URL = 'https://annex.bubt.edu.bd/';

// forceDarkOn only drives Android's deprecated per-WebView dark API, which is
// a no-op on modern WebView versions — the reliable cross-version fix is to
// make the page itself declare it's light-only, which is what the browser
// engine's auto-darken heuristic actually checks.
const FORCE_LIGHT_JS = `
  (function () {
    function apply() {
      if (!document.head || document.querySelector('meta[name="color-scheme"]')) return;
      var meta = document.createElement('meta');
      meta.name = 'color-scheme';
      meta.content = 'light';
      document.head.appendChild(meta);
      var style = document.createElement('style');
      style.textContent = ':root { color-scheme: light; }';
      document.head.appendChild(style);
    }
    if (document.head) apply();
    else document.addEventListener('DOMContentLoaded', apply);
  })();
  true;
`;

export function AnnexPortalScreen() {
  const { C } = useTheme();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Android hardware back should step through the portal's own page history
  // before it's allowed to leave the tab.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onNavStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { paddingHorizontal: Layout.screenPadding }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            CampusOne
          </Text>
          <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            Annex
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Linking.openURL(ANNEX_URL)}
          style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          activeOpacity={0.75}
        >
          <Icon name="annex" size={18} color={C.text2} />
        </TouchableOpacity>
      </View>

      {loading && !error && (
        <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
          <View style={[styles.progressFill, { backgroundColor: C.brand, width: `${Math.max(progress, 0.06) * 100}%` }]} />
        </View>
      )}

      {error ? (
        <LoadError onRetry={retry} />
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            ref={webRef}
            source={{ uri: ANNEX_URL }}
            style={{ flex: 1, backgroundColor: '#fff' }}
            pullToRefreshEnabled
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            forceDarkOn={false}
            injectedJavaScriptBeforeContentLoaded={FORCE_LIGHT_JS}
            injectedJavaScript={FORCE_LIGHT_JS}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={onNavStateChange}
            onError={() => { setError(true); setLoading(false); }}
            onHttpError={({ nativeEvent }) => {
              // Only a non-2xx on the top-level document (site down/blocked)
              // is a real failure — subresource errors (an ad, a broken
              // icon) shouldn't nuke the whole page.
              if (nativeEvent.url !== ANNEX_URL) return;
              setError(true);
              setLoading(false);
            }}
          />
          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: C.bg }]} pointerEvents="none">
              <ActivityIndicator color={C.brand} size="large" />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 12,
    gap: 10,
  } as ViewStyle,
  eyebrow: { fontSize: 12, letterSpacing: 0.2 } as any,
  title: { fontSize: 24, letterSpacing: -0.4, marginTop: 2 } as any,
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  progressTrack: { height: 2.5, width: '100%' } as ViewStyle,
  progressFill: { height: 2.5 } as ViewStyle,
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});
