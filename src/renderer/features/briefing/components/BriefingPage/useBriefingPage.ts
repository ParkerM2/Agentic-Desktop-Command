/**
 * useBriefingPage — all logic for BriefingPage
 */

import { useState } from 'react';

import { useDailyBriefing, useGenerateBriefing, useSuggestions } from '../../api/useBriefing';

export function useBriefingPage() {
  const { data: briefing, isLoading: briefingLoading } = useDailyBriefing();
  const { data: suggestions } = useSuggestions();
  const generateBriefing = useGenerateBriefing();
  const [configOpen, setConfigOpen] = useState(false);

  const displaySuggestions = briefing?.suggestions ?? suggestions ?? [];

  function handleGenerate(): void {
    generateBriefing.mutate();
  }

  return {
    briefing,
    briefingLoading,
    generateBriefing,
    configOpen,
    setConfigOpen,
    displaySuggestions,
    handleGenerate,
  };
}
