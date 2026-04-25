import { domain, events } from '../channel-builder';

export const PEERS = domain('peers', {
  LIST: ['paired', 'discovered'],
  PAIR: ['init', 'confirm'],
  REVOKE: ['peer'],
  IDENTITY: ['get'],
});

export const PEERS_EVENTS = events('peers', {
  PIN: ['issued'],
  DISCOVERY: ['changed'],
  TRUST: ['changed'],
});
