import { domain, events } from '../channel-builder';

const HUB_BUILDER = domain('hub', {
  CONNECT: ['server'],
  DISCONNECT: ['server'],
  GET: ['status', 'config'],
  SYNC: ['data'],
  REMOVE: ['config', 'record'],
  GENERATE: ['key'],
  DISCOVERED: ['list'],
  PAIR: ['request'],
  SWITCH: ['active'],
  MANUAL: ['pair'],
});

export const HUB = HUB_BUILDER;

const HUB_EVENTS_BUILDER = events('hub', {
  CONNECTION: ['changed'],
  SYNC: ['completed'],
  DEVICE: ['online', 'offline'],
  WORKSPACE: ['updated'],
  PROJECT: ['updated'],
  DISCOVERY: ['changed'],
  ACTIVE: ['changed'],
});

export const HUB_EVENTS = {
  ...HUB_EVENTS_BUILDER,
  REVOKED: 'event:hub.revoked',
} as const;
