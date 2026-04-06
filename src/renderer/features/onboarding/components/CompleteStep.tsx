/**
 * CompleteStep — Final step of onboarding wizard
 *
 * Shows success message and completes onboarding by setting flag.
 */

import { Check, Loader2, Rocket } from 'lucide-react';

import { Button, Card, CardContent } from '@ui';

import { useUpdateSettings } from '@features/settings';

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
        ADC is ready to help you manage your coding projects with AI-powered agents.
      </p>

      {/* Quick tips */}
      <Card className="mb-8 w-full max-w-md text-left">
        <CardContent className="p-6">
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
        </CardContent>
      </Card>

      {/* CTA */}
      <Button
        disabled={updateSettings.isPending}
        size="lg"
        onClick={handleFinish}
      >
        {updateSettings.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Rocket className="h-4 w-4" />
            Launch ADC
          </>
        )}
      </Button>
    </div>
  );
}
