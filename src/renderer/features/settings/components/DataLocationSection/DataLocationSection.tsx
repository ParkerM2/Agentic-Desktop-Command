/**
 * DataLocationSection — Settings section for configuring the ADC data directory.
 *
 * Shows the current path, lets users pick a new directory, validates it,
 * and confirms the change (which requires an app restart).
 */

import { CheckCircle, FolderOpen, RotateCcw, XCircle } from 'lucide-react';

import { Badge, Button, Heading, InlineAlert, Spinner, Text } from '@ui';

import { useDataLocationSection } from './useDataLocationSection';

import type { ValidationCheck } from './useDataLocationSection';

// ── Helpers ───────────────────────────────────────────────

function statusToBadgeVariant(status: 'pass' | 'warn' | 'fail') {
  if (status === 'pass') return 'success' as const;
  if (status === 'warn') return 'warning' as const;
  return 'destructive' as const;
}

function ValidationIcon({ status }: { status: ValidationCheck['status'] }) {
  if (status === 'pass') {
    return <CheckCircle className="text-success mt-0.5 h-4 w-4 shrink-0" />;
  }
  if (status === 'warn') {
    return <XCircle className="text-warning mt-0.5 h-4 w-4 shrink-0" />;
  }
  return <XCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />;
}

// ── Component ─────────────────────────────────────────────

export function DataLocationSection() {
  const {
    dirInfo,
    isLoading,
    selectDirectory,
    validateDir,
    confirmDir,
    resetDir,
    validationChecks,
    confirmed,
    hasExistingDb,
    canApply,
    handlePickDirectory,
    handleApplyAndRestart,
    handleReset,
  } = useDataLocationSection();

  if (isLoading) {
    return (
      <section className="mb-8">
        <Spinner className="text-muted-foreground" size="sm" />
      </section>
    );
  }

  return (
    <section className="mb-8">
      <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Data Location
      </Heading>
      <div className="border-border bg-card space-y-4 rounded-lg border p-4">
        {/* Current path */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Text className="text-sm font-medium">Current directory</Text>
            <Text className="text-muted-foreground mt-0.5 truncate text-xs">
              {dirInfo?.current ?? 'Unknown'}
            </Text>
            {dirInfo?.isCustom ? (
              <Badge className="mt-1" size="sm" variant="info">
                Custom
              </Badge>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              disabled={selectDirectory.isPending || validateDir.isPending}
              size="sm"
              variant="outline"
              onClick={() => {
                void handlePickDirectory();
              }}
            >
              {selectDirectory.isPending || validateDir.isPending ? (
                <Spinner className="mr-1.5" size="sm" />
              ) : (
                <FolderOpen className="mr-1.5 h-4 w-4" />
              )}
              <Text className="text-sm">Change</Text>
            </Button>
            {dirInfo?.isCustom ? (
              <Button
                disabled={resetDir.isPending}
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleReset();
                }}
              >
                {resetDir.isPending ? (
                  <Spinner className="mr-1.5" size="sm" />
                ) : (
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                )}
                <Text className="text-sm">Reset to Default</Text>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Validation results */}
        {validationChecks.length > 0 ? (
          <div className="space-y-2">
            <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Validation
            </Text>
            <ul className="space-y-1.5">
              {validationChecks.map((check) => (
                <li key={check.id} className="flex items-start gap-2">
                  <ValidationIcon status={check.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Text className="text-sm">{check.label}</Text>
                      <Badge size="sm" variant={statusToBadgeVariant(check.status)}>
                        {check.status}
                      </Badge>
                    </div>
                    <Text className="text-muted-foreground text-xs">{check.message}</Text>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Action buttons after validation */}
        {canApply && !confirmed ? (
          <div className="flex gap-2">
            <Button
              disabled={confirmDir.isPending}
              size="sm"
              variant="primary"
              onClick={() => {
                void handleApplyAndRestart(false);
              }}
            >
              {confirmDir.isPending ? (
                <Spinner className="mr-1.5" size="sm" />
              ) : null}
              <Text className="text-sm">Apply &amp; Restart</Text>
            </Button>
            {hasExistingDb ? (
              <Button
                disabled={confirmDir.isPending}
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleApplyAndRestart(true);
                }}
              >
                <Text className="text-sm">Use Existing Data</Text>
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Restart notice */}
        {confirmed ? (
          <InlineAlert variant="warning">
            <Text className="text-sm">Restart ADC to apply changes.</Text>
          </InlineAlert>
        ) : null}
      </div>
    </section>
  );
}
