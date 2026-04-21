/**
 * DailyStats — Simple stats row showing daily activity
 *
 * Shows task completions across all projects (not just active project).
 */

import { Card, CardContent } from '@ui';

import { useDailyStats } from './useDailyStats';

export function DailyStats() {
  const { captureCount, tasksCompleted, agentsRan } = useDailyStats();

  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">{tasksCompleted}</span> tasks completed
          {' \u00B7 '}
          <span className="text-foreground font-medium">{agentsRan}</span> agents ran
          {' \u00B7 '}
          <span className="text-foreground font-medium">{captureCount}</span> captures
        </p>
      </CardContent>
    </Card>
  );
}
