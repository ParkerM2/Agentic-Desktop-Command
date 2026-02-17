# Email Service

Sends emails via SMTP with provider presets, encrypted credential storage, and a retry queue with exponential backoff for failed deliveries.

## Key Files

- **`email-service.ts`** — Public API facade: send, configure, test connection, manage queue (delegates to focused modules)
- **`email-config.ts`** — SMTP provider presets (Gmail, Outlook, Yahoo) and email address validation helpers
- **`email-encryption.ts`** — Encrypts SMTP passwords via Electron safeStorage (DPAPI/Keychain/libsecret) with base64 fallback
- **`email-queue.ts`** — Retry queue with exponential backoff (max 3 attempts) for failed email deliveries
- **`email-store.ts`** — JSON file persistence for SMTP configuration and queued emails
- **`smtp-transport.ts`** — Creates nodemailer transporters and handles actual SMTP send and connection verification
- **`index.ts`** — Barrel export of createEmailService, config helpers, and provider constants

## How It Connects

- **Upstream:** IPC handlers (`email-handlers.ts`), assistant email executor
- **Downstream:** SMTP servers via nodemailer, Electron safeStorage for credential encryption
- **Events:** Emits `email.queued` and `email.sent` events to the renderer via IPC
