/**
 * Health IPC — Barrel Export
 *
 * Re-exports all health-related schemas and contract definitions.
 */

export {
  ErrorCategorySchema,
  ErrorContextSchema,
  ErrorEntrySchema,
  ErrorSeveritySchema,
  ErrorStatsSchema,
  ErrorTierSchema,
  HealthStatusSchema,
  ServiceHealthSchema,
  ServiceHealthStatusSchema,
} from './schemas';

export { healthEvents, healthInvoke } from './contract';
