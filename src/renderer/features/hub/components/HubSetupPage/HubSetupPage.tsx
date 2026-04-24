/**
 * HubSetupPage — first-launch Hub configuration screen.
 *
 * Wraps `HubPickerPanel` in a "Welcome to ADC" frame with a Skip action.
 * If the user already has an active paired hub, the page immediately
 * invokes `onSuccess` so the router can forward to the main app.
 *
 * Skip hands off to the parent `onSkip` callback, which is responsible
 * for the local-only session setup (the app's route layer already
 * treats a missing active hub as local mode — no synthetic HubRecord
 * IPC is required).
 */

import { useEffect } from 'react';

import { Server } from 'lucide-react';

import { Button, Card, CardContent, Heading, Separator, Spinner, Text } from '@ui';

import { useHubDiscovery } from '../../api/useHubDiscovery';
import { HubPickerPanel } from '../HubPickerPanel';

import { shouldShowSetup } from './derive';

interface HubSetupPageProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
  onSkip?: () => void;
}

export function HubSetupPage({ onSuccess, onNavigateToLogin, onSkip }: HubSetupPageProps) {
  const discovery = useHubDiscovery();

  const snapshot = discovery.data;
  const paired = snapshot?.paired ?? [];
  const activeHubId = snapshot?.activeHubId ?? null;
  const needsSetup = snapshot === undefined ? true : shouldShowSetup(activeHubId, paired);

  // Already paired with an active hub — forward immediately.
  useEffect(() => {
    if (snapshot === undefined) return;
    if (!needsSetup) onSuccess();
  }, [snapshot, needsSetup, onSuccess]);

  if (discovery.isLoading || snapshot === undefined) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Spinner aria-label="Loading hub snapshot" size="lg" />
      </div>
    );
  }

  if (!needsSetup) {
    // useEffect above already called onSuccess; render nothing while the
    // router transitions.
    return null;
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardContent className="space-y-6 p-8">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="bg-primary/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-lg">
              <Server className="text-primary size-6" />
            </div>
            <Heading as="h1" className="text-card-foreground font-bold">
              Welcome to ADC
            </Heading>
            <Text size="sm" variant="muted">
              Choose a hub to connect, or skip to use ADC locally.
            </Text>
          </div>

          <HubPickerPanel withCardChrome={false} />

          <Separator />

          {/* Footer actions */}
          <div className="flex flex-col items-center gap-2">
            {onSkip === undefined ? null : (
              <Button
                className="w-full sm:w-auto"
                type="button"
                variant="outline"
                onClick={onSkip}
              >
                Skip — use locally without a hub
              </Button>
            )}
            <Text size="sm" variant="muted">
              Already connected?{' '}
              <Button
                className="h-auto p-0 font-medium underline-offset-4 hover:underline"
                type="button"
                variant="link"
                onClick={onNavigateToLogin}
              >
                Sign in
              </Button>
            </Text>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
