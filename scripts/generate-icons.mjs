/**
 * Icon generation script for TradesBrain PWA.
 * Run: npm run generate-icons
 *
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

const OUT = join(projectRoot, 'public', 'icons');
const PUBLIC = join(projectRoot, 'public');
mkdirSync(OUT, { recursive: true });

// ── Diamond logo SVG (1024×1024 base) ────────────────────────────────────────
// Standard variant: rounded-rect background + diamond at 60% scale
function diamondSvg(size, scale = 0.6, rounded = true) {
  const half = size / 2;
  const d = (size * scale) / 2; // half-diagonal

  // Diamond path centered at (half, half) with half-diagonal d
  const diamond = `M${half},${half - d} L${half + d},${half} L${half},${half + d} L${half - d},${half} Z`;

  const rounding = rounded ? `rx="${Math.round(size * 0.12)}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4AF64"/>
      <stop offset="100%" stop-color="#C49A45"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#07070C" ${rounding}/>
  <path d="${diamond}" fill="url(#amberGrad)"/>
</svg>`;
}

// ── OG image SVG (1200×630) ───────────────────────────────────────────────────
function ogImageSvg() {
  const w = 1200, h = 630;
  const cx = w / 2, cy = h / 2 - 40;
  const d = 120;
  const diamond = `M${cx},${cy - d} L${cx + d},${cy} L${cx},${cy + d} L${cx - d},${cy} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4AF64"/>
      <stop offset="100%" stop-color="#C49A45"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#07070C"/>
  <path d="${diamond}" fill="url(#amberGrad)"/>
  <text
    x="${cx}" y="${cy + d + 56}"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="64"
    font-weight="700"
    letter-spacing="2"
    fill="#F8F8F8"
  >TradesBrain</text>
  <text
    x="${cx}" y="${cy + d + 110}"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="28"
    fill="#888"
  >AI job memory and instant invoices for tradespeople.</text>
</svg>`;
}

// ── Lucide Mic shortcut SVG ────────────────────────────────────────────────────
function micSvg(size) {
  const s = size;
  // Lucide Mic path scaled to fit in a 24-unit viewport, then transformed
  const scale = s / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" fill="#07070C"/>
  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" stroke="#D4AF64" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#D4AF64" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="12" y1="19" x2="12" y2="22" stroke="#D4AF64" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="8" y1="22" x2="16" y2="22" stroke="#D4AF64" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// ── Lucide Receipt shortcut SVG ────────────────────────────────────────────────
function receiptSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" fill="#07070C"/>
  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" stroke="#D4AF64" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="8" y1="9" x2="16" y2="9" stroke="#D4AF64" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="13" x2="16" y2="13" stroke="#D4AF64" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="17" x2="12" y2="17" stroke="#D4AF64" stroke-width="2" stroke-linecap="round"/>
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

async function main() {
  console.log('Generating TradesBrain icons…\n');

  // Standard icons (rounded rect background, diamond at 60%)
  await svgToPng(diamondSvg(1024, 0.6, true), join(OUT, 'icon-192.png'), 192);
  await svgToPng(diamondSvg(1024, 0.6, true), join(OUT, 'icon-512.png'), 512);

  // Maskable icons (full-bleed, diamond at 70% safe zone)
  await svgToPng(diamondSvg(1024, 0.5, false), join(OUT, 'icon-maskable-192.png'), 192);
  await svgToPng(diamondSvg(1024, 0.5, false), join(OUT, 'icon-maskable-512.png'), 512);

  // Apple touch icon (180×180, no rounding — iOS clips automatically)
  await svgToPng(diamondSvg(1024, 0.6, false), join(OUT, 'apple-touch-icon.png'), 180);

  // Favicons
  await svgToPng(diamondSvg(64, 0.6, false), join(OUT, 'favicon-16.png'), 16);
  await svgToPng(diamondSvg(64, 0.6, false), join(OUT, 'favicon-32.png'), 32);

  // Favicon.ico from 32px PNG
  const favicon32 = await sharp(Buffer.from(diamondSvg(64, 0.6, false), 'utf8'))
    .resize(32)
    .png()
    .toBuffer();
  const icoBuffer = await pngToIco([favicon32]);
  writeFileSync(join(PUBLIC, 'favicon.ico'), icoBuffer);
  console.log(`  ✓ ./public/favicon.ico`);

  // Shortcut icons
  await svgToPng(micSvg(96), join(OUT, 'shortcut-mic.png'), 96);
  await svgToPng(receiptSvg(96), join(OUT, 'shortcut-receipt.png'), 96);

  // OG image (1200×630)
  await svgToPng(ogImageSvg(), join(PUBLIC, 'og-image.png'), 1200, 630);

  console.log('\nDone! All icons generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
