// Copies the pdf.js runtime into assets/pdfjs so the WebView engine has a
// stable, reviewable copy. Re-run after bumping pdfjs-dist.
//
// The .txt suffix is deliberate. Expo's Metro config already lists `mjs` under
// sourceExts, and an extension cannot be both a source and an asset, so the
// files ship as .txt (registered as an asset in metro.config.js) and get their
// real names back when the engine folder is prepared on device.
import { copyFileSync, mkdirSync } from 'node:fs';

const SRC = 'node_modules/pdfjs-dist/build';
const DEST = 'assets/pdfjs';
mkdirSync(DEST, { recursive: true });
for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  copyFileSync(`${SRC}/${f}`, `${DEST}/${f}.txt`);
  console.log(`copied ${f} as ${f}.txt`);
}
