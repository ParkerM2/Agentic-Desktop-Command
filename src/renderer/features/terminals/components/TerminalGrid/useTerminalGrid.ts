import { useEffect } from 'react';

import { useLooseParams } from '@renderer/shared/hooks';

import { useTerminals, useCreateTerminal, useCloseTerminal } from '../../api/useTerminals';
import { useTerminalEvents } from '../../hooks/useTerminalEvents';
import { useTerminalUI } from '../../store';

export function useTerminalGrid() {
  const params = useLooseParams();
  const { data: terminals, isLoading } = useTerminals();
  const createTerminal = useCreateTerminal();
  const closeTerminal = useCloseTerminal();
  const { activeTerminalId, setActiveTerminal } = useTerminalUI();

  useTerminalEvents();

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
    if (activeTerminalId === sessionId) {
      const remaining = terminals?.filter((t) => t.id !== sessionId);
      setActiveTerminal(remaining?.[0]?.id ?? null);
    }
  }

  return {
    terminals,
    isLoading,
    activeTerminalId,
    setActiveTerminal,
    handleCreateTerminal,
    handleCloseTerminal,
  };
}
