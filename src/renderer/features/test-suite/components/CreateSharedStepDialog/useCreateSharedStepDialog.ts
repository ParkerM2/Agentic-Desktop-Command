import { useState } from 'react';

import { useCreateSharedSteps } from '../../api/useSharedSteps';
import { useTestSuiteStore } from '../../test-suite-store';

export function useCreateSharedStepDialog(projectId: string) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const createSharedSteps = useCreateSharedSteps();
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);

  const handleCreate = () => {
    if (!name.trim() || !domain.trim() || recordedSteps.length === 0) return;
    createSharedSteps.mutate(
      {
        projectId,
        name: name.trim(),
        domain: domain.trim(),
        description: description.trim() || undefined,
        steps: recordedSteps.map((r) => r.step),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setDomain('');
          setDescription('');
        },
      },
    );
  };

  const canCreate = !!name.trim() && !!domain.trim() && recordedSteps.length > 0;

  return {
    open,
    setOpen,
    name,
    setName,
    domain,
    setDomain,
    description,
    setDescription,
    recordedStepsCount: recordedSteps.length,
    canCreate,
    handleCreate,
  };
}
