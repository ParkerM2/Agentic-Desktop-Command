import { useState } from 'react';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  useDeleteSharedSteps,
  useSharedStepDomains,
  useSharedSteps,
} from '../../api/useSharedSteps';
import { useTestSuiteStore } from '../../test-suite-store';

export function useSharedStepsPanel() {
  const { projectId } = useLooseParams();
  const { data: groups = [] } = useSharedSteps(projectId);
  const { data: domains = [] } = useSharedStepDomains(projectId);
  const deleteSharedSteps = useDeleteSharedSteps();
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const addStep = useTestSuiteStore((s) => s.addStep);

  const filtered = domainFilter === 'all'
    ? groups
    : groups.filter((g) => g.domain === domainFilter);

  const insertSteps = (group: typeof groups[0]) => {
    for (let i = 0; i < group.steps.length; i++) {
      addStep({
        stepIndex: Date.now() + i,
        step: group.steps[i],
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteSharedSteps.mutate(id);
  };

  return {
    projectId,
    domains,
    domainFilter,
    setDomainFilter,
    filtered,
    insertSteps,
    handleDelete,
  };
}
