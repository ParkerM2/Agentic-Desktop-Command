import { domain } from '../channel-builder';

export const DOCKER = domain('docker', {
  GET: ['status'],
  SETUP: ['hub'],
  RESET: ['hub'],
});
