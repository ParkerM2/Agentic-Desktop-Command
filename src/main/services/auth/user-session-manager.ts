/**
 * User Session Manager
 *
 * Tracks the currently logged-in user and emits events on login/logout.
 * Services subscribe to these events to reinitialize with user-scoped paths.
 */

import type { IpcRouter } from '@main/ipc/router';

export interface UserSession {
  userId: string;
  email: string;
}

export interface UserSessionManager {
  /** Get current session, or null if not logged in. */
  getCurrentSession: () => UserSession | null;
  /** Called when user logs in successfully. */
  setSession: (session: UserSession) => void;
  /** Called when user logs out. */
  clearSession: () => void;
  /** Subscribe to session changes. Returns unsubscribe function. */
  onSessionChange: (callback: (session: UserSession | null) => void) => () => void;
}

export function createUserSessionManager(router: IpcRouter): UserSessionManager {
  let currentSession: UserSession | null = null;
  const listeners = new Set<(session: UserSession | null) => void>();

  function notifyListeners(): void {
    for (const listener of listeners) {
      listener(currentSession);
    }
  }

  return {
    getCurrentSession() {
      return currentSession;
    },

    setSession(session) {
      currentSession = session;
      router.emit('event:user.sessionChanged', { userId: session.userId, email: session.email });
      notifyListeners();
    },

    clearSession() {
      currentSession = null;
      router.emit('event:user.sessionChanged', { userId: null, email: null });
      notifyListeners();
    },

    onSessionChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
