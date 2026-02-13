/**
 * Briefing feature — daily briefings with proactive suggestions
 */

export { BriefingPage } from './components/BriefingPage';
export { SuggestionCard } from './components/SuggestionCard';
export {
  useDailyBriefing,
  useGenerateBriefing,
  useBriefingConfig,
  useUpdateBriefingConfig,
  useSuggestions,
} from './api/useBriefing';
export { briefingKeys } from './api/queryKeys';
