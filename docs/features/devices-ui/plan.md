# Devices Management Page

> Tracker Key: `devices-ui` | Status: **DRAFT** | Priority: **P1** | Created: 2026-02-26

---

## Problem

Device registration, heartbeat, and management are fully functional in the backend (IPC channels, Hub API proxy, service). But there's no dedicated devices page — device selection is buried in the settings sidebar layout selector.

## Goals

- Dedicated `/devices` page accessible from navigation
- List registered devices with status, last heartbeat, OS info
- Register new devices
- Remove/deregister devices
- Show which device is currently active
- Device health indicators (online/offline/stale)

## Approach

### Route

- Add `/devices` route (personal navigation section or settings sub-route)
- Add to `shared-nav.ts`

### Components

| Component | Purpose |
|-----------|---------|
| `DeviceList.tsx` | Table/card list of all registered devices |
| `DeviceCard.tsx` | Device card with name, OS, status, last seen |
| `RegisterDeviceDialog.tsx` | Form to register a new device |
| `DeviceStatusBadge.tsx` | Online/offline/stale indicator |

### Data Flow

Uses existing hooks in `src/renderer/features/devices/`:
- `useDevices()` — list query
- `useRegisterDevice()` — mutation
- `useDeviceEvents()` — WebSocket event handler for status changes

## Estimated Effort

~1 day (backend complete, just UI components needed)
