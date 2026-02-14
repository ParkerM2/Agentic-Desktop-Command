/**
 * Onboarding wizard state
 *
 * Tracks the current step, skipped items, and navigation actions.
 */

import { create } from 'zustand';

export type OnboardingStep = 'welcome' | 'claude-cli' | 'api-key' | 'integrations' | 'complete';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'claude-cli',
  'api-key',
  'integrations',
  'complete',
];

interface OnboardingState {
  currentStep: OnboardingStep;
  skippedIntegrations: boolean;
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipIntegrations: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  currentStep: 'welcome',
  skippedIntegrations: false,

  setStep: (step) => {
    set({ currentStep: step });
  },

  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      // Index is validated, so next step exists
      set({ currentStep: STEP_ORDER[currentIndex + 1] });
    }
  },

  previousStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      // Index is validated, so prev step exists
      set({ currentStep: STEP_ORDER[currentIndex - 1] });
    }
  },

  skipIntegrations: () => {
    set({ skippedIntegrations: true, currentStep: 'complete' });
  },

  reset: () => {
    set({ currentStep: 'welcome', skippedIntegrations: false });
  },
}));

/** Get the current step index (0-based) */
export function getStepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step);
}

/** Get the total number of steps */
export function getTotalSteps(): number {
  return STEP_ORDER.length;
}
