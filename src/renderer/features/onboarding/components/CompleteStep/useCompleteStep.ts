/**
 * useCompleteStep — logic for CompleteStep
 */

import { useUpdateSettings } from '@features/settings';

export function useCompleteStep(onComplete: () => void) {
  const updateSettings = useUpdateSettings();

  function handleFinish() {
    updateSettings.mutate(
      { onboardingCompleted: true },
      {
        onSuccess() {
          onComplete();
        },
      },
    );
  }

  return {
    isPending: updateSettings.isPending,
    handleFinish,
  };
}
