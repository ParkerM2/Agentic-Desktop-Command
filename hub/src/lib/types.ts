// Domain types for the Hub API

export interface Project {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description: string;
  status: string;
  sort_order: number;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface PlannerEvent {
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

export interface Capture {
  id: string;
  text: string;
  project_id: string | null;
  created_at: string;
}

export interface AgentRun {
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

export interface ApiKey {
  id: string;
  key_hash: string;
  name: string;
  created_at: string;
}

// WebSocket broadcast message
export interface WsBroadcastMessage {
  type: 'mutation';
  entity: string;
  action: 'created' | 'updated' | 'deleted';
  id: string;
  data: unknown;
  timestamp: string;
}
