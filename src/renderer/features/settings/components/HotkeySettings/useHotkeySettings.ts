/**
 * useHotkeySettings — logic hook for HotkeySettings
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { HOTKEYS } from '@shared/ipc/hotkeys';

import { ipc } from '@renderer/shared/lib/ipc';

export interface HotkeyBinding {
  id: string;
  label: string;
  description: string;
  defaultAccelerator: string;
}

export interface HotkeyRowState {
  editing: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSave: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleEditClick: () => void;
}

export const DEFAULT_HOTKEYS: HotkeyBinding[] = [
  {
    id: 'quickCommand',
    label: 'Quick Command',
    description: 'Open the quick command popup',
    defaultAccelerator: 'Ctrl+Shift+Space',
  },
  {
    id: 'quickNote',
    label: 'Quick Note',
    description: 'Open the app for quick note taking',
    defaultAccelerator: 'Ctrl+Shift+N',
  },
  {
    id: 'quickTask',
    label: 'Quick Task',
    description: 'Open the app for quick task creation',
    defaultAccelerator: 'Ctrl+Shift+T',
  },
];

const FEEDBACK_DISPLAY_MS = 2000;

export function useHotkeySettings() {
  const [hotkeys, setHotkeys] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const binding of DEFAULT_HOTKEYS) {
      defaults[binding.id] = binding.defaultAccelerator;
    }
    return defaults;
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await ipc(HOTKEYS.GET.CONFIG, {});
        if (Object.keys(loaded).length > 0) {
          setHotkeys((previous) => ({ ...previous, ...loaded }));
        }
      } catch {
        // Fall back to defaults silently
      }
    })();
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => {
      setFeedback(null);
    }, FEEDBACK_DISPLAY_MS);
  }, []);

  function handleSaveHotkey(id: string, accelerator: string) {
    const updated = { ...hotkeys, [id]: accelerator };
    setHotkeys(updated);

    void (async () => {
      try {
        await ipc(HOTKEYS.UPDATE.CONFIG, { hotkeys: updated });
        showFeedback('success', 'Hotkey saved');
      } catch {
        showFeedback('error', 'Failed to save hotkey');
      }
    })();
  }

  function handleReset() {
    void (async () => {
      try {
        const defaults = await ipc(HOTKEYS.RESET.CONFIG, {});
        setHotkeys(defaults);
        showFeedback('success', 'Hotkeys reset to defaults');
      } catch {
        showFeedback('error', 'Failed to reset hotkeys');
      }
    })();
  }

  return {
    hotkeys,
    feedback,
    handleSaveHotkey,
    handleReset,
  };
}

export function useHotkeyRow(
  binding: HotkeyBinding,
  currentValue: string,
  onSave: (id: string, accelerator: string) => void,
): HotkeyRowState {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue);
  const prevCurrentValue = useRef(currentValue);

  // Sync input when currentValue changes externally and not editing
  useEffect(() => {
    if (!editing && currentValue !== prevCurrentValue.current) {
      setInputValue(currentValue);
    }
    prevCurrentValue.current = currentValue;
  }, [currentValue, editing]);

  const handleSave = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length > 0) {
      onSave(binding.id, trimmed);
    }
    setEditing(false);
  }, [inputValue, onSave, binding.id]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleSave();
      } else if (event.key === 'Escape') {
        setInputValue(currentValue);
        setEditing(false);
      }
    },
    [handleSave, currentValue],
  );

  const handleEditClick = useCallback(() => {
    setInputValue(currentValue);
    setEditing(true);
  }, [currentValue]);

  return {
    editing,
    inputValue,
    setInputValue,
    handleSave,
    handleKeyDown,
    handleEditClick,
  };
}
