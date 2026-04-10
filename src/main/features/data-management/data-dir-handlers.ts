/**
 * Data Directory IPC Handlers
 *
 * Thin handlers for data directory get/set/validate/confirm/reset.
 * All business logic lives in ConfigReader and DataMigrator services.
 */

import { SETTINGS } from '@shared/ipc/settings/channels';

import type { ConfigReader } from './config-reader';
import type { DataMigrator } from './data-migrator';
import type { IpcRouter } from '../../ipc/router';

export function registerDataDirHandlers(
  router: IpcRouter,
  configReader: ConfigReader,
  dataMigrator: DataMigrator,
): void {
  // GET data dir — return current path and whether it's custom
  router.handle(SETTINGS.GET['DATA-DIR'], () => {
    const config = configReader.getConfig();
    return Promise.resolve({
      current: configReader.resolveDataDir(),
      isCustom: config.dataDir !== null,
    });
  });

  // VALIDATE data dir — run all 4 checks against target path
  router.handle(SETTINGS.VALIDATE['DATA-DIR'], ({ path }) => {
    const checks = dataMigrator.validateTarget(path);
    return Promise.resolve({ checks });
  });

  // SET data dir — validate then return results (doesn't apply yet)
  router.handle(SETTINGS.SET['DATA-DIR'], ({ path }) => {
    const validationResults = dataMigrator.validateTarget(path);
    return Promise.resolve({ validationResults });
  });

  // CONFIRM data dir — user confirmed, save config, require restart
  router.handle(SETTINGS.CONFIRM['DATA-DIR'], ({ path, useExisting }) => {
    const currentDir = configReader.resolveDataDir();
    configReader.updateConfig({
      dataDir: path,
      previousDataDir: currentDir,
      pendingMigration: !useExisting, // skip migration if using existing data
      confirmedNonEmpty: true,
    });
    return Promise.resolve({ requiresRestart: true as const });
  });

  // RESET data dir — revert to OS default
  router.handle(SETTINGS.RESET['DATA-DIR'], () => {
    const currentDir = configReader.resolveDataDir();
    const defaultDir = configReader.getDefaultDataDir();
    if (currentDir !== defaultDir) {
      configReader.updateConfig({
        dataDir: null,
        previousDataDir: currentDir,
        pendingMigration: true,
        confirmedNonEmpty: false,
      });
    }
    return Promise.resolve({ requiresRestart: true as const });
  });
}
