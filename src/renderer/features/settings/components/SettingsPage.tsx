/**
 * SettingsPage — App settings view with tab bar layout
 *
 * Tabs: Display, Profile, Hub, Integrations, Storage, Advanced
 */

import { useState } from 'react';

import { HardDrive, Paintbrush, Plug, Server, User, Wrench } from 'lucide-react';

import type { ThemeMode } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';
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

// ── Tab Constants ──────────────────────────────────────────

const SETTINGS_TABS = [
  { id: 'display' as const, label: 'Display', icon: Paintbrush },
  { id: 'profile' as const, label: 'Profile', icon: User },
  { id: 'hub' as const, label: 'Hub', icon: Server },
  { id: 'integrations' as const, label: 'Integrations', icon: Plug },
  { id: 'storage' as const, label: 'Storage', icon: HardDrive },
  { id: 'advanced' as const, label: 'Advanced', icon: Wrench },
];

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

const TAB_BASE = 'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors';
const TAB_ACTIVE = 'border-primary text-foreground font-medium';
const TAB_INACTIVE = 'border-transparent text-muted-foreground hover:text-foreground';

// ── Component ──────────────────────────────────────────────

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('display');
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { mode, colorTheme, uiScale, setMode, setUiScale } = useThemeStore();

  const currentFontFamily = settings?.fontFamily ?? 'system-ui';
  const currentFontSize = settings?.fontSize ?? 14;

  function handleThemeChange(newMode: ThemeMode) {
    setMode(newMode);
    updateSettings.mutate({ theme: newMode });
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

  function renderTabContent() {
    switch (activeTab) {
      case 'display': {
        return (
          <>
            <AppearanceModeSection currentMode={mode} onModeChange={handleThemeChange} />
            <BackgroundSettings />
            <ColorThemeSection currentTheme={colorTheme} />
            <UiScaleSection currentScale={uiScale} onScaleChange={handleUiScaleChange} />
            <TypographySection
              currentFontFamily={currentFontFamily}
              currentFontSize={currentFontSize}
              onFontFamilyChange={handleFontFamilyChange}
              onFontSizeChange={handleFontSizeChange}
            />
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                Language
              </h2>
              <div className="border-border bg-card flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                <span>English</span>
                <span className="text-muted-foreground text-xs">Only language available</span>
              </div>
            </section>
          </>
        );
      }
      case 'profile': {
        return (
          <>
            <ProfileSection />
            <section className="mb-8">
              <WorkspacesTab />
            </section>
          </>
        );
      }
      case 'hub': {
        return (
          <section className="mb-8">
            <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
              Hub Connection
            </h2>
            <HubSettings />
          </section>
        );
      }
      case 'integrations': {
        return (
          <>
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                Claude Code
              </h2>
              <ClaudeAuthSettings />
            </section>
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                GitHub
              </h2>
              <GitHubAuthSettings />
            </section>
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                OAuth Providers
              </h2>
              <OAuthProviderSettings />
            </section>
          </>
        );
      }
      case 'storage': {
        return (
          <section className="mb-8">
            <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
              Storage Management
            </h2>
            <StorageManagementSection />
          </section>
        );
      }
      case 'advanced': {
        return (
          <>
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                Assistant &amp; Webhooks
              </h2>
              <WebhookSettings />
            </section>
            <HotkeySettings />
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                Voice
              </h2>
              <div className="border-border bg-card rounded-lg border p-4">
                <VoiceSettings />
              </div>
            </section>
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                About
              </h2>
              <p className="text-muted-foreground text-sm">ADC v0.1.0</p>
            </section>
          </>
        );
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="text-muted-foreground" size="md" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border border-b px-6 py-4">
        <h1 className="text-foreground text-2xl font-bold">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="border-border border-b px-6">
        <div className="flex gap-1">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              className={cn(TAB_BASE, activeTab === tab.id ? TAB_ACTIVE : TAB_INACTIVE)}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
              }}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">{renderTabContent()}</div>
      </div>
    </div>
  );
}
