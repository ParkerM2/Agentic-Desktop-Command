/**
 * CssImportDialog — Modal for pasting and parsing CSS theme definitions
 */

import { useState } from 'react';

import type { ThemeTokens } from '@shared/types';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@ui';

import { parseCssToTokens } from './css-parser';

interface CssImportDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (light: Partial<ThemeTokens>, dark: Partial<ThemeTokens>) => void;
}

export function CssImportDialog({ open, onClose, onApply }: CssImportDialogProps) {
  const [cssText, setCssText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function handleParse() {
    if (cssText.trim().length === 0) {
      setErrorMessage('Please paste some CSS content first.');
      return;
    }

    try {
      const result = parseCssToTokens(cssText);
      onApply(result.light, result.dark);
      setCssText('');
      setErrorMessage('');
      onClose();
    } catch {
      setErrorMessage('Failed to parse CSS. Check the format and try again.');
    }
  }

  function handleClose() {
    setCssText('');
    setErrorMessage('');
    onClose();
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      handleClose();
    }
  }

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setCssText(event.target.value);
    if (errorMessage.length > 0) {
      setErrorMessage('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSS Theme</DialogTitle>
          <DialogDescription>
            Paste CSS from shadcn/ui, tweakcn, or any theme generator. Supports hex, HSL (Tailwind
            v3), and OKLCH (Tailwind v4) formats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            className="h-64 font-mono text-xs"
            placeholder={CSS_PLACEHOLDER}
            value={cssText}
            onChange={handleTextChange}
          />
          {errorMessage.length > 0 ? (
            <p className="text-xs" style={{ color: 'var(--error)' }}>
              {errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleParse}>Parse &amp; Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CSS_PLACEHOLDER = `:root {
  --background: #ffffff;
  --foreground: #0b0b0f;
  /* ... */
}

.dark {
  --background: #0b0b0f;
  --foreground: #e6e6e6;
  /* ... */
}`;
