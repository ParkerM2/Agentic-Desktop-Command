/**
 * Hub API Client — Typed HTTP helpers
 *
 * Low-level helpers that make authenticated HTTP requests to the Hub server.
 * Uses node:http / node:https for zero external dependencies.
 * Each method returns a typed result with proper error handling.
 */

import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

import type {
  ProgressPushRequest,
  ProgressPushResponse,
  Task,
  TaskCreateRequest,
  TaskUpdateRequest,
  DeleteResponse,
} from '@shared/types/hub-protocol';

// ─── Result type ────────────────────────────────────────────

export interface HubApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ─── Client interface ───────────────────────────────────────

export interface HubApiClient {
  hubGet: <T>(path: string) => Promise<HubApiResponse<T>>;
  hubPost: <T>(path: string, body: unknown) => Promise<HubApiResponse<T>>;
  hubPatch: <T>(path: string, body: unknown) => Promise<HubApiResponse<T>>;
  hubPut: <T>(path: string, body: unknown) => Promise<HubApiResponse<T>>;
  hubDelete: (path: string) => Promise<HubApiResponse<DeleteResponse>>;

  // ── Typed task helpers ──
  listTasks: (query?: Record<string, string>) => Promise<HubApiResponse<{ tasks: Task[] }>>;
  getTask: (taskId: string) => Promise<HubApiResponse<Task>>;
  createTask: (body: TaskCreateRequest) => Promise<HubApiResponse<Task>>;
  updateTask: (taskId: string, body: TaskUpdateRequest) => Promise<HubApiResponse<Task>>;
  deleteTask: (taskId: string) => Promise<HubApiResponse<DeleteResponse>>;
  pushProgress: (
    taskId: string,
    body: ProgressPushRequest,
  ) => Promise<HubApiResponse<ProgressPushResponse>>;
}

// ─── Internal HTTP helper ───────────────────────────────────

function makeRequest<T>(
  baseUrl: string,
  accessToken: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<HubApiResponse<T>> {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const doRequest = isHttps ? httpsRequest : httpRequest;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(bodyString === undefined ? {} : { 'Content-Length': String(Buffer.byteLength(bodyString)) }),
      },
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
          } else if (typeof parsed.error === 'object') {
            errorMessage = parsed.error.message ?? `HTTP ${String(statusCode)}`;
          } else {
            errorMessage = `HTTP ${String(statusCode)}`;
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

export function createHubApiClient(
  getBaseUrl: () => string | null,
  getAccessToken: () => string | null,
): HubApiClient {
  function ensureConfig(): { baseUrl: string; token: string } {
    const baseUrl = getBaseUrl();
    const token = getAccessToken();
    if (!baseUrl || !token) {
      throw new Error('Hub not configured');
    }
    return { baseUrl, token };
  }

  function hubGet<T>(path: string): Promise<HubApiResponse<T>> {
    const { baseUrl, token } = ensureConfig();
    return makeRequest<T>(baseUrl, token, 'GET', path);
  }

  function hubPost<T>(path: string, body: unknown): Promise<HubApiResponse<T>> {
    const { baseUrl, token } = ensureConfig();
    return makeRequest<T>(baseUrl, token, 'POST', path, body);
  }

  function hubPatch<T>(path: string, body: unknown): Promise<HubApiResponse<T>> {
    const { baseUrl, token } = ensureConfig();
    return makeRequest<T>(baseUrl, token, 'PATCH', path, body);
  }

  function hubPut<T>(path: string, body: unknown): Promise<HubApiResponse<T>> {
    const { baseUrl, token } = ensureConfig();
    return makeRequest<T>(baseUrl, token, 'PUT', path, body);
  }

  function hubDelete(path: string): Promise<HubApiResponse<DeleteResponse>> {
    const { baseUrl, token } = ensureConfig();
    return makeRequest<DeleteResponse>(baseUrl, token, 'DELETE', path);
  }

  return {
    hubGet,
    hubPost,
    hubPatch,
    hubPut,
    hubDelete,

    listTasks(query) {
      const params = new URLSearchParams(query);
      const qs = params.toString();
      return hubGet(`/api/tasks${qs ? `?${qs}` : ''}`);
    },

    getTask(taskId) {
      return hubGet(`/api/tasks/${encodeURIComponent(taskId)}`);
    },

    createTask(body) {
      return hubPost('/api/tasks', body);
    },

    updateTask(taskId, body) {
      return hubPut(`/api/tasks/${encodeURIComponent(taskId)}`, body);
    },

    deleteTask(taskId) {
      return hubDelete(`/api/tasks/${encodeURIComponent(taskId)}`);
    },

    pushProgress(taskId, body) {
      return hubPost(`/api/tasks/${encodeURIComponent(taskId)}/progress`, body);
    },
  };
}
