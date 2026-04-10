export interface ValidationCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export interface AdcConfig {
  dataDir: string | null;
  previousDataDir: string | null;
  pendingMigration: boolean;
  confirmedNonEmpty: boolean;
}

export interface DataDirInfo {
  current: string;
  isCustom: boolean;
}
