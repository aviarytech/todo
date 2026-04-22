#!/usr/bin/env node
// Renders the three source images the @capacitor/assets CLI consumes.
//
// The pipeline is:
//   1. This script writes resources/icon.png, resources/splash.png,
//      resources/splash-dark.png using @napi-rs/canvas + Nunito-Black.
//   2. The `generate:assets` npm script then calls `capacitor-assets generate`
//      which consumes these three files and installs the full iOS + Android
//      size matrix into the native projects.

import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RES = join(ROOT, 'resources');

// Brand tokens (mirror src/pages/Landing.css and index.html theme-color).
const VIOLET = '#6b3cff';
const CREAM = '#fafaf7';
const INK = '#0c0b10';

const fontOk = GlobalFonts.registerFromPath(
  join(RES, 'fonts', 'Nunito-Black.ttf'),
  'Nunito',
);
if (!fontOk) {
  throw new Error('Failed to register Nunito-Black.ttf — check resources/fonts/');
}

function renderIcon() {
  const size = 1024;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  // Violet tile — no gradient, no rounded corners (iOS/Android mask it).
  ctx.fillStyle = VIOLET;
  ctx.fillRect(0, 0, size, size);

  // Cream `b` glyph. Optical-centre nudge up 3% because `b` has an ascender
  // but no descender — geometric centring leaves it looking low.
  ctx.fillStyle = CREAM;
  ctx.font = `900 ${size * 0.68}px Nunito`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('b', size / 2, size / 2 - size * 0.03);

  return c.toBuffer('image/png');
}

function renderSplash({ bg, fg }) {
  const size = 2732;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Violet dot ~18% of the short-edge diameter.
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.09, 0, Math.PI * 2);
  ctx.fill();

  return c.toBuffer('image/png');
}

writeFileSync(join(RES, 'icon.png'), renderIcon());
writeFileSync(join(RES, 'splash.png'), renderSplash({ bg: CREAM, fg: VIOLET }));
writeFileSync(join(RES, 'splash-dark.png'), renderSplash({ bg: INK, fg: VIOLET }));

console.log('✓ Wrote resources/icon.png (1024×1024)');
console.log('✓ Wrote resources/splash.png (2732×2732)');
console.log('✓ Wrote resources/splash-dark.png (2732×2732)');
console.log('Next: run `bun run generate:assets` to install into native projects.');
