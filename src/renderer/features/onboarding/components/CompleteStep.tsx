/**
 * CompleteStep — Final step of onboarding wizard
 *
 * Shows success message and completes onboarding by setting flag.
 */

import { Check, Loader2, Rocket } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useUpdateSettings } from '@features/settings';

// ── Constants ───────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors';

// ── Types ───────────────────────────────────────────────────

interface CompleteStepProps {
  onComplete: () => void;
}

// ── Component ───────────────────────────────────────────────

export function CompleteStep({ onComplete }: CompleteStepProps) {
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

  return (
    <div className="flex flex-col items-center text-center">
      {/* Success Icon */}
      <div className="bg-success/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
        <Check className="text-success h-10 w-10" />
      </div>

      <h2 className="text-foreground mb-3 text-3xl font-bold">You&apos;re All Set!</h2>

      <p className="text-muted-foreground mb-8 max-w-md text-lg">
        Claude UI is ready to help you manage your coding projects with AI-powered agents.
      </p>

      {/* Quick tips */}
      <div className="bg-card border-border mb-8 w-full max-w-md rounded-lg border p-6 text-left">
        <h3 className="text-foreground mb-4 font-semibold">Quick Tips</h3>
        <ul className="text-muted-foreground space-y-3 text-sm">
          <li className="flex gap-3">
            <Rocket className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <span>Add a project folder to get started with task management.</span>
          </li>
          <li className="flex gap-3">
            <Rocket className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <span>Create tasks and let Claude agents help you build features.</span>
          </li>
          <li className="flex gap-3">
            <Rocket className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <span>Check Settings anytime to configure integrations and preferences.</span>
          </li>
        </ul>
      </div>

      {/* CTA */}
      <button
        disabled={updateSettings.isPending}
        type="button"
        className={cn(
          BUTTON_BASE,
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onClick={handleFinish}
      >
        {updateSettings.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Rocket className="h-4 w-4" />
            Launch Claude UI
          </>
        )}
      </button>
    </div>
  );
}
