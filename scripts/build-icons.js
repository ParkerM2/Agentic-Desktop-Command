/**
 * build-icons.js
 *
 * Reads resources/icon-optimized.svg and uses icon-gen to produce:
 *   resources/icon.ico      Windows multi-size ICO
 *   resources/icon.icns     macOS multi-size ICNS
 *   resources/icon-N.png    PNG at 16, 32, 48, 64, 128, 256, 512, 1024
 *   resources/icon.png      Copy of icon-512.png (electron-builder linux default)
 *
 * Run via: npm run icons:generate
 */

import generateIcon from 'icon-gen'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const INPUT = path.join(ROOT, 'resources', 'icon-optimized.svg')
const OUTPUT = path.join(ROOT, 'resources')

if (!fs.existsSync(INPUT)) {
  console.error(`✗ Optimized SVG not found: ${INPUT}`)
  console.error('  Run the full pipeline: npm run icons:generate')
  process.exit(1)
}

const PNG_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]

await generateIcon(INPUT, OUTPUT, {
  report: true,
  ico: {
    name: 'icon',
    sizes: [16, 24, 32, 48, 64, 128, 256],
  },
  icns: {
    name: 'icon',
    sizes: [16, 32, 64, 128, 256, 512, 1024],
  },
  favicon: {
    name: 'icon',
    pngSizes: PNG_SIZES,
  },
})

// icon-gen places PNG outputs either in a favicon/ subdirectory or directly in OUTPUT
// with no dash (e.g. icon16.png). Normalize to flat resources/icon-N.png.
const faviconDir = path.join(OUTPUT, 'favicon')
if (fs.existsSync(faviconDir)) {
  // Subdirectory variant: move from favicon/icon-N.png -> resources/icon-N.png
  for (const size of PNG_SIZES) {
    const src = path.join(faviconDir, `icon-${size}.png`)
    const dest = path.join(OUTPUT, `icon-${size}.png`)
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest)
    }
  }
  // Clean up empty favicon dir
  try {
    fs.rmdirSync(faviconDir)
  } catch {
    console.warn('⚠ favicon/ not empty after rename — inspect if needed')
  }
} else {
  // Flat variant: rename iconN.png -> icon-N.png
  for (const size of PNG_SIZES) {
    const src = path.join(OUTPUT, `icon${size}.png`)
    const dest = path.join(OUTPUT, `icon-${size}.png`)
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest)
    }
  }
}

// Copy 512px as icon.png (linux electron-builder default)
const icon512 = path.join(OUTPUT, 'icon-512.png')
if (fs.existsSync(icon512)) {
  fs.copyFileSync(icon512, path.join(OUTPUT, 'icon.png'))
}

// icon-gen generates a secondary favicon.ico when favicon mode is used — remove it
// since resources/icon.ico is the authoritative Windows icon.
const extraFavico = path.join(OUTPUT, 'favicon.ico')
if (fs.existsSync(extraFavico)) {
  fs.rmSync(extraFavico)
}

console.log('✓ All icon assets generated in resources/')
