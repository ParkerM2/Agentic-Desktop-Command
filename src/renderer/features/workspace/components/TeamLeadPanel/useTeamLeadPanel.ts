import { useQuery } from '@tanstack/react-query';

import type { WorkspaceSession } from '@shared/ipc/workspace';
import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { useStopTeamLead, useWorkspaceSend } from '../../api/useWorkspace';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { useSessionMessageInput } from '../../hooks/useSessionMessageInput';
import { useSessionThinking } from '../../hooks/useSessionThinking';
import { messagesToChatItems } from '../../lib/chat-utils';
import { useWorkspaceStore } from '../../store';

export function useTeamLeadPanel(session: WorkspaceSession) {
  const { key, agentSessionId, status } = session;
  const { projectId, index } = key;
  const isImmortal = index === 0;
  const label = index === 0 ? 'Team Lead 1' : `Team Lead ${index + 1}`;

  const send = useWorkspaceSend();
  const stop = useStopTeamLead(projectId);
  const isThinking = useSessionThinking(agentSessionId);
  const showThinking = send.isPending || isThinking;

  const isCollapsed = useWorkspaceStore((s) => s.teamLeadCollapsed[agentSessionId] ?? false);
  const toggle = useWorkspaceStore((s) => s.toggleTeamLeadCollapsed);
  const draft = useWorkspaceStore((s) => s.inputDrafts[agentSessionId] ?? '');
  const setDraft = useWorkspaceStore((s) => s.setInputDraft);
  const clearDraft = useWorkspaceStore((s) => s.clearInputDraft);

  const { data: rawMessages = [] } = useQuery<AgentChatMessage[]>({
    queryKey: ['agent-dashboard', 'messages', agentSessionId],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const chatItems = messagesToChatItems(rawMessages);

  const { handleSend, handleKeyDown } = useSessionMessageInput({
    sessionId: agentSessionId,
    draft,
    status,
    send,
    clearDraft,
  });

  function handleStop() {
    stop.mutate({ index });
  }

  /* ---- Drag-to-resize ---- */
  const {
    height: messageHeight,
    cardRef,
    handleCardMouseDown,
    handleCardMouseMove,
  } = useResizablePanel({ defaultHeight: 192, minHeight: 64, edgeZone: 6 });

  return {
    agentSessionId,
    status,
    label,
    isImmortal,
    send,
    stop,
    showThinking,
    isCollapsed,
    toggle,
    draft,
    setDraft,
    chatItems,
    messageHeight,
    cardRef,
    handleSend,
    handleKeyDown,
    handleStop,
    handleCardMouseDown,
    handleCardMouseMove,
    // Derived mutation states
    isSending: send.isPending,
    isStopping: stop.isPending,
  };
}
