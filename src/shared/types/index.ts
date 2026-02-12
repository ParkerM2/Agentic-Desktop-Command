/**
 * Shared types barrel export
 * All domain types used across main, preload, and renderer
 */

export type * from './task';
export type * from './project';
export type * from './terminal';
export type * from './settings';
export type * from './agent';
export type * from './hub-connection';

/**
 * Generic IPC result wrapper
 */
export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
