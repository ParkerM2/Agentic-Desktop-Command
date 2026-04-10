# Security Assessment — ADC Electron App

> Assessment date: 2026-04-10

## Scope

This document covers the current Electron security posture for ADC, focusing on three areas:
1. Content Security Policy (CSP)
2. Sandbox configuration and its implications
3. Memory monitoring in the health subsystem

---

## 1. Content Security Policy

### Current State

A CSP meta tag is defined in `src/renderer/index.html`:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' ws://localhost:* http://localhost:* https://localhost:*;
img-src 'self' data: blob:;
font-src 'self';
media-src 'none';
object-src 'none';
frame-src 'none'
```

### Rationale for Each Directive

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Deny-by-default for any resource type not explicitly listed |
| `script-src` | `'self'` | Only scripts bundled with the app; no inline scripts, no eval |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind v4 injects runtime utility classes as inline styles — `'unsafe-inline'` is required |
| `connect-src` | `'self' ws://localhost:* http://localhost:* https://localhost:*` | Allows IPC-adjacent WebSocket and HTTP connections to local Hub service during development and production |
| `img-src` | `'self' data: blob:` | `data:` for base64-encoded images; `blob:` for dynamically created object URLs |
| `font-src` | `'self'` | Fonts are bundled; no external font CDNs |
| `media-src` | `'none'` | No audio/video in scope |
| `object-src` | `'none'` | Blocks Flash and other object embeds |
| `frame-src` | `'none'` | Blocks iframes; external URLs open in the OS browser via `shell.openExternal` |

### Known Limitation

`'unsafe-inline'` in `style-src` reduces protection against CSS injection attacks. This is acceptable given that Tailwind v4 requires it for runtime class generation. A nonce-based approach would be the long-term mitigation if stricter style isolation is required.

---

## 2. Sandbox Analysis

### Current Configuration

`src/main/index.ts` — `BrowserWindow` webPreferences:

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.mjs'),
  sandbox: false,
  contextIsolation: true,
  nodeIntegration: false,
}
```

### Why `sandbox: false` Is Currently Required

Electron's sandbox mode (`sandbox: true`) restricts the preload script to a limited browser-like environment with no access to Node.js APIs. ADC's preload script (`src/preload/index.mjs`) uses `require()` to import Node.js modules and Electron's `ipcRenderer`, which is incompatible with sandbox mode.

Specifically, the preload uses:
- `require('electron')` — for `contextBridge` and `ipcRenderer`
- Node.js builtins loaded transitively

In sandbox mode, `require()` is not available and module resolution fails at startup.

### Security Compensations in Place

Although `sandbox: false` weakens isolation at the OS level, ADC applies compensating controls:

| Control | Implementation |
|---------|----------------|
| `contextIsolation: true` | Renderer JS runs in a separate V8 context from the preload; `window` is not shared |
| `nodeIntegration: false` | Renderer cannot call Node.js APIs directly |
| `setWindowOpenHandler` deny | All `window.open` calls are intercepted and denied; external URLs open via `shell.openExternal` |
| CSP meta tag | Restricts resource loading in the renderer |
| `contextBridge` API surface | Only explicitly exposed functions are callable from renderer |

### Recommended Migration Path — `sandbox: true`

To enable `sandbox: true`, the preload must be rewritten to avoid `require()`:

1. **Use ESM imports with Electron's preload context** — Electron 20+ supports `contextBridge` and `ipcRenderer` via `import` in preload scripts when using a bundler that outputs ESM with inline Electron imports
2. **Replace `require()` with `import type`** — type-only imports have no runtime cost
3. **Audit all preload dependencies** — ensure no transitive Node.js builtins are imported
4. **Test with `sandbox: true`** — set the flag in development first and fix any startup errors

Until this migration is complete, the current `sandbox: false` + `contextIsolation: true` configuration is the pragmatic minimum for a desktop app where the renderer only loads trusted local content.

### Risk Level

**Medium** — The renderer loads only `localhost` content (no remote URLs in production). External content is blocked by CSP and `frame-src: 'none'`. The attack surface is limited to the local machine.

---

## 3. Memory Monitoring

### Implementation

`src/main/features/health/health-service.ts` adds periodic memory reporting via `createHealthService(healthRegistry)`:

- Registers a `'memory'` entry with the `HealthRegistry` on startup
- Polls `process.memoryUsage()` every 30 seconds
- Calls `healthRegistry.pulse('memory')` each cycle so missed polls are detected by the registry's sweep timer
- Exposes `getMemoryStats()` returning `{ heapUsed, heapTotal, rss, capturedAt }`

### Why Memory Monitoring Matters

Long-running Electron processes are susceptible to heap growth from:
- Retained event listeners not cleaned up on window close
- Growing in-memory SQLite WAL buffers
- JSONL session logs accumulating in memory

Surfacing `heapUsed` and `rss` in the health registry allows the existing unhealthy-threshold mechanism to page an alert when memory stops being reported (process hung) and allows future dashboards to chart memory over time.

---

## Summary

| Item | Status |
|------|--------|
| CSP meta tag — `script-src 'self'` | Implemented |
| CSP meta tag — `style-src 'unsafe-inline'` | Implemented (required for Tailwind v4) |
| CSP meta tag — `connect-src` localhost | Implemented |
| Memory monitoring in health service | Implemented |
| `sandbox: true` migration | Deferred — requires preload ESM rewrite |
| `contextIsolation: true` | Already enabled |
| `nodeIntegration: false` | Already enabled |
