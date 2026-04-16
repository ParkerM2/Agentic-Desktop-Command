import { Tooltip, TooltipContent, TooltipTrigger } from '@ui';

interface RunSparklineProps {
  results: Array<{ status: string; startedAt: string; durationMs: number }>;
}

function dotClass(status: string): string {
  if (status === 'passed') return 'bg-green-500';
  if (status === 'failed') return 'bg-destructive';
  return 'bg-muted';
}

export function RunSparkline({ results }: RunSparklineProps) {
  if (results.length === 0) return <span className="text-xs text-text-muted">—</span>;

  const reversed = [...results].reverse();

  return (
    <div className="flex items-center gap-0.5">
      {reversed.map((r) => (
        <Tooltip key={`${r.startedAt}-${r.durationMs}-${r.status}`}>
          <TooltipTrigger asChild>
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass(r.status)}`}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">
              {r.status} — {new Date(r.startedAt).toLocaleString()} ({r.durationMs}ms)
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
