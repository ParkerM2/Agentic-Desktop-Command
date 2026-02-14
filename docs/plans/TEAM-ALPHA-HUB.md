# Team Alpha: Hub + Backend Implementation

**Branch**: `feature/team-alpha-hub`
**Base**: `master`
**Coordination**: `docs/plans/2026-02-14-parallel-implementation-plan.md`

---

## Your Mission

You are Team Alpha. You own the Hub server, authentication, and backend API development. Team Beta (running in another terminal) is building the frontend simultaneously.

**Your file ownership:**
- `hub/` — Full ownership
- `src/shared/types/hub-protocol.ts` — Shared (coordinate changes)
- `src/main/services/device/` — New
- `src/main/services/workspace/` — New
- `docs/contracts/hub-device-protocol.md` — Yours to update

---

## Setup

```bash
cd Claude-UI
git checkout master && git pull origin master
git checkout -b feature/team-alpha-hub

# Create your progress file
mkdir -p docs/progress
touch docs/progress/team-alpha-progress.md
```

---

## Wave 1: Authentication & Devices

### 1.1 Database Schema

Update `hub/src/db/schema.sql` with new tables:

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  settings TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  device_id TEXT REFERENCES devices(id),
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Devices
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  machine_id TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  device_type TEXT NOT NULL,
  device_name TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen DATETIME,
  app_version TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(machine_id) WHERE machine_id IS NOT NULL
);

-- Workspaces (for Wave 2)
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  host_device_id TEXT NOT NULL REFERENCES devices(id),
  settings TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects (for Wave 2)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  root_path TEXT NOT NULL,
  git_url TEXT,
  repo_structure TEXT NOT NULL,
  parent_project_id TEXT REFERENCES projects(id),
  default_branch TEXT DEFAULT 'main',
  settings TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, root_path)
);

-- Sub-projects (for Wave 2)
CREATE TABLE sub_projects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  git_url TEXT,
  default_branch TEXT DEFAULT 'main',
  UNIQUE(project_id, relative_path)
);

-- Update tasks table
ALTER TABLE tasks ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);
ALTER TABLE tasks ADD COLUMN sub_project_id TEXT REFERENCES sub_projects(id);
```

### 1.2 Authentication Routes

Create `hub/src/routes/auth.ts`:

```typescript
// Endpoints:
// POST /api/auth/register - Create user account
// POST /api/auth/login    - Login, returns JWT
// POST /api/auth/logout   - Invalidate session
// POST /api/auth/refresh  - Refresh JWT
// GET  /api/auth/me       - Get current user

// Use bcrypt or argon2 for password hashing
// Use jsonwebtoken for JWT
// Store session in sessions table
```

### 1.3 Device Routes

Create `hub/src/routes/devices.ts`:

```typescript
// Endpoints:
// POST   /api/devices       - Register device
// GET    /api/devices       - List user's devices
// PATCH  /api/devices/:id   - Update device
// DELETE /api/devices/:id   - Remove device

// Device registration should:
// 1. Validate JWT from Authorization header
// 2. Check if machine_id already registered
// 3. Create or update device record
// 4. Return device with capabilities
```

### 1.4 Update Protocol Types

Update `src/shared/types/hub-protocol.ts`:

```typescript
// Add:
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
  deviceInfo?: {
    machineId?: string;
    deviceName: string;
    deviceType: DeviceType;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
}
```

### Wave 1 Checklist

- [ ] Database schema created with all tables
- [ ] `POST /api/auth/register` works
- [ ] `POST /api/auth/login` returns JWT
- [ ] `GET /api/auth/me` returns user from JWT
- [ ] `POST /api/devices` registers device
- [ ] `GET /api/devices` lists user's devices
- [ ] Protocol types updated

**When complete**: Update `docs/progress/team-alpha-progress.md` and notify Team Beta for Sync Point 1.

---

## Sync Point 1

**Wait for Team Beta** before proceeding.

Actions:
1. Share final API endpoints
2. Verify `hub-protocol.ts` types are in sync
3. Resolve any contract issues

---

## Wave 2: Workspaces & Projects

### 2.1 Workspace Routes

Create `hub/src/routes/workspaces.ts`:

```typescript
// Endpoints:
// GET    /api/workspaces          - List user's workspaces
// POST   /api/workspaces          - Create workspace
// GET    /api/workspaces/:id      - Get workspace
// PATCH  /api/workspaces/:id      - Update workspace
// DELETE /api/workspaces/:id      - Delete workspace
// POST   /api/workspaces/:id/host - Change host device
```

### 2.2 Project Routes

Create `hub/src/routes/projects.ts`:

```typescript
// Endpoints:
// GET    /api/workspaces/:wid/projects  - List projects
// POST   /api/workspaces/:wid/projects  - Create project
// POST   /api/projects/detect           - Detect repo type (desktop only)
// GET    /api/projects/:id              - Get project
// PATCH  /api/projects/:id              - Update project
// DELETE /api/projects/:id              - Delete project

// Sub-projects:
// GET    /api/projects/:id/sub-projects
// POST   /api/projects/:id/sub-projects
// DELETE /api/projects/:pid/sub-projects/:sid
```

### 2.3 WebSocket Events

Update `hub/src/ws/handlers.ts`:

```typescript
// Add broadcasts for:
// workspace:created, workspace:updated, workspace:deleted
// project:created, project:updated, project:deleted
// device:online, device:offline
```

### Wave 2 Checklist

- [ ] Workspace CRUD endpoints work
- [ ] Project CRUD endpoints work
- [ ] Sub-project management works
- [ ] WebSocket broadcasts workspace changes
- [ ] Device online/offline tracked

**When complete**: Update progress file, proceed to Sync Point 2.

---

## Sync Point 2

**Integration test with Team Beta**:

1. Start Hub server
2. Team Beta connects frontend
3. Test: Register → Login → Create Workspace → Create Project
4. Verify WebSocket events received
5. Fix issues before proceeding

---

## Wave 3: Task Updates

### 3.1 Update Task Endpoints

Modify `hub/src/routes/tasks.ts`:

```typescript
// Add workspace_id and sub_project_id to:
// - Task creation
// - Task listing (filter by workspace)
// - Task response

// New endpoints:
// POST /api/tasks/:id/progress - Push progress update
// POST /api/tasks/:id/complete - Mark task complete
```

### 3.2 Progress WebSocket

```typescript
// Broadcast on progress update:
// task:progress { taskId, progress }
// task:completed { taskId, result, prUrl? }
```

### Wave 3 Checklist

- [ ] Tasks have workspace_id, sub_project_id
- [ ] Task list filters by workspace
- [ ] Progress endpoint stores and broadcasts
- [ ] Complete endpoint updates status

---

## Wave 4: Execution Commands

### 4.1 Execution Endpoints

```typescript
// POST /api/tasks/:id/execute
// - Verify task belongs to user
// - Find workspace host device
// - Send command:execute via WebSocket to host

// POST /api/tasks/:id/cancel
// - Send command:cancel via WebSocket to host
```

### 4.2 WebSocket Commands

```typescript
// Hub → Device (to workspace host only):
// command:execute { taskId, task }
// command:cancel { taskId, reason? }

// Device → Hub (from executing device):
// execution:started { taskId, sessionId, pid? }
// execution:ack { taskId, action, error? }
```

### 4.3 Finalize Protocol Documentation

Update `docs/contracts/hub-device-protocol.md`:
- Document all endpoints
- Document all WebSocket events
- Ensure types match implementation

### Wave 4 Checklist

- [ ] Execute routes to workspace host
- [ ] Cancel broadcasts correctly
- [ ] Execution acks received
- [ ] Protocol documentation complete

---

## Final Merge

1. Ensure all tests pass
2. Run `npm run lint` in hub/
3. Update progress file to COMPLETE
4. Merge to master first (before Team Beta)
5. Notify Team Beta to rebase

---

## Key Files You'll Create/Modify

```
hub/
├── src/
│   ├── db/
│   │   └── schema.sql           # Updated schema
│   ├── routes/
│   │   ├── auth.ts              # NEW
│   │   ├── devices.ts           # NEW
│   │   ├── workspaces.ts        # NEW
│   │   ├── projects.ts          # NEW
│   │   └── tasks.ts             # Modified
│   ├── ws/
│   │   └── handlers.ts          # Modified
│   └── middleware/
│       └── auth.ts              # NEW - JWT validation

src/shared/types/
└── hub-protocol.ts              # Updated types

docs/
├── contracts/
│   └── hub-device-protocol.md   # Updated
└── progress/
    └── team-alpha-progress.md   # Your progress
```
