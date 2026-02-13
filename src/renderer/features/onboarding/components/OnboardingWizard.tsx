/**
 * OnboardingWizard — Main wizard container
 *
 * Full-page modal that displays the appropriate step component.
 * Includes progress indicator and handles navigation.
 */

import { cn } from '@renderer/shared/lib/utils';
import { ThemeHydrator } from '@renderer/shared/stores';

import { getStepIndex, getTotalSteps, useOnboardingStore } from '../store';

import { ApiKeyStep } from './ApiKeyStep';
import { ClaudeCliStep } from './ClaudeCliStep';
import { CompleteStep } from './CompleteStep';
import { IntegrationsStep } from './IntegrationsStep';
import { WelcomeStep } from './WelcomeStep';

// ── Types ───────────────────────────────────────────────────

interface OnboardingWizardProps {
  onComplete: () => void;
}

// ── Progress Indicator ──────────────────────────────────────

function getProgressDotClasses(index: number, currentIndex: number): string {
  if (index === currentIndex) {
    return 'bg-primary w-8';
  }
  if (index < currentIndex) {
    return 'bg-primary/50 w-2';
  }
  return 'bg-muted w-2';
}

function ProgressIndicator() {
  const { currentStep } = useOnboardingStore();
  const currentIndex = getStepIndex(currentStep);
  const totalSteps = getTotalSteps();

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          // Using index is acceptable here since the array is static
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            getProgressDotClasses(index, currentIndex),
          )}
        />
      ))}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { currentStep, nextStep, previousStep, skipIntegrations } = useOnboardingStore();

  function renderStep() {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={nextStep} />;
      case 'claude-cli':
        return <ClaudeCliStep onBack={previousStep} onNext={nextStep} />;
      case 'api-key':
        return <ApiKeyStep onBack={previousStep} onNext={nextStep} />;
      case 'integrations':
        return (
          <IntegrationsStep onBack={previousStep} onNext={nextStep} onSkip={skipIntegrations} />
        );
      case 'complete':
        return <CompleteStep onComplete={onComplete} />;
      default:
        return <WelcomeStep onNext={nextStep} />;
    }
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <ThemeHydrator />

      {/* Header with progress */}
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <span className="text-foreground text-lg font-semibold">Setup</span>
        <ProgressIndicator />
      </header>

      {/* Main content area */}
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-xl">{renderStep()}</div>
      </main>

      {/* Footer */}
      <footer className="border-border border-t px-6 py-4">
        <p className="text-muted-foreground text-center text-xs">
          You can always change these settings later in the Settings page.
        </p>
      </footer>
    </div>
  );
}
