#!/usr/bin/env node
// Renders every brand icon the app ships with.
//
// The pipeline is:
//   1. This script writes:
//      - resources/icon.png + resources/splash{,-dark}.png — sources for the
//        @capacitor/assets CLI to install into the iOS + Android projects.
//      - public/icons/icon-{72..512}.png — the PWA manifest icons used by the
//        web install prompt and "Add to Home Screen".
//   2. `bun run generate:assets` then runs `capacitor-assets generate` to push
//      the resources/* sources through into ios/ and android/.

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RES = join(ROOT, 'resources');
const PWA_ICONS = join(ROOT, 'public', 'icons');

// PWA manifest icon sizes — keep in sync with public/manifest.json.
const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Brand tokens (mirror src/pages/Landing.css and index.html theme-color).
const VIOLET = '#6b3cff';
const CREAM = '#fafaf7';
const INK = '#0c0b10';

// The mark: a filled dot with a soft ripple ring, proportions locked to the
// identity pack — dot r = 0.218·s, ring r = 0.373·s, stroke = max(1.5, 0.0136·s).
function drawMark(ctx, cx, cy, s, { dotColor, ringColor, ringOpacity = 0.25 }) {
  const dotR = s * 0.218;
  const ringR = s * 0.373;
  const strokeW = Math.max(1.5, s * 0.0136);

  ctx.save();
  ctx.globalAlpha = ringOpacity;
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = strokeW;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
  ctx.fill();
}

function renderIcon() {
  const size = 1024;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  // Violet tile — no gradient, no rounded corners (iOS/Android mask it).
  ctx.fillStyle = VIOLET;
  ctx.fillRect(0, 0, size, size);

  // Cream dot + ripple — the "iOS rounded" artboard from the identity pack.
  // Ring opacity bumps to 0.4 so the cream stroke holds against violet.
  drawMark(ctx, size / 2, size / 2, size, {
    dotColor: CREAM,
    ringColor: CREAM,
    ringOpacity: 0.4,
  });

  return c.toBuffer('image/png');
}

function renderSplash({ bg, fg }) {
  const size = 2732;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Dot ~18% diameter (r ≈ 0.09·size) — keep that by sizing the mark so its
  // dot resolves to the same radius: markSize = (0.09 / 0.218)·size.
  drawMark(ctx, size / 2, size / 2, size * 0.413, {
    dotColor: fg,
    ringColor: fg,
    ringOpacity: 0.25,
  });

  return c.toBuffer('image/png');
}

// PWA manifest icon — same treatment as the native app icon, sized per manifest.
function renderPwaIcon(size) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = VIOLET;
  ctx.fillRect(0, 0, size, size);

  drawMark(ctx, size / 2, size / 2, size, {
    dotColor: CREAM,
    ringColor: CREAM,
    ringOpacity: 0.4,
  });

  return c.toBuffer('image/png');
}

writeFileSync(join(RES, 'icon.png'), renderIcon());
writeFileSync(join(RES, 'splash.png'), renderSplash({ bg: CREAM, fg: VIOLET }));
writeFileSync(join(RES, 'splash-dark.png'), renderSplash({ bg: INK, fg: VIOLET }));

console.log('✓ Wrote resources/icon.png (1024×1024)');
console.log('✓ Wrote resources/splash.png (2732×2732)');
console.log('✓ Wrote resources/splash-dark.png (2732×2732)');

for (const size of PWA_SIZES) {
  writeFileSync(join(PWA_ICONS, `icon-${size}.png`), renderPwaIcon(size));
  console.log(`✓ Wrote public/icons/icon-${size}.png (${size}×${size})`);
}

console.log('Next: run `bun run generate:assets` to install into native projects.');
