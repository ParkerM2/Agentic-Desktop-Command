import { writeFileSync, mkdirSync } from 'node:fs';

// Simple SVG icon — "C" lettermark in a rounded square
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="#1a1a2e"/>
  <text x="128" y="172" font-family="Arial, sans-serif" font-size="160" font-weight="bold" fill="#D6D876" text-anchor="middle">C</text>
</svg>`;

mkdirSync('resources', { recursive: true });
writeFileSync('resources/icon.svg', svg);
console.log('SVG icon created at resources/icon.svg');
