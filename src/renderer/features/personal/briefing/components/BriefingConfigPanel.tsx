/**
 * BriefingConfigPanel — Dialog for editing daily briefing configuration.
 * Controls: enabled toggle, scheduled time, GitHub inclusion, agent activity inclusion.
 */

import { useEffect, useState } from 'react';

import { Settings } from 'lucide-react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  Switch,
} from '@ui';

import { useBriefingConfig, useUpdateBriefingConfig } from '../api/useBriefing';

interface BriefingConfigPanelProps {
  open: boolean;
  onClose: () => void;
}

export function BriefingConfigPanel({ open, onClose }: BriefingConfigPanelProps) {
  const { data: config, isLoading } = useBriefingConfig();
  const updateConfig = useUpdateBriefingConfig();

  const [enabled, setEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [includeGitHub, setIncludeGitHub] = useState(false);
  const [includeAgentActivity, setIncludeAgentActivity] = useState(false);

  // Sync form state when config loads or dialog opens
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

  function renderBody() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      );
    }

    return (
      <div className="space-y-5 py-2">
        {/* Enabled toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium" htmlFor="briefing-enabled">
              Enable daily briefing
            </Label>
            <p className="text-muted-foreground text-xs">
              Automatically generate a briefing each day
            </p>
          </div>
          <Switch
            checked={enabled}
            id="briefing-enabled"
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Scheduled time */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium" htmlFor="briefing-time">
            Scheduled time
          </Label>
          <Input
            disabled={!enabled}
            id="briefing-time"
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Time when your daily briefing will be generated
          </p>
        </div>

        {/* Include GitHub */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={includeGitHub}
            disabled={!enabled}
            id="briefing-github"
            onCheckedChange={(checked) => setIncludeGitHub(checked === true)}
          />
          <div>
            <Label className="text-sm font-medium leading-none" htmlFor="briefing-github">
              Include GitHub notifications
            </Label>
            <p className="text-muted-foreground mt-1 text-xs">
              Show unread GitHub notification count in your briefing
            </p>
          </div>
        </div>

        {/* Include agent activity */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={includeAgentActivity}
            disabled={!enabled}
            id="briefing-agents"
            onCheckedChange={(checked) => setIncludeAgentActivity(checked === true)}
          />
          <div>
            <Label className="text-sm font-medium leading-none" htmlFor="briefing-agents">
              Include agent activity
            </Label>
            <p className="text-muted-foreground mt-1 text-xs">
              Show running and completed agent sessions in your briefing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="text-primary h-5 w-5" />
            Briefing Settings
          </DialogTitle>
        </DialogHeader>

        {renderBody()}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={isLoading || updateConfig.isPending}
            onClick={handleSave}
          >
            {updateConfig.isPending ? <Spinner size="sm" /> : null}
            {updateConfig.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
