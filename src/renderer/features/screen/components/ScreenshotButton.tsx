/**
 * ScreenshotButton — Capture screenshot with source selection dropdown
 */

import { useState } from 'react';

import { AlertCircle, AppWindow, Camera, ChevronDown, Loader2, Monitor } from 'lucide-react';

import type { ScreenSource, Screenshot } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import {
  useAvailableSources,
  useCaptureScreen,
  useScreenPermission,
} from '../api/useScreenCapture';

interface ScreenshotButtonProps {
  onCapture?: (screenshot: Screenshot) => void;
  className?: string;
}

export function ScreenshotButton({ onCapture, className }: ScreenshotButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ScreenSource | null>(null);

  const { data: permission } = useScreenPermission();
  const {
    data: sources,
    isLoading: sourcesLoading,
    refetch: refetchSources,
  } = useAvailableSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 150, height: 150 },
  });
  const captureScreen = useCaptureScreen();

  const permissionDenied = permission?.platform === 'darwin' && permission.status === 'denied';

  function handleDropdownToggle() {
    if (!isDropdownOpen) {
      void refetchSources();
    }
    setIsDropdownOpen(!isDropdownOpen);
  }

  function handleSourceSelect(source: ScreenSource) {
    setSelectedSource(source);
    setIsDropdownOpen(false);
  }

  function handleCapture() {
    if (!selectedSource) return;

    captureScreen.mutate(
      { sourceId: selectedSource.id },
      {
        onSuccess: (screenshot) => {
          onCapture?.(screenshot);
        },
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  }

  // Separate screens and windows
  const screens = sources?.filter((s) => s.id.startsWith('screen:')) ?? [];
  const windows = sources?.filter((s) => s.id.startsWith('window:')) ?? [];

  function getSourceIcon(source: ScreenSource) {
    if (source.appIcon) {
      return <img alt="" className="h-4 w-4" src={source.appIcon} />;
    }
    return <AppWindow className="h-4 w-4" />;
  }

  return (
    <div className={cn('relative inline-flex', className)}>
      {/* Main capture button */}
      <button
        aria-label="Capture screenshot"
        disabled={!selectedSource || captureScreen.isPending || permissionDenied}
        type="button"
        className={cn(
          'bg-primary text-primary-foreground flex items-center gap-2 rounded-l-md px-4 py-2 text-sm font-medium transition-colors',
          'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onClick={handleCapture}
      >
        {captureScreen.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {selectedSource ? `Capture ${selectedSource.name}` : 'Select Source'}
      </button>

      {/* Dropdown toggle */}
      <button
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        aria-label="Select capture source"
        type="button"
        className={cn(
          'bg-primary text-primary-foreground border-primary-foreground/20 rounded-r-md border-l px-2 py-2 transition-colors',
          'hover:bg-primary/90',
        )}
        onClick={handleDropdownToggle}
        onKeyDown={handleKeyDown}
      >
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isDropdownOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen ? (
        <div
          role="listbox"
          className={cn(
            'bg-popover border-border absolute top-full right-0 z-50 mt-1 w-72 rounded-lg border shadow-lg',
            'max-h-80 overflow-y-auto',
          )}
        >
          {permissionDenied ? (
            <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 border-b p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-xs">
                Screen recording permission denied. Enable in System Preferences &gt; Security &amp;
                Privacy.
              </span>
            </div>
          ) : null}

          {sourcesLoading ? (
            <div className="text-muted-foreground flex items-center justify-center p-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading sources...
            </div>
          ) : (
            <>
              {/* Screens section */}
              {screens.length > 0 ? (
                <div>
                  <div className="text-muted-foreground border-border border-b px-3 py-2 text-xs font-medium uppercase">
                    Screens
                  </div>
                  {screens.map((source) => (
                    <SourceOption
                      key={source.id}
                      icon={<Monitor className="h-4 w-4" />}
                      selected={selectedSource?.id === source.id}
                      source={source}
                      onClick={() => handleSourceSelect(source)}
                    />
                  ))}
                </div>
              ) : null}

              {/* Windows section */}
              {windows.length > 0 ? (
                <div>
                  <div className="text-muted-foreground border-border border-b px-3 py-2 text-xs font-medium uppercase">
                    Windows
                  </div>
                  {windows.map((source) => (
                    <SourceOption
                      key={source.id}
                      icon={getSourceIcon(source)}
                      selected={selectedSource?.id === source.id}
                      source={source}
                      onClick={() => handleSourceSelect(source)}
                    />
                  ))}
                </div>
              ) : null}

              {screens.length === 0 && windows.length === 0 ? (
                <div className="text-muted-foreground p-4 text-center text-sm">
                  No capture sources available
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Source Option Component ───────────────────────────────────

interface SourceOptionProps {
  source: ScreenSource;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

function SourceOption({ source, icon, selected, onClick }: SourceOptionProps) {
  return (
    <button
      aria-selected={selected}
      role="option"
      type="button"
      className={cn(
        'hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
        selected && 'bg-accent',
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="border-border h-10 w-14 shrink-0 overflow-hidden rounded border">
        <img alt={source.name} className="h-full w-full object-cover" src={source.thumbnail} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="text-foreground flex items-center gap-2 text-sm font-medium">
          {icon}
          <span className="truncate">{source.name}</span>
        </div>
      </div>
    </button>
  );
}
