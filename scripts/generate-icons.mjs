#!/usr/bin/env node
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true });

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate icons
for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background - amber/brown gradient to match app theme
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, '#FEF3C7'); // amber-100
  gradient.addColorStop(1, '#F59E0B'); // amber-500
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw poop emoji text
  const fontSize = Math.floor(size * 0.65);
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💩', size / 2, size / 2 + fontSize * 0.05);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const filename = join(iconsDir, `icon-${size}.png`);
  writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);
}

// Also generate new-list icon
const newListSize = 96;
const canvas = createCanvas(newListSize, newListSize);
const ctx = canvas.getContext('2d');

const gradient = ctx.createRadialGradient(
  newListSize / 2, newListSize / 2, 0,
  newListSize / 2, newListSize / 2, newListSize / 2
);
gradient.addColorStop(0, '#D1FAE5'); // emerald-100
gradient.addColorStop(1, '#10B981'); // emerald-500
ctx.fillStyle = gradient;
ctx.beginPath();
ctx.arc(newListSize / 2, newListSize / 2, newListSize / 2, 0, Math.PI * 2);
ctx.fill();

// Plus sign
ctx.strokeStyle = 'white';
ctx.lineWidth = 8;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(newListSize / 2, newListSize * 0.25);
ctx.lineTo(newListSize / 2, newListSize * 0.75);
ctx.moveTo(newListSize * 0.25, newListSize / 2);
ctx.lineTo(newListSize * 0.75, newListSize / 2);
ctx.stroke();

writeFileSync(join(iconsDir, 'new-list.png'), canvas.toBuffer('image/png'));
console.log('Generated: new-list.png');

console.log('\n✅ All icons generated successfully!');
