# Channel isolation

ADC supports three data-isolated channels. They can all run simultaneously on the same machine.

| Channel | How to run | `app.setName` | userData path | `AppUserModelID` | Auto-update |
|---|---|---|---|---|---|
| release | Installed from GitHub release | `ADC` | `%APPDATA%/ADC` | `com.adc.app` | Yes |
| local | `npm run build:local` → `release/win-unpacked/ADC-Local.exe` | `ADC-Local` | `%APPDATA%/ADC-Local` | `com.adc.app.local` | No |
| dev | `npm run dev` | `ADC-Dev` | `%APPDATA%/ADC-Dev` | `com.adc.app.dev` | No |

## How channel is resolved

`src/main/lib/channel.ts::resolveChannel` precedence:

1. `ADC_CHANNEL` env var (if valid value)
2. Compile-time `__ADC_CHANNEL__` (baked by electron-vite `define`)
3. `ADC_DEV_MODE=true` → `dev`
4. `!app.isPackaged` → `dev`
5. default → `release`

## What a channel isolates

- `userData` (including `adc.db`, settings, auth tokens) — via `app.setName()`
- `cache`, `logs`, `crashDumps`, `sessionData` — inherit from `userData`
- Claude CLI state (`~/.claude/*` equivalents) — via `CLAUDE_CONFIG_DIR=<userData>/.claude`
- Single-instance lock — keyed off `app.getName()`
- Windows taskbar grouping and toast routing — via `setAppUserModelId()`
- NSIS registry entries and installer paths — via electron-builder `productName` / `appId` overrides
- Auto-updater — disabled on non-release channels so local binaries never update against the real release feed

## What a channel does NOT isolate

- Port 9222 (DevTools MCP remote-debugging port) — hardcoded, only one instance can bind it at a time. Run at most one debuggable instance simultaneously.
- The Windows `%TEMP%` dir — shared. Portable target extraction writes here.
- Git worktrees and project directories — those are shared by design (the app manages user projects outside itself).

## Cleaning a channel

```bash
npm run reset:local   # wipes %APPDATA%/ADC-Local
npm run reset:dev     # wipes %APPDATA%/ADC-Dev
# release reset: manual, prompts for confirmation
node scripts/reset-channel.mjs release
```
