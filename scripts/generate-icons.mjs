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
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RES = join(ROOT, 'resources');
const PWA_ICONS = join(ROOT, 'public', 'icons');
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

// PWA manifest icon sizes — keep in sync with public/manifest.json.
const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Brand tokens (mirror src/pages/Landing.css and index.html theme-color).
const VIOLET = '#6b3cff';
const CREAM = '#fafaf7';
const INK = '#0c0b10';
const ANDROID_DENSITIES = [
  ['ldpi', 36, 81],
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

// The completed-item mark: a filled dot with a soft ripple ring, proportions
// matched to the app-icon reference art.
function drawMark(ctx, cx, cy, s, { dotColor, ringColor, ringOpacity = 0.25 }) {
  const dotR = s * 0.23;
  const ringR = s * 0.392;
  const strokeW = Math.max(1.5, s * 0.014);

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

  // Cream tile — no rounded corners (iOS/Android mask it).
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, size, size);

  // Violet dot + ripple, like a checked-off todo control.
  drawMark(ctx, size / 2, size / 2, size, {
    dotColor: VIOLET,
    ringColor: VIOLET,
    ringOpacity: 0.24,
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

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, size, size);

  drawMark(ctx, size / 2, size / 2, size, {
    dotColor: VIOLET,
    ringColor: VIOLET,
    ringOpacity: 0.24,
  });

  return c.toBuffer('image/png');
}

function renderAndroidBackground(size) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, size, size);

  return c.toBuffer('image/png');
}

function renderAndroidForeground(size) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  drawMark(ctx, size / 2, size / 2, size, {
    dotColor: VIOLET,
    ringColor: VIOLET,
    ringOpacity: 0.24,
  });

  return c.toBuffer('image/png');
}

function renderAndroidLegacyIcon(size, { round }) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const pad = Math.max(1, Math.round(size * 0.08));
  const tile = size - pad * 2;
  const r = round ? tile / 2 : tile * 0.18;
  const x = pad;
  const y = pad;

  ctx.save();
  ctx.beginPath();
  if (round) {
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + tile - r, y);
    ctx.quadraticCurveTo(x + tile, y, x + tile, y + r);
    ctx.lineTo(x + tile, y + tile - r);
    ctx.quadraticCurveTo(x + tile, y + tile, x + tile - r, y + tile);
    ctx.lineTo(x + r, y + tile);
    ctx.quadraticCurveTo(x, y + tile, x, y + tile - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
  ctx.clip();
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, size, size);
  drawMark(ctx, size / 2, size / 2, size * 0.82, {
    dotColor: VIOLET,
    ringColor: VIOLET,
    ringOpacity: 0.24,
  });
  ctx.restore();

  return c.toBuffer('image/png');
}

function renderAndroidLauncherAssets() {
  if (!existsSync(ANDROID_RES)) return;

  writeFileSync(
    join(ANDROID_RES, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${CREAM}</color>\n</resources>\n`,
  );

  writeFileSync(
    join(ANDROID_RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n`,
  );
  writeFileSync(
    join(ANDROID_RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n`,
  );

  for (const [density, legacySize, adaptiveSize] of ANDROID_DENSITIES) {
    const dir = join(ANDROID_RES, `mipmap-${density}`);
    if (!existsSync(dir)) continue;

    writeFileSync(join(dir, 'ic_launcher_background.png'), renderAndroidBackground(adaptiveSize));
    writeFileSync(join(dir, 'ic_launcher_foreground.png'), renderAndroidForeground(adaptiveSize));
    writeFileSync(join(dir, 'ic_launcher.png'), renderAndroidLegacyIcon(legacySize, { round: false }));
    writeFileSync(join(dir, 'ic_launcher_round.png'), renderAndroidLegacyIcon(legacySize, { round: true }));
  }
}

const androidOnly = process.argv.includes('--android-native-only');

if (!androidOnly) {
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
}

renderAndroidLauncherAssets();
console.log('✓ Wrote Android launcher assets');
