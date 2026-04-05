/**
 * ActivityLine — Compact one-line display for tool activity.
 * Only shown when the "show details" toggle is on.
 */

interface ActivityLineProps {
  toolName: string;
  summary: string;
}

export function ActivityLine({ toolName, summary }: ActivityLineProps) {
  return (
    <div className="text-muted-foreground/50 flex items-baseline gap-1.5 px-1 py-0.5 font-mono text-[10px]">
      <span className="text-muted-foreground/40">⚙</span>
      <span>{toolName}</span>
      {summary ? (
        <>
          <span className="text-muted-foreground/30">·</span>
          <span className="truncate">{summary}</span>
        </>
      ) : null}
    </div>
  );
}
