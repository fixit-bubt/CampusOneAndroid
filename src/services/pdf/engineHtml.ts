// The engine page. Written into engineDir() at startup next to the vendored
// pdf.js files, then loaded over file:// so it can fetch the document the
// native side dropped beside it. Nothing crosses the bridge on the way in.
import { TEXT_SAMPLE_PAGES } from './presets';

export function buildEngineHtml(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- The page parses untrusted PDFs, and Android needs
     allowUniversalAccessFromFileURLs for its module imports, which removes the
     same-origin barrier. Refusing navigation is not enough on its own: an image
     src, a beacon or an XHR would still reach the network without ever being a
     navigation. This policy is enforced by the engine itself, so it holds
     whatever the file-origin flags say. -->
<!-- The file: scheme is listed explicitly beside 'self': a file:// document can be an
     opaque origin, in which case 'self' matches nothing and the engine's own
     module and worker would be blocked. No http, https or wss source appears
     anywhere, which is what closes the exfiltration routes. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' file: 'unsafe-inline' blob:; worker-src 'self' file: blob:; child-src 'self' file: blob:; img-src 'self' file: data: blob:; style-src 'unsafe-inline'; connect-src 'self' file: data: blob:; form-action 'none'; base-uri 'none'">
<style>html,body{margin:0;background:#fff}</style>
</head><body>
<script type="module">
import * as pdfjs from './pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';

var doc = null;

function send(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
function fail(id, code, detail) { send({ id: id, type: 'error', code: code, detail: detail }); }

// Read a local file as bytes. XHR rather than fetch: the Fetch API rejects the
// file: scheme outright, while allowFileAccessFromFileURLs exists precisely to
// let XHR read a sibling file.
function readLocal(path) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', path, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {
      if (xhr.response) resolve(xhr.response);
      else reject(new Error('empty'));
    };
    xhr.onerror = function () { reject(new Error('read failed')); };
    xhr.send();
  });
}

// Render one page to a JPEG. The page is flattened onto white first: PDF
// pages are transparent and JPEG has no alpha channel.
async function toJpeg(page, scale, quality) {
  var viewport = page.getViewport({ scale: scale });
  var canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  var ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: viewport }).promise;
  var url = canvas.toDataURL('image/jpeg', quality);
  canvas.width = 0; canvas.height = 0;
  return url.slice(url.indexOf(',') + 1);
}

async function handle(msg) {
  var id = msg.id;
  var op = msg.op;
  try {
    if (op === 'close') { if (doc) { await doc.destroy(); doc = null; } return; }

    if (op === 'open') {
      if (doc) { await doc.destroy(); doc = null; }
      var buf = await readLocal(msg.path);
      try {
        doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
      } catch (e) {
        return fail(id, String(e && e.name) === 'PasswordException' ? 'encrypted' : 'corrupt');
      }
      // Average characters of real text per page, sampled across the file.
      // Drives the "mostly text" warning: rasterising a text page costs far
      // more bytes than the vector text it replaces.
      var sample = Math.min(${TEXT_SAMPLE_PAGES}, doc.numPages);
      var step = Math.max(1, Math.floor(doc.numPages / sample));
      var chars = 0, seen = 0;
      for (var n = 1; n <= doc.numPages && seen < sample; n += step) {
        var p = await doc.getPage(n);
        var c = await p.getTextContent();
        for (var i = 0; i < c.items.length; i++) {
          chars += c.items[i].str ? c.items[i].str.length : 0;
        }
        p.cleanup(); seen++;
      }
      return send({ id: id, type: 'opened', pages: doc.numPages, textChars: seen ? chars / seen : 0 });
    }

    if (!doc) return fail(id, 'unknown');

    var page = await doc.getPage(msg.page);
    try {
      // Size in POINTS comes from the unscaled viewport, not the MediaBox, so
      // a page carrying /Rotate 90 keeps the orientation a reader shows.
      var base = page.getViewport({ scale: 1 });
      var longest = Math.max(base.width, base.height);

      if (op === 'thumb') {
        var thumb = await toJpeg(page, Math.max(msg.maxDim / longest, 0.05), 0.6);
        return send({ id: id, type: 'thumb', page: msg.page, base64: thumb });
      }
      if (op === 'render') {
        var scale = Math.min(Math.max(msg.longEdge / longest, 0.1), 3);
        var raster = await toJpeg(page, scale, msg.quality);
        return send({ id: id, type: 'page', page: msg.page, base64: raster, wPt: base.width, hPt: base.height });
      }
      return fail(id, 'unknown');
    } finally {
      page.cleanup();
    }
  } catch (e) {
    fail(id, 'unknown', String(e && e.message));
  }
}

window.__pdfEngine = function (json) { handle(JSON.parse(json)); };
if (window.__pdfEngineBooted) window.__pdfEngineBooted();
send({ id: 0, type: 'ready' });
</script>
<script>
// Classic script, so it still runs if the module above fails to load at all.
// Without this a broken runtime is silent and the native side waits forever.
var booted = false;
function reportFatal() {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ id: 0, type: 'fatal' }));
  }
}
// Capture phase, because a script that fails to FETCH dispatches a
// non-bubbling error event at the element itself, which never reaches
// window.onerror. That is the exact failure this exists to catch: the runtime
// not being there.
window.addEventListener('error', reportFatal, true);
window.onerror = reportFatal;
// A rejection that escapes is only fatal before the page has announced itself.
// Afterwards it is far more likely to be pdf.js tidying up a destroyed
// document, and killing a working engine over that is worse than ignoring it.
window.addEventListener('unhandledrejection', function () {
  if (!booted) reportFatal();
});
window.__pdfEngineBooted = function () { booted = true; };
</script>
</body></html>`;
}
