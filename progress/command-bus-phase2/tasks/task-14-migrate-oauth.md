---
title: "Migrate OAuth Tokens to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-4, data-migration]
wave: 4
---

## Current State
- Encrypted JSON: token store
- Service: `src/main/auth/token-store.ts`
- Channels: `OAUTH.AUTHORIZE.PROVIDER`, `OAUTH.CHECK.AUTHENTICATED`

## Migration Steps
1. Add `oauth_tokens` table (encrypted values)
2. Migrate existing token store to SQLite
3. Update token-store to use Drizzle
4. Verify all OAuth flows work (GitHub, Google, Slack, Spotify)
