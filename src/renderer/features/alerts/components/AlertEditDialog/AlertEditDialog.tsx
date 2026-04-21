/**
 * AlertEditDialog — Edit alert message, triggerAt, recurring config, and linkedTo
 */

import { Link } from 'lucide-react';

import type { Alert } from '@shared/types';

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import { useAlertEditDialog } from './useAlertEditDialog';

interface AlertEditDialogProps {
  alert: Alert | null;
  onClose: () => void;
}

export function AlertEditDialog({ alert, onClose }: AlertEditDialogProps) {
  const {
    isOpen,
    message,
    setMessage,
    triggerAt,
    setTriggerAt,
    enableRecurring,
    setEnableRecurring,
    recurringFrequency,
    setRecurringFrequency,
    recurringTime,
    setRecurringTime,
    handleSubmit,
    handleOpenChange,
    isPending,
    linkedTo,
  } = useAlertEditDialog({ alert, onClose });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Alert</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {linkedTo === undefined ? null : (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Linked to:</span>
              <Badge variant="secondary">
                {linkedTo.type}: {linkedTo.id}
              </Badge>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-alert-message">Message</Label>
            <Input
              id="edit-alert-message"
              placeholder="Alert message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-alert-trigger-at">Trigger At</Label>
            <Input
              id="edit-alert-trigger-at"
              type="datetime-local"
              value={triggerAt}
              onChange={(e) => setTriggerAt(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label
              className="flex cursor-pointer items-center gap-2"
              htmlFor="edit-alert-recurring-toggle"
            >
              <Checkbox
                checked={enableRecurring}
                id="edit-alert-recurring-toggle"
                onCheckedChange={(checked) => setEnableRecurring(checked === true)}
              />
              <span>Recurring</span>
            </Label>

            {enableRecurring ? (
              <div className="space-y-3 pl-6">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-alert-frequency">Frequency</Label>
                  <Select
                    value={recurringFrequency}
                    onValueChange={(value) =>
                      setRecurringFrequency(value as 'daily' | 'weekly' | 'monthly')
                    }
                  >
                    <SelectTrigger id="edit-alert-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-alert-time">Time</Label>
                  <Input
                    id="edit-alert-time"
                    type="time"
                    value={recurringTime}
                    onChange={(e) => setRecurringTime(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={message.trim().length === 0 || isPending}
            onClick={handleSubmit}
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Inline badge to display linkedTo on alert cards */
interface LinkedToBadgeProps {
  linkedTo: Alert['linkedTo'];
}

export function LinkedToBadge({ linkedTo }: LinkedToBadgeProps) {
  if (linkedTo === undefined) return null;

  return (
    <Badge className="mt-1 text-xs" variant="outline">
      <Link className="mr-1 h-2.5 w-2.5" />
      {linkedTo.type}
    </Badge>
  );
}
