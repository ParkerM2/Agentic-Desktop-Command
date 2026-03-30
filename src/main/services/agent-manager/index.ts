/**
 * Agent Manager — Barrel Export
 *
 * Re-exports the public API for the agent-manager service module.
 */

export { createAgentManagerService } from './agent-manager-service';
export type { AgentManagerDeps, AgentManagerService } from './agent-manager-service';
export { createStreamJsonParser, extractToolCalls } from './stream-json-parser';
export type { StreamJsonParser } from './stream-json-parser';
export { createProcessManager } from './process-manager';
export type { ManagedProcess, ProcessManager } from './process-manager';
