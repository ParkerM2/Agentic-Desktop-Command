/**
 * Data Migrator
 *
 * Validation and migration logic for moving the ADC data directory
 * to a user-chosen location. Validates target directories (write permissions,
 * disk space, existing files) and performs recursive copy with integrity checks.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statfsSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ValidationCheck } from '@shared/types';

import { createScopedLogger } from '@main/lib/logger';

import type { ConfigReader } from './config-reader';

const logger = createScopedLogger('data-migrator');

export interface DataMigrator {
  /** Run all 4 validation checks against a target directory */
  validateTarget: (targetPath: string) => ValidationCheck[];
  /** Copy all files from source to target, verify integrity */
  migrateData: (sourcePath: string, targetPath: string) => { success: boolean; error?: string };
  /** Check if a pending migration exists and run it (called on boot) */
  runPendingMigration: () => { migrated: boolean; error?: string };
}

export function createDataMigrator(configReader: ConfigReader): DataMigrator {
  function getDirectorySize(dirPath: string): number {
    if (!existsSync(dirPath)) return 0;
    let total = 0;
    for (const entry of readdirSync(dirPath)) {
      const entryPath = join(dirPath, entry);
      const stat = statSync(entryPath);
      total += stat.isDirectory() ? getDirectorySize(entryPath) : stat.size;
    }
    return total;
  }

  function countFiles(dirPath: string): number {
    if (!existsSync(dirPath)) return 0;
    let count = 0;
    for (const entry of readdirSync(dirPath)) {
      const entryPath = join(dirPath, entry);
      const stat = statSync(entryPath);
      count += stat.isDirectory() ? countFiles(entryPath) : 1;
    }
    return count;
  }

  function copyDirRecursive(src: string, dest: string): void {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    for (const entry of readdirSync(src)) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      if (statSync(srcPath).isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  function checkWritePermission(targetPath: string): ValidationCheck {
    const id = 'WRITE_PERMISSION';
    const label = 'Write permission';
    try {
      mkdirSync(targetPath, { recursive: true });
      const tempFile = join(targetPath, `.adc-write-test-${Date.now()}`);
      writeFileSync(tempFile, 'test', 'utf-8');
      unlinkSync(tempFile);
      return { id, label, status: 'pass', message: 'Directory is writable' };
    } catch (err: unknown) {
      logger.error('Write permission check failed', { targetPath, error: err instanceof Error ? err.message : String(err) });
      return { id, label, status: 'fail', message: 'Cannot write to this directory. Check permissions.' };
    }
  }

  function checkDiskSpace(targetPath: string): ValidationCheck {
    const id = 'DISK_SPACE';
    const label = 'Disk space';
    try {
      const currentDataDir = configReader.resolveDataDir();
      const dataSize = getDirectorySize(currentDataDir);

      // Ensure target exists for statfs
      mkdirSync(targetPath, { recursive: true });
      const fsStats = statfsSync(targetPath);
      const freeSpace = fsStats.bfree * fsStats.bsize;

      if (freeSpace < dataSize) {
        return {
          id,
          label,
          status: 'fail',
          message: `Not enough disk space. Need ${formatBytes(dataSize)}, only ${formatBytes(freeSpace)} available.`,
        };
      }
      if (freeSpace < dataSize * 2) {
        return {
          id,
          label,
          status: 'warn',
          message: `Low disk space. ${formatBytes(freeSpace)} available, recommended: ${formatBytes(dataSize * 2)}.`,
        };
      }
      return { id, label, status: 'pass', message: `${formatBytes(freeSpace)} available` };
    } catch {
      return { id, label, status: 'warn', message: 'Could not check disk space' };
    }
  }

  function checkNonEmpty(targetPath: string): ValidationCheck {
    const id = 'NON_EMPTY_DIR';
    const label = 'Directory contents';
    try {
      if (!existsSync(targetPath)) {
        return { id, label, status: 'pass', message: 'Directory will be created' };
      }
      const entries = readdirSync(targetPath);
      if (entries.length === 0) {
        return { id, label, status: 'pass', message: 'Directory is empty' };
      }
      return {
        id,
        label,
        status: 'warn',
        message: `Directory contains ${entries.length} existing item(s). Data will be merged.`,
      };
    } catch {
      return { id, label, status: 'fail', message: 'Cannot read directory contents' };
    }
  }

  function checkExistingDb(targetPath: string): ValidationCheck {
    const id = 'EXISTING_ADC_DB';
    const label = 'Existing database';
    const dbPath = join(targetPath, 'adc.db');
    if (existsSync(dbPath)) {
      return {
        id,
        label,
        status: 'warn',
        message: 'An existing adc.db was found. You can use this existing data or overwrite it.',
      };
    }
    return { id, label, status: 'pass', message: 'No existing database found' };
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function validateTarget(targetPath: string): ValidationCheck[] {
    return [
      checkNonEmpty(targetPath),
      checkExistingDb(targetPath),
      checkWritePermission(targetPath),
      checkDiskSpace(targetPath),
    ];
  }

  function migrateData(
    sourcePath: string,
    targetPath: string,
  ): { success: boolean; error?: string } {
    logger.info('Migration starting', { sourcePath, targetPath });
    try {
      mkdirSync(targetPath, { recursive: true });
      copyDirRecursive(sourcePath, targetPath);

      // Verify integrity: file count and total size
      const sourceCount = countFiles(sourcePath);
      const targetCount = countFiles(targetPath);
      const sourceSize = getDirectorySize(sourcePath);
      const targetSize = getDirectorySize(targetPath);

      if (targetCount < sourceCount) {
        const error = `File count mismatch: expected ${sourceCount}, got ${targetCount}`;
        logger.error('Migration integrity check failed', error);
        rmSync(targetPath, { recursive: true, force: true });
        return { success: false, error };
      }
      if (targetSize < sourceSize) {
        const error = `Size mismatch: expected ${formatBytes(sourceSize)}, got ${formatBytes(targetSize)}`;
        logger.error('Migration integrity check failed', error);
        rmSync(targetPath, { recursive: true, force: true });
        return { success: false, error };
      }

      logger.info('Migration complete', { sourcePath, targetPath, fileCount: targetCount, size: formatBytes(targetSize) });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown migration error';
      logger.error('Migration failed', message);
      rmSync(targetPath, { recursive: true, force: true });
      return { success: false, error: message };
    }
  }

  function runPendingMigration(): { migrated: boolean; error?: string } {
    const config = configReader.getConfig();
    if (!config.pendingMigration) {
      return { migrated: false };
    }

    const source = config.previousDataDir;
    const target = config.dataDir;

    if (!source || !target) {
      configReader.updateConfig({ pendingMigration: false });
      return { migrated: false, error: 'Missing source or target path for pending migration' };
    }

    const result = migrateData(source, target);

    if (result.success) {
      configReader.updateConfig({
        pendingMigration: false,
        previousDataDir: null,
      });
      return { migrated: true };
    }

    // Clean up partially-copied target before reverting config
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }

    // Revert to previous data dir on failure
    configReader.updateConfig({
      dataDir: source,
      pendingMigration: false,
    });
    return { migrated: false, error: result.error };
  }

  return { validateTarget, migrateData, runPendingMigration };
}
