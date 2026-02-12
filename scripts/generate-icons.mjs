import sharp from 'sharp';
import { join } from 'node:path';

const sizes = [16, 32, 48, 64, 128, 256];
const svgPath = join('resources', 'icon.svg');

// Generate PNGs at various sizes
for (const size of sizes) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(join('resources', `icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);
}

// Generate main icon.png (256x256)
await sharp(svgPath)
  .resize(256, 256)
  .png()
  .toFile(join('resources', 'icon.png'));

console.log('Main icon.png generated (256x256)');
console.log('Icons generated in resources/');
