/**
 * Settings — Data management sub-module barrel (re-exports from top-level feature)
 */

export {
  createConfigReader,
  createDataMigrator,
  createUserDataMigrator,
  createUserDataResolver,
  isReinitializable,
  createCleanupService,
  createStorageInspector,
  registerDataDirHandlers,
  registerDataManagementHandlers,
} from '../data-management';

export type { CleanupService } from '../data-management/cleanup-service';
export type { ConfigReader } from '../data-management/config-reader';
export type { DataMigrator } from '../data-management/data-migrator';
export type { StorageInspector } from '../data-management/storage-inspector';
export type { ReinitializableService } from '../data-management/reinitializable-service';
