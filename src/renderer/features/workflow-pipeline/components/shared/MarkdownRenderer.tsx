/**
 * MarkdownRenderer — Renders markdown content with theme-aware styles.
 * Uses react-markdown with remark-gfm for GFM support (tables, checkboxes, etc.).
 */

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@renderer/shared/lib/utils';

import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  className?: string;
  content: string;
}

const components: Components = {
  h1: ({ children, ...props }) => (
    <h1
      className="text-foreground mb-4 mt-6 border-b border-border pb-2 text-2xl font-bold first:mt-0"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-foreground mb-3 mt-5 border-b border-border pb-1.5 text-xl font-semibold first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-foreground mb-2 mt-4 text-lg font-semibold first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="text-foreground mb-2 mt-3 text-base font-medium first:mt-0" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p className="text-foreground mb-3 leading-relaxed last:mb-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="text-foreground mb-3 list-disc space-y-1 pl-6 last:mb-0" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="text-foreground mb-3 list-decimal space-y-1 pl-6 last:mb-0" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-foreground leading-relaxed" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="text-muted-foreground mb-3 border-l-4 border-border pl-4 italic last:mb-0"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className: codeClassName, ...props }) => {
    const isBlock = codeClassName?.startsWith('language-');
    if (isBlock) {
      return (
        <code className={cn('text-foreground text-sm', codeClassName)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="mb-3 overflow-x-auto rounded-md bg-muted p-3 text-sm font-mono last:mb-0"
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/50" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-border px-3 py-2 text-left text-sm font-semibold text-foreground"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-border px-3 py-2 text-sm text-foreground" {...props}>
      {children}
    </td>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  ),
  hr: (props) => <hr className="my-4 border-border" {...props} />,
  input: ({ checked, ...props }) => (
    <input
      disabled
      readOnly
      checked={checked}
      className="mr-2 accent-primary"
      type="checkbox"
      {...props}
    />
  ),
};

export function MarkdownRenderer({ className, content }: MarkdownRendererProps) {
  return (
    <div className={cn('text-foreground text-sm', className)}>
      <Markdown components={components} remarkPlugins={[remarkGfm]}>
        {content}
      </Markdown>
    </div>
  );
}
