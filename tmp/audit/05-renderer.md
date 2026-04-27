# Audit 05 — Peers Renderer / Settings

Scope: `src/renderer/features/peers/**`, integration in `src/renderer/features/settings/components/SettingsPage.tsx`, and the cache-write side of `src/renderer/shared/components/EventBridge.tsx` that owns peer events.

## Critical (wiring/MVP violations / raw HTML)

### C1. `usePeerEvents` bypasses the shared `useIpcEvent` hook
File: `src/renderer/features/peers/api/usePeerEvents.ts:13-20`
The hook calls `window.api.on(PEERS_EVENTS.PIN.ISSUED, ...)` directly with two eslint-disable comments to silence guards. The codebase already has a shared, typed wrapper at `src/renderer/shared/hooks/useIpcEvent.ts` that does exactly this (with an unsubscribe-stable handler ref). 41 other features use `useIpcEvent` (per grep on `useIpcEvent|EventBridge`). This file is the only renderer feature talking to `window.api.on` for an "event-driven cache" type of payload outside the EventBridge itself.
Fix: replace the body with `useIpcEvent(PEERS_EVENTS.PIN.ISSUED, (payload) => setPin(payload));` and drop the SSR guard + `as PinIssuedEvent` cast (the channel is already typed via `EventPayload<T>`).

### C2. EventBridge uses hardcoded peer query-key tuples instead of `peerKeys`
File: `src/renderer/shared/components/EventBridge.tsx:98-99,138,150`
`PEERS_PAIRED = ['peers', 'paired']` and `PEERS_DISCOVERED = ['peers', 'discovered']` are local string literals. The peers feature exports `peerKeys` from `src/renderer/features/peers/api/queryKeys.ts:5-10` (`peerKeys.paired()`, `peerKeys.discovered()`). CLAUDE.md "Query/Mutation pattern" rule explicitly forbids inline `['peers', ...]` arrays. If `peerKeys` ever changes shape (e.g. `peerKeys.paired(scope)`), the bridge will silently miss invalidations.
Fix: import `peerKeys` from `@features/peers` (already barrel-exported via `index.ts:1`) and reference `peerKeys.paired()` / `peerKeys.discovered()` in the bridge.

### C3. `OutgoingPairDialog` is a god-component — full MVP violation
File: `src/renderer/features/peers/components/OutgoingPairDialog.tsx:33-166`
Component owns: `Stage` state machine (line 34), `session` state (35), `pin` state (36), two mutation hooks (38-39), three handler functions with mutation `.mutate` calls and `onSuccess` cascades inline (43-84), label derivation (41), and PIN sanitization in JSX `onChange` (133). Per CLAUDE.md "MVP separation," all of this must live in a presentation hook (e.g. `useOutgoingPair(target, onClose)`); the component should only render JSX.
Fix: extract `useOutgoingPair(target, onClose)` returning `{ stage, pin, setPin, targetLabel, isInitPending, isConfirmPending, initError, confirmError, sendInvite, confirm, close }`. Move PIN sanitization (`replaceAll(/\D/g, '').slice(0, 6)`) into a helper `sanitizePin(raw: string)` in `lib/`. Component becomes a render-only switch on `stage`.

### C4. `PeerListPanel` mixes state, mutations, and dialog control with rendering
File: `src/renderer/features/peers/components/PeerListPanel.tsx:176-223`
Component calls four query/mutation hooks, owns `inviteTarget` state, and forwards `(peerId) => revoke.mutate(peerId)` inline as a child callback (line 202). Per MVP rule, these belong in a `usePeerListPanel()` hook returning view-model data. The current "renderXxxBody" helper functions take 3-4 positional args (line 87-92, 144-148) which is a smell that the data should come from one hook.
Fix: extract `usePeerListPanel()` returning `{ self, paired, discovered, revoke, inviteTarget, openInvite, closeInvite }`. Inline the small `renderSelfBody`/`renderPairedBody`/`renderDiscoveredBody` helpers as the panel's own JSX or sub-components that take a single typed view-model prop.

## High (rule violations)

### H1. `useIncomingPin` swallows multiple PINs
File: `src/renderer/features/peers/api/usePeerEvents.ts:11-27`
Doc comment says "Multiple PINs in quick succession overwrite the previous (Phase 3b accepts this)." This is a documented but real footgun: receiver loses the prior pairing dialog without explicit dismissal. Also `pin` is keyed only on the latest event — if the dialog is open and dismissed mid-flight, a freshly-arrived PIN is lost (handler closure is fine, but `setPin(null)` after a new event silently wins the race depending on render order).
Fix (out of audit scope but flag for product): keep a queue `PinIssuedEvent[]` and pop on dismiss. Doc-only acknowledgement is acceptable for MVP, but the comment should specify "Phase 3b" lives in a tracking ticket.

### H2. `useIncomingPin` does an unsafe `as PinIssuedEvent` cast
File: `src/renderer/features/peers/api/usePeerEvents.ts:16-18`
Payload arrives untyped because of the bypass in C1. The `useIpcEvent<typeof PEERS_EVENTS.PIN.ISSUED>` form returns `EventPayload<T>` directly via the `EventPayload` map (`src/shared/ipc/peers/contract.ts:126`).
Fix: addressed by C1.

### H3. `ProfileSection` Workspace tab tied to "Profile" — not a peers issue but spotted
File: `src/renderer/features/settings/components/SettingsPage.tsx:138`
Out of audit scope; flagging only because the integration site was read.

### H4. `IncomingPinDialog` mounted inside `SettingsPage` — only fires when on Settings
File: `src/renderer/features/settings/components/SettingsPage.tsx:186-187`
A `TODO(p2p-phase4)` comment acknowledges the issue: the dialog must be mounted at `RootLayout` for global visibility; otherwise an incoming pair invite issued while the user is on any other route silently issues a PIN with no UI surface. The hook side (`useIncomingPin`) only listens while mounted, so the event is lost.
Fix: hoist `<IncomingPinDialog />` to `src/renderer/app/layouts/RootLayout.tsx` (alongside `<EventBridge />`). Remove the TODO; this is critical-path security UX.

### H5. `discovered.data === undefined` short-circuit hides empty-array state ambiguity
File: `src/renderer/features/peers/components/PeerListPanel.tsx:94, 150`
Both render helpers test `data === undefined || data.length === 0`. After EventBridge writes an empty `peers: []` via `setQueryData` on `DISCOVERY.CHANGED`, the EmptyState shows "No devices found" — correct. But the fetch defaults via `useDiscoveredPeers` at `staleTime: 5_000` meaning the empty cache write may be re-fetched. Not strictly broken; flag only.

## Medium (DRY/helpers/maintainability)

### M1. Dialog footer/cancel pattern duplicated three times in `OutgoingPairDialog`
File: `src/renderer/features/peers/components/OutgoingPairDialog.tsx:112-119,141-151,158-160`
Three copies of `<DialogFooter>` with cancel + primary buttons. Stage-specific bodies could each be a sub-component (`<IdleStage/>`, `<AwaitingPinStage/>`, `<DoneStage/>`) sharing a `<DialogFooter>` shell.
Fix: split each stage into its own component file under `components/outgoing-pair/`.

### M2. Inline `(peer) => peer.displayName ?? truncate(peer.peerId)` repeated in 3 places
Files:
- `src/renderer/features/peers/components/PeerListPanel.tsx:61` (PairedRow)
- `src/renderer/features/peers/components/PeerListPanel.tsx:122` (DiscoveredRow)
- `src/renderer/features/peers/components/IncomingPinDialog.tsx:23-24`
- `src/renderer/features/peers/components/OutgoingPairDialog.tsx:41`
Fix: add `peerLabel(peer: { displayName: string | null; peerId: string }): string` to `lib/truncate.ts` (rename to `lib/format.ts`).

### M3. `renderSelfBody` / `renderPairedBody` / `renderDiscoveredBody` are pseudo-components
File: `src/renderer/features/peers/components/PeerListPanel.tsx:32-165`
Per "Compositional component structure" rule, prefer real components (named export, props interface) over render-fn helpers. They're already nearly there (`PairedRow`, `DiscoveredRow` are real), but the wrapping bodies should be `<SelfBody/>`, `<PairedList/>`, `<DiscoveredList/>` for symmetry and proper React DevTools naming.
Fix: convert each helper to a typed component with a single props interface.

### M4. `peerKeys.all` is `as const` array but children spread it
File: `src/renderer/features/peers/api/queryKeys.ts:6-9`
`all: ['peers'] as const` — fine. Children `[...peerKeys.all, 'paired'] as const` work but every consumer that calls `peerKeys.paired()` allocates a new array. Trivial, mention only for parity with other domains' `keyFactory` patterns elsewhere in the codebase. No fix required.

### M5. Magic numbers `6` (PIN length) and `16` (truncate max) repeated
Files:
- `src/renderer/features/peers/components/OutgoingPairDialog.tsx:67,75,130,133,146` — hard-coded `6` five times
- `src/renderer/features/peers/lib/truncate.ts:2` — `max = 16`
Fix: export `PIN_LENGTH = 6` from `@shared/ipc/peers` (single source — main + renderer agree on PIN size) and import in the dialog. The PIN length almost certainly already lives somewhere in the main service (not in scope).

## Low (style/cleanup)

### L1. Eslint disables in `usePeerEvents.ts`
File: `src/renderer/features/peers/api/usePeerEvents.ts:14`
Two disables on one line: `@typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions`. Resolved by C1 (use `useIpcEvent`).

### L2. `OutgoingPairDialog` button label uses Unicode ellipsis directly
File: `src/renderer/features/peers/components/OutgoingPairDialog.tsx:117,149`
`'Sending…'`, `'Confirming…'` — fine, but inconsistent with `truncate.ts:3` which also uses `…`. Trivial.

### L3. `Heading as="h1"` for a 6-digit PIN
File: `src/renderer/features/peers/components/IncomingPinDialog.tsx:40`
The DialogTitle is the actual H1 of the dialog; using `as="h1"` for the PIN value collides with semantic heading hierarchy. Should be a large display Text with `font-mono` or a dedicated `<Code>` styled large.
Fix: `<Text size="3xl" className="font-mono tracking-widest">{pin.pin}</Text>` (or whichever Text variants exist; check `@ui` typography).

### L4. `PEER_DISCOVERED`/`PEER_PAIRED` constant naming inconsistency
File: `src/renderer/shared/components/EventBridge.tsx:98-99`
Plural `PEERS_PAIRED` matches the channel namespace; fine, but if C2 is fixed this becomes moot.

### L5. Unused `as const` cast tightness
File: `src/renderer/features/peers/api/usePeers.ts:18`
`ipc(PEERS.LIST.PAIRED, {})` — empty object is fine. No issue, but `staleTime: 30_000` for paired (long) vs. `5_000` for discovered (short) vs. `Infinity` for self — consider centralizing under a `PEER_QUERY_OPTS` const for tunability.

## Strengths

- **Query-key factory present and used in hooks.** `peerKeys` is correctly defined and consumed by every hook in `usePeers.ts` (lines 17, 27, 35, 62, 73). Only the EventBridge violates this (C2).
- **`onSuccess` invalidation, no optimistic updates.** `usePairConfirm` and `useRevokePeer` both invalidate `peerKeys.paired()` on success per CLAUDE.md guidance. No stale-data races.
- **All UI uses `@ui` primitives.** Zero raw `<button>`/`<input>`/`<label>`/`<dialog>` across the three components. `Button`, `Input`, `Label`, `Dialog`, `Stack`, `Flex`, `Card`, `Badge`, `Code`, `EmptyState`, `Spinner`, `Heading`, `Text` are all from `@ui` barrel.
- **`error.message` rendered through `Text role="alert" variant="error"`** — accessible failure state in `OutgoingPairDialog.tsx:108-110, 137-139`.
- **`Input` has matching `Label htmlFor`** — `OutgoingPairDialog.tsx:126-134` correctly associates label with input via `id="pair-pin-input"`.
- **Barrel export is clean** — `index.ts` exposes only the three public surfaces (`IncomingPinDialog`, `OutgoingPairDialog`, `PeerListPanel`) plus the API hooks and key factory.
- **`truncate` extracted to `lib/`** — small but the right call; it's the seed of the formatter helper proposed in M2.
- **Mutation reset on dialog close** — `OutgoingPairDialog.handleClose` calls `pairInit.reset()` and `pairConfirm.reset()` (lines 44-45). Prevents stale error toasts on re-open.
- **PIN sanitization** strips non-digit and clamps to 6 chars (line 133) — defends against paste of "1-2-3-4-5-6" or extra chars.
