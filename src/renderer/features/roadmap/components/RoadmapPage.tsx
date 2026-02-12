import { Map } from 'lucide-react';

export function RoadmapPage() {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
      <Map className="mb-3 h-12 w-12 opacity-40" />
      <p className="text-sm font-medium">Roadmap</p>
      <p className="mt-1 text-xs">Coming soon — will be ported from Claude-Auto.</p>
    </div>
  );
}
