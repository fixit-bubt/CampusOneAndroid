// The raster engine: a hidden WebView running pdf.js, used only for the one
// job React Native cannot do, which is drawing a PDF page into a picture.
//
// Input never crosses the bridge. The document is copied into engineDir() and
// the page, loaded from that same folder over file://, reads it itself. What
// comes back is one page JPEG at a time; the assembled PDF is built natively
// by pdf-lib and written straight to disk, so it never crosses either.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { PdfError } from './presets';
import { engineDir, copyIntoEngineDir, clearEngineDir } from './pdfFiles';
import { buildEngineHtml } from './engineHtml';
import { reduceEngineMessage, type EngineMessage, type PendingJob } from './engineProtocol';

// A job that never gets an answer would park its promise forever, so every
// request is bounded. Rendering a large page can genuinely take a while on a
// cheap phone, hence the generous ceiling.
const BOOT_TIMEOUT_MS = 20_000;
const JOB_TIMEOUT_MS = 90_000;
const MAX_ENGINE_RESTARTS = 2;

export interface EngineHandle {
  open(uri: string): Promise<{ pages: number; textChars: number }>;
  thumb(page: number, maxDim: number): Promise<string>;
  render(page: number, longEdge: number, quality: number): Promise<{ base64: string; wPt: number; hPt: number }>;
  close(): void;
}

// Copy the vendored runtime and write the page beside it. The runtime ships
// with a .txt suffix (see scripts/vendor-pdfjs.mjs) and gets its real name
// back here, which is what the page's import specifiers expect.
//
// The copies are overwritten rather than skipped when present: a half-written
// file from an interrupted first launch would otherwise count as good forever.
async function prepareEngineFolder(): Promise<string> {
  const dir = engineDir();
  const runtime = [
    { mod: require('../../../assets/pdfjs/pdf.min.mjs.txt'), name: 'pdf.min.mjs' },
    { mod: require('../../../assets/pdfjs/pdf.worker.min.mjs.txt'), name: 'pdf.worker.min.mjs' },
  ];
  for (const r of runtime) {
    const asset = Asset.fromModule(r.mod);
    await asset.downloadAsync();
    if (!asset.localUri) throw new PdfError('engine-failed');
    const dest = new File(dir, r.name);
    if (dest.exists) dest.delete();
    // copy() is asynchronous in SDK 56. Not awaiting it lets the WebView load
    // the page before the runtime has landed, which hangs the engine on a
    // fresh install and then mysteriously fixes itself on the second try.
    await new File(asset.localUri).copy(dest);
  }
  const html = new File(dir, 'engine.html');
  if (html.exists) html.delete();
  html.create();
  html.write(buildEngineHtml());
  return html.uri;
}

export function useRasterEngine() {
  const webRef = useRef<WebView>(null);
  const pending = useRef(new Map<number, PendingJob>()).current;
  const seq = useRef(0);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  // Bumped when the engine dies, which remounts the WebView so the next job
  // gets a live page instead of posting into a corpse.
  const [generation, setGeneration] = useState(0);
  const readAccess = useRef<string | null>(null);
  const bootTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A broken runtime would otherwise remount forever, since the reload hits the
  // same failing page and reports the same error.
  const restarts = useRef(0);

  // Resolved by the page's own "ready" message, rejected if it never arrives.
  // Every job waits on it, so a request cannot be injected before the module
  // script has run.
  const ready = useRef<{ promise: Promise<void>; resolve: () => void; reject: (e: any) => void; settled: boolean }>(null as any);
  const newReady = () => {
    let res!: () => void;
    let rej!: (e: any) => void;
    const promise = new Promise<void>((a, b) => { res = a; rej = b; });
    // Nothing awaits this until the student picks a file, and an unawaited
    // rejection would be reported as an unhandled promise.
    promise.catch(() => {});
    return { promise, resolve: res, reject: rej, settled: false };
  };
  if (!ready.current) ready.current = newReady();

  const failEngine = useCallback(() => {
    if (bootTimer.current) { clearTimeout(bootTimer.current); bootTimer.current = null; }
    if (!ready.current.settled) {
      ready.current.settled = true;
      ready.current.reject(new PdfError('engine-failed'));
    }
    reduceEngineMessage(pending, { id: 0, type: 'fatal' });
    if (restarts.current >= MAX_ENGINE_RESTARTS) return;
    restarts.current++;
    // Arm a fresh gate for the remounted page, otherwise one crash would keep
    // every later job rejecting against the old, already-settled promise.
    ready.current = newReady();
    setGeneration((g) => g + 1);
  }, [pending]);

  // Prepare the folder once, then again for each restart: the cache directory
  // this lives in can be purged by the OS while the screen is open, so a
  // remount that reuses a vanished path would fail exactly as before.
  useEffect(() => {
    let alive = true;
    if (!readAccess.current) readAccess.current = engineDir().uri;
    prepareEngineFolder()
      .then((uri) => { if (alive) setHtmlUri(uri); })
      .catch(() => { if (alive) failEngine(); });
    return () => { alive = false; };
  }, [generation, failEngine]);

  // Armed per generation, not once per mount. A page that never announces
  // itself is the failure; clearing this on "ready" is what stops a healthy
  // engine from tearing itself down mid job, and re-arming it on a remount is
  // what stops the second failure from hanging forever.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ready.current.settled) failEngine();
    }, BOOT_TIMEOUT_MS);
    bootTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (bootTimer.current === timer) bootTimer.current = null;
    };
  }, [generation, failEngine]);

  useEffect(() => () => {
    for (const [, job] of pending) job.reject(new PdfError('cancelled'));
    pending.clear();
    clearEngineDir();
  }, [pending]);

  const post = useCallback((payload: Record<string, unknown>) => {
    // JSON.stringify of the JSON text yields a correctly escaped JS string
    // literal, which is safer than hand-rolling quote escaping.
    const literal = JSON.stringify(JSON.stringify(payload));
    webRef.current?.injectJavaScript(`window.__pdfEngine && window.__pdfEngine(${literal}); true;`);
  }, []);

  const run = useCallback(async <T,>(payload: Record<string, unknown>): Promise<T> => {
    await ready.current.promise;
    const id = ++seq.current;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pending.delete(id)) reject(new PdfError('engine-failed'));
      }, JOB_TIMEOUT_MS);
      const done = (fn: (v: any) => void) => (v: any) => { clearTimeout(timer); fn(v); };
      pending.set(id, { resolve: done(resolve), reject: done(reject) });
      post({ ...payload, id });
    });
  }, [pending, post]);

  const engine: EngineHandle = useMemo(() => ({
    async open(uri: string) {
      // The engine may only read its own folder, so put the document there
      // under a fixed name it can fetch by.
      const path = await copyIntoEngineDir(uri);
      return run<{ pages: number; textChars: number }>({ op: 'open', path });
    },
    thumb: (page: number, maxDim: number) => run<string>({ op: 'thumb', page, maxDim }),
    render: (page: number, longEdge: number, quality: number) =>
      run<{ base64: string; wPt: number; hPt: number }>({ op: 'render', page, longEdge, quality }),
    close: () => {
      // Rejecting first matters: a loop parked on thumb() would otherwise be
      // woken by pdf.js failing against the destroyed document and report that
      // as a real error, for something the student deliberately did.
      for (const [, job] of pending) job.reject(new PdfError('cancelled'));
      pending.clear();
      post({ op: 'close' });
      clearEngineDir();
    },
  }), [pending, post, run]);

  const onMessage = useCallback((raw: string) => {
    let msg: EngineMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === 'ready') {
      if (bootTimer.current) { clearTimeout(bootTimer.current); bootTimer.current = null; }
      if (!ready.current.settled) { ready.current.settled = true; ready.current.resolve(); }
      return;
    }
    if (msg.type === 'fatal') { failEngine(); return; }
    reduceEngineMessage(pending, msg);
  }, [pending, failEngine]);

  const host = (
    <View style={styles.hidden} pointerEvents="none">
      {htmlUri ? (
        <WebView
          key={generation}
          ref={webRef}
          source={{ uri: htmlUri }}
          originWhitelist={['file://*']}
          javaScriptEnabled
          // Android: let the page read the sibling runtime and document.
          allowFileAccess
          allowFileAccessFromFileURLs
          // Required for the page's ES module imports to resolve from a file://
          // origin. It is broader than we would like, so the page is pinned to
          // its own URL below and cannot open windows.
          allowUniversalAccessFromFileURLs
          // iOS: the same permission, scoped to the one folder.
          allowingReadAccessToURL={readAccess.current ?? undefined}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          // The engine is a fixed local page. Anything trying to navigate it
          // elsewhere is either a bug or an exfiltration attempt through a
          // malformed PDF, so refuse every other URL.
          onShouldStartLoadWithRequest={(req) =>
            req.url === 'about:blank' || (!!readAccess.current && req.url.startsWith(readAccess.current))}
          onMessage={(e) => onMessage(e.nativeEvent.data)}
          onError={failEngine}
          onRenderProcessGone={failEngine}
          onContentProcessDidTerminate={failEngine}
        />
      ) : null}
    </View>
  );

  return { engine, host };
}

const styles = StyleSheet.create({
  // Off screen rather than zero-sized: a WebView with no layout does not run
  // its content on every Android version.
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -9999, top: -9999 },
});
