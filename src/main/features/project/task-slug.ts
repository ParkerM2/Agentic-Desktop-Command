/**
 * Task Slug — Slug generation and numbering for task directories.
 */

import { existsSync, readdirSync } from 'node:fs';

export function slugify(title: string, num: number): string {
  const slug = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 50);
  return `${num}-${slug || 'task'}`;
}

export function getNextNum(specsDir: string): number {
  if (!existsSync(specsDir)) return 1;
  const nums = readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => Number.parseInt(d.name.split('-')[0] ?? '', 10))
    .filter((n) => !Number.isNaN(n));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}
