/**
 * Shared types barrel export
 * All domain types used across main, preload, and renderer
 */

export type * from './agent';
export type * from './alert';
export type * from './assistant';
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
export type * from './screen';
export * from './notifications';

/**
 * Generic IPC result wrapper
 */
export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
