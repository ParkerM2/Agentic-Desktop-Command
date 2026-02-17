/**
 * Launcher executor — handles "open" and "launch" URL commands.
 */

import { shell } from 'electron';

import type { AssistantResponse } from '@shared/types';

import { buildActionResponse, buildTextResponse } from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';

export async function handleLauncher(intent: ClassifiedIntent): Promise<AssistantResponse> {
  const target = intent.extractedEntities.target || '';
  if (target.length > 0) {
    await shell.openExternal(target.startsWith('http') ? target : `https://${target}`);
    return buildActionResponse(`Opened: ${target}`, intent, 'open_url');
  }
  return buildTextResponse('Please specify what to open.');
}
