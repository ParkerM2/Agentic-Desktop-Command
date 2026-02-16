/**
 * Captures frames from the animated social preview HTML and assembles a GIF.
 *
 * Usage: node scripts/generate-social-gif.mjs
 * Output: social-preview.gif (640x320, ~2s loop, <1MB)
 */

import { chromium } from 'playwright';
import { createWriteStream, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import GIFEncoder from 'gif-encoder-2';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const HTML_PATH = join(__dirname, 'social-preview-animated.html');
const OUTPUT_PATH = join(PROJECT_ROOT, 'social-preview.gif');
const FRAMES_DIR = join(__dirname, '.frames');

// Animation config — optimized for <1MB output
const CAPTURE_WIDTH = 1280;  // Capture at full res for crisp text
const CAPTURE_HEIGHT = 640;
const OUTPUT_WIDTH = 640;    // Halve for GIF (GitHub scales up)
const OUTPUT_HEIGHT = 320;
const FPS = 5;
const DURATION_MS = 2000;    // 2 second loop
const TOTAL_FRAMES = Math.round((DURATION_MS / 1000) * FPS);
const FRAME_DELAY = Math.round(1000 / FPS);

/**
 * Nearest-neighbor downscale — fast, preserves crisp text/edges for dark UIs.
 */
function downscale(srcPng, dstW, dstH) {
  const srcW = srcPng.width;
  const srcH = srcPng.height;
  const dst = new PNG({ width: dstW, height: dstH });
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcY = Math.floor(y * yRatio);
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * dstW + x) * 4;
      dst.data[dstIdx] = srcPng.data[srcIdx];
      dst.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      dst.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      dst.data[dstIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }
  return dst;
}

async function main() {
  console.log(`Generating ${TOTAL_FRAMES} frames at ${FPS}fps (${DURATION_MS}ms loop)...`);
  console.log(`Capture: ${CAPTURE_WIDTH}x${CAPTURE_HEIGHT} → Output: ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}`);

  // Create temp frames directory
  mkdirSync(FRAMES_DIR, { recursive: true });

  // Launch browser at full resolution for crisp capture
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT });

  // Load the animated HTML
  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle' });

  // Let animations initialize
  await page.waitForTimeout(500);

  // Capture frames
  console.log('Capturing frames...');
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const framePath = join(FRAMES_DIR, `frame-${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    await page.waitForTimeout(FRAME_DELAY);
    console.log(`  Frame ${i + 1}/${TOTAL_FRAMES}`);
  }

  await browser.close();
  console.log('Browser closed. Downscaling & assembling GIF...');

  // Create GIF encoder at OUTPUT dimensions with reduced color palette
  const encoder = new GIFEncoder(OUTPUT_WIDTH, OUTPUT_HEIGHT, 'neuquant', true);
  encoder.setDelay(FRAME_DELAY);
  encoder.setRepeat(0);     // Infinite loop
  encoder.setQuality(20);   // 1-30: higher = faster + smaller (fewer colors sampled)
  encoder.setTransparent(null);

  const outputStream = createWriteStream(OUTPUT_PATH);
  encoder.createReadStream().pipe(outputStream);
  encoder.start();

  // Downscale each frame and add to GIF
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const framePath = join(FRAMES_DIR, `frame-${String(i).padStart(3, '0')}.png`);
    const pngData = readFileSync(framePath);
    const srcPng = PNG.sync.read(pngData);
    const scaled = downscale(srcPng, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    encoder.addFrame(scaled.data);
  }

  encoder.finish();

  await new Promise((resolve) => {
    outputStream.on('finish', resolve);
  });

  // Cleanup frames
  rmSync(FRAMES_DIR, { recursive: true, force: true });

  console.log(`\nDone! Output: ${OUTPUT_PATH}`);

  // File size
  const stats = readFileSync(OUTPUT_PATH);
  const sizeKB = (stats.length / 1024).toFixed(1);
  const sizeMB = (stats.length / (1024 * 1024)).toFixed(2);
  console.log(`File size: ${sizeKB} KB (${sizeMB} MB)`);

  if (stats.length > 1024 * 1024) {
    console.log('WARNING: File exceeds 1 MB GitHub limit!');
  } else {
    console.log('OK: Under 1 MB GitHub limit.');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
