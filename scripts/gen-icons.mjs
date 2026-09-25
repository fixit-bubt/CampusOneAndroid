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
await sharp(LOGO_FULL)
  .resize(780, 670, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 177, bottom: 177, left: 122, right: 122, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(1024, 1024)
  .png()
  .toFile(join(ASSETS, 'splash-icon.png'));
console.log('wrote splash-icon.png');

// 4. Favicon (64x64)
await sharp(LOGO_MARK)
  .resize(64, 64)
  .png()
  .toFile(join(ASSETS, 'favicon.png'));
console.log('wrote favicon.png');

console.log('Official icons synchronized successfully!');
