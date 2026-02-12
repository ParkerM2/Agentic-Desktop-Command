/**
 * Terminal-related types
 */

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  projectPath?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TerminalOutput {
  sessionId: string;
  data: string;
  timestamp: string;
}
