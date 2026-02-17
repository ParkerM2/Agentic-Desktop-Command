/**
 * StepSubRepos — Wizard step for selecting child repositories
 */

import type { InvokeOutput } from '@shared/ipc-contract';

import { SubRepoSelector } from '../SubRepoSelector';

type ChildRepo = InvokeOutput<'projects.detectRepo'>['childRepos'][number];

interface StepSubReposProps {
  repos: ChildRepo[];
  selected: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

export function StepSubRepos({ repos, selected, onSelectionChange }: StepSubReposProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">Select Repositories</h3>
      <SubRepoSelector repos={repos} selected={selected} onSelectionChange={onSelectionChange} />
    </div>
  );
}
