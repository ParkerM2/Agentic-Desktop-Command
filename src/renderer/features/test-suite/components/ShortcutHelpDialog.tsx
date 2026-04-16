import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ui';

import { useTestSuiteStore } from '../test-suite-store';

const SHORTCUTS = [
  { keys: 'Alt + 1', action: 'Recording tab' },
  { keys: 'Alt + 2', action: 'Library tab' },
  { keys: 'Alt + 3', action: 'Results tab' },
  { keys: 'Alt + 4', action: 'Screenshots tab' },
  { keys: 'Alt + 5', action: 'Analytics tab' },
  { keys: 'Alt + 6', action: 'CI Export tab' },
  { keys: 'Alt + S', action: 'Focus search' },
  { keys: '?', action: 'Show this help' },
  { keys: 'Escape', action: 'Close dialog' },
];

export function ShortcutHelpDialog() {
  const open = useTestSuiteStore((s) => s.shortcutHelpOpen);
  const setOpen = useTestSuiteStore((s) => s.setShortcutHelpOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-text-muted">{s.action}</span>
              <kbd className="rounded border border-border bg-bg-surface px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
