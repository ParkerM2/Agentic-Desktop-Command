/**
 * AgentPanelCompact — Minimal status view (~120px fixed height)
 *
 * Shows: status dot, name, model, task, last message preview, expand/popup buttons.
 */

import { Maximize2, Expand } from 'lucide-react';

import type { AgentSession } from '@shared/types/agent-dashboard';

import { cn, truncate } from '@renderer/shared/lib/utils';

import { Button, Card, CardContent, CardHeader } from '@ui';

import { AgentStatusBar } from './AgentStatusBar';

// ─── Props ─────────────────────────────────────────────────

interface AgentPanelCompactProps {
  agent: AgentSession;
  className?: string;
  onExpand: () => void;
  onPopup: () => void;
}

// ─── Helpers ───────────────────────────────────────────────

function getLastMessagePreview(agent: AgentSession): string {
  for (let i = agent.messages.length - 1; i >= 0; i--) {
    const msg = agent.messages[i];
    if (msg.kind === 'text') {
      return truncate(msg.message.content, 120);
    }
  }
  return 'No messages yet';
}

// ─── Component ─────────────────────────────────────────────

export function AgentPanelCompact({
  agent,
  className,
  onExpand,
  onPopup,
}: AgentPanelCompactProps) {
  return (
    <Card
      className={cn('h-[120px] overflow-hidden', className)}
      variant="interactive"
    >
      <CardHeader className="px-4 py-3 pb-0">
        <AgentStatusBar agent={agent} />
      </CardHeader>
      <CardContent className="flex items-end justify-between px-4 py-2">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {getLastMessagePreview(agent)}
        </p>
        <div className="ml-2 flex shrink-0 gap-1">
          <Button
            aria-label="Expand panel"
            size="icon"
            variant="ghost"
            onClick={onExpand}
          >
            <Expand className="h-3.5 w-3.5" />
          </Button>
          <Button
            aria-label="Open popup"
            size="icon"
            variant="ghost"
            onClick={onPopup}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
