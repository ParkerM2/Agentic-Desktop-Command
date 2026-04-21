/**
 * HotkeySettings -- Global hotkey configuration
 *
 * Loads hotkey bindings from IPC, allows customization via text input
 * for Electron accelerator strings, and supports resetting to defaults.
 */

import { Keyboard, RotateCcw } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Input } from '@ui';

import { DEFAULT_HOTKEYS, useHotkeyRow, useHotkeySettings } from './useHotkeySettings';

import type { HotkeyBinding } from './useHotkeySettings';

// -- Hotkey Row --

interface HotkeyRowProps {
  binding: HotkeyBinding;
  currentValue: string;
  onSave: (id: string, accelerator: string) => void;
}

function HotkeyRow({ binding, currentValue, onSave }: HotkeyRowProps) {
  const {
    editing,
    inputValue,
    setInputValue,
    handleSave,
    handleKeyDown,
    handleEditClick,
  } = useHotkeyRow(binding, currentValue, onSave);

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{binding.label}</p>
        <p className="text-muted-foreground text-xs">{binding.description}</p>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            aria-label={`Hotkey for ${binding.label}`}
            className="w-44"
            placeholder="e.g. Ctrl+Shift+Space"
            size="sm"
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button size="sm" variant="link" onClick={handleSave}>
            Save
          </Button>
        </div>
      ) : (
        <Button className="group" variant="ghost" onClick={handleEditClick}>
          <kbd
            className={cn(
              'bg-muted text-muted-foreground rounded-md px-2.5 py-1 font-mono text-xs',
              'group-hover:bg-accent group-hover:text-foreground transition-colors',
            )}
          >
            {currentValue}
          </kbd>
        </Button>
      )}
    </div>
  );
}

// -- Component --

export function HotkeySettings() {
  const { hotkeys, feedback, handleSaveHotkey, handleReset } = useHotkeySettings();

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wider uppercase">
          <Keyboard className="h-4 w-4" />
          Global Hotkeys
        </h2>
        <Button
          aria-label="Reset hotkeys to defaults"
          size="sm"
          variant="ghost"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to Defaults
        </Button>
      </div>
      <div className="border-border bg-card divide-border divide-y rounded-lg border px-4">
        {DEFAULT_HOTKEYS.map((binding) => (
          <HotkeyRow
            key={binding.id}
            binding={binding}
            currentValue={hotkeys[binding.id] ?? binding.defaultAccelerator}
            onSave={handleSaveHotkey}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Use Electron accelerator format: Ctrl+Shift+Key, CmdOrCtrl+Key, Alt+Key
        </p>
        {feedback ? (
          <p
            className={cn(
              'text-xs font-medium',
              feedback.type === 'success' ? 'text-success' : 'text-destructive',
            )}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
