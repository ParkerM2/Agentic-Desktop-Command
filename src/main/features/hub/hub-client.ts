/**
 * Hub REST API Client
 *
 * HTTP client for communicating with the hub backend.
 * Wraps fetch calls with API key authentication, error handling,
 * and typed responses for each hub API endpoint.
 */

import type { HubConnection } from '@shared/types';

/** Generic API response — either success with data or error with message. */
export interface HubApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/** Hub project entity matching the backend schema. */
export interface HubProject {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

/** Hub task entity matching the backend schema. */
export interface HubTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

/** Hub planner event entity matching the backend schema. */
export interface HubPlannerEvent {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  category: string;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Hub capture entity matching the backend schema. */
export interface HubCapture {
  id: string;
  text: string;
  project_id: string | null;
  created_at: string;
}

/** Hub agent run entity matching the backend schema. */
export interface HubAgentRun {
  id: string;
  task_id: string | null;
  project_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  tokens_used: number;
  cost_usd: number;
  log: string;
}

export interface HubClient {
  /** Check if the hub server is reachable. */
  healthCheck: () => Promise<HubApiResult<{ status: string; timestamp: string }>>;

  // ── Projects ──
  listProjects: () => Promise<HubApiResult<HubProject[]>>;
  getProject: (id: string) => Promise<HubApiResult<HubProject>>;
  createProject: (data: { name: string; path: string }) => Promise<HubApiResult<HubProject>>;
  updateProject: (
    id: string,
    data: Partial<Pick<HubProject, 'name' | 'path'>>,
  ) => Promise<HubApiResult<HubProject>>;
  deleteProject: (id: string) => Promise<HubApiResult<void>>;

  // ── Tasks ──
  listTasks: (projectId?: string) => Promise<HubApiResult<HubTask[]>>;
  getTask: (id: string) => Promise<HubApiResult<HubTask>>;
  createTask: (data: {
    project_id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: number;
  }) => Promise<HubApiResult<HubTask>>;
  updateTask: (
    id: string,
    data: Partial<Pick<HubTask, 'title' | 'description' | 'status' | 'priority' | 'project_id'>>,
  ) => Promise<HubApiResult<HubTask>>;
  deleteTask: (id: string) => Promise<HubApiResult<void>>;
  updateTaskStatus: (id: string, status: string) => Promise<HubApiResult<HubTask>>;

  // ── Planner ──
  listPlannerEvents: (date?: string, endDate?: string) => Promise<HubApiResult<HubPlannerEvent[]>>;
  createPlannerEvent: (data: {
    date: string;
    start_time: string;
    end_time: string;
    title: string;
    category?: string;
    task_id?: string;
  }) => Promise<HubApiResult<HubPlannerEvent>>;
  updatePlannerEvent: (
    id: string,
    data: Partial<
      Pick<HubPlannerEvent, 'date' | 'start_time' | 'end_time' | 'title' | 'category' | 'task_id'>
    >,
  ) => Promise<HubApiResult<HubPlannerEvent>>;
  deletePlannerEvent: (id: string) => Promise<HubApiResult<void>>;

  // ── Captures ──
  listCaptures: (limit?: number) => Promise<HubApiResult<HubCapture[]>>;
  createCapture: (data: { text: string; project_id?: string }) => Promise<HubApiResult<HubCapture>>;
  deleteCapture: (id: string) => Promise<HubApiResult<void>>;

  // ── Agent Runs ──
  listAgentRuns: (projectId?: string) => Promise<HubApiResult<HubAgentRun[]>>;
  createAgentRun: (data: {
    project_id: string;
    task_id?: string;
    status?: string;
    tokens_used?: number;
    cost_usd?: number;
    log?: string;
  }) => Promise<HubApiResult<HubAgentRun>>;
  updateAgentRun: (
    id: string,
    data: Partial<
      Pick<HubAgentRun, 'status' | 'completed_at' | 'tokens_used' | 'cost_usd' | 'log'>
    >,
  ) => Promise<HubApiResult<HubAgentRun>>;

  // ── Settings ──
  getSettings: () => Promise<HubApiResult<Record<string, string>>>;
  updateSettings: (data: Record<string, string>) => Promise<HubApiResult<Record<string, string>>>;
}

async function makeRequest<T>(
  baseUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<HubApiResult<T>> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 204) {
      return { success: true };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const parsed = JSON.parse(errorBody) as { error?: string };
        errorMessage = parsed.error ?? `HTTP ${String(response.status)}`;
      } catch {
        errorMessage = `HTTP ${String(response.status)}: ${errorBody}`;
      }
      return { success: false, error: errorMessage, statusCode: response.status };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return { success: false, error: message };
  }
}

export function createHubClient(getConnection: () => HubConnection | null): HubClient {
  function request<T>(method: string, path: string, body?: unknown): Promise<HubApiResult<T>> {
    const conn = getConnection();
    if (!conn) {
      return Promise.resolve({ success: false, error: 'Hub not configured' });
    }
    if (!conn.enabled) {
      return Promise.resolve({ success: false, error: 'Hub connection disabled' });
    }
    return makeRequest<T>(conn.hubUrl, conn.apiKey, method, path, body);
  }

  return {
    healthCheck: () => request('GET', '/api/health'),

    // ── Projects ──
    listProjects: () => request('GET', '/api/projects'),
    getProject: (id) => request('GET', `/api/projects/${id}`),
    createProject: (data) => request('POST', '/api/projects', data),
    updateProject: (id, data) => request('PUT', `/api/projects/${id}`, data),
    deleteProject: (id) => request('DELETE', `/api/projects/${id}`),

    // ── Tasks ──
    listTasks: (projectId) => {
      const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      return request('GET', `/api/tasks${query}`);
    },
    getTask: (id) => request('GET', `/api/tasks/${id}`),
    createTask: (data) => request('POST', '/api/tasks', data),
    updateTask: (id, data) => request('PUT', `/api/tasks/${id}`, data),
    deleteTask: (id) => request('DELETE', `/api/tasks/${id}`),
    updateTaskStatus: (id, status) => request('PATCH', `/api/tasks/${id}/status`, { status }),

    // ── Planner ──
    listPlannerEvents: (date, endDate) => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (endDate) params.set('end_date', endDate);
      const query = params.toString();
      return request('GET', `/api/planner/events${query ? `?${query}` : ''}`);
    },
    createPlannerEvent: (data) => request('POST', '/api/planner/events', data),
    updatePlannerEvent: (id, data) => request('PUT', `/api/planner/events/${id}`, data),
    deletePlannerEvent: (id) => request('DELETE', `/api/planner/events/${id}`),

    // ── Captures ──
    listCaptures: (limit) => {
      const query = limit === undefined ? '' : `?limit=${String(limit)}`;
      return request('GET', `/api/captures${query}`);
    },
    createCapture: (data) => request('POST', '/api/captures', data),
    deleteCapture: (id) => request('DELETE', `/api/captures/${id}`),

    // ── Agent Runs ──
    listAgentRuns: (projectId) => {
      const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      return request('GET', `/api/agent-runs${query}`);
    },
    createAgentRun: (data) => request('POST', '/api/agent-runs', data),
    updateAgentRun: (id, data) => request('PUT', `/api/agent-runs/${id}`, data),

    // ── Settings ──
    getSettings: () => request('GET', '/api/settings'),
    updateSettings: (data) => request('PUT', '/api/settings', data),
  };
}
