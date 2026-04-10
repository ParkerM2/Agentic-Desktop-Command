/**
 * Settings — Data management sub-module barrel
 */

export {
  createConfigReader,
  createDataMigrator,
  createUserDataMigrator,
  createUserDataResolver,
  isReinitializable,
} from './data-management/index';
export { createCleanupService } from './data-management/cleanup-service';
export { createStorageInspector } from './data-management/storage-inspector';
export { registerDataDirHandlers } from './data-management/data-dir-handlers';
export { registerDataManagementHandlers } from './data-management/data-management-handlers';

export type { CleanupService } from './data-management/cleanup-service';
export type { ConfigReader } from './data-management/config-reader';
export type { DataMigrator } from './data-management/data-migrator';
export type { StorageInspector } from './data-management/storage-inspector';
export type { ReinitializableService } from './data-management/reinitializable-service';
