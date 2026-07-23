# PDF Maker for the CampusOne app — design

Date: 2026-07-23
Status: approved, ready for implementation planning

## Goal

Port the web app's PDF Maker (shipped in fixit-campus commits `5caf6fd`→`24e4e6d`) into the
CampusOne Expo app. Four client-side tools for assignment submission, students only, no
Supabase, no uploads, no schema changes:

| Tool | What it does | Lossless |
|---|---|---|
| Photos to PDF | photos of handwritten pages → one A4 page each | no (JPEG) |
| Merge | PDFs + photos → one file, in the arranged order | PDF pages yes, photos no |
| Organize | reorder, rotate, delete, extract pages | yes (metadata only) |
| Compress | shrink a scan to fit a 2 MB / 5 MB upload limit | no (raster) |

## The constraint that shapes everything

React Native has no canvas and no PDF page renderer. Assembling a PDF is pure computation
and runs fine in JS; **drawing a PDF page into a picture cannot be done natively**. Two
features need exactly that: the Compress tool (re-encodes every page as a JPEG) and the page
thumbnails in Organize.

The web version has the mirror-image problem — it splits pdf-lib into a worker and keeps
pdf.js on the main thread because pdf.js needs a DOM. Same split, different reason.

## Architecture

```
src/screens/pdfmaker/
  PdfMakerScreen.tsx      landing: four tool cards
  ToolImagesScreen.tsx    photos → PDF
  ToolMergeScreen.tsx     merge
  ToolOrganizeScreen.tsx  reorder / rotate / delete / extract
  ToolCompressScreen.tsx  shrink to a target size
  components.tsx          ThumbCard, FileRow, ProgressPanel, ResultPanel, Notice
src/services/pdf/
  presets.ts        A4, LIMITS, IMAGE_PRESETS, COMPRESS_TARGETS, error codes
  imagesToPdf.ts    ImageManipulator + pdf-lib
  mergePdf.ts       pdf-lib
  organizePdf.ts    pdf-lib
  compressPdf.ts    drives the raster engine, assembles with pdf-lib
  rasterEngine.tsx  hidden WebView + pdf.js bridge
assets/pdfjs/       engine.html, pdf.js, pdf.worker, standard_fonts/
```

Where each job runs:

| Work | Runs | Library |
|---|---|---|
| create / copy pages / embed JPEG / rotate / save | native JS | pdf-lib |
| resize, rotate, re-encode a photo | native | expo-image-manipulator |
| draw a PDF page into a picture | hidden WebView | pdf.js |

New dependencies: `pdf-lib`, `expo-image-manipulator`, `react-native-webview`.

`expo-print` is deliberately **not** used. `printToFileAsync` takes one `width`/`height` for
the whole document, so a landscape photo could not get a landscape page; pdf-lib gives exact
per-page control and is already needed for merge and organize. CoverPage keeps using
expo-print and is untouched.

## Bridge design

The naive approach — pass files to the WebView as base64 — is the main crash risk: a 25 MB
PDF becomes a ~33 MB JavaScript string, copied on both sides.

- **Input never crosses the bridge.** The picked PDF is copied into the app cache directory.
  `engine.html` is loaded from that same directory over `file://`, with read access scoped to
  it (`allowFileAccess` on Android, `allowingReadAccessToURL` on iOS). The engine `fetch()`es
  the file itself.
- **Output crosses in 1 MB chunks**, reassembled natively into a `Uint8Array` and written via
  `new File(...).write(bytes)`.
- Thumbnails are 160 px JPEGs (~8 KB each), so their bridge cost is negligible.
- Documented fallback if `file://` read proves unreliable on a real device: chunked base64
  input, same chunking machinery as the output path.

Engine message contract (each message carries a job `id`):

| → engine | ← engine |
|---|---|
| `{op:'open', id, path}` | `{id, type:'opened', pages, textChars}` |
| `{op:'thumb', id, page, maxDim}` | `{id, type:'thumb', page, base64}` |
| `{op:'render', id, page, longEdge, quality}` | `{id, type:'page', page, base64, wPt, hPt}` |
| `{op:'cancel', id}` | `{id, type:'error', code, detail}` |

`wPt`/`hPt` come from `getViewport({scale:1})`, not the MediaBox, so pages carrying
`/Rotate 90` keep the orientation a reader actually shows.

## Tool behaviour

Rules carried over from the web version verbatim unless noted.

### Photos to PDF (fully native)

Photos arrive from `expo-image-picker` (library or camera). Per photo:
`ImageManipulator.manipulate(uri).resize(longEdge = preset.maxDim).rotate(userRotate)`
→ `renderAsync()` → `saveAsync({format: JPEG, compress: preset.quality, base64: true})`
→ `pdf.embedJpg()` → `addPage([w, h])` → `drawImage` letterboxed inside a 24 pt margin.

- Quality presets: High 2480 px / 0.87, Balanced 1754 px / 0.78, Compact 1240 px / 0.62.
  Default Balanced.
- A photo wider than it is tall gets a **landscape** page, so it is not shrunk into a
  portrait column.
- Reorder, rotate and remove per photo, using arrow buttons (not drag) — the web chose this
  for touch, and it is the right call here too.

### Merge (fully native)

`new File(uri).bytes()` → `PDFDocument.load()` → `copyPages(getPageIndices())`. PDF pages are
copied, so text stays selectable and nothing is re-encoded. Images in the queue take the
Photos-to-PDF path at the Balanced preset.

Failures name the offending file (`detail`), so a ten-file queue reports which one broke.
`ignoreEncryption` is never passed — it "succeeds" and yields broken output.

### Organize

Rebuild is native pdf-lib: `copyPages(order)` plus
`setRotation(degrees((current + delta) % 360))` — metadata only, so the output is lossless and
the file does not grow.

Thumbnails come from the WebView engine, requested one page at a time so tiles appear
progressively instead of freezing until the last page.

The `"1-3,7"` range input is parsed against **original** page numbers, matching each tile's
"Page N" caption, so reordering first does not silently change what a range means. Rejects
`0`, `to < from`, over-max, and anything non-numeric.

### Compress

The only tool that needs the engine end to end. Engine renders page N at
(`longEdge`, `quality`); native pdf-lib embeds the JPEG at the page's original point size, so
pagination is identical.

Iterative walk, up to 3 passes:

1. start at `longEdge = 1754`, `quality` = 0.65 (2 MB target) or 0.75 (5 MB target)
2. stop when `out.bytes <= target.bytes`
3. otherwise `nextQ = max(0.35, min(q, q * (target/out) ** 0.9))`
4. resolution only shrinks (`max(1000, longEdge * sqrt(ratio))`) **after** quality has
   bottomed out — dropping DPI hurts legibility more than JPEG artefacts do
5. keep the smallest pass, not the last

Both honesty guards are ported:

- `sampleTextiness` (5 sampled pages, > 200 chars/page average) ⇒ "this PDF is mostly text"
  warning and a hard gate: the Compress button stays disabled until the student taps
  "I understand — continue".
- If the best result is **not smaller than the input**, it is discarded and reported as
  "already optimized". A compressor that hands back a bigger file is a bug, not a result.
- Missing the target by more than 10% still returns the file, with a warning naming the size
  actually achieved.

## Output

No history, no library screen. Each tool writes its result to `Paths.cache/pdfmaker/` and
immediately opens the system share sheet:

```ts
await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })
```

the same call CoverPage already makes. From the sheet the student saves to Files/Downloads or
sends straight to Drive, Gmail, WhatsApp or Classroom. Cache is the correct location: the file
is transient once shared, and the OS may reclaim it.

Output names follow the web: `<firstFileBaseName>.pdf`, `-merged.pdf`, `-organized.pdf`,
`-compressed.pdf`.

## Limits

Tuned below the web's, because phones have less headroom.

| | web | app |
|---|---|---|
| images | 40 files / 25 MB each | 30 / 25 MB |
| merge | 10 files / 50 MB / 500 pages | 10 / 40 MB / 500 pages |
| organize | 50 MB / 200 pages | 40 MB / 200 pages |
| compress | 50 MB / 150 pages | 25 MB / 100 pages |

Compress is cut hardest — it is the tool moving full-page rasters across the bridge.

## Errors and i18n

Error **codes** port verbatim from the web `ERROR_TEXT` map: `encrypted`, `corrupt`,
`unsupported-image`, `heic`, `too-large`, `too-many-pages`, `already-optimized`,
`cant-hit-target`, `cancelled`, `unknown`. Strings live in `src/i18n/en.ts` and `bn.ts` under a
`pdfmaker` section, per the project's dictionary rule — no literals in screens.

`browser-unsupported` is dropped (there is no user browser to be too old) and replaced by
`engine-failed`, raised when the WebView engine cannot boot. A failed engine fails every job
in flight rather than hanging the UI, matching the web's `worker.onerror` behaviour.

HEIC largely stops being a problem: `expo-image-picker` returns JPEG on iOS. The check and its
message stay for files arriving through `expo-document-picker`.

**Accepted deviation:** PNGs with transparency pass through ImageManipulator's JPEG encoder,
which cannot be forced to composite onto white the way the web's canvas does, so a transparent
area may come out dark. Camera photos — the actual use case — are unaffected. Not worked
around.

## Navigation and theme

- `SectorColors.pdfmaker = '#b12f8c'` added to `src/theme/colors.ts`, same hex as the web.
  No hardcoded colours in screens.
- Entry point: a **tool card** in the Explore tab, students only, alongside CGPA and Campus
  Issues above the sector grid — this app's equivalent of the web's Academics nav group. Plus
  a Home quick-action card.
- Deliberately **not** added to the `SECTORS` grid: `SectorKey` feeds notification preferences
  and `sectorLabel`/`sectorDesc`, and PDF Maker sends no notifications. Adding it there would
  invent a dead notification category.
- Routes `PdfMaker`, `PdfImages`, `PdfMerge`, `PdfOrganize`, `PdfCompress` registered in the
  stack and in `src/types/navigation.ts`, role-gated the way `CoverPageForm` is.

## Cancellation

Native loops check a `cancelRef` between photos/pages. WebView jobs carry an id; cancelling
posts `{op:'cancel', id}` and the engine bails between pages. Either way cancellation lands
within roughly one page of work, and a cancelled job shows no error toast.

## Memory hygiene

The web version's rules apply here too and are easy to lose in a port:

- release each manipulated image result as soon as its bytes are embedded; never hold 30
  decoded photos at once
- destroy the engine's pdf.js document when a tool unmounts or the file is changed
- the WebView engine is mounted lazily on first use and unmounted with the tool
- render/embed one page at a time; never build an array of every page's JPEG before assembling
  when the page count is large

## Risks

1. **pdf-lib under Hermes** — the whole native-assembly half assumes it runs. This is verified
   first, with a throwaway smoke test (create → embedJpg → save → share) before any UI is
   built. If it fails, the fallback is moving assembly into the WebView engine as well: same
   architecture, one more responsibility behind the same bridge.
2. **`file://` read access from the WebView** — behaves differently on Android and iOS.
   Fallback is chunked base64 input.
3. **Low-end device memory on Compress** — mitigated by the 25 MB / 100 page cap, one page in
   flight at a time, and chunked output.

## Out of scope

Uploads, Supabase, sharing generated PDFs into Study Hub, OCR, password removal, digital
signing, annotation, a saved-file library. **Zero database changes** — the web shipped this
feature with none.

## Testing

Jest (`jest-expo` is already configured):

- `parseRanges` — `"1-3,7"`; rejects `0`, `to < from`, over-max, non-numeric
- compress quality walk — converges toward the target, floors at 0.35, only drops resolution
  after quality has bottomed out
- file validation classifier — HEIC vs non-image vs oversize vs over-count, and the exact
  message each produces
- `moveItem` reorder helper — bounds and no-op cases

pdf-lib, ImageManipulator and the WebView engine require a real device run with an installed
signed APK. No "works" claim without that.
