/**
 * Insights feature — project metrics and activity dashboard
 */

export { InsightsPage } from './components/InsightsPage';
export {
  useInsightMetrics,
  useInsightTimeSeries,
  useProjectBreakdown,
  useTaskDistribution,
} from './api/useInsights';
export { insightKeys } from './api/queryKeys';
