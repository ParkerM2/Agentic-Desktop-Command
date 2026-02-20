/**
 * TitleBar — Custom frameless window title bar
 *
 * Replaces the native OS title bar. Provides drag region for window
 * movement, utility buttons (screenshot, health, hub status), and
 * minimize/maximize/close buttons for window controls.
 */

import { useCallback, useEffect, useState } from 'react';

import { Minus, Square, X } from 'lucide-react';

import { HubStatus } from '@renderer/shared/components/HubStatus';
import { ipc } from '@renderer/shared/lib/ipc';

import { Button, Separator } from '@ui';

import { HealthIndicator } from '@features/health';

import { TitleBarScreenshot } from './TitleBarScreenshot';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  // Query maximize state on mount and when window events occur
  const refreshMaximizedState = useCallback(async () => {
    try {
      const result = await ipc('window.isMaximized', {});
      setIsMaximized(result.isMaximized);
    } catch {
      // Silently ignore — non-critical UI state
    }
  }, []);

  useEffect(() => {
    void refreshMaximizedState();
  }, [refreshMaximizedState]);

  // Listen for native maximize/unmaximize via resize events
  useEffect(() => {
    function handleResize() {
      void refreshMaximizedState();
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [refreshMaximizedState]);

  function handleMinimize() {
    void ipc('window.minimize', {});
  }

  function handleMaximize() {
    void ipc('window.maximize', {});
    setIsMaximized((prev) => !prev);
  }

  function handleClose() {
    void ipc('window.close', {});
  }

  return (
    <div className="electron-drag bg-card border-border flex h-8 shrink-0 items-center border-b">
      {/* App title — left side */}
      <div className="flex items-center px-3">
        <span className="text-muted-foreground select-none text-xs font-semibold tracking-wide">
          ADC
        </span>
      </div>

      {/* Spacer — fills remaining drag area */}
      <div className="flex-1" />

      {/* Utility buttons — screenshot, health, hub status */}
      <div className="electron-no-drag flex items-center gap-0.5 px-1">
        <TitleBarScreenshot />
        <HealthIndicator />
        <HubStatus />
      </div>

      {/* Divider between utility buttons and window controls */}
      <Separator className="mx-1 h-4" orientation="vertical" />

      {/* Window controls — right side */}
      <div className="electron-no-drag flex h-full items-center">
        <Button
          aria-label="Minimize window"
          className="text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-10 rounded-none"
          size="icon"
          variant="ghost"
          onClick={handleMinimize}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          className="text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-10 rounded-none"
          size="icon"
          variant="ghost"
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <svg
              aria-hidden="true"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 10 10"
            >
              <rect height="7" rx="0.5" width="7" x="0.5" y="2.5" />
              <path d="M2.5 2.5V1a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H8" />
            </svg>
          ) : (
            <Square className="h-3 w-3" />
          )}
        </Button>
        <Button
          aria-label="Close window"
          className="text-muted-foreground hover:bg-destructive hover:text-destructive-foreground h-8 w-10 rounded-none"
          size="icon"
          variant="ghost"
          onClick={handleClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
