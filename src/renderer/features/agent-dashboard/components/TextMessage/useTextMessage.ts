import { useEffect, useMemo, useRef } from 'react';

import remarkGfm from 'remark-gfm';

import type { AgentTextMessage } from '@shared/types/agent-dashboard';

import { useLayoutStore } from '@renderer/shared/stores';

interface UseTextMessageParams {
  message: AgentTextMessage;
  showHandOff?: boolean;
}

type RemarkPlugins = Array<typeof remarkGfm>;

interface UseTextMessageReturn {
  endRef: React.RefObject<HTMLDivElement | null>;
  plugins: RemarkPlugins;
  structured: boolean;
  activeProjectId: string | null;
  planPath: string | null;
  shouldShowHandOff: boolean;
}

// ─── Helpers ────────────────────────────────────────────────

const LONG_MESSAGE_CHARS = 300;

function isStructuredContent(text: string): boolean {
  if (/\|.+\|/.test(text) && text.includes('---')) return true;
  if (/^#{1,4}\s/m.test(text)) return true;
  if (/```[\s\S]*?```/.test(text)) return true;
  const listMatches = text.match(/^[\s]*[-*+]\s|^\s*\d+\.\s/gm);
  if (listMatches && listMatches.length >= 3) return true;
  if (text.length > LONG_MESSAGE_CHARS) return true;
  return false;
}

function extractPlanPath(text: string): string | null {
  const backtickMatch = /`([^`]*plan[^`]*\.md)`/i.exec(text);
  if (backtickMatch) return backtickMatch[1];
  const bareMatch = /(?:^|\s)((?:[\w./-]+\/)?[\w.-]*plan[\w.-]*\.md)/im.exec(text);
  if (bareMatch) return bareMatch[1];
  return null;
}

export function useTextMessage({ message, showHandOff = true }: UseTextMessageParams): UseTextMessageReturn {
  const endRef = useRef<HTMLDivElement>(null);
  const plugins: RemarkPlugins = useMemo(() => [remarkGfm], []);
  const structured = isStructuredContent(message.content);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);

  const planPath =
    message.role === 'assistant' && message.isStreaming !== true
      ? extractPlanPath(message.content)
      : null;
  const shouldShowHandOff = showHandOff && planPath !== null && activeProjectId !== null;

  useEffect(() => {
    if (message.isStreaming === true) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message.content, message.isStreaming]);

  return { endRef, plugins, structured, activeProjectId, planPath, shouldShowHandOff };
}
