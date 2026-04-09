import { describe, expect, it } from 'vitest';

import { domain, events } from '@shared/ipc/channel-builder';

describe('channel-builder', () => {
  describe('domain()', () => {
    it('builds nested channel constants from domain + verb/noun map', () => {
      const EXAMPLE = domain('example', {
        LIST: ['items', 'archived'],
        CREATE: ['item'],
        DELETE: ['item'],
      } as const);
      expect(EXAMPLE.LIST.ITEMS).toBe('example.list.items');
      expect(EXAMPLE.LIST.ARCHIVED).toBe('example.list.archived');
      expect(EXAMPLE.CREATE.ITEM).toBe('example.create.item');
      expect(EXAMPLE.DELETE.ITEM).toBe('example.delete.item');
    });

    it('handles single-noun verbs', () => {
      const SIMPLE = domain('auth', { LOGIN: ['user'] } as const);
      expect(SIMPLE.LOGIN.USER).toBe('auth.login.user');
    });

    it('handles hyphenated domain names', () => {
      const HYPHEN = domain('agent-dashboard', { SPAWN: ['owner'] } as const);
      expect(HYPHEN.SPAWN.OWNER).toBe('agent-dashboard.spawn.owner');
    });

    it('handles hyphenated noun names', () => {
      const COMPOUND = domain('workflow', { LIST: ['agent-defs'] } as const);
      expect(COMPOUND.LIST['AGENT-DEFS']).toBe('workflow.list.agent-defs');
    });
  });

  describe('events()', () => {
    it('builds event channel constants with event: prefix', () => {
      const EXAMPLE_EVENTS = events('example', {
        ITEM: ['created', 'updated', 'deleted'],
      } as const);
      expect(EXAMPLE_EVENTS.ITEM.CREATED).toBe('event:example.item.created');
      expect(EXAMPLE_EVENTS.ITEM.UPDATED).toBe('event:example.item.updated');
      expect(EXAMPLE_EVENTS.ITEM.DELETED).toBe('event:example.item.deleted');
    });
  });
});
