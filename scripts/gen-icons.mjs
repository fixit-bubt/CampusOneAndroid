// One-off: rasterize the CampusOne grad-cap logo into app-icon / splash PNGs.
// Run: node scripts/gen-icons.mjs   (requires dev dep `sharp`)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
mkdirSync(ASSETS, { recursive: true });

const BRAND = '#2b5be3';
const BRAND_DK = '#2147b1';
const BG_LIGHT = '#E6F4FE';

// Graduation-cap glyph on a 100x100 grid, given a fill color.
const cap = (fill) => `
  <g fill="${fill}">
    <polygon points="50,30 86,44 50,58 14,44" />
    <path d="M34,50 L34,61 C34,69 66,69 66,61 L66,50 L50,57 Z" />
    <path d="M82,45 L82,66" stroke="${fill}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="82" cy="69" r="3.4" />
  </g>`;

// Full square: gradient background + white cap, with corner rounding baked for non-masked targets.
const squareSvg = (size, { round = false } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND}"/>
      <stop offset="1" stop-color="${BRAND_DK}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" ${round ? 'rx="22" ry="22"' : ''} fill="url(#g)"/>
  ${cap('#ffffff')}
</svg>`;

// Cap only on transparent bg (android adaptive foreground / splash logo). Cap scaled into safe zone.
const capOnlySvg = (size, { scale = 0.56, color = '#ffffff' } = {}) => {
  const s = 100 * scale;
  const off = (100 - s) / 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <g transform="translate(${off},${off}) scale(${scale})">${cap(color)}</g>
</svg>`;
};

const solidSvg = (size, color) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${color}"/></svg>`;

async function png(svg, out, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(ASSETS, out));
  console.log('wrote', out, size);
}

await png(squareSvg(1024, { round: true }), 'icon.png', 1024);
await png(squareSvg(1024, { round: true }), 'splash-icon.png', 1024);
await png(squareSvg(64), 'favicon.png', 64);
await png(capOnlySvg(1024, { scale: 0.46 }), 'android-icon-foreground.png', 1024);
// background = brand gradient square (no cap, no rounding — system masks the shape)
await png(squareSvg(1024).replace(cap('#ffffff'), ''), 'android-icon-background.png', 1024);
await png(capOnlySvg(1024, { scale: 0.46, color: '#000000' }), 'android-icon-monochrome.png', 1024);

console.log('done');
