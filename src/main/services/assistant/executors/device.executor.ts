/**
 * Device executor — handles cross-device status queries via Hub API.
 */

import type { AssistantResponse } from '@shared/types';

import { buildActionResponse, buildErrorResponse, UNKNOWN_ERROR } from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';

export async function executeDeviceQuery(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  if (deps.crossDeviceQuery === undefined) {
    return buildErrorResponse('Cross-device queries are not available. Hub connection required.');
  }

  try {
    const deviceName = intent.extractedEntities.deviceName || '';
    const result = await deps.crossDeviceQuery.query(deviceName);
    return buildActionResponse(result, intent, 'device_query');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Device query failed: ${message}`);
  }
}
