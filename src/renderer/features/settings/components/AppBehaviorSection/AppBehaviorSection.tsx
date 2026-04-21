/**
 * AppBehaviorSection — App Behavior settings (open at login, tray, agents)
 */

import { Heading, Input, Label, Switch, Text } from '@ui';

import { useAppBehaviorSection } from './useAppBehaviorSection';

export function AppBehaviorSection() {
  const {
    openAtLogin,
    minimizeToTray,
    startMinimized,
    keepRunning,
    maxConcurrentAgents,
    updateSettings,
    handleMaxConcurrentAgentsChange,
  } = useAppBehaviorSection();

  return (
    <section className="mb-8">
      <Heading className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        App Behavior
      </Heading>
      <div className="border-border bg-card space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Text className="text-sm font-medium">Open at login</Text>
            <Text className="text-muted-foreground text-xs">
              Launch ADC automatically when you log in
            </Text>
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
            <Text className="text-sm font-medium">Minimize to tray</Text>
            <Text className="text-muted-foreground text-xs">
              Keep ADC in the system tray when minimized
            </Text>
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
            <Text className="text-sm font-medium">Start minimized</Text>
            <Text className="text-muted-foreground text-xs">
              Launch ADC minimized to the tray on startup
            </Text>
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
            <Text className="text-sm font-medium">Keep running when window closed</Text>
            <Text className="text-muted-foreground text-xs">
              Continue running agents in the background when the window is closed
            </Text>
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
            <Text className="text-muted-foreground text-xs">
              Maximum number of agents that can run simultaneously (1–20)
            </Text>
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
