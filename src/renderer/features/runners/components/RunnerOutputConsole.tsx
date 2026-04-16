import { useEffect, useRef } from 'react';

import { useRunnersStore } from '../runners-store';

interface Props {
  instanceId: string | undefined;
  hint?: string;
}

export function RunnerOutputConsole({ instanceId, hint }: Props) {
  const lines = useRunnersStore((s) => (instanceId ? s.outputs[instanceId] : undefined)) ?? [];
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length]);

  if (!instanceId) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-muted">
        {hint ?? 'No runner selected.'}
      </div>
    );
  }

  return (
    <div className="h-48 overflow-y-auto bg-surface-subtle font-mono text-xs leading-tight">
      {lines.map((line, i) => (
        // eslint-disable-next-line react/no-array-index-key -- output lines are append-only, index is stable
        <div key={i} className="whitespace-pre-wrap px-3 py-0.5">
          {line}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
