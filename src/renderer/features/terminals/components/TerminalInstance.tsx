/**
 * TerminalInstance — Single xterm.js terminal
 *
 * Mounts an xterm.js instance, connects it to IPC for I/O,
 * and handles resize/fit.
 */

import { useEffect, useRef } from 'react';

import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal as XTerm } from '@xterm/xterm';

import type { TerminalSession } from '@shared/types';

import { useIpcEvent } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

interface TerminalInstanceProps {
  session: TerminalSession;
  isActive: boolean;
}

export function TerminalInstance({ session, isActive }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize xterm on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#0a0a0a',
        foreground: '#e4e4e7',
        cursor: '#e4e4e7',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#3f3f46',
        black: '#18181b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#fafafa',
      },
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    // Try WebGL renderer, fall back to canvas
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available, canvas renderer is fine
    }

    term.open(containerRef.current);
    fitAddon.fit();

    // Send user input to main process
    term.onData((data) => {
      void ipc('terminals.sendInput', { sessionId: session.id, data });
    });

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [session.id]);

  // Handle resize when tab becomes active or window resizes
  useEffect(() => {
    if (!isActive || !fitAddonRef.current || !xtermRef.current) return;

    const fit = () => {
      try {
        fitAddonRef.current?.fit();
        const term = xtermRef.current;
        if (term) {
          void ipc('terminals.resize', {
            sessionId: session.id,
            cols: term.cols,
            rows: term.rows,
          });
        }
      } catch {
        // Ignore fit errors during transitions
      }
    };

    // Fit on activation
    fit();

    // Fit on window resize
    const observer = new ResizeObserver(fit);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isActive, session.id]);

  // Receive output from main process
  useIpcEvent('event:terminal.output', ({ sessionId, data }) => {
    if (sessionId === session.id && xtermRef.current) {
      xtermRef.current.write(data);
    }
  });

  // Handle terminal title changes
  useIpcEvent('event:terminal.titleChanged', ({ sessionId: _sessionId, title: _title }) => {
    // Could update tab title through store if needed
  });

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  );
}
