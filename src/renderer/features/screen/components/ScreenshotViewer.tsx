/**
 * ScreenshotViewer — Display and manage captured screenshots
 */

import { useState } from 'react';

import { Check, Copy, Download, Image, Maximize2, X } from 'lucide-react';

import type { Screenshot } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

interface ScreenshotViewerProps {
  screenshot: Screenshot | null;
  onClose?: () => void;
  className?: string;
}

export function ScreenshotViewer({ screenshot, onClose, className }: ScreenshotViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!screenshot) {
    return (
      <div
        className={cn(
          'bg-muted/50 border-border flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8',
          className,
        )}
      >
        <Image className="text-muted-foreground mb-2 h-12 w-12" />
        <p className="text-muted-foreground text-sm">No screenshot captured yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Select a source and click capture to take a screenshot
        </p>
      </div>
    );
  }

  async function handleCopyToClipboard() {
    if (!screenshot) return;

    try {
      // Convert base64 data URL to blob
      const response = await fetch(screenshot.data);
      const blob = await response.blob();

      // Use the Clipboard API with ClipboardItem
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy as text (base64)
      try {
        await navigator.clipboard.writeText(screenshot.data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Silent fail if clipboard not available
      }
    }
  }

  function handleDownload() {
    if (!screenshot) return;

    // Create a download link
    const link = document.createElement('a');
    link.href = screenshot.data;
    link.download = `screenshot-${new Date(screenshot.timestamp).toISOString().replaceAll(/[:.]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        onClose?.();
      }
    }
  }

  function handleFullscreenToggle() {
    setIsFullscreen((prev) => !prev);
  }

  const formattedTime = new Date(screenshot.timestamp).toLocaleString();

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <button
        aria-label="Screenshot fullscreen view - click to close"
        className="bg-background/95 fixed inset-0 z-50 flex cursor-pointer items-center justify-center backdrop-blur-sm"
        type="button"
        onClick={handleFullscreenToggle}
        onKeyDown={handleKeyDown}
      >
        <button
          aria-label="Close fullscreen"
          className="bg-background/80 text-foreground hover:bg-accent absolute top-4 right-4 rounded-lg p-2 transition-colors"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFullscreenToggle();
          }}
        >
          <X className="h-5 w-5" />
        </button>
        <img
          alt={`Screenshot from ${screenshot.source.name}`}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          src={screenshot.data}
        />
      </button>
    );
  }

  return (
    <div className={cn('bg-card border-border overflow-hidden rounded-lg border', className)}>
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground truncate text-sm font-medium">{screenshot.source.name}</h3>
          <p className="text-muted-foreground text-xs">
            {screenshot.width} x {screenshot.height} - {formattedTime}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            aria-label="Copy to clipboard"
            type="button"
            className={cn(
              'text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-2 transition-colors',
              copied && 'text-success',
            )}
            onClick={() => void handleCopyToClipboard()}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>

          <button
            aria-label="Download screenshot"
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-2 transition-colors"
            type="button"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            aria-label="View fullscreen"
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-2 transition-colors"
            type="button"
            onClick={handleFullscreenToggle}
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {onClose ? (
            <button
              aria-label="Close viewer"
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-2 transition-colors"
              type="button"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Image preview */}
      <div className="bg-muted/30 relative">
        <button
          aria-label="View fullscreen"
          className="w-full cursor-pointer"
          type="button"
          onClick={handleFullscreenToggle}
          onKeyDown={handleKeyDown}
        >
          <img
            alt={`Screenshot from ${screenshot.source.name}`}
            className="h-auto w-full object-contain"
            src={screenshot.data}
          />
        </button>
      </div>
    </div>
  );
}
