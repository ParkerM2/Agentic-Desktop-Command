/**
 * Relay IPC Channel Constants
 *
 * Channel definitions for the hub relay system — project claiming,
 * remote session management, and claim lifecycle.
 */

import { domain, events } from '../channel-builder';

export const RELAY = domain('relay', {
  CLAIM: ['project'],
  RELEASE: ['project'],
  RECLAIM: ['project'],
  SPAWN: ['session'],
  SEND: ['input'],
  LIST: ['sessions'],
  GET: ['buffer'],
  RENEW: ['claim'],
});

export const RELAY_EVENTS = events('relay', {
  PROJECT: ['claimed', 'unclaimed'],
  SESSION: ['spawned', 'output', 'ended'],
  CLAIM: ['reclaimed'],
});
