/**
 * ExecutionLog -- Scrollable log area showing task.logs[] entries.
 * Auto-scrolls to bottom when new entries arrive.
 */

import { useEffect, useRef } from 'react';

import { Terminal } from 'lucide-react';

interface ExecutionLogProps {
  logs: string[];
}

export function ExecutionLog({ logs }: ExecutionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-xs italic">
        <Terminal className="h-3.5 w-3.5 shrink-0" />
        <span>No execution logs yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground mb-1 text-xs font-medium">
        Execution Log ({logs.length})
      </div>
      <div
        ref={scrollRef}
        className="bg-muted/30 border-border max-h-40 overflow-y-auto rounded border p-2"
      >
        {logs.map((entry, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key -- log entries are append-only, index is stable
            key={index}
            className="text-muted-foreground font-mono text-[11px] leading-relaxed"
          >
            <span className="text-foreground/50 mr-2 select-none">&gt;</span>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}
