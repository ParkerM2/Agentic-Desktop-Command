import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { isPackaged: false },
}));

import { closeDatabase, initDatabase } from '@main/db';
import { createNotesService } from '@main/services/notes/notes-service';

const migrationsFolder = join(__dirname, '../../../drizzle');

describe('NotesService (SQLite)', () => {
  let tempDir: string;
  let service: ReturnType<typeof createNotesService>;
  const router = { emit: vi.fn() } as unknown as Parameters<typeof createNotesService>[0]['router'];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'adc-notes-test-'));
    const db = initDatabase(tempDir, { migrationsFolder });
    service = createNotesService({ db, router, dataDir: tempDir });
  });

  afterEach(() => {
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists notes (empty)', () => {
    expect(service.listNotes({})).toEqual([]);
  });

  it('creates a note', () => {
    const note = service.createNote({ title: 'Test', content: 'Body' });
    expect(note.title).toBe('Test');
    expect(note.content).toBe('Body');
    expect(note.tags).toEqual([]);
    expect(note.pinned).toBe(false);
    expect(router.emit).toHaveBeenCalled();
  });

  it('updates a note', () => {
    const note = service.createNote({ title: 'Original', content: 'Body' });
    const updated = service.updateNote(note.id, { title: 'Updated', pinned: true });
    expect(updated.title).toBe('Updated');
    expect(updated.pinned).toBe(true);
    expect(updated.content).toBe('Body');
  });

  it('deletes a note', () => {
    const note = service.createNote({ title: 'Delete me', content: '' });
    service.deleteNote(note.id);
    expect(service.listNotes({})).toHaveLength(0);
  });

  it('throws on update of nonexistent note', () => {
    expect(() => service.updateNote('nonexistent', { title: 'x' })).toThrow('Note not found');
  });

  it('sorts pinned first, then by updatedAt desc', () => {
    const n1 = service.createNote({ title: 'Old', content: '' });
    const n2 = service.createNote({ title: 'New', content: '' });
    service.updateNote(n1.id, { pinned: true });
    const list = service.listNotes({});
    expect(list[0].title).toBe('Old'); // pinned
    expect(list[1].title).toBe('New');
  });

  it('filters by projectId', () => {
    service.createNote({ title: 'P1', content: '', projectId: 'proj-1' });
    service.createNote({ title: 'P2', content: '', projectId: 'proj-2' });
    const filtered = service.listNotes({ projectId: 'proj-1' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('P1');
  });

  it('filters by tag', () => {
    service.createNote({ title: 'Tagged', content: '', tags: ['important'] });
    service.createNote({ title: 'Untagged', content: '' });
    const filtered = service.listNotes({ tag: 'important' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Tagged');
  });

  it('searches notes case-insensitively', () => {
    service.createNote({ title: 'Meeting Notes', content: 'discussed ROADMAP' });
    service.createNote({ title: 'Shopping', content: 'eggs, milk' });
    const results = service.searchNotes('roadmap');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Meeting Notes');
  });

  it('migrates from JSON file', () => {
    closeDatabase();
    const tempDir2 = mkdtempSync(join(tmpdir(), 'adc-notes-migrate-'));
    writeFileSync(
      join(tempDir2, 'notes.json'),
      JSON.stringify({
        notes: [{
          id: 'n1', title: 'Migrated', content: 'Body',
          tags: ['test'], pinned: false,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        }],
      }),
    );
    const db2 = initDatabase(tempDir2, { migrationsFolder });
    const svc2 = createNotesService({ db: db2, router, dataDir: tempDir2 });
    const list = svc2.listNotes({});
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Migrated');
    expect(list[0].tags).toEqual(['test']);
    closeDatabase();
    rmSync(tempDir2, { recursive: true, force: true });
  });
});
