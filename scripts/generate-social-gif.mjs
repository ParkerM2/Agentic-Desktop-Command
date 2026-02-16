/**
 * Captures frames from the animated social preview HTML and assembles a GIF.
 *
 * Usage: node scripts/generate-social-gif.mjs
 * Output: social-preview.gif (1280x640, ~2.5s loop)
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

// Animation config
const WIDTH = 1280;
const HEIGHT = 640;
const FPS = 15;
const DURATION_MS = 3500; // 3.5 second loop (matches indeterminate animation)
const TOTAL_FRAMES = Math.round((DURATION_MS / 1000) * FPS);
const FRAME_INTERVAL = Math.round(1000 / FPS);

async function main() {
  console.log(`Generating ${TOTAL_FRAMES} frames at ${FPS}fps (${DURATION_MS}ms loop)...`);

  // Create temp frames directory
  mkdirSync(FRAMES_DIR, { recursive: true });

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });

  // Load the animated HTML
  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle' });

  // Let animations initialize
  await page.waitForTimeout(500);

  // Capture frames
  console.log('Capturing frames...');
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const framePath = join(FRAMES_DIR, `frame-${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    await page.waitForTimeout(FRAME_INTERVAL);

    if ((i + 1) % 10 === 0 || i === TOTAL_FRAMES - 1) {
      console.log(`  Frame ${i + 1}/${TOTAL_FRAMES}`);
    }
  }

  await browser.close();
  console.log('Browser closed. Assembling GIF...');

  // Create GIF encoder
  const encoder = new GIFEncoder(WIDTH, HEIGHT, 'neuquant', true);
  encoder.setDelay(FRAME_INTERVAL);
  encoder.setRepeat(0); // Infinite loop
  encoder.setQuality(10); // 1-30, lower = better quality but slower
  encoder.setTransparent(null);

  const outputStream = createWriteStream(OUTPUT_PATH);
  encoder.createReadStream().pipe(outputStream);
  encoder.start();

  // Add each frame
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const framePath = join(FRAMES_DIR, `frame-${String(i).padStart(3, '0')}.png`);
    const pngData = readFileSync(framePath);
    const png = PNG.sync.read(pngData);
    encoder.addFrame(png.data);
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
  const sizeMB = (stats.length / (1024 * 1024)).toFixed(2);
  console.log(`File size: ${sizeMB} MB`);

  if (Number(sizeMB) > 10) {
    console.log('Warning: GitHub recommends < 10 MB for social previews.');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
