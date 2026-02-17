/**
 * StepDetection — Wizard step for repository detection results
 */

import type { InvokeOutput } from '@shared/ipc-contract';

import { RepoTypeSelector } from '../RepoTypeSelector';
import { SubRepoDetector } from '../SubRepoDetector';

type RepoDetectionResult = InvokeOutput<'projects.detectRepo'>;

interface StepDetectionProps {
  selectedPath: string | null;
  detection: RepoDetectionResult | undefined;
  error: Error | null;
  isLoading: boolean;
  repoType: string;
  onTypeChange: (type: string) => void;
}

export function StepDetection({
  selectedPath,
  detection,
  error,
  isLoading,
  repoType,
  onTypeChange,
}: StepDetectionProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">Repository Detection</h3>
      <p className="text-muted-foreground mb-4 text-xs">{selectedPath}</p>
      <SubRepoDetector detection={detection} error={error} isLoading={isLoading} />
      {detection ? (
        <div className="mt-4">
          <RepoTypeSelector
            detectedType={detection.repoType}
            selectedType={repoType}
            onTypeChange={onTypeChange}
          />
        </div>
      ) : null}
    </div>
  );
}
