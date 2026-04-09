import { domain, events } from '../channel-builder';

export const HUB = domain('hub', {
  CONNECT: ['server'],
  DISCONNECT: ['server'],
  GET: ['status', 'config'],
  SYNC: ['data'],
  REMOVE: ['config'],
});

export const HUB_EVENTS = events('hub', {
  CONNECTION: ['changed'],
  SYNC: ['completed'],
  DEVICE: ['online', 'offline'],
  WORKSPACE: ['updated'],
  PROJECT: ['updated'],
});
