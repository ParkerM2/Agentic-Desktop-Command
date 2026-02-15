/**
 * DeviceCard — Displays a single device with status, type, and capabilities
 */

import { Clock, Globe, Monitor, Smartphone } from 'lucide-react';

import type { Device } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

interface DeviceCardProps {
  device: Device;
}

function getDeviceIcon(deviceType: Device['deviceType']) {
  if (deviceType === 'mobile') return Smartphone;
  if (deviceType === 'web') return Globe;
  return Monitor;
}

function formatLastSeen(lastSeen: string | undefined): string {
  if (!lastSeen) return 'Never';
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${String(diffMin)}m ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${String(diffHrs)}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  return `${String(diffDays)}d ago`;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const Icon = getDeviceIcon(device.deviceType);
  const hasRepos = device.capabilities.repos.length > 0;

  return (
    <div className="border-border bg-card rounded-lg border p-4 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon + status */}
        <div className="relative mt-0.5 shrink-0">
          <Icon className="text-muted-foreground h-5 w-5" />
          <span
            title={device.isOnline ? 'Online' : 'Offline'}
            className={cn(
              'absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-900',
              device.isOnline ? 'bg-success' : 'bg-muted-foreground',
            )}
          />
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{device.deviceName}</h3>
            <span className="text-muted-foreground text-xs">({device.deviceType})</span>
          </div>

          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {/* Last seen */}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {formatLastSeen(device.lastSeen)}
            </span>

            {/* App version */}
            {device.appVersion ? (
              <span>v{device.appVersion}</span>
            ) : null}

            {/* Capabilities */}
            {device.capabilities.canExecute ? (
              <span className="text-success text-xs font-medium">Can Execute</span>
            ) : null}
          </div>

          {/* Repos */}
          {hasRepos ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {device.capabilities.repos.map((repo) => (
                <span
                  key={repo}
                  className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
                >
                  {repo}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
