/**
 * TextMessage — Renders assistant messages in two modes:
 *
 * 1. **Bubble** — short conversational replies, left-aligned like iMessage
 * 2. **Card** — structured content (tables, code blocks, headings, long text)
 *    renders as a full-width card with proper formatting
 *
 * Uses react-markdown + remark-gfm for GFM rendering.
 * Uses react-syntax-highlighter for fenced code blocks.
 * Markdown element styles are applied via the .markdown-body CSS class.
 */

import { useRef, useEffect, useMemo } from 'react';

import { Send } from 'lucide-react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

import { WORKSPACE } from '@shared/ipc/workspace/channels';
import type { AgentTextMessage } from '@shared/types/agent-dashboard';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { Button } from '@ui/button';

// ─── Props ─────────────────────────────────────────────────

interface TextMessageProps {
  message: AgentTextMessage;
  className?: string;
  /** Whether to show "Send to Team Lead" for plan paths. Default true. */
  showHandOff?: boolean;
}

// ─── Plan File Detection ─────────────────────────────────

/**
 * Extract a plan file path from message content.
 * Looks for common plan path patterns in markdown (backtick-wrapped or bare).
 */
function extractPlanPath(text: string): string | null {
  // Match backtick-wrapped paths containing 'plan' and ending in .md
  const backtickMatch = /`([^`]*plan[^`]*\.md)`/i.exec(text);
  if (backtickMatch) return backtickMatch[1];

  // Match bare paths like docs/features/X/plan.md
  const bareMatch = /(?:^|\s)((?:[\w./-]+\/)?[\w.-]*plan[\w.-]*\.md)/im.exec(text);
  if (bareMatch) return bareMatch[1];

  return null;
}

// ─── Structured Content Detection ──────────────────────────

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

// ─── Code Block Renderer ───────────────────────────────────

function CodeBlock({
  className: blockClassName,
  children,
}: {
  className?: string;
  children?: string;
}) {
  const match = /language-(\w+)/.exec(blockClassName ?? '');
  const language = match?.[1] ?? 'text';
  const code = (children ?? '').replace(/\n$/, '');

  return (
    <SyntaxHighlighter
      PreTag="div"
      language={language}
      style={oneDark}
      customStyle={{
        margin: 0,
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8125rem',
        background: 'var(--background)',
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}

function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  );
}

// ─── Markdown Components ───────────────────────────────────

const markdownComponents: React.ComponentProps<typeof Markdown>['components'] = {
  code: ({ className: codeClassName, children: codeChildren, ...rest }) => {
    const isBlock = (codeClassName ?? '').includes('language-');
    if (isBlock) {
      const codeStr = typeof codeChildren === 'string' ? codeChildren : '';
      return (
        <CodeBlock className={codeClassName}>
          {codeStr}
        </CodeBlock>
      );
    }
    return <InlineCode {...rest}>{codeChildren}</InlineCode>;
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50 text-foreground text-xs font-medium">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-border border-b px-3 py-1.5 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-border border-b px-3 py-1.5 text-foreground/90">{children}</td>
  ),
  h1: ({ children }) => (
    <h1 className="text-foreground mt-3 mb-1.5 text-base font-semibold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-foreground mt-3 mb-1.5 text-sm font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-foreground mt-2 mb-1 text-sm font-medium">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-foreground/90 my-1.5 text-sm leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="text-foreground/90 my-1.5 ml-4 list-disc space-y-0.5 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="text-foreground/90 my-1.5 ml-4 list-decimal space-y-0.5 text-sm">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  a: ({ children, href }) => (
    <a className="text-primary hover:underline" href={href}>{children}</a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-primary/40 text-muted-foreground my-2 border-l-2 pl-3 text-sm italic">{children}</blockquote>
  ),
  hr: () => <hr className="border-border my-3" />,
  strong: ({ children }) => (
    <strong className="text-foreground font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-foreground/90">{children}</em>
  ),
  pre: ({ children }) => (
    <div className="my-2">{children}</div>
  ),
};

// ─── Component ─────────────────────────────────────────────

export function TextMessage({ message, className, showHandOff = true }: TextMessageProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const plugins = useMemo(() => [remarkGfm], []);
  const structured = isStructuredContent(message.content);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);

  // Detect plan file path in assistant messages (not user, not streaming)
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

  const markdownContent = (
    <Markdown components={markdownComponents} remarkPlugins={plugins}>
      {message.content}
    </Markdown>
  );

  const timestamp = (
    <div className="mt-1 text-right text-[10px] text-muted-foreground">
      {new Date(message.timestamp).toLocaleTimeString()}
    </div>
  );

  const handOffButton = shouldShowHandOff ? (
    <div className="border-border/30 mt-2 border-t pt-2">
      <Button
        className="h-7 gap-1.5 text-xs"
        size="sm"
        variant="outline"
        onClick={() => void ipc(WORKSPACE.HANDOFF.PLAN, { projectId: activeProjectId, planPath })}
      >
        <Send className="h-3 w-3" />
        Send to Team Lead
      </Button>
    </div>
  ) : null;

  // ── Card layout: left-aligned for structured content ────
  if (structured) {
    return (
      <div className={cn('flex justify-start', className)}>
        <div
          className={cn(
            'max-w-[80%] rounded-lg border border-border/50 px-4 py-3',
            'bg-card text-foreground',
            message.isStreaming === true && 'animate-pulse',
          )}
        >
          <div className="max-w-none break-words">{markdownContent}</div>
          {handOffButton}
          {timestamp}
          <div ref={endRef} />
        </div>
      </div>
    );
  }

  // ── Bubble layout: left-aligned conversational reply ────
  return (
    <div className={cn('flex justify-start', className)}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5',
          'bg-muted/60 text-foreground',
          message.isStreaming === true && 'animate-pulse',
        )}
      >
        <div className="max-w-none break-words">{markdownContent}</div>
        {handOffButton}
        {timestamp}
        <div ref={endRef} />
      </div>
    </div>
  );
}
