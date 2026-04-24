/**
 * PairedRow — one row in the "Paired" section of HubPickerPanel.
 *
 * Shows:
 *   - a status dot + label (connected / reconnecting / offline / error)
 *   - the hub's display name (click to switch active)
 *   - an inline rename affordance
 *   - a destructive Remove action with AlertDialog confirmation
 *
 * All controls are @ui primitives — no raw HTML buttons/inputs.
 */

import { useEffect, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Flex,
  Input,
  Label,
  StatusIndicator,
  Text,
} from '@ui';

import { labelForPairedRowStatus } from './derive';

import type { HubRecord, PairedRowStatus } from './derive';

interface PairedRowProps {
  record: HubRecord;
  status: PairedRowStatus;
  isActive: boolean;
  isRenameSupported: boolean;
  isRemovePending: boolean;
  isSwitchPending: boolean;
  onActivate: () => void;
  onRename: (nextName: string) => void;
  onRemove: () => void;
}

const STATUS_VARIANT: Record<PairedRowStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  connected: 'success',
  reconnecting: 'warning',
  error: 'error',
  'paired-offline': 'neutral',
};

export function PairedRow({
  record,
  status,
  isActive,
  isRenameSupported,
  isRemovePending,
  isSwitchPending,
  onActivate,
  onRename,
  onRemove,
}: PairedRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.displayName);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(record.displayName);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(record.displayName);
  };

  const saveEdit = () => {
    const next = draft.trim();
    if (next === '' || next === record.displayName) {
      cancelEdit();
      return;
    }
    onRename(next);
    setEditing(false);
  };

  const rowId = `hub-paired-${record.hubId}`;
  const labelId = `${rowId}-label`;

  return (
    <Flex
      aria-checked={isActive}
      aria-labelledby={labelId}
      className="group items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2 data-[active=true]:border-primary/60 data-[active=true]:bg-primary/5"
      data-active={isActive ? 'true' : 'false'}
      data-testid={rowId}
      role="radio"
      tabIndex={isActive ? 0 : -1}
    >
      <StatusIndicator size="sm" variant={STATUS_VARIANT[status]} />

      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit();
            }}
          >
            <Label className="sr-only" htmlFor={`${rowId}-name-input`}>
              Rename {record.displayName}
            </Label>
            <Input
              ref={inputRef}
              className="h-7 flex-1"
              id={`${rowId}-name-input`}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
            />
            <Button size="sm" type="submit" variant="secondary">
              Save
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={cancelEdit}>
              Cancel
            </Button>
          </form>
        ) : (
          <Flex className="items-center gap-2">
            <Button
              className="h-auto justify-start truncate p-0 font-medium"
              disabled={isSwitchPending}
              id={labelId}
              type="button"
              variant="link"
              onClick={onActivate}
            >
              {record.displayName}
            </Button>
            <Text className="shrink-0" size="sm" variant="muted">
              {labelForPairedRowStatus(status)}
            </Text>
          </Flex>
        )}
      </div>

      {editing ? null : (
        <Flex className="items-center gap-1 opacity-80 group-hover:opacity-100">
          {isRenameSupported ? (
            <Button size="sm" type="button" variant="ghost" onClick={startEdit}>
              Rename
            </Button>
          ) : null}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={isRemovePending}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {record.displayName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the hub from this device. Your data on the hub is not
                  deleted — you can re-pair later. If this was the active hub, the
                  next paired hub (if any) will become active.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Flex>
      )}
    </Flex>
  );
}
