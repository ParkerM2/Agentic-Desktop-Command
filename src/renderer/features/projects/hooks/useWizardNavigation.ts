/**
 * useWizardNavigation — step progression with forward/backward navigation.
 */

import { useCallback, useState } from 'react';

export function useWizardNavigation(totalSteps: number) {
  const [step, setStep] = useState(0);

  const handleNext = useCallback(
    () => setStep((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps],
  );

  const handleBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;

  return { step, setStep, handleNext, handleBack, isFirst, isLast };
}
