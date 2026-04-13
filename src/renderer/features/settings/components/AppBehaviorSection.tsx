/**
 * AppBehaviorSection — App Behavior settings (open at login, tray, agents)
 */

import { Input, Label, Switch } from '@ui';

import { useSettings, useUpdateSettings, useAgentSettings, useUpdateAgentSettings } from '../api/useSettings';

export function AppBehaviorSection() {
  // 1. Hooks
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: agentSettings } = useAgentSettings();
  const updateAgentSettings = useUpdateAgentSettings();

  // 2. Derived state
  const openAtLogin = settings?.openAtLogin ?? false;
  const minimizeToTray = settings?.minimizeToTray ?? false;
  const startMinimized = settings?.startMinimized ?? false;
  const keepRunning = settings?.keepRunning ?? false;
  const maxConcurrentAgents = agentSettings?.maxConcurrentAgents ?? 5;

  // 3. Event handlers
  function handleMaxConcurrentAgentsChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Math.min(20, Math.max(1, Number(event.target.value)));
    updateAgentSettings.mutate({ maxConcurrentAgents: value });
  }

  // 4. Render
  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        App Behavior
      </h2>
      <div className="border-border bg-card space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Open at login</p>
            <p className="text-muted-foreground text-xs">
              Launch ADC automatically when you log in
            </p>
          </div>
          <Switch
            checked={openAtLogin}
            onCheckedChange={(checked) => {
              updateSettings.mutate({ openAtLogin: checked });
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Minimize to tray</p>
            <p className="text-muted-foreground text-xs">
              Keep ADC in the system tray when minimized
            </p>
          </div>
          <Switch
            checked={minimizeToTray}
            onCheckedChange={(checked) => {
              updateSettings.mutate({ minimizeToTray: checked });
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Start minimized</p>
            <p className="text-muted-foreground text-xs">
              Launch ADC minimized to the tray on startup
            </p>
          </div>
          <Switch
            checked={startMinimized}
            onCheckedChange={(checked) => {
              updateSettings.mutate({ startMinimized: checked });
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Keep running when window closed</p>
            <p className="text-muted-foreground text-xs">
              Continue running agents in the background when the window is closed
            </p>
          </div>
          <Switch
            checked={keepRunning}
            onCheckedChange={(checked) => {
              updateSettings.mutate({ keepRunning: checked });
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium" htmlFor="max-concurrent-agents">
              Max concurrent agents
            </Label>
            <p className="text-muted-foreground text-xs">
              Maximum number of agents that can run simultaneously (1–20)
            </p>
          </div>
          <Input
            className="w-20 text-center"
            id="max-concurrent-agents"
            max={20}
            min={1}
            type="number"
            value={maxConcurrentAgents}
            onChange={handleMaxConcurrentAgentsChange}
          />
        </div>
      </div>
    </section>
  );
}
