/**
 * NotificationRules — Configure notification filtering rules
 */

import { Plus, Trash2 } from 'lucide-react';

import {
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import { useNotificationRules } from './useNotificationRules';

export function NotificationRules() {
  const {
    notificationRules,
    removeNotificationRule,
    toggleNotificationRule,
    newPattern,
    setNewPattern,
    newService,
    setNewService,
    handleAdd,
    handleKeyDown,
  } = useNotificationRules();

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <h3 className="text-foreground mb-3 text-sm font-semibold">Notification Rules</h3>
      <p className="text-muted-foreground mb-4 text-xs">
        Filter notifications by keyword pattern. Matching messages will trigger desktop alerts.
      </p>

      {/* Add rule */}
      <div className="mb-4 flex gap-2">
        <Select
          value={newService}
          onValueChange={(v) => setNewService(v as 'slack' | 'discord')}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slack">Slack</SelectItem>
            <SelectItem value="discord">Discord</SelectItem>
          </SelectContent>
        </Select>

        <Input
          className="flex-1"
          placeholder="Keyword or pattern..."
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <Button
          aria-label="Add notification rule"
          disabled={newPattern.trim().length === 0}
          type="button"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Rules list */}
      {notificationRules.length > 0 ? (
        <ul className="space-y-2">
          {notificationRules.map((rule) => (
            <li
              key={rule.id}
              className="border-border flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <Checkbox
                checked={rule.enabled}
                onCheckedChange={() => toggleNotificationRule(rule.id)}
              />
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs capitalize">
                {rule.service}
              </span>
              <span className="text-foreground min-w-0 flex-1 text-sm">{rule.pattern}</span>
              <Button
                aria-label={`Remove rule: ${rule.pattern}`}
                className="text-muted-foreground hover:text-destructive shrink-0"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => removeNotificationRule(rule.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-center text-xs">No rules configured</p>
      )}
    </div>
  );
}
