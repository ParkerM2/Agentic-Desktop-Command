import { useLooseParams } from '@renderer/shared/hooks';

import { useTestSuiteConfig } from '../../api/useTestSuiteConfig';
import { useTestSuiteEvents } from '../../hooks/useTestSuiteEvents';
import { useTestSuiteShortcuts } from '../../hooks/useTestSuiteShortcuts';
import { useTestSuiteStore } from '../../test-suite-store';

export function useTestSuitePage() {
  const { projectId } = useLooseParams();
  const { data: config, isLoading } = useTestSuiteConfig(projectId);
  const { activeTab, setActiveTab } = useTestSuiteStore();

  useTestSuiteShortcuts();
  useTestSuiteEvents(projectId ?? '');

  return {
    projectId,
    config,
    isLoading,
    activeTab,
    setActiveTab,
  };
}
