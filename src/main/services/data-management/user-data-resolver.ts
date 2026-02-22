/**
 * User Data Path Resolver
 *
 * Provides user-scoped data directory paths. User data is stored in
 * `<userData>/users/<userId>/` to isolate data between Hub accounts.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface UserDataResolver {
  /** Get the data directory for a specific user. Creates if needed. */
  getUserDataDir: (userId: string) => string;
  /** Get the global data directory (for non-user-scoped data). */
  getGlobalDataDir: () => string;
  /** Check if a user data directory exists. */
  userDataExists: (userId: string) => boolean;
}

export function createUserDataResolver(baseDataDir: string): UserDataResolver {
  const usersDir = join(baseDataDir, 'users');

  function getUserDataDir(userId: string): string {
    if (!userId) {
      throw new Error('userId is required for user-scoped data');
    }
    const userDir = join(usersDir, userId);
    if (!existsSync(userDir)) {
      mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  function getGlobalDataDir(): string {
    return baseDataDir;
  }

  function userDataExists(userId: string): boolean {
    if (!userId) return false;
    return existsSync(join(usersDir, userId));
  }

  return {
    getUserDataDir,
    getGlobalDataDir,
    userDataExists,
  };
}
