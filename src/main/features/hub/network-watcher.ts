import { networkInterfaces } from 'node:os';

import { powerMonitor } from 'electron';

export interface NetworkWatcherOpts {
  intervalMs?: number;
  /** For testing: override the interface snapshot source. */
  getInterfaces?: () => ReturnType<typeof networkInterfaces>;
  /** For testing: override the power monitor. */
  powerMonitor?: {
    on: (event: string, handler: () => void) => void;
    off: (event: string, handler: () => void) => void;
  };
}

export type Unsubscribe = () => void;

function hashInterfaces(ifaces: ReturnType<typeof networkInterfaces>): string {
  const parts: string[] = [];
  const names = Object.keys(ifaces).sort();
  for (const name of names) {
    const list = ifaces[name];
    if (!list) continue;
    for (const entry of list) {
      parts.push(`${name}|${entry.family}|${entry.address}|${entry.cidr ?? ''}|${entry.internal}`);
    }
  }
  return parts.sort().join(';');
}

export function createNetworkWatcher(
  onChange: () => void,
  opts: NetworkWatcherOpts = {},
): Unsubscribe {
  const intervalMs = opts.intervalMs ?? 5_000;
  const getIfaces = opts.getInterfaces ?? (() => networkInterfaces());
  const pm = opts.powerMonitor ?? powerMonitor;

  let lastHash = hashInterfaces(getIfaces());

  function check(): void {
    const current = hashInterfaces(getIfaces());
    if (current !== lastHash) {
      lastHash = current;
      onChange();
    }
  }

  const interval = setInterval(check, intervalMs);
  interval.unref();
  const resumeHandler = (): void => {
    check();
  };
  pm.on('resume', resumeHandler);

  return () => {
    clearInterval(interval);
    pm.off('resume', resumeHandler);
  };
}
