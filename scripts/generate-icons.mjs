/**
 * Icon generation script for VerityFlow PWA.
 * Run: npm run generate-icons
 *
 * Sources: public/logo/verityflow-icon.png (app icon)
 *          public/logo/verityflow-full.png  (wordmark for OG image)
 * Outputs to public/icons/ and public/favicon.ico
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const sharp = require('sharp');
const { default: pngToIco } = require('png-to-ico');
const { writeFileSync } = require('fs');

const OUT    = join(projectRoot, 'public', 'icons');
const PUBLIC = join(projectRoot, 'public');
const LOGO   = join(projectRoot, 'public', 'logo', 'verityflow-icon.png');
const FULL   = join(projectRoot, 'public', 'logo', 'verityflow-full.png');

const BG = '#050912'; // navy-black brand background

mkdirSync(OUT, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compose the brand icon onto a solid background.
 * @param {number} size   - Output square size in px
 * @param {number} scale  - Icon as fraction of canvas (0–1)
 * @param {boolean} rounded - Whether to clip to rounded-rect
 */
async function makeIcon(outputPath, size, scale, rounded) {
  const iconSize = Math.round(size * scale);
  const offset   = Math.round((size - iconSize) / 2);
  const radius   = rounded ? Math.round(size * 0.22) : 0;

  // Resize the source logo to iconSize×iconSize (preserving aspect ratio, then padding)
  const iconBuf = await sharp(LOGO)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let base = sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  });

  if (rounded) {
    // Build an SVG mask for rounded rect
    const svg = `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`;
    base = base.composite([
      { input: Buffer.from(svg), blend: 'dest-in' },
    ]);
    // Re-composite onto solid bg so non-mask area is BG, not transparent
    const maskedBg = await sharp({
      create: { width: size, height: size, channels: 4, background: BG },
    })
      .composite([
        { input: Buffer.from(svg), blend: 'dest-in' },
      ])
      .png()
      .toBuffer();

    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 5, g: 9, b: 18, alpha: 1 } } })
      .composite([
        { input: maskedBg, blend: 'over' },
        { input: iconBuf, left: offset, top: offset, blend: 'over' },
      ])
      .png()
      .toFile(outputPath);
  } else {
    await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
      .composite([
        { input: iconBuf, left: offset, top: offset, blend: 'over' },
      ])
      .png()
      .toFile(outputPath);
  }

  console.log(`  ✓ ${outputPath.replace(projectRoot, '.')}`);
}

/**
 * OG image: 1200×630, full logo centered on navy background.
 */
async function makeOgImage(outputPath) {
  const w = 1200, h = 630;
  const logoH = 220;
  const logoW = Math.round(logoH * (32693 / 21000)); // approximate aspect from file; let sharp compute

  const fullLogoBuf = await sharp(FULL)
    .resize({ height: logoH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Get actual resized dimensions
  const meta = await sharp(fullLogoBuf).metadata();
  const left = Math.round((w - meta.width) / 2);
  const top  = Math.round((h - meta.height) / 2);

  await sharp({ create: { width: w, height: h, channels: 3, background: '#050912' } })
    .composite([
      { input: fullLogoBuf, left, top, blend: 'over' },
    ])
    .png()
    .toFile(outputPath);

  console.log(`  ✓ ${outputPath.replace(projectRoot, '.')}`);
}

// ── Shortcut SVGs (mic + receipt) — strokes recolored to brand blue ───────────

function micSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" fill="#050912"/>
  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" stroke="#1E90FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#1E90FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="12" y1="19" x2="12" y2="22" stroke="#1E90FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="8" y1="22" x2="16" y2="22" stroke="#1E90FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function receiptSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" fill="#050912"/>
  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" stroke="#1E90FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="8" y1="9" x2="16" y2="9" stroke="#1E90FF" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="13" x2="16" y2="13" stroke="#1E90FF" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="17" x2="12" y2="17" stroke="#1E90FF" stroke-width="2" stroke-linecap="round"/>
</svg>`;
}

async function svgToPng(svgString, outputPath, width, height) {
  const buf = Buffer.from(svgString, 'utf8');
  await sharp(buf)
    .resize(width, height ?? width)
    .png()
    .toFile(outputPath);
  console.log(`  ✓ ${outputPath.replace(projectRoot, '.')}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Generating VerityFlow icons…\n');

  // Standard PWA icons (rounded rect, logo at 60% of canvas)
  await makeIcon(join(OUT, 'icon-192.png'),          192, 0.60, true);
  await makeIcon(join(OUT, 'icon-512.png'),          512, 0.60, true);

  // Maskable icons (full-bleed, logo at 50% for safe-zone compliance)
  await makeIcon(join(OUT, 'icon-maskable-192.png'), 192, 0.50, false);
  await makeIcon(join(OUT, 'icon-maskable-512.png'), 512, 0.50, false);

  // Apple touch icon (180 px, iOS clips to circle automatically)
  await makeIcon(join(OUT, 'apple-touch-icon.png'),  180, 0.60, false);

  // Favicons
  await makeIcon(join(OUT, 'favicon-16.png'),  16, 0.75, false);
  await makeIcon(join(OUT, 'favicon-32.png'),  32, 0.75, false);

  // favicon.ico from 32px PNG
  const fav32 = await sharp(LOGO)
    .resize(24, 24, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const favicon32 = await sharp({ create: { width: 32, height: 32, channels: 4, background: BG } })
    .composite([{ input: fav32, left: 4, top: 4, blend: 'over' }])
    .png()
    .toBuffer();
  const icoBuffer = await pngToIco([favicon32]);
  writeFileSync(join(PUBLIC, 'favicon.ico'), icoBuffer);
  console.log('  ✓ ./public/favicon.ico');

  // Shortcut icons
  await svgToPng(micSvg(96),     join(OUT, 'shortcut-mic.png'),     96);
  await svgToPng(receiptSvg(96), join(OUT, 'shortcut-receipt.png'), 96);

  // OG image (1200×630)
  await makeOgImage(join(PUBLIC, 'og-image.png'));

  console.log('\nDone! All icons generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
