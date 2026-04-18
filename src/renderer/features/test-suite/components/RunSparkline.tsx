import { Text, Tooltip, TooltipContent, TooltipTrigger } from '@ui';

interface RunSparklineProps {
  results: Array<{ status: string; startedAt: string; durationMs: number }>;
}

function isFlaky(results: Array<{ status: string }>, index: number): boolean {
  if (results.length < 3 || index === 0 || index === results.length - 1) return false;
  const prev = results[index - 1].status;
  const curr = results[index].status;
  const next = results[index + 1].status;
  return curr !== prev && curr !== next;
}

function getBarColor(status: string, flaky: boolean): string {
  if (flaky) return 'bg-yellow-500';
  if (status === 'passed') return 'bg-green-500';
  if (status === 'failed') return 'bg-destructive';
  return 'bg-muted';
}

export function RunSparkline({ results }: RunSparklineProps) {
  if (results.length === 0) return <Text size="sm" variant="muted">—</Text>;

  const reversed = [...results].reverse();

  return (
    <div className="flex items-center gap-0.5">
      {reversed.map((r, i) => {
        const flaky = isFlaky(reversed, i);
        const color = getBarColor(r.status, flaky);
        const label = flaky
          ? `Flaky — ${new Date(r.startedAt).toLocaleString()} (${r.durationMs}ms)`
          : `${r.status} — ${new Date(r.startedAt).toLocaleString()} (${r.durationMs}ms)`;
        return (
          <Tooltip key={`${r.startedAt}-${r.durationMs}-${r.status}`}>
            <TooltipTrigger asChild>
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
                title={flaky ? 'Flaky' : undefined}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              <Text size="sm">{label}</Text>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
