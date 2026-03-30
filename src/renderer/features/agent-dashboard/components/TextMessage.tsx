/**
 * TextMessage — Renders a markdown-formatted assistant message
 *
 * Uses react-markdown + remark-gfm for GFM rendering.
 * Uses react-syntax-highlighter for code blocks.
 */

import { useRef, useEffect, useMemo } from 'react';

import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

import type { AgentTextMessage } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

// ─── Props ─────────────────────────────────────────────────

interface TextMessageProps {
  message: AgentTextMessage;
  className?: string;
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
        borderRadius: 'var(--radius)',
        fontSize: '0.8125rem',
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}

function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
      {children}
    </code>
  );
}

// ─── Markdown Components ───────────────────────────────────

const markdownComponents: React.ComponentProps<typeof Markdown>['components'] = {
  code: ({ className: codeClassName, children: codeChildren, ...rest }) => {
    const isBlock = (codeClassName ?? '').includes('language-');
    if (isBlock) {
      // react-markdown always passes a string child for code blocks
      const codeStr = typeof codeChildren === 'string' ? codeChildren : '';
      return (
        <CodeBlock className={codeClassName}>
          {codeStr}
        </CodeBlock>
      );
    }
    return <InlineCode {...rest}>{codeChildren}</InlineCode>;
  },
};

// ─── Component ─────────────────────────────────────────────

export function TextMessage({ message, className }: TextMessageProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const plugins = useMemo(() => [remarkGfm], []);

  useEffect(() => {
    if (message.isStreaming === true) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message.content, message.isStreaming]);

  return (
    <div
      className={cn(
        'group relative rounded-lg px-4 py-3',
        'bg-muted/50 text-foreground',
        message.isStreaming === true && 'animate-pulse',
        className,
      )}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
        <Markdown components={markdownComponents} remarkPlugins={plugins}>
          {message.content}
        </Markdown>
      </div>
      <div className="mt-1 text-right text-xs text-muted-foreground">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
      <div ref={endRef} />
    </div>
  );
}
