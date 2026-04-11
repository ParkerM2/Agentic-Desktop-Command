/**
 * Insights IPC handlers
 */

import { INSIGHTS } from '@shared/ipc/misc/insights.channels';

import type { InsightsService } from "./insights-service";
import type { IpcRouter } from '../../ipc/router';

export function registerInsightsHandlers(router: IpcRouter, service: InsightsService): void {
  router.handle(INSIGHTS.GET.METRICS, (_input) =>
    service.getMetrics(),
  );

  router.handle(INSIGHTS.GET['TIME-SERIES'], ({ days }) =>
    service.getTimeSeries(days),
  );

  router.handle(INSIGHTS.GET['TASK-DISTRIBUTION'], (_input) =>
    service.getTaskDistribution(),
  );

  router.handle(INSIGHTS.GET['PROJECT-BREAKDOWN'], () =>
    service.getProjectBreakdown(),
  );
}
