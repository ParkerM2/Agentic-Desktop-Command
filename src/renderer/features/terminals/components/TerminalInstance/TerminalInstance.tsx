/**
 * TerminalInstance — Single xterm.js terminal
 *
 * Mounts an xterm.js instance, connects it to IPC for I/O,
 * and handles resize/fit.
 */

import type { TerminalSession } from '@shared/types';

import { useTerminalInstance } from './useTerminalInstance';

interface TerminalInstanceProps {
  session: TerminalSession;
  isActive: boolean;
}

export function TerminalInstance({ session, isActive }: TerminalInstanceProps) {
  const { containerRef } = useTerminalInstance({ session, isActive });

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  );
}
