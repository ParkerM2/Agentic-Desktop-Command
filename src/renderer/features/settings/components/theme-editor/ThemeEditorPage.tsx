/**
 * ThemeEditorPage — Full-page theme color editor
 *
 * Split layout: scrollable controls on left, sticky preview on right.
 * Edits stay local until "Apply" (live preview) or "Save" (persist).
 */

import { useCallback, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Copy, Download, Moon, Save, Sun, Upload } from 'lucide-react';

import { ROUTES } from '@shared/constants';
import { DEFAULT_DARK_TOKENS, DEFAULT_LIGHT_TOKENS } from '@shared/constants/themes';
import type { CustomTheme, ThemeTokens } from '@shared/types';

import { useThemeStore } from '@renderer/shared/stores';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Separator,
} from '@ui';

import { useSettings, useUpdateSettings } from '../../api/useSettings';

import { ColorSection } from './ColorSection';
import { copyToClipboard, exportTokensToCss } from './css-exporter';
import { CssImportDialog } from './CssImportDialog';
import { SavedThemesBar } from './SavedThemesBar';
import { ThemePreview } from './ThemePreview';
import { TOKEN_SECTIONS } from './token-sections';

export function ThemeEditorPage() {
  // ── Hooks ──────────────────────────────────────────────
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { setColorTheme, setCustomThemes } = useThemeStore();

  // ── Local editing state ─────────────────────────────────
  const [lightTokens, setLightTokens] = useState<ThemeTokens>({ ...DEFAULT_LIGHT_TOKENS });
  const [darkTokens, setDarkTokens] = useState<ThemeTokens>({ ...DEFAULT_DARK_TOKENS });
  const [editingMode, setEditingMode] = useState<'light' | 'dark'>('dark');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [themeName, setThemeName] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const activeTokens = editingMode === 'light' ? lightTokens : darkTokens;
  const savedThemes = settings?.customThemes ?? [];

  // ── Handlers ────────────────────────────────────────────

  const handleTokenChange = useCallback(
    (key: string, value: string) => {
      if (editingMode === 'light') {
        setLightTokens((prev) => ({ ...prev, [key]: value }));
      } else {
        setDarkTokens((prev) => ({ ...prev, [key]: value }));
      }
    },
    [editingMode],
  );

  function handleBack() {
    void navigate({ to: ROUTES.SETTINGS as '/' });
  }

  function handleApply() {
    const themeId = `preview-${Date.now()}`;
    const previewTheme: CustomTheme = {
      id: themeId,
      name: 'Preview',
      light: { ...lightTokens },
      dark: { ...darkTokens },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const existing = settings?.customThemes ?? [];
    setCustomThemes([...existing, previewTheme]);
    setColorTheme(themeId);
  }

  function handleSave() {
    setShowSaveDialog(true);
  }

  function handleConfirmSave() {
    const name = themeName.trim();
    if (name.length === 0) return;

    const newTheme: CustomTheme = {
      id: crypto.randomUUID(),
      name,
      light: { ...lightTokens },
      dark: { ...darkTokens },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = settings?.customThemes ?? [];
    const updatedThemes = [...existing, newTheme];
    setCustomThemes(updatedThemes);
    setColorTheme(newTheme.id);
    updateSettings.mutate({ customThemes: updatedThemes, colorTheme: newTheme.id });
    setShowSaveDialog(false);
    setThemeName('');
  }

  function handleExportCss() {
    const css = exportTokensToCss(lightTokens, darkTokens);
    void (async () => {
      const success = await copyToClipboard(css);
      if (success) {
        setCopyFeedback(true);
        setTimeout(() => {
          setCopyFeedback(false);
        }, 2000);
      }
    })();
  }

  function handleImportApply(light: Partial<ThemeTokens>, dark: Partial<ThemeTokens>) {
    setLightTokens((prev) => ({ ...prev, ...light }));
    setDarkTokens((prev) => ({ ...prev, ...dark }));
  }

  function handleLoadTheme(theme: CustomTheme) {
    setLightTokens({ ...theme.light });
    setDarkTokens({ ...theme.dark });
  }

  function handleDeleteTheme(themeId: string) {
    const existing = settings?.customThemes ?? [];
    const updatedThemes = existing.filter((t) => t.id !== themeId);
    setCustomThemes(updatedThemes);
    updateSettings.mutate({ customThemes: updatedThemes });
  }

  function handleSaveDialogOpenChange(open: boolean) {
    if (!open) {
      setShowSaveDialog(false);
      setThemeName('');
    }
  }

  function handleThemeNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setThemeName(event.target.value);
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back to settings" size="icon" variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-foreground text-lg font-semibold">Theme Editor</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Light/Dark toggle */}
          <Button
            size="sm"
            variant={editingMode === 'light' ? 'primary' : 'outline'}
            onClick={() => { setEditingMode('light'); }}
          >
            <Sun className="mr-1 h-3.5 w-3.5" />
            Light
          </Button>
          <Button
            size="sm"
            variant={editingMode === 'dark' ? 'primary' : 'outline'}
            onClick={() => { setEditingMode('dark'); }}
          >
            <Moon className="mr-1 h-3.5 w-3.5" />
            Dark
          </Button>

          <Separator className="mx-1 h-6" orientation="vertical" />

          <Button size="sm" variant="outline" onClick={() => { setShowImportDialog(true); }}>
            <Upload className="mr-1 h-3.5 w-3.5" />
            Import CSS
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCss}>
            {copyFeedback ? (
              <Copy className="mr-1 h-3.5 w-3.5" />
            ) : (
              <Download className="mr-1 h-3.5 w-3.5" />
            )}
            {copyFeedback ? 'Copied!' : 'Export CSS'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleApply}>
            Apply
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="mr-1 h-3.5 w-3.5" />
            Save Theme
          </Button>
        </div>
      </div>

      {/* Saved themes bar */}
      <div className="border-border border-b px-4 py-2">
        <SavedThemesBar
          themes={savedThemes}
          onApply={handleLoadTheme}
          onDelete={handleDeleteTheme}
        />
      </div>

      {/* Main content: controls + preview */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel: color controls */}
        <ScrollArea className="w-1/2 border-r border-border">
          <div className="p-4">
            {TOKEN_SECTIONS.map((section) => (
              <ColorSection
                key={section.title}
                title={section.title}
                tokens={section.tokens}
                values={activeTokens}
                onChange={handleTokenChange}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Right panel: live preview (sticky) */}
        <ScrollArea className="w-1/2">
          <div className="p-4">
            <ThemePreview tokens={activeTokens} />
          </div>
        </ScrollArea>
      </div>

      {/* Import CSS Dialog */}
      <CssImportDialog
        open={showImportDialog}
        onApply={handleImportApply}
        onClose={() => { setShowImportDialog(false); }}
      />

      {/* Save Theme Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={handleSaveDialogOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="theme-name">Theme Name</Label>
            <Input
              id="theme-name"
              placeholder="My Custom Theme"
              value={themeName}
              onChange={handleThemeNameChange}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSaveDialog(false); }}>
              Cancel
            </Button>
            <Button disabled={themeName.trim().length === 0} onClick={handleConfirmSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
