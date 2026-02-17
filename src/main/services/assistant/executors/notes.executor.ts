/**
 * Notes executor — handles note creation, standup logs, and note queries.
 */

import type { AssistantResponse } from '@shared/types';

import {
  buildActionResponse,
  buildErrorResponse,
  buildTextResponse,
  UNKNOWN_ERROR,
} from './response-builders';

import type { CommandExecutorDeps } from './types';
import type { NotesService } from '../../notes/notes-service';
import type { ClassifiedIntent } from '../intent-classifier';

export function handleNotes(
  intent: ClassifiedIntent,
  notesService: NotesService,
): AssistantResponse {
  const content = intent.extractedEntities.content || intent.originalInput;
  const note = notesService.createNote({ title: content.slice(0, 80), content });
  return buildActionResponse(`Note created: "${note.title}"`, intent, 'create_note');
}

export function handleStandup(
  intent: ClassifiedIntent,
  notesService: NotesService,
): AssistantResponse {
  const raw = intent.extractedEntities.raw || intent.originalInput;
  const note = notesService.createNote({
    title: `Standup ${new Date().toLocaleDateString()}`,
    content: raw,
    tags: ['standup'],
  });
  return buildActionResponse(`Standup logged: "${note.title}"`, intent, 'create_note');
}

export function executeNotes(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.notesService) {
    return buildErrorResponse('Notes service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'search': {
        const query = intent.extractedEntities.query || intent.originalInput;
        const results = deps.notesService.searchNotes(query);
        if (results.length === 0) {
          return buildTextResponse(`No notes found matching "${query}".`);
        }
        const lines = results.slice(0, 5).map((n) => `- ${n.title}`);
        const moreText = results.length > 5 ? `\n...and ${String(results.length - 5)} more` : '';
        return buildActionResponse(
          `Found ${String(results.length)} note(s):\n${lines.join('\n')}${moreText}`,
          intent,
          'notes_search',
        );
      }
      case 'list': {
        const notes = deps.notesService.listNotes({});
        if (notes.length === 0) {
          return buildTextResponse('No notes yet.');
        }
        const lines = notes.slice(0, 5).map((n) => `- ${n.title}`);
        const moreText = notes.length > 5 ? `\n...and ${String(notes.length - 5)} more` : '';
        return buildActionResponse(
          `Notes (${String(notes.length)} total):\n${lines.join('\n')}${moreText}`,
          intent,
          'notes_list',
        );
      }
      default:
        return buildTextResponse(
          'I understood that as a notes command, but could not determine the action.',
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Notes command failed: ${message}`);
  }
}
