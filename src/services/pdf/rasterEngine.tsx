// The raster engine: a hidden WebView running pdf.js, used only for the one
// job React Native cannot do, which is drawing a PDF page into a picture.
//
// Input never crosses the bridge. The document is copied into engineDir() and
// the page, loaded from that same folder over file://, fetches it itself. What
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

export interface EngineHandle {
  open(uri: string, name: string): Promise<{ pages: number; textChars: number }>;
  thumb(page: number, maxDim: number): Promise<string>;
  render(page: number, longEdge: number, quality: number): Promise<{ base64: string; wPt: number; hPt: number }>;
  cancel(): void;
  close(): void;
}

// Copy the vendored runtime and write the page beside it. The runtime ships
// with a .txt suffix (see scripts/vendor-pdfjs.mjs) and gets its real name
// back here, which is what the page's import specifiers expect.
async function prepareEngineFolder(): Promise<string> {
  const dir = engineDir();
  const runtime = [
    { mod: require('../../../assets/pdfjs/pdf.min.mjs.txt'), name: 'pdf.min.mjs' },
    { mod: require('../../../assets/pdfjs/pdf.worker.min.mjs.txt'), name: 'pdf.worker.min.mjs' },
  ];
  for (const r of runtime) {
    const dest = new File(dir, r.name);
    if (dest.exists) continue;
    const asset = Asset.fromModule(r.mod);
    await asset.downloadAsync();
    if (!asset.localUri) throw new PdfError('engine-failed');
    new File(asset.localUri).copy(dest);
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
  const currentId = useRef(0);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);

  // Resolved by the page's own "ready" message. Every job waits on it, so a
  // request cannot be injected before the module script has run.
  const ready = useRef<{ promise: Promise<void>; resolve: () => void; reject: (e: any) => void }>(null as any);
  if (!ready.current) {
    let res!: () => void;
    let rej!: (e: any) => void;
    const promise = new Promise<void>((a, b) => { res = a; rej = b; });
    ready.current = { promise, resolve: res, reject: rej };
  }

  useEffect(() => {
    let alive = true;
    prepareEngineFolder()
      .then((uri) => { if (alive) setHtmlUri(uri); })
      .catch(() => ready.current.reject(new PdfError('engine-failed')));
    return () => {
      alive = false;
      for (const [, job] of pending) job.reject(new PdfError('cancelled'));
      pending.clear();
      clearEngineDir();
    };
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
    currentId.current = id;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      post({ ...payload, id });
    });
  }, [pending, post]);

  const engine: EngineHandle = useMemo(() => ({
    async open(uri: string, name: string) {
      // The engine may only read its own folder, so put the document there.
      const path = await copyIntoEngineDir(uri, name);
      return run<{ pages: number; textChars: number }>({ op: 'open', path });
    },
    thumb: (page: number, maxDim: number) => run<string>({ op: 'thumb', page, maxDim }),
    render: (page: number, longEdge: number, quality: number) =>
      run<{ base64: string; wPt: number; hPt: number }>({ op: 'render', page, longEdge, quality }),
    cancel: () => post({ op: 'cancel', targetId: currentId.current }),
    close: () => { post({ op: 'close' }); clearEngineDir(); },
  }), [post, run]);

  const onMessage = useCallback((raw: string) => {
    let msg: EngineMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === 'ready') { ready.current.resolve(); return; }
    reduceEngineMessage(pending, msg);
  }, [pending]);

  const host = (
    <View style={styles.hidden} pointerEvents="none">
      {htmlUri ? (
        <WebView
          ref={webRef}
          source={{ uri: htmlUri }}
          originWhitelist={['*']}
          javaScriptEnabled
          // Android: let the page read the sibling runtime and document.
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          // iOS: the same permission, scoped to the one folder.
          allowingReadAccessToURL={engineDir().uri}
          onMessage={(e) => onMessage(e.nativeEvent.data)}
          onError={() => reduceEngineMessage(pending, { id: 0, type: 'fatal' })}
          onRenderProcessGone={() => reduceEngineMessage(pending, { id: 0, type: 'fatal' })}
          onContentProcessDidTerminate={() => reduceEngineMessage(pending, { id: 0, type: 'fatal' })}
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
