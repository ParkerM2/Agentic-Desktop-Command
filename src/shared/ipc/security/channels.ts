import { domain } from '../channel-builder';

export const SECURITY = domain('security', {
  GET: ['settings'],
  UPDATE: ['settings'],
  EXPORT: ['audit'],
});
