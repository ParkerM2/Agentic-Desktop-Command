/**
 * useSavedLogins — persists email addresses in localStorage
 * so the login page can show click-to-fill badges.
 *
 * Passwords are intentionally NOT stored.
 */

const STORAGE_KEY = 'adc:saved-logins';

export interface SavedLogin {
  email: string;
}

function readFromStorage(): SavedLogin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedLogin =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).email === 'string',
    );
  } catch {
    return [];
  }
}

function writeToStorage(logins: SavedLogin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logins));
}

export function useSavedLogins() {
  const logins = readFromStorage();

  function saveLogin(email: string): void {
    const existing = readFromStorage().filter((l) => l.email !== email);
    writeToStorage([{ email }, ...existing]);
  }

  function removeLogin(email: string): void {
    writeToStorage(readFromStorage().filter((l) => l.email !== email));
  }

  return { logins, saveLogin, removeLogin };
}
