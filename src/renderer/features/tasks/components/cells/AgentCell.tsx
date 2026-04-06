/**
 * AgentCell — cell renderer showing agent avatar (initials) + name.
 */

export function AgentCell({ value }: { value: string }) {
  const agentName = value;

  if (agentName === '') {
    return <span className="text-muted-foreground text-sm">Unassigned</span>;
  }

  const initials = agentName
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="bg-primary/15 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
        {initials}
      </div>
      <span className="truncate text-sm">{agentName}</span>
    </div>
  );
}
