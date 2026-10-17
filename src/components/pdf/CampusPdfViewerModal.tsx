import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../ui/Toast';
import { FontFamily } from '../../theme';
import { openUrl } from '../../utils/link';
import { normalizePdfUrl, isRemotePdfUrl, buildGoogleDocsViewerUrl } from '../../utils/pdfUrl';
import {
  prepareViewerEnvironment,
  prepareDocumentForViewer,
  shareDownloadedPdf,
} from '../../services/pdf/pdfViewerService';

interface CampusPdfViewerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  category?: string;
  fileUrl: string | null;
  fileName?: string;
  initialSearchQuery?: string;
  targetPage?: number;
}

export function CampusPdfViewerModal({
  visible,
  onClose,
  title,
  subtitle,
  category,
  fileUrl,
  fileName,
  initialSearchQuery,
  targetPage,
}: CampusPdfViewerModalProps) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const webRef = useRef<WebView>(null);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [engineDirUri, setEngineDirUri] = useState<string | null>(null);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Preparing document…');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSelectorVisible, setPageSelectorVisible] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Normalized URI: maps relative or legacy Vercel links to live reachable endpoints
  const normalizedUrl = useMemo(() => normalizePdfUrl(fileUrl), [fileUrl]);
  const isRemote = useMemo(() => isRemotePdfUrl(normalizedUrl), [normalizedUrl]);

  // Google Docs Viewer URL for remote web PDFs
  const googleDocsViewerUrl = useMemo(() => {
    if (!normalizedUrl || !isRemote) return null;
    return buildGoogleDocsViewerUrl(normalizedUrl);
  }, [normalizedUrl, isRemote]);

  // Synchronization refs for local pdf.js engine
  const webViewReadyRef = useRef(false);
  const docPayloadRef = useRef<{ base64?: string; fileUri?: string } | null>(null);

  const sendDocumentToWebView = useCallback(() => {
    if (!docPayloadRef.current) return;
    const payload = docPayloadRef.current;
    if (payload.base64) {
      webRef.current?.injectJavaScript(
        `if (typeof window.loadPdfData === 'function') { window.loadPdfData(${JSON.stringify(payload.base64)}); } true;`
      );
    } else if (payload.fileUri) {
      webRef.current?.injectJavaScript(
        `if (typeof window.loadPdfDoc === 'function') { window.loadPdfDoc(${JSON.stringify(payload.fileUri)}); } true;`
      );
    }
  }, []);

  // Initialize and prepare engine + document
  const initViewer = useCallback(async (forceRefresh = false) => {
    if (!normalizedUrl) {
      setErrorMsg('No document URL provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Mode A: Remote Web URL (Notices, Routines, Academic Calendar) -> In-App Google Docs Embed
      if (isRemote) {
        setLoadingMessage('Streaming document…');
        // Remote mode renders via direct webview URL; no heavy local cache download needed
        return;
      }

      // Mode B: Local File (Cover Page Generator, PDF Maker scans) -> On-Device Local pdf.js Engine
      setLoadingMessage(category ? `Preparing ${category}…` : 'Preparing document…');
      const env = await prepareViewerEnvironment(isDark);
      setEngineDirUri(env.engineDirUri);
      setHtmlUri(env.htmlUri);

      const doc = await prepareDocumentForViewer(normalizedUrl, fileName, forceRefresh);
      setLocalFileUri(doc.localFileUri);

      docPayloadRef.current = {
        base64: doc.base64Data,
        fileUri: doc.engineFileUri,
      };
      sendDocumentToWebView();

    } catch (err: any) {
      console.warn('PDF Viewer init error:', err);
      setErrorMsg(err.message || 'Could not load official PDF document.');
      setLoading(false);
    }
  }, [normalizedUrl, isRemote, fileName, category, isDark, sendDocumentToWebView]);

  useEffect(() => {
    if (visible && normalizedUrl) {
      setCurrentPage(1);
      setTotalPages(1);
      webViewReadyRef.current = false;
      docPayloadRef.current = null;
      initViewer();
    } else {
      webViewReadyRef.current = false;
      docPayloadRef.current = null;
      setHtmlUri(null);
      setLocalFileUri(null);
      setErrorMsg(null);
    }
  }, [visible, normalizedUrl, initViewer]);

  // Handle messages from the local WebView engine
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'viewerReady') {
        webViewReadyRef.current = true;
        sendDocumentToWebView();
      } else if (data.type === 'rendering') {
        setLoadingMessage('Rendering document…');
      } else if (data.type === 'docOpened') {
        setTotalPages(data.totalPages || 1);
        setLoading(false);
        if (initialSearchQuery) {
          webRef.current?.injectJavaScript(`window.findSectionPage(${JSON.stringify(initialSearchQuery)}); true;`);
        } else if (targetPage && targetPage > 1) {
          webRef.current?.injectJavaScript(`window.scrollToPage(${targetPage}); true;`);
        }
      } else if (data.type === 'pageMatched') {
        if (data.page > 0) {
          setCurrentPage(data.page);
          toast({
            type: 'success',
            title: 'Section Located',
            message: `Showing page ${data.page} of ${data.totalPages || totalPages} for "${data.query}"`,
          });
        } else {
          toast({
            type: 'info',
            title: 'Section Not Found',
            message: `Could not locate "${data.query}" automatically. Showing full document.`,
          });
        }
      } else if (data.type === 'pageChange') {
        if (data.page) setCurrentPage(data.page);
        if (data.total) setTotalPages(data.total);
      } else if (data.type === 'error') {
        setErrorMsg(data.message || 'Error rendering document.');
        setLoading(false);
      }
    } catch {
      // ignore malformed messages
    }
  }, [sendDocumentToWebView, initialSearchQuery, targetPage, totalPages, toast]);

  // Share handler
  const handleShare = useCallback(async () => {
    if (sharing) return;
    try {
      setSharing(true);
      if (localFileUri) {
        await shareDownloadedPdf(localFileUri, title || 'BUBT Notice');
      } else if (normalizedUrl) {
        await openUrl(normalizedUrl);
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Could not share notice', message: err.message });
    } finally {
      setSharing(false);
    }
  }, [localFileUri, normalizedUrl, title, sharing, toast]);

  // Jump to specific page (local engine only)
  const handleJumpToPage = useCallback((pageNum: number) => {
    webRef.current?.injectJavaScript(`window.scrollToPage(${pageNum}); true;`);
    setCurrentPage(pageNum);
    setPageSelectorVisible(false);
  }, []);

  // Open fallback in browser
  const handleOpenExternal = useCallback(() => {
    if (normalizedUrl) {
      openUrl(normalizedUrl).catch(() => {
        toast({ type: 'error', title: 'Cannot open document in browser' });
      });
    }
  }, [normalizedUrl, toast]);

  const navBarBg = isDark ? '#0a192f' : '#1e3a8a';
  const displaySubtitle = subtitle || category || 'BUBT Official Notice';

  // CSS injection to streamline Google Docs Viewer into an in-app reader
  const googleDocsInjectedCss = `
    (function() {
      function cleanGview() {
        const styleId = 'campusone-gview-cleaner';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = \`
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: ${isDark ? '#000000' : '#f8fafc'} !important;
              overflow-x: auto !important;
            }
            .ndfHFb-c4YZDc-Wrql6b,
            .drive-viewer-toolstrip,
            div[role="toolbar"],
            .goog-inline-block.ndfHFb-c4YZDc-to915-LgbsSe,
            a[href*="docs.google.com"],
            .ndfHFb-c4YZDc-V67aGc {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              opacity: 0 !important;
            }
            .ndfHFb-c4YZDc-bC7sje,
            .ndfHFb-c4YZDc-c3fl2b,
            .ndfHFb-c4YZDc-cYSp0e-tJHJj,
            .ndfHFb-c4YZDc-s2gQvd,
            .ndfHFb-c4YZDc-bC7sje-tJHJj,
            .ndfHFb-c4YZDc-AWhBae {
              background: ${isDark ? '#000000' : '#f8fafc'} !important;
              background-color: ${isDark ? '#000000' : '#f8fafc'} !important;
              width: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }
            .ndfHFb-c4YZDc-s2gQvd img,
            .ndfHFb-c4YZDc-bC7sje img,
            .ndfHFb-c4YZDc-cYSp0e-tJHJj img,
            .ndfHFb-c4YZDc-c3fl2b img,
            .ndfHFb-c4YZDc-AWhBae img,
            canvas,
            img {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              margin: 0 0 10px 0 !important;
              display: block !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.18) !important;
            }
          \`;
          document.head && document.head.appendChild(style);
        }
      }
      cleanGview();
      setInterval(cleanGview, 350);
    })();
    true;
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#f1f5f9' }]}>
        <StatusBar barStyle="light-content" backgroundColor={navBarBg} />

        {/* =========================================================================
            1. EXECUTIVE APP BAR (Dual-line layout matching BUBT Info & CampusOne Navy)
           ========================================================================= */}
        <View style={[styles.header, { backgroundColor: navBarBg, paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.headerRow}>
            {/* Left Chevron Back Button */}
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={26} color="#ffffff" />
            </TouchableOpacity>

            {/* Title & Subtitle */}
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title || 'Official Document'}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {displaySubtitle}
              </Text>
            </View>

            {/* Right Action Icons */}
            <View style={styles.headerActions}>
              {!isRemote && totalPages > 1 && (
                <TouchableOpacity
                  onPress={() => setPageSelectorVisible(true)}
                  hitSlop={10}
                  style={styles.actionBtn}
                  activeOpacity={0.75}
                >
                  <Feather name="layers" size={19} color="#ffffff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleShare}
                hitSlop={10}
                style={styles.actionBtn}
                activeOpacity={0.75}
                disabled={sharing}
              >
                <Feather name="share-2" size={19} color="#ffffff" />
              </TouchableOpacity>

              {isRemote && (
                <TouchableOpacity
                  onPress={handleOpenExternal}
                  hitSlop={10}
                  style={styles.actionBtn}
                  activeOpacity={0.75}
                >
                  <Feather name="external-link" size={18} color="#ffffff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => initViewer(true)}
                hitSlop={10}
                style={styles.actionBtn}
                activeOpacity={0.75}
              >
                <Feather name="rotate-cw" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* =========================================================================
            2. BODY: HYBRID STREAMING / NATIVE PDF CANVAS
           ========================================================================= */}
        <View style={styles.viewerWrapper}>
          {/* Mode A: Remote Web PDF streaming inside the app via Google Docs Viewer */}
          {isRemote && googleDocsViewerUrl && !errorMsg && (
            <View style={StyleSheet.absoluteFill}>
              <WebView
                ref={webRef}
                source={{ uri: googleDocsViewerUrl }}
                style={[styles.webView, { backgroundColor: isDark ? '#000000' : '#f1f5f9' }]}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                setSupportMultipleWindows={false}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={false}
                injectedJavaScriptBeforeContentLoaded={`
                  (function() {
                    const meta = document.createElement('meta');
                    meta.name = 'viewport';
                    meta.content = 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes';
                    document.head && document.head.appendChild(meta);
                  })();
                  true;
                `}
                scalesPageToFit={false}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={[styles.centerOverlay, { backgroundColor: isDark ? '#000000' : '#f8fafc' }]}>
                    <ActivityIndicator size="large" color={C.brand} />
                    <Text style={[styles.loadingTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      Loading official PDF…
                    </Text>
                  </View>
                )}
                injectedJavaScript={googleDocsInjectedCss}
                onError={() => {
                  setErrorMsg('Could not stream document.');
                  setLoading(false);
                }}
              />
            </View>
          )}

          {/* Mode B: Local File rendering on-device via pdf.js (Cover Page & PDF Maker) */}
          {!isRemote && htmlUri && !errorMsg && (
            <View style={StyleSheet.absoluteFill}>
              <WebView
                ref={webRef}
                source={{ uri: htmlUri }}
                style={[styles.webView, { backgroundColor: isDark ? '#000000' : '#f1f5f9' }]}
                originWhitelist={['file://*']}
                javaScriptEnabled
                allowFileAccess
                allowFileAccessFromFileURLs
                allowUniversalAccessFromFileURLs
                allowingReadAccessToURL={engineDirUri ?? undefined}
                setSupportMultipleWindows={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onLoadEnd={() => {
                  webRef.current?.injectJavaScript(`
                    if (window.__viewerShellReady && window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'viewerReady' }));
                    }
                    true;
                  `);
                }}
                onMessage={handleMessage}
                onError={() => {
                  setErrorMsg('Failed to render PDF engine.');
                  setLoading(false);
                }}
              />
            </View>
          )}

          {/* Loading Indicator (Local Engine Only) */}
          {!isRemote && loading && !errorMsg && (
            <View style={[styles.centerOverlay, { backgroundColor: isDark ? '#000000' : '#f8fafc' }]}>
              <ActivityIndicator size="large" color={C.brand} />
              <Text style={[styles.loadingTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {loadingMessage}
              </Text>
            </View>
          )}

          {/* Error Screen with Fallbacks */}
          {errorMsg && (
            <View style={[styles.centerOverlay, { backgroundColor: isDark ? '#000000' : '#f8fafc' }]}>
              <View style={[styles.errorCard, { backgroundColor: isDark ? '#121212' : '#ffffff', borderColor: C.border }]}>
                <View style={[styles.errorIconBox, { backgroundColor: C.dangerBg }]}>
                  <Feather name="alert-triangle" size={28} color={C.danger} />
                </View>
                <Text style={[styles.errorTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Could not load document
                </Text>
                <Text style={[styles.errorDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {errorMsg}
                </Text>

                <View style={styles.errorBtns}>
                  <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: C.brand }]}
                    onPress={() => initViewer(true)}
                    activeOpacity={0.8}
                  >
                    <Feather name="rotate-cw" size={15} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={[styles.retryBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>Retry</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.browserBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: C.border }]}
                    onPress={handleOpenExternal}
                    activeOpacity={0.8}
                  >
                    <Feather name="external-link" size={15} color={C.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.browserBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Open in Browser
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Page Pill for Local Multi-Page Documents */}
          {!isRemote && !loading && !errorMsg && totalPages >= 1 && (
            <TouchableOpacity
              style={[
                styles.floatingPagePill,
                { bottom: Math.max(insets.bottom, 16) + 16 }
              ]}
              onPress={() => totalPages > 1 && setPageSelectorVisible(true)}
              activeOpacity={totalPages > 1 ? 0.8 : 1}
            >
              <Feather name="book-open" size={14} color="#ffffff" style={{ marginRight: 7 }} />
              <Text style={[styles.floatingPageText, { fontFamily: FontFamily.jakartaBold }]}>
                {currentPage} / {totalPages}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Page Selector Modal for Local Documents */}
        {!isRemote && (
          <Modal
            visible={pageSelectorVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setPageSelectorVisible(false)}
          >
            <TouchableOpacity
              style={styles.sheetOverlay}
              activeOpacity={1}
              onPress={() => setPageSelectorVisible(false)}
            >
              <View style={[styles.sheetContent, { backgroundColor: isDark ? '#18181b' : '#ffffff', paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Select Page
                  </Text>
                  <TouchableOpacity onPress={() => setPageSelectorVisible(false)} hitSlop={10}>
                    <Feather name="x" size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageChipsScroll}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                    const isCurrent = num === currentPage;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.pageChip,
                          {
                            backgroundColor: isCurrent ? C.brand : (isDark ? '#27272a' : '#f1f5f9'),
                            borderColor: isCurrent ? C.brand : (isDark ? '#3f3f46' : '#e2e8f0'),
                          }
                        ]}
                        onPress={() => handleJumpToPage(num)}
                      >
                        <Feather
                          name="file-text"
                          size={14}
                          color={isCurrent ? '#ffffff' : (isDark ? '#a1a1aa' : '#64748b')}
                          style={{ marginBottom: 4 }}
                        />
                        <Text
                          style={[
                            styles.pageChipTxt,
                            {
                              color: isCurrent ? '#ffffff' : (isDark ? '#e4e4e7' : '#334155'),
                              fontFamily: isCurrent ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            }
                          ]}
                        >
                          Page {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 6,
    marginLeft: -4,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 6,
  },
  headerTitle: {
    fontSize: 15,
    color: '#ffffff',
    fontFamily: FontFamily.jakartaBold,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: FontFamily.jakartaMedium,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 6,
  },
  viewerWrapper: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingTxt: {
    marginTop: 12,
    fontSize: 13,
  },
  floatingPagePill: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  floatingPageText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  errorIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 17,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBtns: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnTxt: {
    color: '#ffffff',
    fontSize: 14,
  },
  browserBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  browserBtnTxt: {
    fontSize: 13,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
  },
  pageChipsScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  pageChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 78,
  },
  pageChipTxt: {
    fontSize: 12,
  },
});
