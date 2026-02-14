/**
 * Auth IPC handlers — stub implementation returning mock data
 */

import type { IpcRouter } from '../router';

const MOCK_USER = {
  id: 'usr_mock_001',
  email: 'user@example.com',
  displayName: 'Mock User',
};

const MOCK_TOKEN = 'mock-jwt-token-stub';

export function registerAuthHandlers(router: IpcRouter): void {
  router.handle('auth.login', ({ email }) =>
    Promise.resolve({
      token: MOCK_TOKEN,
      user: { ...MOCK_USER, email },
    }),
  );

  router.handle('auth.register', ({ email, displayName }) =>
    Promise.resolve({
      token: MOCK_TOKEN,
      user: { ...MOCK_USER, email, displayName },
    }),
  );

  router.handle('auth.me', () => Promise.resolve(MOCK_USER));

  router.handle('auth.logout', () => Promise.resolve({ success: true }));

  router.handle('auth.refresh', () => Promise.resolve({ token: MOCK_TOKEN }));
}
