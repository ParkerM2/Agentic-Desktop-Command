/**
 * Agents IPC — Barrel Export
 *
 * Re-exports orchestrator schemas and contract definitions.
 */

export {
  AgentPhaseSchema,
  AgentSessionStatusSchema,
  OrchestratorSessionSchema,
} from './schemas';

export {
  orchestratorEvents,
  orchestratorInvoke,
} from './contract';
