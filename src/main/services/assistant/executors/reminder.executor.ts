/**
 * Reminder executor — handles reminder/alert creation.
 */

import type { AssistantResponse } from '@shared/types';

import { buildActionResponse } from './response-builders';

import type { AlertService } from '../../alerts/alert-service';
import type { ClassifiedIntent } from '../intent-classifier';

export function handleReminder(
  intent: ClassifiedIntent,
  alertService: AlertService,
): AssistantResponse {
  const message = intent.extractedEntities.content || intent.originalInput;
  const triggerAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const alert = alertService.createAlert({ type: 'reminder', message, triggerAt });
  return buildActionResponse(`Reminder set: "${alert.message}"`, intent, 'create_reminder');
}
