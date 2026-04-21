import { useEffect, useRef } from 'react';

interface UseAgentChatPanelParams {
  messageCount: number;
}

interface UseAgentChatPanelReturn {
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export function useAgentChatPanel({ messageCount }: UseAgentChatPanelParams): UseAgentChatPanelReturn {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

  return { bottomRef };
}
