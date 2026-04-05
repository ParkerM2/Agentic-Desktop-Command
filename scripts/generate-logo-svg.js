/**
 * generate-logo-svg.js
 *
 * Converts "ADC" in Pinyon Script to pure SVG path geometry using opentype.js.
 * Composes the squircle badge mark with a teal signature flourish.
 *
 * Output:
 *   resources/icon.svg   — master brand mark (used by build-icons.js)
 *   brand/logo-badge.svg — same mark for website/marketing use
 */

import opentype from 'opentype.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const SIZE = 1024
const CORNER_RADIUS = Math.round(SIZE * 0.22)
// Decrease to 0.32 if letterform clips the badge boundary
const FONT_SIZE_RATIO = 0.38

async function generateMark() {
  const fontPath = path.join(__dirname, 'fonts', 'PinyonScript-Regular.ttf')

  if (!fs.existsSync(fontPath)) {
    console.error(`✗ Font not found at ${fontPath}`)
    console.error('  Place PinyonScript-Regular.ttf in scripts/fonts/')
    process.exit(1)
  }

  const font = await opentype.load(fontPath)
  const fontSize = SIZE * FONT_SIZE_RATIO

  const measuredPath = font.getPath('ADC', 0, 0, fontSize)
  const bbox = measuredPath.getBoundingBox()
  const textW = bbox.x2 - bbox.x1
  const textH = bbox.y2 - bbox.y1

  // Center text. Nudge upward by 5% because Pinyon Script descenders pull optical center down.
  const offsetX = (SIZE - textW) / 2 - bbox.x1
  const offsetY = (SIZE - textH) / 2 - bbox.y1 - textH * 0.05

  const finalPath = font.getPath('ADC', offsetX, offsetY, fontSize)
  const pathData = finalPath.toPathData(2)
  const finalBbox = finalPath.getBoundingBox()

  // Teal flourish: 55% of text width, centered, 1.8% below baseline
  const flourishW = (finalBbox.x2 - finalBbox.x1) * 0.55
  const flourishX = (SIZE - flourishW) / 2
  const flourishY = finalBbox.y2 + SIZE * 0.018
  const flourishH = Math.round(SIZE * 0.006)
  const flourishR = flourishH / 2

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <!-- Squircle badge background — Void #141416 -->
  <rect width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" fill="#141416"/>
  <!-- Subtle border — Rim #2A2A2E -->
  <rect width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" fill="none" stroke="#2A2A2E" stroke-width="3"/>
  <!-- ADC lettermark — Pinyon Script converted to pure path geometry, zero font runtime dependency -->
  <path d="${pathData}" fill="#F0F0F5"/>
  <!-- Teal signature flourish -->
  <rect
    x="${flourishX.toFixed(1)}"
    y="${flourishY.toFixed(1)}"
    width="${flourishW.toFixed(1)}"
    height="${flourishH}"
    rx="${flourishR}"
    fill="#2DD4BF"
  />
</svg>`.trim()

  fs.mkdirSync(path.join(ROOT, 'resources'), { recursive: true })
  fs.writeFileSync(path.join(ROOT, 'resources', 'icon.svg'), svg)
  console.log(`✓ resources/icon.svg`)

  fs.mkdirSync(path.join(ROOT, 'brand'), { recursive: true })
  fs.writeFileSync(path.join(ROOT, 'brand', 'logo-badge.svg'), svg)
  console.log(`✓ brand/logo-badge.svg`)
}

generateMark().catch((error) => {
  console.error('✗ Generation failed:', error.message)
  process.exit(1)
})
