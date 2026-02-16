/**
 * Assistant Watch Types — Persistent subscriptions for proactive notifications
 *
 * A watch is a user-defined trigger: "tell me when task 123 is done" creates
 * a watch that fires when the task status changes to 'done'. One-shot by default.
 */

export type WatchType =
  | 'task_status'
  | 'task_completed'
  | 'agent_error'
  | 'qa_result'
  | 'device_status';

export type WatchOperator = 'equals' | 'changes' | 'any';

export type WatchAction = 'notify' | 'speak' | 'notify_and_speak';

export interface WatchCondition {
  field: string;
  operator: WatchOperator;
  value?: string;
}

export interface AssistantWatch {
  id: string;
  type: WatchType;
  targetId: string;
  condition: WatchCondition;
  action: WatchAction;
  followUp?: string;
  createdAt: string;
  triggered: boolean;
  expiresAt?: string;
}
