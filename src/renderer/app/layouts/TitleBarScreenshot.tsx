/**
 * TitleBarScreenshot — Camera icon button for the TitleBar
 *
 * Captures the primary screen and copies a PNG image to the clipboard.
 * Shows a brief checkmark icon (1.5s) on success.
 */

import { useCallback, useRef, useState } from 'react';

import { Camera, Check } from 'lucide-react';

import { SCREEN } from '@shared/ipc/screen';

import { ipc } from '@renderer/shared/lib/ipc';

export function TitleBarScreenshot() {
  // 1. Hooks
  const [captured, setCaptured] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2. Handlers
  const handleCapture = useCallback(async () => {
    try {
      // Step 1: List screen sources
      const sources = await ipc(SCREEN.LIST.SOURCES, { types: ['screen'] });

      if (sources.length === 0) return;

      // Step 2: Capture the primary screen (index 0 is safe after length check)
      const screenshot = await ipc(SCREEN.CAPTURE.SCREEN, {
        sourceId: sources[0].id,
      });

      // Step 3: Convert base64 to PNG Blob and copy to clipboard
      const response = await fetch(
        `data:image/png;base64,${screenshot.data}`,
      );
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      // Step 4: Show checkmark feedback
      setCaptured(true);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setCaptured(false);
        timerRef.current = null;
      }, 1500);
    } catch {
      // Silently ignore — non-critical UI action
    }
  }, []);

  function handleClick() {
    void handleCapture();
  }

  // 3. Render
  return (
    <button
      aria-label={captured ? 'Screenshot copied' : 'Take screenshot'}
      className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex h-full w-10 items-center justify-center border-l"
      title={captured ? 'Screenshot copied' : 'Take screenshot'}
      type="button"
      onClick={handleClick}
    >
      {captured ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Camera className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
