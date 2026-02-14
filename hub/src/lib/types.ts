// Domain types for the Hub API

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  settings: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  device_id: string | null;
  refresh_token_hash: string;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

export interface Device {
  id: string;
  machine_id: string | null;
  user_id: string;
  device_type: 'desktop' | 'mobile' | 'web';
  device_name: string;
  capabilities: string; // JSON
  is_online: number; // SQLite boolean
  last_seen: string | null;
  app_version: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  host_device_id: string | null;
  settings: string | null; // JSON
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  workspace_id: string | null;
  git_url: string | null;
  repo_structure: 'single' | 'monorepo' | 'multi-repo';
  default_branch: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubProject {
  id: string;
  project_id: string;
  name: string;
  relative_path: string;
  git_url: string | null;
  default_branch: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  workspace_id: string | null;
  sub_project_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: number;
  assigned_device_id: string | null;
  created_by_device_id: string | null;
  execution_session_id: string | null;
  progress: string | null; // JSON
  metadata: string | null; // JSON
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

// Webhook command (stored in webhook_commands table)
export interface WebhookCommand {
  id: string;
  source: 'slack' | 'github' | 'manual';
  source_id: string | null;
  source_channel: string | null;
  source_url: string | null;
  command_text: string;
  project_id: string | null;
  status: 'pending' | 'processed' | 'failed';
  result_text: string | null;
  created_at: string;
  processed_at: string | null;
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
