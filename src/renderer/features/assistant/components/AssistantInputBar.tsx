/**
 * AssistantInputBar — Combined input bar with text input, send button,
 * and quick action chips.
 *
 * Layout:
 *   [Ask anything...        ] [↑]
 *   +Task  +Todo  Status  Git  PRs
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ArrowUp } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { useProjects } from '@features/projects/api/useProjects';

import { Button } from '@ui/button';
import { Separator } from '@ui/separator';
import { Textarea } from '@ui/textarea';

import { QuickActionChips } from './QuickActionChips';

interface AssistantInputBarProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function AssistantInputBar({ onSubmit, disabled, compact }: AssistantInputBarProps) {
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();

  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derive project name from projects list
  const projectName = useMemo(() => {
    if (projects && activeProjectId) {
      const found = projects.find((p) => p.id === activeProjectId);
      if (found) return found.name;
    }
    return 'project';
  }, [projects, activeProjectId]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${String(Math.min(el.scrollHeight, compact ? 64 : 80))}px`;
    }
  }, [compact]);

  useEffect(() => {
    adjustHeight();
  }, [draft, adjustHeight]);

  function handleSubmit() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setDraft('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handlePrefill(text: string) {
    setDraft(text);
    textareaRef.current?.focus();
  }

  return (
    <div className={cn('shrink-0', compact ? 'space-y-0' : 'space-y-0.5')}>
      <Separator />
      {/* Row 1: textarea + send */}
      <div className={cn('flex items-end gap-1', compact ? 'p-1.5' : 'p-2')}>
        <Textarea
          ref={textareaRef}
          aria-label="Message assistant"
          disabled={disabled}
          placeholder="Ask anything..."
          resize="none"
          rows={1}
          value={draft}
          className={cn(
            'min-h-0 flex-1 px-2 py-1.5 text-xs',
            compact ? 'max-h-16' : 'max-h-20',
          )}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          aria-label="Send message"
          className="h-7 w-7 shrink-0 p-1.5"
          disabled={disabled === true || draft.trim().length === 0}
          size="icon"
          variant="primary"
          onClick={handleSubmit}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Row 2: Quick action chips */}
      <QuickActionChips projectName={projectName} onPrefill={handlePrefill} />
    </div>
  );
}
