/**
 * Shared types barrel export
 * All domain types used across main, preload, and renderer
 */

export type * from './agent';
export type * from './alert';
export type * from './assistant';
export type * from './assistant-watch';
export type * from './auth';
export type * from './claude';
export type * from './changelog';
export type * from './email';
export type * from './fitness';
export type * from './git';
export type * from './github';
export type * from './hub-connection';
export type * from './idea';
export type * from './insights';
export type * from './milestone';
export type * from './note';
export type * from './planner';
export type * from './project';
export type * from './settings';
export type * from './task';
export type * from './terminal';
export type * from './voice';
export type * from './screen';
export type * from './briefing';
export type * from './health';
export type * from './workspace';
export type * from './hub-events';
export * from './notifications';
export { HUB_EVENT_CHANNELS } from './hub-events';
export { VOICE_LANGUAGES, DEFAULT_VOICE_CONFIG } from './voice';

/**
 * Generic IPC result wrapper
 */
export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
