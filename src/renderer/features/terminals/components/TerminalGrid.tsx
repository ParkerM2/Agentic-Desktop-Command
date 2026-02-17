/**
 * TerminalGrid — Multi-terminal view with tabs
 *
 * Uses xterm.js for terminal rendering via TerminalInstance.
 */

import { useEffect } from 'react';

import { Plus, X, Terminal as TerminalIcon, Loader2 } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';
import { cn } from '@renderer/shared/lib/utils';

import { useTerminals, useCreateTerminal, useCloseTerminal } from '../api/useTerminals';
import { useTerminalEvents } from '../hooks/useTerminalEvents';
import { useTerminalUI } from '../store';

import { TerminalInstance } from './TerminalInstance';

export function TerminalGrid() {
  const params = useLooseParams();
  const { data: terminals, isLoading } = useTerminals();
  const createTerminal = useCreateTerminal();
  const closeTerminal = useCloseTerminal();
  const { activeTerminalId, setActiveTerminal } = useTerminalUI();

  // Register real-time event listeners
  useTerminalEvents();

  // Auto-select first terminal if none active
  useEffect(() => {
    if (!activeTerminalId && terminals && terminals.length > 0) {
      setActiveTerminal(terminals[0].id);
    }
  }, [activeTerminalId, terminals, setActiveTerminal]);

  function handleCreateTerminal() {
    createTerminal.mutate({
      cwd: '~',
      projectPath: params.projectId,
    });
  }

  function handleCloseTerminal(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    closeTerminal.mutate(sessionId);
    // If closing active terminal, switch to next one
    if (activeTerminalId === sessionId) {
      const remaining = terminals?.filter((t) => t.id !== sessionId);
      setActiveTerminal(remaining?.[0]?.id ?? null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Terminal tabs */}
      <div className="border-border bg-card flex items-center gap-px border-b px-2">
        {terminals?.map((term) => (
          <button
            key={term.id}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 text-sm transition-colors',
              activeTerminalId === term.id
                ? 'border-primary text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTerminal(term.id)}
          >
            <TerminalIcon className="h-3.5 w-3.5" />
            <span>{term.name || `Terminal ${term.id.slice(0, 6)}`}</span>
            <span
              className="hover:bg-muted rounded p-0.5 opacity-0 group-hover:opacity-100"
              role="button"
              tabIndex={0}
              onClick={(e) => handleCloseTerminal(e, term.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCloseTerminal(e as unknown as React.MouseEvent, term.id);
                }
              }}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
        <button
          className="text-muted-foreground hover:bg-accent hover:text-foreground ml-1 rounded p-1.5"
          title="New terminal"
          onClick={handleCreateTerminal}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Terminal content area */}
      <div className="relative flex-1 bg-[#0a0a0a]">
        {terminals?.map((term) => (
          <TerminalInstance key={term.id} isActive={term.id === activeTerminalId} session={term} />
        ))}

        {/* Empty state */}
        {(terminals === undefined || terminals.length === 0) && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
            <TerminalIcon className="h-8 w-8" />
            <p className="text-sm">No terminal open</p>
            <button
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
              onClick={handleCreateTerminal}
            >
              Create Terminal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
