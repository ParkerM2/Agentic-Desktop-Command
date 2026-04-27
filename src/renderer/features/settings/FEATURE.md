# Settings

Application settings page with sections for appearance, peers (P2P pairing), OAuth providers, webhooks, profiles, workspaces, and devices.

## API Hooks

- **`api/useSettings.ts`** — Query/mutation hooks for app settings and user profiles (CRUD, set default)
- **`api/useWebhookConfig.ts`** — Query/mutation hooks for webhook configuration

## Page and Sections

- **`components/SettingsPage.tsx`** — Main settings view composing all section components below
- Appearance: **`AppearanceModeSection.tsx`**, **`LayoutSection.tsx`** (includes color theme selector), **`UiScaleSection.tsx`**, **`TypographySection.tsx`**, **`BackgroundSettings.tsx`**
- **`components/HotkeySettings.tsx`** — Keyboard shortcut configuration
- **`components/ProfileSection.tsx`** — Profile management with **`ProfileCard.tsx`** and **`ProfileFormModal.tsx`**
- **`components/WorkspacesTab.tsx`** — Workspace list with **`WorkspaceCard.tsx`** and **`WorkspaceEditor.tsx`**
- **`components/DeviceSelector.tsx`** — Device picker with **`DeviceCard.tsx`**

## OAuth and Webhooks

- **`components/OAuthProviderSettings.tsx`** — Provider list with **`OAuthProviderForm.tsx`**, **`ProviderConsoleInfo.tsx`**, **`oauth-provider-constants.ts`**
- **`components/WebhookSettings.tsx`** — Webhook URL management with **`WebhookUrlDisplay.tsx`**, **`webhook-constants.ts`**
- Setup guides: **`GitHubSetupInstructions.tsx`**, **`SlackSetupInstructions.tsx`**, **`CollapsibleInstructions.tsx`**
- Shared inputs: **`CredentialInput.tsx`**, **`SecretInput.tsx`**

## How It Connects

- IPC channels: `settings.*` for app config; theme store for live appearance updates
