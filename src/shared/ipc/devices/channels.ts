import { domain } from '../channel-builder';

export const DEVICES = domain('devices', {
  LIST: ['all'],
  REGISTER: ['device'],
  HEARTBEAT: ['device'],
  UPDATE: ['device'],
});
