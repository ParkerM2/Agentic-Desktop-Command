import { useLooseParams } from '@renderer/shared/hooks';

import {
  useAnalyticsSummary,
  useAnalyticsTrend,
  useErrorPatterns,
  useFlakyTests,
  useSlowestTests,
  useTopFailures,
} from '../../api/useTestSuiteAnalytics';
import { computeHealthScore } from '../../lib/health-score';

export function useAnalyticsPanel() {
  const { projectId } = useLooseParams();
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(projectId);
  const { data: trend = [] } = useAnalyticsTrend(projectId);
  const { data: topFailures = [] } = useTopFailures(projectId);
  const { data: slowest = [] } = useSlowestTests(projectId);
  const { data: errorPatterns = [] } = useErrorPatterns(projectId);
  const { data: flakyTests = [] } = useFlakyTests(projectId);

  const health = summary && summary.totalRuns > 0 ? computeHealthScore(summary) : null;

  return {
    projectId,
    summary,
    summaryLoading,
    trend,
    topFailures,
    slowest,
    errorPatterns,
    flakyTests,
    health,
  };
}
