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

import { TERMINALS, TERMINALS_EVENTS } from '@shared/ipc/terminals/channels';
import type { TerminalSession } from '@shared/types';

import { useIpcEvent } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';
import { useThemeStore } from '@renderer/shared/stores/theme-store';

interface TerminalInstanceProps {
  session: TerminalSession;
  isActive: boolean;
}

/**
 * Reads a CSS custom property from the document root and returns its value.
 * Falls back to the provided default if the property is not set.
 */
function getCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Builds an xterm.js ITheme from the active CSS custom properties.
 * This ensures the terminal adapts to whichever color theme is active.
 */
function getTerminalTheme(): Record<string, string> {
  return {
    background: getCssVar('--background', '#0a0a0a'),
    foreground: getCssVar('--foreground', '#e4e4e7'),
    cursor: getCssVar('--foreground', '#e4e4e7'),
    cursorAccent: getCssVar('--background', '#0a0a0a'),
    selectionBackground: getCssVar('--muted', '#3f3f46'),
    black: getCssVar('--secondary', '#18181b'),
    red: getCssVar('--destructive', '#f87171'),
    green: getCssVar('--success', '#4ade80'),
    yellow: getCssVar('--warning', '#facc15'),
    blue: getCssVar('--info', '#60a5fa'),
    magenta: getCssVar('--accent-foreground', '#c084fc'),
    cyan: getCssVar('--info', '#22d3ee'),
    white: getCssVar('--foreground', '#e4e4e7'),
    brightBlack: getCssVar('--muted-foreground', '#52525b'),
    brightRed: getCssVar('--error', '#fca5a5'),
    brightGreen: getCssVar('--success', '#86efac'),
    brightYellow: getCssVar('--warning', '#fde68a'),
    brightBlue: getCssVar('--info', '#93c5fd'),
    brightMagenta: getCssVar('--accent-foreground', '#d8b4fe'),
    brightCyan: getCssVar('--info', '#67e8f9'),
    brightWhite: getCssVar('--card-foreground', '#fafafa'),
  };
}

export function TerminalInstance({ session, isActive }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const colorTheme = useThemeStore((s) => s.colorTheme);
  const mode = useThemeStore((s) => s.mode);

  // Initialize xterm on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: getTerminalTheme(),
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
      void ipc(TERMINALS.SEND.INPUT, { sessionId: session.id, data });
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
          void ipc(TERMINALS.RESIZE.SESSION, {
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

  // Re-apply theme when color theme or mode changes
  useEffect(() => {
    if (!xtermRef.current) return;
    xtermRef.current.options.theme = getTerminalTheme();
  }, [colorTheme, mode]);

  // Receive output from main process
  useIpcEvent(TERMINALS_EVENTS.TERMINAL.OUTPUT, ({ sessionId, data }) => {
    if (sessionId === session.id && xtermRef.current) {
      xtermRef.current.write(data);
    }
  });

  // Handle terminal title changes
  useIpcEvent(TERMINALS_EVENTS.TERMINAL['TITLE-CHANGED'], ({ sessionId: _sessionId, title: _title }) => {
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
