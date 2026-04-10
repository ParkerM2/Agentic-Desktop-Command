/**
 * App IPC Schemas
 *
 * Consolidated schemas for the app domain, including health monitoring,
 * Docker setup, and window control. Re-exports from the standalone domain
 * schema files to maintain backwards compatibility while the standalone
 * directories are present.
 */

// ─── Health schemas ───────────────────────────────────────────
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
} from '../health/schemas';

// ─── Docker schemas ───────────────────────────────────────────
export { DockerHubSetupResultSchema, DockerStatusSchema } from '../docker/schemas';

// ─── Window schemas ───────────────────────────────────────────
export { WindowEmptyInputSchema, WindowIsMaximizedOutputSchema } from '../window/schemas';
