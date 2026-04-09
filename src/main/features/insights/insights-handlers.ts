/**
 * Insights IPC handlers
 */

import { INSIGHTS } from '@shared/ipc/misc/insights.channels';

import type { InsightsService } from "./insights-service";
import type { IpcRouter } from '../../ipc/router';

export function registerInsightsHandlers(router: IpcRouter, service: InsightsService): void {
  router.handle(INSIGHTS.GET.METRICS, ({ projectId }) =>
    Promise.resolve(service.getMetrics(projectId)),
  );

  router.handle(INSIGHTS.GET['TIME-SERIES'], ({ projectId, days }) =>
    Promise.resolve(service.getTimeSeries(projectId, days)),
  );

  router.handle(INSIGHTS.GET['TASK-DISTRIBUTION'], ({ projectId }) =>
    Promise.resolve(service.getTaskDistribution(projectId)),
  );

  router.handle(INSIGHTS.GET['PROJECT-BREAKDOWN'], () =>
    Promise.resolve(service.getProjectBreakdown()),
  );
}
