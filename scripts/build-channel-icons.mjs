/**
 * build-channel-icons.mjs
 *
 * Produces per-channel Windows ICO variants for taskbar disambiguation:
 *   resources/icon-local.ico  — orange-tinted (hue +30°)  — local production builds
 *   resources/icon-dev.ico    — green-tinted  (hue +120°) — dev/HMR builds
 *
 * Source: resources/icon-optimized.svg (same authoritative SVG used by build-icons.js).
 * Pipeline: sharp rasterizes the SVG at each ICO size and applies .modulate({ hue, saturation })
 *           → PNG buffers written to a temp dir → icon-gen assembles .ico from that dir.
 *
 * Run via: npm run icons:channels
 */

import generateIcon from 'icon-gen'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const INPUT = path.join(ROOT, 'resources', 'icon-optimized.svg')
const OUTPUT = path.join(ROOT, 'resources')

// Match the sizes used for the release icon (see scripts/build-icons.js).
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

// Channels: hue rotation in degrees + a small saturation boost so the shift is
// visible even when the source art has moderate saturation. Values picked so
// local (orange) and dev (green) are clearly distinct from each other and from
// the release icon.
const CHANNELS = [
  { name: 'local', hue: 30, saturation: 1.25 },
  { name: 'dev', hue: 140, saturation: 1.25 },
]

if (!fs.existsSync(INPUT)) {
  console.error(`✗ Source SVG not found: ${INPUT}`)
  console.error('  Run: npm run icons:generate')
  process.exit(1)
}

for (const channel of CHANNELS) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `adc-icon-${channel.name}-`))
  try {
    // Rasterize the SVG at each ICO size with hue+saturation shift applied.
    // icon-gen's directory mode expects files named `<size>.png`.
    for (const size of ICO_SIZES) {
      const buf = await sharp(INPUT)
        .resize(size, size)
        .modulate({ hue: channel.hue, saturation: channel.saturation })
        .png()
        .toBuffer()
      fs.writeFileSync(path.join(workDir, `${size}.png`), buf)
    }

    // icon-gen writes to a directory; point it at our temp dir and let it
    // emit icon-<channel>.ico directly in resources/.
    await generateIcon(workDir, OUTPUT, {
      report: true,
      ico: {
        name: `icon-${channel.name}`,
        sizes: ICO_SIZES,
      },
    })

    console.log(`✓ resources/icon-${channel.name}.ico`)
  } finally {
    fs.rmSync(workDir, { force: true, recursive: true })
  }
}

console.log('✓ Per-channel icons generated')
