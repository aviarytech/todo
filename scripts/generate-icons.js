#!/usr/bin/env node

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ICON_DIR = 'resources/icon';
const SPLASH_DIR = 'resources/splash';

// iOS icon sizes
const IOS_SIZES = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

// Android icon sizes
const ANDROID_SIZES = [48, 72, 96, 144, 192, 512];

// Splash screen sizes
const SPLASH_SIZES = [
  { name: 'universal', width: 2732, height: 2732 },
  { name: 'iphone-portrait', width: 1242, height: 2688 },
  { name: 'iphone-landscape', width: 2688, height: 1242 },
  { name: 'iphone-small', width: 828, height: 1792 },
];

// Create directories
mkdirSync(ICON_DIR, { recursive: true });
mkdirSync(SPLASH_DIR, { recursive: true });

console.log('🎨 Generating app icons...');

/**
 * Generate a single icon
 */
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#8B4513'); // Saddle brown
  gradient.addColorStop(1, '#D2691E'); // Chocolate/amber

  // Fill background with gradient
  ctx.fillStyle = gradient;
  
  // Add rounded corners
  const cornerRadius = size * 0.225; // iOS standard ~22.5%
  ctx.beginPath();
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.quadraticCurveTo(size, 0, size, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
  ctx.lineTo(cornerRadius, size);
  ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
  ctx.closePath();
  ctx.fill();

  // Draw emoji
  const fontSize = size * 0.6;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('💩', size / 2, size / 2);

  return canvas;
}

/**
 * Generate a splash screen
 */
function generateSplash(width, height, isDark = false) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background color
  ctx.fillStyle = isDark ? '#1a1a1a' : '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Draw centered emoji
  const size = Math.min(width, height);
  const fontSize = size * 0.3;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isDark ? '#FFFFFF' : '#8B4513';
  ctx.fillText('💩', width / 2, height / 2);

  return canvas;
}

// Generate iOS icons
console.log('📱 Generating iOS icons...');
for (const size of IOS_SIZES) {
  const canvas = generateIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = `icon-${size}.png`;
  writeFileSync(join(ICON_DIR, filename), buffer);
  console.log(`   ✓ ${filename} (${size}x${size})`);
}

// Generate Android icons
console.log('🤖 Generating Android icons...');
for (const size of ANDROID_SIZES) {
  const canvas = generateIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = `icon-${size}.png`;
  writeFileSync(join(ICON_DIR, filename), buffer);
  console.log(`   ✓ ${filename} (${size}x${size})`);
}

// Generate splash screens
console.log('🖼️  Generating splash screens...');
for (const { name, width, height } of SPLASH_SIZES) {
  // Light version
  const lightCanvas = generateSplash(width, height, false);
  const lightBuffer = lightCanvas.toBuffer('image/png');
  const lightFilename = `splash-${name}-light.png`;
  writeFileSync(join(SPLASH_DIR, lightFilename), lightBuffer);
  console.log(`   ✓ ${lightFilename} (${width}x${height})`);

  // Dark version
  const darkCanvas = generateSplash(width, height, true);
  const darkBuffer = darkCanvas.toBuffer('image/png');
  const darkFilename = `splash-${name}-dark.png`;
  writeFileSync(join(SPLASH_DIR, darkFilename), darkBuffer);
  console.log(`   ✓ ${darkFilename} (${width}x${height})`);
}

console.log('\n✨ Done! Icons and splash screens generated in:');
console.log(`   📁 ${ICON_DIR}`);
console.log(`   📁 ${SPLASH_DIR}`);
