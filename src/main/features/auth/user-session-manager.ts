/**
 * User Session Manager
 *
 * Tracks the currently logged-in user (local-only — no Hub coupling).
 * Services subscribe to in-process callbacks to reinitialize with
 * user-scoped paths when the session changes.
 */

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

export function createUserSessionManager(): UserSessionManager {
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
      notifyListeners();
    },

    clearSession() {
      currentSession = null;
      notifyListeners();
    },

    onSessionChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
