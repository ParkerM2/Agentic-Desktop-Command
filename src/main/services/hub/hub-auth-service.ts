/**
 * Hub Auth Service — User authentication against the Hub server
 *
 * Handles login, registration, logout, token refresh, and current user retrieval.
 * Uses the shared TokenStore for secure token persistence (provider: 'hub').
 */

import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

import type {
  AuthLoginRequest,
  AuthRefreshResponse,
  AuthRegisterRequest,
  AuthResponse,
  User,
} from '@shared/types/hub-protocol';

import type { TokenStore } from '@main/auth/token-store';
import { hubLogger } from '@main/lib/logger';

// ─── Result type ────────────────────────────────────────────

export interface HubAuthResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ─── Service interface ──────────────────────────────────────

export interface HubAuthService {
  login: (data: { email: string; password: string }) => Promise<HubAuthResult<AuthResponse>>;
  register: (data: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<HubAuthResult<AuthResponse>>;
  logout: () => Promise<HubAuthResult<{ success: boolean }>>;
  getCurrentUser: () => Promise<HubAuthResult<User>>;
  refreshToken: () => Promise<HubAuthResult<AuthRefreshResponse>>;
  getAccessToken: () => string | null;
  isAuthenticated: () => boolean;
}

// ─── Internal HTTP helper ───────────────────────────────────

function makeRequest<T>(
  baseUrl: string,
  method: string,
  path: string,
  body?: unknown,
  accessToken?: string,
): Promise<HubAuthResult<T>> {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const doRequest = isHttps ? httpsRequest : httpRequest;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    if (bodyString !== undefined) {
      headers['Content-Length'] = String(Buffer.byteLength(bodyString));
    }

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = doRequest(options, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        const statusCode = res.statusCode ?? 0;

        if (statusCode === 204) {
          resolve({ ok: true, statusCode });
          return;
        }

        if (statusCode >= 200 && statusCode < 300) {
          try {
            const data = JSON.parse(rawBody) as T;
            resolve({ ok: true, data, statusCode });
          } catch {
            resolve({ ok: false, error: 'Invalid JSON response', statusCode });
          }
          return;
        }

        // Error response
        let errorMessage: string;
        try {
          const parsed = JSON.parse(rawBody) as { error?: string | { message?: string } };
          if (typeof parsed.error === 'string') {
            errorMessage = parsed.error;
          } else if (parsed.error === undefined) {
            errorMessage = `HTTP ${String(statusCode)}`;
          } else {
            errorMessage = parsed.error.message ?? `HTTP ${String(statusCode)}`;
          }
        } catch {
          errorMessage = `HTTP ${String(statusCode)}: ${rawBody.slice(0, 200)}`;
        }

        resolve({ ok: false, error: errorMessage, statusCode });
      });
    });

    req.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });

    if (bodyString !== undefined) {
      req.write(bodyString);
    }

    req.end();
  });
}

// ─── Factory ────────────────────────────────────────────────

const HUB_PROVIDER = 'hub';

export interface HubAuthServiceDeps {
  tokenStore: TokenStore;
  getHubUrl: () => string | null;
}

export function createHubAuthService(deps: HubAuthServiceDeps): HubAuthService {
  const { tokenStore, getHubUrl } = deps;

  function getBaseUrl(): string {
    const hubUrl = getHubUrl();
    if (!hubUrl) {
      throw new Error('Hub URL not configured');
    }
    return hubUrl;
  }

  function storeTokens(response: AuthResponse): void {
    tokenStore.setTokens(HUB_PROVIDER, {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt,
      tokenType: 'Bearer',
    });
  }

  return {
    async login(data) {
      const baseUrl = getBaseUrl();
      const requestBody: AuthLoginRequest = {
        email: data.email,
        password: data.password,
      };

      const result = await makeRequest<AuthResponse>(
        baseUrl,
        'POST',
        '/api/auth/login',
        requestBody,
      );

      if (result.ok && result.data) {
        storeTokens(result.data);
      }

      return result;
    },

    async register(data) {
      const baseUrl = getBaseUrl();
      const requestBody: AuthRegisterRequest = {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      };

      const result = await makeRequest<AuthResponse>(
        baseUrl,
        'POST',
        '/api/auth/register',
        requestBody,
      );

      if (result.ok && result.data) {
        storeTokens(result.data);
      }

      return result;
    },

    async logout() {
      const tokens = tokenStore.getTokens(HUB_PROVIDER);
      const accessToken = tokens?.accessToken;

      // Try to call server logout, but clear local tokens regardless
      try {
        if (accessToken) {
          const baseUrl = getBaseUrl();
          await makeRequest<{ success: boolean }>(
            baseUrl,
            'POST',
            '/api/auth/logout',
            {},
            accessToken,
          );
        }
      } catch {
        hubLogger.warn('[HubAuth] Server logout failed, clearing local tokens anyway');
      }

      tokenStore.deleteTokens(HUB_PROVIDER);
      return { ok: true, data: { success: true } };
    },

    async getCurrentUser() {
      const tokens = tokenStore.getTokens(HUB_PROVIDER);
      if (!tokens?.accessToken) {
        return { ok: false, error: 'Not authenticated' };
      }

      const baseUrl = getBaseUrl();
      // Hub returns { user: User, device?: Device } — extract the user field
      const result = await makeRequest<{ user: User }>(
        baseUrl,
        'GET',
        '/api/auth/me',
        undefined,
        tokens.accessToken,
      );

      if (result.ok && result.data) {
        return { ok: true, data: result.data.user, statusCode: result.statusCode };
      }

      return { ok: result.ok, error: result.error, statusCode: result.statusCode };
    },

    async refreshToken() {
      const tokens = tokenStore.getTokens(HUB_PROVIDER);
      if (!tokens?.refreshToken) {
        return { ok: false, error: 'No refresh token available' };
      }

      const baseUrl = getBaseUrl();
      const result = await makeRequest<AuthRefreshResponse>(
        baseUrl,
        'POST',
        '/api/auth/refresh',
        { refreshToken: tokens.refreshToken },
      );

      if (result.ok && result.data) {
        // Store the rotated refresh token from the Hub response
        tokenStore.setTokens(HUB_PROVIDER, {
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          expiresAt: result.data.expiresAt,
          tokenType: 'Bearer',
        });
      } else {
        // Refresh failed, clear tokens
        tokenStore.deleteTokens(HUB_PROVIDER);
      }

      return result;
    },

    getAccessToken() {
      const tokens = tokenStore.getTokens(HUB_PROVIDER);
      return tokens?.accessToken ?? null;
    },

    isAuthenticated() {
      return tokenStore.hasTokens(HUB_PROVIDER);
    },
  };
}
