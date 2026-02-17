/**
 * Captures the social preview HTML as a PNG screenshot.
 *
 * Usage: node scripts/generate-social-preview.mjs
 * Output: social-preview.png (1280x640)
 */

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const HTML_PATH = join(__dirname, 'social-preview-animated.html');
const OUTPUT_PATH = join(PROJECT_ROOT, 'social-preview.png');

const WIDTH = 1280;
const HEIGHT = 640;

async function main() {
  console.log(`Capturing ${WIDTH}x${HEIGHT} PNG...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });

  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  await page.screenshot({ path: OUTPUT_PATH, type: 'png' });

  await browser.close();

  const stats = readFileSync(OUTPUT_PATH);
  const sizeKB = (stats.length / 1024).toFixed(1);
  console.log(`Done! Output: ${OUTPUT_PATH}`);
  console.log(`File size: ${sizeKB} KB`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
