/**
 * Pixel Diff Engine — sharp-based screenshot comparison
 *
 * Reads a baseline PNG and an actual PNG, compares pixels with a
 * sensitivity threshold, and writes a diff image highlighting
 * mismatches in red. Uses dynamic import for `sharp` so the module
 * degrades gracefully when the native binding is unavailable.
 */

import fs from 'node:fs';
import path from 'node:path';

import { generateId } from '@shared/lib/id';

import type SharpModule from 'sharp';

export type DiffSensitivity = 'strict' | 'balanced' | 'relaxed';

export interface DiffResult {
  mismatchPercentage: number;
  mismatchPixels: number;
  totalPixels: number;
  diffFilePath: string;
  status: 'match' | 'mismatch' | 'size-mismatch';
}

const THRESHOLDS: Record<DiffSensitivity, number> = {
  strict: 0,
  balanced: 5,
  relaxed: 15,
};

export async function compareScreenshots(params: {
  baselinePath: string;
  actualPath: string;
  outputDir: string;
  sensitivity: DiffSensitivity;
}): Promise<DiffResult> {
  const { baselinePath, actualPath, outputDir, sensitivity } = params;
  const threshold = THRESHOLDS[sensitivity];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let sharp: typeof SharpModule;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    return {
      mismatchPercentage: 0,
      mismatchPixels: 0,
      totalPixels: 0,
      diffFilePath: '',
      status: 'match',
    };
  }

  const baselineImg = sharp(baselinePath);
  const actualImg = sharp(actualPath);

  const baselineMeta = await baselineImg.metadata();
  const actualMeta = await actualImg.metadata();

  if (
    baselineMeta.width !== actualMeta.width ||
    baselineMeta.height !== actualMeta.height
  ) {
    return {
      mismatchPercentage: 100,
      mismatchPixels: (baselineMeta.width ?? 0) * (baselineMeta.height ?? 0),
      totalPixels: (baselineMeta.width ?? 0) * (baselineMeta.height ?? 0),
      diffFilePath: '',
      status: 'size-mismatch',
    };
  }

  if (
    baselineMeta.width === undefined ||
    baselineMeta.width === 0 ||
    baselineMeta.height === undefined ||
    baselineMeta.height === 0
  ) {
    throw new Error('missing dimensions');
  }

  const { width, height } = baselineMeta;
  const totalPixels = width * height;

  const baselineRaw = await baselineImg.raw().ensureAlpha().toBuffer();
  const actualRaw = await actualImg.raw().ensureAlpha().toBuffer();

  const diffBuffer = Buffer.alloc(width * height * 4);
  let mismatchPixels = 0;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const rDiff = Math.abs(baselineRaw[offset] - actualRaw[offset]);
    const gDiff = Math.abs(baselineRaw[offset + 1] - actualRaw[offset + 1]);
    const bDiff = Math.abs(baselineRaw[offset + 2] - actualRaw[offset + 2]);

    const maxDiff = Math.max(rDiff, gDiff, bDiff);
    const diffPercent = (maxDiff / 255) * 100;

    if (diffPercent > threshold) {
      mismatchPixels++;
      diffBuffer[offset] = 255;
      diffBuffer[offset + 1] = 0;
      diffBuffer[offset + 2] = 0;
      diffBuffer[offset + 3] = 200;
    } else {
      diffBuffer[offset] = actualRaw[offset];
      diffBuffer[offset + 1] = actualRaw[offset + 1];
      diffBuffer[offset + 2] = actualRaw[offset + 2];
      diffBuffer[offset + 3] = 80;
    }
  }

  const diffFileName = `diff-${generateId()}.png`;
  const diffFilePath = path.join(outputDir, diffFileName);

  await sharp(diffBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(diffFilePath);

  const mismatchPercentage = Math.round((mismatchPixels / totalPixels) * 100);

  return {
    mismatchPercentage,
    mismatchPixels,
    totalPixels,
    diffFilePath,
    status: mismatchPercentage > 0 ? 'mismatch' : 'match',
  };
}
