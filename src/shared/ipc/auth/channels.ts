import { domain, events } from '../channel-builder';

export const AUTH = domain('auth', {
  LOGIN: ['user'],
  LOGOUT: ['user'],
  REGISTER: ['user'],
  REFRESH: ['token'],
  GET: ['user'],
  RESTORE: ['session'],
});

export const AUTH_EVENTS = events('auth', {
  SESSION: ['changed'],
});
