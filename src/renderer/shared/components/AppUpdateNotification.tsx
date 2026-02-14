/**
 * AppUpdateNotification -- Fixed-position notification for app updates
 *
 * Listens to update events from the main process and shows
 * appropriate UI for downloading and installing updates.
 * Dismissible by the user.
 */

import { useState } from 'react';

import { Download, RefreshCw, X } from 'lucide-react';

import { useIpcEvent } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

// -- Types --

type UpdatePhase = 'available' | 'downloaded';

interface UpdateInfo {
  version: string;
  phase: UpdatePhase;
}

// -- Component --

export function AppUpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useIpcEvent('event:app.updateAvailable', ({ version }) => {
    setUpdateInfo({ version, phase: 'available' });
    setDismissed(false);
  });

  useIpcEvent('event:app.updateDownloaded', ({ version }) => {
    setUpdateInfo({ version, phase: 'downloaded' });
    setDismissed(false);
  });

  if (!updateInfo || dismissed) {
    return null;
  }

  function handleDownload() {
    void ipc('app.downloadUpdate', {});
  }

  function handleRestart() {
    void ipc('app.quitAndInstall', {});
  }

  function handleDismiss() {
    setDismissed(true);
  }

  const isDownloaded = updateInfo.phase === 'downloaded';

  return (
    <div
      aria-label="App update notification"
      className="bg-card border-border text-foreground fixed right-4 bottom-4 z-50 flex max-w-xs items-center gap-3 rounded-lg border p-4 shadow-lg"
      role="status"
    >
      {isDownloaded ? (
        <RefreshCw aria-hidden="true" className="text-success h-5 w-5 shrink-0" />
      ) : (
        <Download aria-hidden="true" className="text-info h-5 w-5 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {isDownloaded
            ? `Update v${updateInfo.version} downloaded`
            : `Update v${updateInfo.version} available`}
        </p>
      </div>

      {isDownloaded ? (
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          type="button"
          onClick={handleRestart}
        >
          Restart
        </button>
      ) : (
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          type="button"
          onClick={handleDownload}
        >
          Download
        </button>
      )}

      <button
        aria-label="Dismiss update notification"
        className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
        type="button"
        onClick={handleDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
