import type { ComponentPropsWithoutRef } from 'react';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@renderer/shared/lib/utils';

// ─── Stable component map (defined outside render) ───────────────────────────
// All components are referenced by pointer, preventing React from treating them
// as new types on each render (react/no-unstable-nested-components).

function MdP({ children }: ComponentPropsWithoutRef<'p'>) {
  return <p className="leading-relaxed">{children}</p>;
}

function MdH1({ children }: ComponentPropsWithoutRef<'h1'>) {
  return <h1 className="text-base font-semibold">{children}</h1>;
}

function MdH2({ children }: ComponentPropsWithoutRef<'h2'>) {
  return <h2 className="text-sm font-semibold">{children}</h2>;
}

function MdH3({ children }: ComponentPropsWithoutRef<'h3'>) {
  return <h3 className="text-sm font-medium">{children}</h3>;
}

function MdUl({ children }: ComponentPropsWithoutRef<'ul'>) {
  return <ul className="list-disc space-y-0.5 pl-4">{children}</ul>;
}

function MdOl({ children }: ComponentPropsWithoutRef<'ol'>) {
  return <ol className="list-decimal space-y-0.5 pl-4">{children}</ol>;
}

function MdLi({ children }: ComponentPropsWithoutRef<'li'>) {
  return <li className="leading-relaxed">{children}</li>;
}

function MdStrong({ children }: ComponentPropsWithoutRef<'strong'>) {
  return <strong className="font-semibold">{children}</strong>;
}

function MdEm({ children }: ComponentPropsWithoutRef<'em'>) {
  return <em className="italic">{children}</em>;
}

function MdCode({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const isBlock = className?.startsWith('language-');
  if (isBlock) {
    return <code className="block font-mono text-xs">{children}</code>;
  }
  return <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">{children}</code>;
}

function MdPre({ children }: ComponentPropsWithoutRef<'pre'>) {
  return (
    <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  );
}

function MdBlockquote({ children }: ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote className="border-muted-foreground/30 text-muted-foreground border-l-2 pl-3 italic">
      {children}
    </blockquote>
  );
}

function MdA({ href, children }: ComponentPropsWithoutRef<'a'>) {
  return (
    <a
      className="text-primary underline underline-offset-2"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function MdTable({ children }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

function MdThead({ children }: ComponentPropsWithoutRef<'thead'>) {
  return <thead className="border-border border-b">{children}</thead>;
}

function MdTbody({ children }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody>{children}</tbody>;
}

function MdTr({ children }: ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr className="border-border/40 hover:bg-muted/30 border-b transition-colors last:border-0">
      {children}
    </tr>
  );
}

function MdTh({ children }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th className="text-muted-foreground px-3 py-1.5 text-left font-medium">{children}</th>
  );
}

function MdTd({ children }: ComponentPropsWithoutRef<'td'>) {
  return <td className="px-3 py-1.5">{children}</td>;
}

function MdHr() {
  return <hr className="border-border" />;
}

const COMPONENTS = {
  p: MdP,
  h1: MdH1,
  h2: MdH2,
  h3: MdH3,
  ul: MdUl,
  ol: MdOl,
  li: MdLi,
  strong: MdStrong,
  em: MdEm,
  code: MdCode,
  pre: MdPre,
  blockquote: MdBlockquote,
  a: MdA,
  table: MdTable,
  thead: MdThead,
  tbody: MdTbody,
  tr: MdTr,
  th: MdTh,
  td: MdTd,
  hr: MdHr,
} as const;

// ─── Public component ─────────────────────────────────────────────────────────

interface MarkdownMessageProps {
  children: string;
  className?: string;
  /** Compact mode uses text-xs (for the floating widget). Default is text-sm. */
  compact?: boolean;
}

/**
 * MarkdownMessage — Renders assistant responses as formatted markdown.
 * Supports GFM: tables, strikethrough, task lists, autolinks.
 */
export function MarkdownMessage({ children, className, compact = false }: MarkdownMessageProps) {
  return (
    <div className={cn('min-w-0 space-y-2', compact ? 'text-xs' : 'text-sm', className)}>
      <Markdown components={COMPONENTS} remarkPlugins={[remarkGfm]}>
        {children}
      </Markdown>
    </div>
  );
}
