/**
 * useOnboardingWizard — logic for OnboardingWizard
 */

import { useUpdateSettings } from '@features/settings';

import { useOnboardingStore } from '../../store';

export function useOnboardingWizard(onComplete: () => void) {
  const { currentStep, nextStep, previousStep, skipIntegrations } = useOnboardingStore();
  const updateSettings = useUpdateSettings();

  function handleSkipOnboarding() {
    updateSettings.mutate(
      { onboardingCompleted: true },
      { onSuccess() { onComplete(); } },
    );
  }

  return {
    currentStep,
    nextStep,
    previousStep,
    skipIntegrations,
    updateSettings,
    handleSkipOnboarding,
  };
}
