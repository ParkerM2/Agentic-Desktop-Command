/**
 * AG-Grid module registration for tree shaking.
 * Only imports the modules needed by the task data grid.
 * ValidationModule is included in dev builds for helpful warnings.
 */

import {
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  CsvExportModule,
  HighlightChangesModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
} from 'ag-grid-community';

import type { Module } from 'ag-grid-community';

const MODULES: Module[] = [
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  TextFilterModule,
  NumberFilterModule,
  CellStyleModule,
  HighlightChangesModule,
  CsvExportModule,
  ValidationModule,
];

export function registerAgGridModules(): void {
  ModuleRegistry.registerModules(MODULES);
}
