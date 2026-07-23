# Vendored pdf.js runtime

These two files are the pdf.js build that the PDF Maker's hidden WebView runs.
They are copied out of `node_modules/pdfjs-dist/build` by `npm run vendor:pdfjs`
and committed, so the app ships a known, reviewable version rather than whatever
a fresh install resolves to.

Refresh after bumping `pdfjs-dist`:

```
npm run vendor:pdfjs
```

## Why the `.txt` suffix

Expo's Metro config already lists `mjs` under `sourceExts`, and an extension
cannot be both a source and an asset. The files therefore ship as `.txt`
(registered as an asset in `metro.config.js`) and get their real names back when
`prepareEngineFolder()` copies them into the engine's cache folder, which is
what the engine page's `import './pdf.min.mjs'` expects.

## What is deliberately missing

`standard_fonts/` and `cmaps/` are **not** vendored.

`standard_fonts/` matters only for PDFs that reference but do not embed the 14
standard fonts, which is exactly the text-heavy case the Compress tool already
gates behind an explicit warning. Scans, the real use case, carry no fonts at
all. The engine runs with `useSystemFonts: true` so the WebView substitutes its
own fonts instead.

`cmaps/` covers CJK and other encoded text, which this campus does not use.

If device testing ever shows blank or missing text on a Word or Google Docs
export, the fix is to vendor `standard_fonts/` the same way and point
`standardFontDataUrl` at the engine folder in `src/services/pdf/engineHtml.ts`.
