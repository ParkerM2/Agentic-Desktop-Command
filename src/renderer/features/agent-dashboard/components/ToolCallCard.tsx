/**
 * ToolCallCard — Visual card for each tool call type
 *
 * Renders Read, Edit, Write, Bash, and AgentSpawn tool calls as collapsible cards.
 * Uses @ui primitives (Card, Badge, Collapsible, Button).
 * Collapsible by default, click to expand.
 */

import { useState } from 'react';

import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  FileCode,
  FilePlus,
  Terminal,
  Users,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import type {
  AgentToolCall,
  ToolCallAgentSpawn,
  ToolCallBash,
  ToolCallData,
  ToolCallEdit,
  ToolCallRead,
  ToolCallWrite,
} from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ui';

// ─── Props ─────────────────────────────────────────────────

interface ToolCallCardProps {
  toolCall: AgentToolCall;
  className?: string;
  onViewAgent?: (agentId: string) => void;
}

// ─── Tool Type Config ──────────────────────────────────────

const TOOL_CONFIG: Record<
  ToolCallData['type'],
  { icon: React.ElementType; label: string; colorClass: string }
> = {
  Read: { icon: Eye, label: 'Read', colorClass: 'text-info' },
  Edit: { icon: Edit3, label: 'Edit', colorClass: 'text-warning' },
  Write: { icon: FilePlus, label: 'Write', colorClass: 'text-success' },
  Bash: { icon: Terminal, label: 'Bash', colorClass: 'text-primary' },
  AgentSpawn: { icon: Users, label: 'Agent Spawn', colorClass: 'text-accent-foreground' },
};

// ─── Sub-renderers ─────────────────────────────────────────

function ReadContent({ data }: { data: ToolCallRead }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm">
        <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-xs text-foreground">{data.filePath}</span>
      </div>
      {data.lineRange !== undefined && data.lineRange.length > 0 && (
        <span className="text-xs text-muted-foreground">Lines {data.lineRange}</span>
      )}
      {data.content !== undefined && data.content.length > 0 && (
        <div className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs">
          {data.content}
        </div>
      )}
    </div>
  );
}

function EditContent({ data }: { data: ToolCallEdit }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-xs text-foreground">{data.filePath}</span>
      </div>
      <div className="flex gap-3 text-xs">
        <span className="text-success">+{String(data.additions)}</span>
        <span className="text-destructive">-{String(data.deletions)}</span>
      </div>
      {data.diffPreview !== undefined && data.diffPreview.length > 0 && (
        <div className="mt-2 overflow-auto rounded">
          <SyntaxHighlighter
            PreTag="div"
            language="diff"
            style={oneDark}
            customStyle={{
              margin: 0,
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              maxHeight: '10rem',
            }}
          >
            {data.diffPreview}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

function WriteContent({ data }: { data: ToolCallWrite }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-mono text-xs text-foreground">{data.filePath}</span>
      {data.isNew ? (
        <Badge size="sm" variant="success">new file</Badge>
      ) : null}
    </div>
  );
}

function BashContent({ data }: { data: ToolCallBash }) {
  const exitSuccess = data.exitCode === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-mono text-xs text-foreground">
        <span className="text-muted-foreground">$</span>
        <span>{data.command}</span>
      </div>
      {data.output !== undefined && data.output.length > 0 && (
        <div className="max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs text-muted-foreground">
          {data.output}
        </div>
      )}
      {data.exitCode !== undefined && (
        <div className="flex items-center gap-2 text-xs">
          <Badge
            size="sm"
            variant={exitSuccess ? 'success' : 'destructive'}
          >
            {exitSuccess ? 'Exit 0' : `Exit ${String(data.exitCode)}`}
          </Badge>
          {data.durationMs !== undefined && (
            <span className="text-muted-foreground">
              {(data.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AgentSpawnContent({
  data,
  onViewAgent,
}: {
  data: ToolCallAgentSpawn;
  onViewAgent?: (agentId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{data.agentName}</span>
        <Badge size="sm" variant="secondary">{data.model}</Badge>
      </div>
      <div className="text-xs text-muted-foreground">{data.task}</div>
      {onViewAgent === undefined ? null : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { onViewAgent(data.agentId); }}
        >
          View Agent
        </Button>
      )}
    </div>
  );
}

// ─── Render Content Switch ─────────────────────────────────

function renderToolContent(
  toolCall: ToolCallData,
  onViewAgent?: (agentId: string) => void,
): React.ReactNode {
  switch (toolCall.type) {
    case 'Read':
      return <ReadContent data={toolCall} />;
    case 'Edit':
      return <EditContent data={toolCall} />;
    case 'Write':
      return <WriteContent data={toolCall} />;
    case 'Bash':
      return <BashContent data={toolCall} />;
    case 'AgentSpawn':
      return <AgentSpawnContent data={toolCall} onViewAgent={onViewAgent} />;
  }
}

// ─── Component ─────────────────────────────────────────────

export function ToolCallCard({ toolCall, className, onViewAgent }: ToolCallCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = TOOL_CONFIG[toolCall.toolCall.type];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden',
        toolCall.isError && 'border-destructive',
        className,
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className="cursor-pointer select-none p-3"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
              }
            }}
          >
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <Icon className={cn('h-4 w-4', config.colorClass)} />
              <span className="text-sm font-medium text-foreground">{config.label}</span>
              {toolCall.isError ? (
                <Badge size="sm" variant="destructive">failed</Badge>
              ) : null}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-3 pb-3 pt-0">
            {renderToolContent(toolCall.toolCall, onViewAgent)}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
