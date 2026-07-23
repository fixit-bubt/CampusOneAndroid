# PDF Maker

Four on-device PDF tools for assignment submission, students only. Ported from
the web app (fixit-campus `5caf6fd`..`24e4e6d`). No Supabase, no uploads, no
database changes.

| Tool | Route | Lossless |
|---|---|---|
| Photos to PDF | `PdfImages` | no, photos are re-encoded as JPEG |
| Merge | `PdfMerge` | PDF pages yes, photos no |
| Organize pages | `PdfOrganize` | yes, metadata only |
| Compress | `PdfCompress` | no, every page is rasterised |

Entry points: a students-only card in Explore and one on the student Home, both
going to `PdfMaker`.

## Why there is a WebView in here

React Native has no canvas and no PDF page renderer. Building a PDF is pure
computation and runs natively; **drawing an existing PDF page into a picture
cannot be done natively at all**. Two things need exactly that: the Compress
tool, which re-encodes every page, and the page thumbnails in Organize.

So the work is split:

| Work | Runs | Library |
|---|---|---|
| create / copy pages / embed JPEG / rotate / save | native JS | pdf-lib |
| resize, rotate, re-encode a photo | native | expo-image-manipulator |
| draw a PDF page into a picture | hidden WebView | pdf.js |

The WebView is offscreen (1x1, `left: -9999`) and mounted only by the two tools
that need it. It is positioned rather than zero-sized because a WebView with no
layout does not run its content on every Android version.

## How files move

- **Into the engine: never over the bridge.** Passing a 25 MB PDF as base64
  would mean a ~33 MB JavaScript string copied on both sides. Instead the file
  is copied into `Paths.cache/pdfengine/` under the fixed name `source.pdf`,
  and the engine page, loaded from that same folder over `file://`, reads it
  with `XMLHttpRequest` (the Fetch API refuses the `file:` scheme).
- **The copied name is fixed on purpose.** Deriving it from the student's
  filename let a PDF called `pdf.min.mjs` overwrite the vendored pdf.js
  runtime, which `clearEngineDir()` preserves and `prepareEngineFolder()`
  would not restore, so the tool stayed broken and the engine would import
  student-supplied bytes as a module. `clearEngineDir()` now keeps an
  allowlist (`ENGINE_RUNTIME`) rather than keeping by file extension.
- **Out of the engine: one page JPEG at a time.** A thumbnail is a few KB; a
  full page raster is a few hundred KB. Thumbnails are written straight to
  `Paths.cache/pdfthumbs/` and shown by file URI: 200 data URIs would pin 200
  base64 strings plus 200 decoded bitmaps that RN's image cache never evicts.
- **The finished PDF never crosses the bridge at all.** pdf-lib assembles it
  natively and `File.write()` puts it on disk. The design doc anticipated
  chunking the output; it turned out unnecessary, because only individual page
  images ever travel.
- **Out of the app:** `Sharing.shareAsync`, the same call CoverPage makes. No
  history is kept, so results live in `Paths.cache/pdfmaker/` and the OS may
  reclaim them.

If `file://` reads ever fail on a device, the fallback is chunked base64 input;
it changes `EngineHandle.open()` and the engine's `readLocal()` call, nothing
else.

### WebView permissions, stated honestly

iOS is tightly scoped by `allowingReadAccessToURL`. Android is not: the page
needs `allowUniversalAccessFromFileURLs` for its ES module imports to resolve
from a `file://` origin, and that flag removes the same-origin barrier for the
whole page. Since that page parses untrusted student PDFs through pdf.js, the
mitigation that actually carries the weight is the `Content-Security-Policy`
meta in `buildEngineHtml()`: `default-src 'none'` with only `'self'`, `data:`
and `blob:` allowed for scripts, workers, images and connections. The WebView
enforces that regardless of the file-origin flags, so an `img.src`, a
`sendBeacon` or an XHR to an outside host is refused.

`onShouldStartLoadWithRequest` only sees **navigations**, not subresource
requests, so on its own it would have been close to decorative. It stays, along
with `originWhitelist: ['file://*']` and both window-opening props off, but the
CSP is the actual boundary.

Two follow-ups, both needing a device: inline pdf.js as a classic script so
`allowUniversalAccessFromFileURLs` can be dropped altogether, and confirm CSP
`'self'` resolves as expected on a `file://` origin in both engines.

### Nothing waits forever

Every request is bounded (`JOB_TIMEOUT_MS`), the page has a boot deadline
(`BOOT_TIMEOUT_MS`), the page reports its own script failures through
`window.onerror`, and any fatal rejects every in-flight job with
`engine-failed` and remounts the WebView so the next attempt gets a live page.
`engine.close()` rejects pending jobs with `cancelled` first, so a tool that
navigates away mid-loop does not surface pdf.js's teardown error as a real
failure.

## Layout

```
src/services/pdf/
  presets.ts        limits, quality presets, error codes, PdfError
  pdfUtils.ts       pure rules: ranges, reorder, compress walk, A4 fitting
  pdfFiles.ts       cache folders, save, share, engine folder hygiene
  imagesToPdf.ts    photos to PDF
  mergePdf.ts       merge
  organizePdf.ts    reorder, rotate, delete, extract
  compressPdf.ts    the pass loop, driving the engine
  engineProtocol.ts request and response bookkeeping (pure, tested)
  engineHtml.ts     the engine page, generated as a string
  rasterEngine.tsx  the WebView host and EngineHandle
  smokeTest.ts      dev-only pdf-lib check
src/screens/pdfmaker/
  PdfMakerScreen.tsx, ToolImagesScreen.tsx, ToolMergeScreen.tsx,
  ToolOrganizeScreen.tsx, ToolCompressScreen.tsx, components.tsx
assets/pdfjs/       vendored pdf.js runtime, see its README
```

## Rules worth not breaking

- **Compress is honest or it is nothing.** A PDF whose sampled pages average
  more than 200 characters of text is flagged and the Compress button stays
  disabled until the student acknowledges it, and any result that is not
  actually smaller than the input is discarded with "already optimized". A
  compressor that returns a bigger file is a bug, not a result.
- **Page sizes come from the viewport, not the MediaBox**, so a page carrying
  `/Rotate 90` keeps the orientation a reader shows.
- **Organize is metadata only.** `copyPages` plus `setRotation`. Never
  re-encode there; the whole point is that text stays selectable.
- **The range box reads original page numbers**, matching each tile's caption,
  so reordering first does not silently change what `1-3,7` means.
- **One page or photo in flight at a time.** Never build an array of every
  page's JPEG before assembling.
- **Never pass `ignoreEncryption`** to pdf-lib. It "succeeds" and then writes
  broken output.

## Limits

Deliberately below the web's, because phones have less headroom.

| | web | app |
|---|---|---|
| images | 40 files / 25 MB | 30 / 25 MB |
| merge | 10 / 50 MB / 500 pages | 10 / 40 MB / 500 pages |
| organize | 50 MB / 200 pages | 40 MB / 200 pages |
| compress | 50 MB / 150 pages | 25 MB / 100 pages |

Compress is cut hardest: it is the tool moving full page rasters.

## Accepted deviations from the web version

- **No standard font data is vendored.** See `assets/pdfjs/README.md`. It
  matters only for text-heavy PDFs, which Compress already gates behind a
  warning.
- **PNG transparency may darken.** The web flattens onto white on a canvas
  before encoding; expo-image-manipulator's JPEG encoder cannot be told to do
  that. Camera photos, the real use case, are unaffected.
- **Quality is preset-only in Compress.** The web also offers a custom quality
  slider; the app ships the two size targets.
- **HEIC is mostly a non-issue.** expo-image-picker returns JPEG on iOS. The
  check and its message remain for files arriving through the document picker.

## Testing

`npm test` covers the pure halves: range parsing, reorder, the compress quality
and resolution walk, filename sanitising, page fitting, the engine's message
routing, and each tool's orchestration against mocked pdf-lib and
expo-image-manipulator.

pdf-lib under Hermes, expo-image-manipulator and the WebView engine need a real
device. The landing screen carries a `__DEV__` only row that runs
`smokeTestPdfLib()` and reports the byte count, which is the fastest way to tell
whether a dependency bump broke native assembly.
