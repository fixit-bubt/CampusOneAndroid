// Regenerate CampusOne app icons and splash from official brand assets.
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
mkdirSync(ASSETS, { recursive: true });

const LOGO_MARK = join(ASSETS, 'logo-mark.png');
const LOGO_FULL = join(ASSETS, 'logo.png');

if (!existsSync(LOGO_MARK) || !existsSync(LOGO_FULL)) {
  console.error('Missing logo-mark.png or logo.png in assets/');
  process.exit(1);
}

// 1. App Icon (1024x1024)
await sharp(LOGO_MARK)
  .resize(960, 953, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 35, bottom: 36, left: 32, right: 32, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(1024, 1024)
  .png()
  .toFile(join(ASSETS, 'icon.png'));
console.log('wrote icon.png');

// 2. Play Store Icons (512x512)
await sharp(LOGO_MARK)
  .resize(480, 476, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 18, bottom: 18, left: 16, right: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(512, 512)
  .png()
  .toFile(join(ASSETS, 'playstore-icon.png'));
console.log('wrote playstore-icon.png');

// 3. Splash Icon (1024x1024)
// Android 12+ circular viewport safe zone: 160dp diameter in a 288dp viewport (55.5%).
// To guarantee the full brand name 'CampusOne' is never clipped (including the 'C' and 'e'),
// the combination logo is scaled to fit safely within the circular mask (ratio 400 / 1024 = ~39.06%).
const trimmedLogo = await sharp(LOGO_FULL).trim().png().toBuffer();
const trimmedMeta = await sharp(trimmedLogo).metadata();
const logoAspect = trimmedMeta.width / trimmedMeta.height;

const splashTargetW = 400;
const splashTargetH = Math.round(splashTargetW / logoAspect);
const splashImg = await sharp(trimmedLogo).resize(splashTargetW, splashTargetH).png().toBuffer();
const splashX = Math.round((1024 - splashTargetW) / 2);
const splashY = Math.round((1024 - splashTargetH) / 2);

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
})
  .composite([{ input: splashImg, left: splashX, top: splashY }])
  .png()
  .toFile(join(ASSETS, 'splash-icon.png'));
console.log('wrote splash-icon.png');

// 4. Android Native Splash Screen Drawables (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
const DENSITIES = [
  { folder: 'drawable-mdpi', canvasSize: 288, targetW: 112 },
  { folder: 'drawable-hdpi', canvasSize: 432, targetW: 169 },
  { folder: 'drawable-xhdpi', canvasSize: 576, targetW: 225 },
  { folder: 'drawable-xxhdpi', canvasSize: 864, targetW: 338 },
  { folder: 'drawable-xxxhdpi', canvasSize: 1152, targetW: 450 },
];

for (const { folder, canvasSize, targetW } of DENSITIES) {
  const dir = join(RES, folder);
  mkdirSync(dir, { recursive: true });
  const targetH = Math.round(targetW / logoAspect);
  const img = await sharp(trimmedLogo).resize(targetW, targetH).png().toBuffer();
  const left = Math.round((canvasSize - targetW) / 2);
  const top = Math.round((canvasSize - targetH) / 2);

  await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: img, left, top }])
    .png()
    .toFile(join(dir, 'splashscreen_logo.png'));
  console.log(`wrote ${folder}/splashscreen_logo.png (${canvasSize}x${canvasSize}, logo ${targetW}x${targetH})`);
}

// 5. Favicon (64x64)
await sharp(LOGO_MARK)
  .resize(64, 64)
  .png()
  .toFile(join(ASSETS, 'favicon.png'));
console.log('wrote favicon.png');

console.log('Official icons and splash assets synchronized successfully!');
