/**
 * useBriefingConfigPanel — all logic for BriefingConfigPanel
 */

import { useEffect, useState } from 'react';

import { useBriefingConfig, useUpdateBriefingConfig } from '../../api/useBriefing';

interface UseBriefingConfigPanelParams {
  open: boolean;
  onClose: () => void;
}

export function useBriefingConfigPanel({ open, onClose }: UseBriefingConfigPanelParams) {
  const { data: config, isLoading } = useBriefingConfig();
  const updateConfig = useUpdateBriefingConfig();

  const [enabled, setEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [includeGitHub, setIncludeGitHub] = useState(false);
  const [includeAgentActivity, setIncludeAgentActivity] = useState(false);

  useEffect(() => {
    if (config !== undefined) {
      setEnabled(config.enabled);
      setScheduledTime(config.scheduledTime);
      setIncludeGitHub(config.includeGitHub);
      setIncludeAgentActivity(config.includeAgentActivity);
    }
  }, [config, open]);

  function handleSave() {
    updateConfig.mutate(
      { enabled, scheduledTime, includeGitHub, includeAgentActivity },
      { onSuccess: onClose },
    );
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  return {
    isLoading,
    enabled,
    setEnabled,
    scheduledTime,
    setScheduledTime,
    includeGitHub,
    setIncludeGitHub,
    includeAgentActivity,
    setIncludeAgentActivity,
    handleSave,
    handleOpenChange,
    isPending: updateConfig.isPending,
  };
}
