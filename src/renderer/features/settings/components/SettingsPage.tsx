/**
 * SettingsPage — App settings view with tab bar layout
 *
 * Tabs: Display, Profile, Hub, Integrations, Storage, Advanced
 */

import { FlaskConical, HardDrive, Paintbrush, Plug, Server, User, Wrench } from 'lucide-react';

import type { ThemeMode } from '@shared/types';

import { useAssistantWidgetStore, useThemeStore } from '@renderer/shared/stores';

import { Heading, PageContent, PageHeader, PageLayout, Spinner, Switch } from '@ui';

import { useSettings, useUpdateSettings } from '../api/useSettings';

import { AppBehaviorSection } from './AppBehaviorSection';
import { AppearanceModeSection } from './AppearanceModeSection';
import { BackgroundSettings } from './BackgroundSettings';
import { ClaudeAuthSettings } from './ClaudeAuthSettings';
import { DataLocationSection } from './DataLocationSection';
import { GitHubAuthSettings } from './GitHubAuthSettings';
import { HotkeySettings } from './HotkeySettings';
import { HubSettings } from './HubSettings';
import { LayoutSection } from './LayoutSection';
import { OAuthProviderSettings } from './OAuthProviderSettings';
import { ProfileSection } from './ProfileSection';
import { SpacingSection } from './SpacingSection';
import { StorageManagementSection } from './StorageManagementSection';
import { TestingSettingsTab } from './TestingSettingsTab';
import { TypographySection } from './TypographySection';
import { UiScaleSection } from './UiScaleSection';
import { VoiceSettings } from './voice/VoiceSettings';
import { WebhookSettings } from './WebhookSettings';
import { WorkspacesTab } from './WorkspacesTab';

// ── Tab Constants ──────────────────────────────────────────

const SETTINGS_TABS = [
  { id: 'display' as const, label: 'Display', icon: Paintbrush },
  { id: 'profile' as const, label: 'Profile', icon: User },
  { id: 'hub' as const, label: 'Hub', icon: Server },
  { id: 'integrations' as const, label: 'Integrations', icon: Plug },
  { id: 'storage' as const, label: 'Storage', icon: HardDrive },
  { id: 'testing' as const, label: 'Testing', icon: FlaskConical },
  { id: 'advanced' as const, label: 'Advanced', icon: Wrench },
];

// ── Component ──────────────────────────────────────────────

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { mode, uiScale, layoutGap, setMode, setUiScale, setLayoutGap } = useThemeStore();

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

  function handleLayoutGapChange(event: React.ChangeEvent<HTMLInputElement>) {
    const gap = Number(event.target.value);
    setLayoutGap(gap);
    updateSettings.mutate({ layoutGap: gap });
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
    <PageLayout>
      <PageHeader.Tabs defaultValue="display">
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title>Settings</PageHeader.Title>
          </PageHeader.Row>
          <PageHeader.TabList>
            {SETTINGS_TABS.map((tab) => (
              <PageHeader.Tab key={tab.id} value={tab.id}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </PageHeader.Tab>
            ))}
          </PageHeader.TabList>
        </PageHeader>
        <PageContent>
          <PageHeader.TabContent value="display">
            <LayoutSection />
            <AppearanceModeSection currentMode={mode} onModeChange={handleThemeChange} />
            <UiScaleSection currentScale={uiScale} onScaleChange={handleUiScaleChange} />
            <SpacingSection currentGap={layoutGap} onGapChange={handleLayoutGapChange} />
            <TypographySection
              currentFontFamily={currentFontFamily}
              currentFontSize={currentFontSize}
              onFontFamilyChange={handleFontFamilyChange}
              onFontSizeChange={handleFontSizeChange}
            />
            <section className="mb-8">
              <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                Language
              </Heading>
              <div className="border-border bg-card flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                <span>English</span>
                <span className="text-muted-foreground text-xs">Only language available</span>
              </div>
            </section>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="profile">
            <ProfileSection />
            <section className="mb-8">
              <WorkspacesTab />
            </section>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="hub">
            <section className="mb-8">
              <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                Hub Connection
              </Heading>
              <HubSettings />
            </section>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="integrations">
            <section className="mb-8">
              <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                Claude Code
              </Heading>
              <ClaudeAuthSettings />
            </section>
            <section className="mb-8">
              <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                GitHub
              </Heading>
              <GitHubAuthSettings />
            </section>
            <section className="mb-8">
              <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                OAuth Providers
              </Heading>
              <OAuthProviderSettings />
            </section>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="storage">
            <DataLocationSection />
            <section className="mb-8">
              <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                Storage Management
              </Heading>
              <StorageManagementSection />
            </section>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="testing">
            <TestingSettingsTab />
          </PageHeader.TabContent>

          <PageHeader.TabContent value="advanced">
            <AdvancedTab settings={settings} updateSettings={updateSettings} />
          </PageHeader.TabContent>
        </PageContent>
      </PageHeader.Tabs>
    </PageLayout>
  );
}

// ── Advanced tab extracted to avoid calling hooks conditionally ──

interface AdvancedTabProps {
  settings: ReturnType<typeof useSettings>['data'];
  updateSettings: ReturnType<typeof useUpdateSettings>;
}

function AdvancedTab({ settings, updateSettings }: AdvancedTabProps) {
  const assistantAutoStart = settings?.assistantAutoStart !== false;
  const { isOpen: assistantIsOpen, open: openAssistant, close: closeAssistant } =
    useAssistantWidgetStore.getState();

  return (
    <>
      <BackgroundSettings />
      <section className="mb-8">
        <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          AI Assistant
        </Heading>
        <div className="border-border bg-card space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-start on launch</p>
              <p className="text-muted-foreground text-xs">
                Open the assistant panel when ADC starts
              </p>
            </div>
            <Switch
              checked={assistantAutoStart}
              onCheckedChange={(checked) => {
                updateSettings.mutate({ assistantAutoStart: checked });
                if (checked && !assistantIsOpen) openAssistant();
                if (!checked && assistantIsOpen) closeAssistant();
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Assistant panel</p>
              <p className="text-muted-foreground text-xs">
                {assistantIsOpen ? 'Currently open' : 'Currently closed'} · Ctrl+J to toggle
              </p>
            </div>
            <Switch
              checked={assistantIsOpen}
              onCheckedChange={(checked) => {
                if (checked) openAssistant();
                else closeAssistant();
              }}
            />
          </div>
        </div>
      </section>
      <AppBehaviorSection />
      <section className="mb-8">
        <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Assistant &amp; Webhooks
        </Heading>
        <WebhookSettings />
      </section>
      <HotkeySettings />
      <section className="mb-8">
        <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Voice
        </Heading>
        <div className="border-border bg-card rounded-lg border p-4">
          <VoiceSettings />
        </div>
      </section>
      <section className="mb-8">
        <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          About
        </Heading>
        <p className="text-muted-foreground text-sm">ADC v0.1.0</p>
      </section>
    </>
  );
}
