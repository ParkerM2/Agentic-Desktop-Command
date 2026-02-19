/**
 * DeviceSelector — Dropdown to pick a host device for a workspace
 */

import { useId, useState } from 'react';

import { ChevronDown, Monitor } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';


import { useDevices } from '@features/devices';

interface DeviceSelectorProps {
  value: string | undefined;
  onChange: (deviceId: string) => void;
}

export function DeviceSelector({ value, onChange }: DeviceSelectorProps) {
  const { data: devices } = useDevices();
  const [open, setOpen] = useState(false);
  const listboxId = useId();

  const selected = devices?.find((d) => d.id === value);

  function handleSelect(deviceId: string) {
    onChange(deviceId);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(!open);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleOptionKeyDown(event: React.KeyboardEvent, deviceId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(deviceId);
    }
  }

  return (
    <div className="relative">
      <Button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select host device"
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm"
        role="combobox"
        variant="outline"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2">
          <Monitor className="text-muted-foreground h-4 w-4" />
          <span>{selected ? selected.deviceName : 'Select device...'}</span>
          {selected ? (
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                selected.isOnline ? 'bg-success' : 'bg-muted-foreground',
              )}
            />
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform',
            open && 'rotate-180',
          )}
        />
      </Button>
      {open ? (
        <div
          className="border-border bg-card absolute z-10 mt-1 w-full overflow-hidden rounded-lg border shadow-lg"
          id={listboxId}
          role="listbox"
        >
          {devices?.map((device) => (
            <div
              key={device.id}
              aria-selected={value === device.id}
              role="option"
              tabIndex={0}
              className={cn(
                'flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors',
                'hover:bg-accent',
                value === device.id && 'bg-accent text-primary',
              )}
              onClick={() => handleSelect(device.id)}
              onKeyDown={(event) => handleOptionKeyDown(event, device.id)}
            >
              <div className="flex items-center gap-2">
                <Monitor className="text-muted-foreground h-4 w-4" />
                <span>{device.deviceName}</span>
                <span className="text-muted-foreground text-xs">({device.deviceType})</span>
              </div>
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  device.isOnline ? 'bg-success' : 'bg-muted-foreground',
                )}
              />
            </div>
          )) ?? null}
        </div>
      ) : null}
    </div>
  );
}
