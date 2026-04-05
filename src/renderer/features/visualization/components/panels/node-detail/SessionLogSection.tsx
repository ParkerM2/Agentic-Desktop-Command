/**
 * SessionLogSection — expandable session log viewer for agent nodes.
 */

import { useState } from 'react';

import { Button, ScrollArea, Skeleton } from '@ui';

import { useSessionLog } from '../../../api/visualization-api';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface SessionLogSectionProps {
  agentName: string;
  feature: string;
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SessionLogSection({ agentName, feature, projectId }: SessionLogSectionProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>();

  const { data, isLoading } = useSessionLog(
    open ? projectId : '',
    open ? feature : '',
    open ? agentName : '',
    cursor,
  );

  return (
    <div className="border-t border-border">
      <Button
        className="w-full justify-between rounded-none px-4 py-2 text-xs"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
      >
        <span>Session Log</span>
        <span className="text-muted-foreground">{open ? '\u25B2' : '\u25BC'}</span>
      </Button>

      {open ? (
        <div className="px-4 pb-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : null}

          {!isLoading && data?.sessionFile === null ? (
            <p className="text-xs text-muted-foreground">No session file found</p>
          ) : null}

          {!isLoading && data?.sessionFile !== null && data !== undefined ? (
            <>
              <ScrollArea className="h-48 rounded border border-border bg-muted/30">
                <div className="p-2">
                  {data.lines.map((line) => (
                    <pre
                      key={line.index}
                      className="whitespace-pre-wrap break-all font-mono text-xs text-foreground/80"
                    >
                      {line.raw}
                    </pre>
                  ))}
                </div>
              </ScrollArea>

              <Button
                className="mt-2 w-full text-xs"
                disabled={data.cursor === -1}
                size="sm"
                variant="outline"
                onClick={() => {
                  setCursor(data.cursor);
                }}
              >
                Load more
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
