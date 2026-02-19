/**
 * SettingsPage — App settings view
 *
 * Sections: Appearance (mode + color theme), UI Scale, Typography, Language, About
 */

import type { ThemeMode } from '@shared/types';

import { useThemeStore } from '@renderer/shared/stores';

import { Spinner } from '@ui';


import { VoiceSettings } from '@features/voice';

import { useSettings, useUpdateSettings } from '../api/useSettings';

import { AppearanceModeSection } from './AppearanceModeSection';
import { BackgroundSettings } from './BackgroundSettings';
import { ClaudeAuthSettings } from './ClaudeAuthSettings';
import { ColorThemeSection } from './ColorThemeSection';
import { GitHubAuthSettings } from './GitHubAuthSettings';
import { HotkeySettings } from './HotkeySettings';
import { HubSettings } from './HubSettings';
import { OAuthProviderSettings } from './OAuthProviderSettings';
import { ProfileSection } from './ProfileSection';
import { StorageManagementSection } from './StorageManagementSection';
import { TypographySection } from './TypographySection';
import { UiScaleSection } from './UiScaleSection';
import { WebhookSettings } from './WebhookSettings';
import { WorkspacesTab } from './WorkspacesTab';

// ── Component ───────────────────────────────────────────────

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { mode, colorTheme, uiScale, setMode, setColorTheme, setUiScale } = useThemeStore();

  const currentFontFamily = settings?.fontFamily ?? 'system-ui';
  const currentFontSize = settings?.fontSize ?? 14;

  function handleThemeChange(newMode: ThemeMode) {
    setMode(newMode);
    updateSettings.mutate({ theme: newMode });
  }

  function handleColorThemeChange(theme: string) {
    setColorTheme(theme);
    updateSettings.mutate({ colorTheme: theme });
  }

  function handleUiScaleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const scale = Number(event.target.value);
    setUiScale(scale);
    updateSettings.mutate({ uiScale: scale });
  }

  function handleFontFamilyChange(fontFamily: string) {
    document.documentElement.style.setProperty('--app-font-sans', fontFamily);
    updateSettings.mutate({ fontFamily });
  }

  function handleFontSizeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const fontSize = Number(event.target.value);
    document.documentElement.style.setProperty('--app-font-size', `${String(fontSize)}px`);
    updateSettings.mutate({ fontSize });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="text-muted-foreground" size="md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl overflow-y-auto p-8">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      <AppearanceModeSection currentMode={mode} onModeChange={handleThemeChange} />
      <BackgroundSettings />
      <ProfileSection />

      <section className="mb-8">
        <WorkspacesTab />
      </section>

      <ColorThemeSection currentTheme={colorTheme} onThemeChange={handleColorThemeChange} />
      <UiScaleSection currentScale={uiScale} onScaleChange={handleUiScaleChange} />

      <TypographySection
        currentFontFamily={currentFontFamily}
        currentFontSize={currentFontSize}
        onFontFamilyChange={handleFontFamilyChange}
        onFontSizeChange={handleFontSizeChange}
      />

      {/* ── Language ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Language
        </h2>
        <div className="border-border bg-card flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
          <span>English</span>
          <span className="text-muted-foreground text-xs">Only language available</span>
        </div>
      </section>

      {/* ── Claude Code ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Claude Code
        </h2>
        <ClaudeAuthSettings />
      </section>

      {/* ── GitHub ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          GitHub
        </h2>
        <GitHubAuthSettings />
      </section>

      {/* ── OAuth Providers ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          OAuth Providers
        </h2>
        <OAuthProviderSettings />
      </section>

      {/* ── Hub Connection ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Hub Connection
        </h2>
        <HubSettings />
      </section>

      {/* ── Storage Management ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Storage Management
        </h2>
        <StorageManagementSection />
      </section>

      {/* ── Webhooks ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Assistant &amp; Webhooks
        </h2>
        <WebhookSettings />
      </section>

      <HotkeySettings />

      {/* ── Voice ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Voice
        </h2>
        <div className="border-border bg-card rounded-lg border p-4">
          <VoiceSettings />
        </div>
      </section>

      {/* ── About ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          About
        </h2>
        <p className="text-muted-foreground text-sm">ADC v0.1.0</p>
      </section>
    </div>
  );
}
