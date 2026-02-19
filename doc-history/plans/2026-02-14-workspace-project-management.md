# Workspace & Project Management

> Tracker Key: `workspace-project` | Status: **SUPERSEDED** | Created: 2026-02-14

**Related**: `2026-02-13-kanban-workflow-refactor.md` (Task Dashboard & Multi-Device Workflow plan)

---

## Overview

This document defines the Workspace and Project management system, which supersedes the simpler "Computer" model from the original refactor plan.

---

## Key Concept Changes

| Original Term | New Term | Meaning |
|---------------|----------|---------|
| Computer | **Workspace** | Logical execution environment (renameable) |
| (implicit) | **Device** | Physical device (phone, laptop, desktop) |
| (implicit) | **User** | Authenticated account |
| Project | **Project** | Git repository (enhanced with multi-repo support) |
| (none) | **Sub-Project** | Child repo within a multi-repo structure |

---

## Data Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                              USER                                    │
│  (Authenticated account - can log in from any device)               │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ owns
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           WORKSPACES                                 │
│  "Work PC"          "Home Desktop"         "Personal Laptop"        │
│  (host: device-A)   (host: device-B)       (host: device-C)         │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         │ contains           │ contains             │ contains
         ▼                    ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    PROJECTS     │  │    PROJECTS     │  │    PROJECTS     │
│                 │  │                 │  │                 │
│ • company-api   │  │ • claude-ui     │  │ • side-project  │
│ • company-web   │  │ • blog          │  │ • learning-rust │
│ • infra-tools   │  │ • dotfiles      │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         │ (multi-repo example)
         ▼
┌─────────────────────────────────────────┐
│  PROJECT: company-monolith              │
│  Type: multi-repo                       │
│  Root: /work/company-monolith           │
│                                         │
│  ├── /frontend (git repo) ◄─ Sub-Project│
│  ├── /backend  (git repo) ◄─ Sub-Project│
│  └── /shared   (git repo) ◄─ Sub-Project│
└─────────────────────────────────────────┘
```

---

## Entity Definitions

### User

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt: string;
  settings: UserSettings;
}

interface UserSettings {
  defaultWorkspaceId?: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
}
```

### Device

A physical device that can connect to the Hub. Any device can view/manage, but only devices with Claude CLI can execute.

```typescript
interface Device {
  id: string;                    // Hub-assigned
  machineId: string;             // Hardware fingerprint (for desktop)
  userId: string;                // Owner
  deviceType: 'desktop' | 'mobile' | 'web';
  deviceName: string;            // "Parker's iPhone", "Chrome on MacBook"
  capabilities: {
    canExecute: boolean;         // Has Claude CLI
    canHostWorkspace: boolean;   // Can be a workspace host
  };
  isOnline: boolean;
  lastSeen: string;
  appVersion?: string;
  createdAt: string;
}
```

### Workspace

A logical execution environment. Named by user, hosted on a specific device.

```typescript
interface Workspace {
  id: string;
  userId: string;                // Owner
  name: string;                  // "Work PC", "Home Desktop" (user-editable)
  description?: string;
  hostDeviceId: string;          // Which device runs this workspace
  isOnline: boolean;             // Is the host device online?
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceSettings {
  autoStartTasks: boolean;       // Auto-execute queued tasks
  maxConcurrentAgents: number;
  defaultBranch: string;
  notifyOnComplete: boolean;
}
```

### Project

A git repository within a workspace. Can be simple, monorepo, or multi-repo.

```typescript
type RepoStructure = 'single' | 'monorepo' | 'multi-repo';

interface Project {
  id: string;
  workspaceId: string;
  name: string;                  // "claude-ui", "company-api"
  description?: string;
  rootPath: string;              // Absolute path on host device
  gitUrl?: string;               // Remote URL if available
  repoStructure: RepoStructure;
  parentProjectId?: string;      // For sub-projects in multi-repo
  subProjects?: SubProject[];    // Child repos (for multi-repo)
  defaultBranch: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

interface SubProject {
  id: string;
  projectId: string;             // Parent project
  name: string;                  // "frontend", "backend"
  relativePath: string;          // "/frontend", "/backend"
  gitUrl?: string;
  defaultBranch: string;
}

interface ProjectSettings {
  claudeModel: 'opus' | 'sonnet' | 'haiku';
  workflowSkill: string;         // "/implement-feature" by default
  prTemplate?: string;
  branchPrefix?: string;         // "feature/", "fix/"
}
```

### Task

Now includes optional sub-project targeting.

```typescript
interface Task {
  id: string;
  projectId: string;
  subProjectId?: string;         // Optional: target specific sub-repo
  workspaceId: string;           // Denormalized for filtering
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  // ... rest of task fields from protocol
  targetPath?: string;           // Computed: project root + sub-project path
}
```

---

## User Flows

### 1. First-Time Setup (Desktop App)

```
1. User opens app for first time
2. App prompts: "Create account or sign in"
3. User creates account (email/password or OAuth)
4. App detects this is a desktop with Claude CLI
5. Prompt: "Set up this computer as a Workspace?"
6. User names it: "Work Laptop"
7. Workspace created, this device is the host
8. Prompt: "Add a project?" → Project initialization flow
```

### 2. Adding a Device (Mobile)

```
1. User opens mobile app / PWA
2. Sign in with existing account
3. App registers as device (mobile, no execution capability)
4. User sees all their workspaces
5. Can view projects, tasks, progress
6. Can create/edit tasks (execution happens on workspace host)
```

### 3. Project Initialization

```
1. User clicks "Add Project" in workspace
2. Select folder (native dialog on desktop)
3. App detects git status:

   A) New folder (no .git):
      - Prompt: "Initialize as new repository?"
      - Ask repo type: Single | Monorepo | Multi-repo parent

   B) Existing single repo:
      - Auto-detect, add as "single" type
      - Read remote URL, default branch

   C) Folder with child git repos:
      - Prompt: "Detected child repositories:"
        ☑ /frontend (git)
        ☑ /backend (git)
        ☐ /docs (not a git repo)
      - "Add these as sub-projects?"
      - User confirms, creates Project + SubProjects

4. Project added to workspace
5. Syncs to Hub → visible on all devices
```

### 4. Creating Task for Multi-Repo Project

```
1. User viewing project "company-monolith" (multi-repo)
2. Clicks "New Task"
3. Task form shows:

   Title: [________________]
   Description: [______________]

   Target: ○ Entire project
           ○ frontend (sub-project)
           ○ backend (sub-project)
           ○ shared (sub-project)

   Priority: [Normal ▼]

4. User selects "frontend", creates task
5. Task created with subProjectId set
6. When executed, Claude works in /frontend directory
```

### 5. Workspace Settings

```
Settings → Workspaces

┌─────────────────────────────────────────────────┐
│ My Workspaces                                    │
├─────────────────────────────────────────────────┤
│ 🟢 Work Laptop                    [Edit] [···]  │
│    Host: MacBook Pro (this device)              │
│    Projects: 5                                   │
│    Status: Online                               │
├─────────────────────────────────────────────────┤
│ 🔴 Home Desktop                   [Edit] [···]  │
│    Host: Windows PC                             │
│    Projects: 3                                   │
│    Status: Offline (last seen: 2h ago)          │
├─────────────────────────────────────────────────┤
│ [+ Add Workspace]                               │
└─────────────────────────────────────────────────┘

Edit Workspace:
┌─────────────────────────────────────────────────┐
│ Workspace Settings                              │
├─────────────────────────────────────────────────┤
│ Name: [Work Laptop_____________]                │
│                                                 │
│ Host Device: [MacBook Pro (this device) ▼]     │
│   ⚠️ Changing host will migrate projects        │
│                                                 │
│ Auto-start queued tasks: [✓]                   │
│ Max concurrent agents:   [3____]               │
│ Default branch:          [main__]              │
│ Notify on completion:    [✓]                   │
│                                                 │
│              [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────┘
```

---

## Hub Database Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  settings TEXT,                 -- JSON: UserSettings
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- Devices table (physical devices)
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  machine_id TEXT,               -- NULL for mobile/web
  user_id TEXT NOT NULL REFERENCES users(id),
  device_type TEXT NOT NULL,     -- 'desktop' | 'mobile' | 'web'
  device_name TEXT NOT NULL,
  capabilities TEXT NOT NULL,    -- JSON: { canExecute, canHostWorkspace }
  is_online BOOLEAN DEFAULT FALSE,
  last_seen DATETIME,
  app_version TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(machine_id) WHERE machine_id IS NOT NULL
);

-- Workspaces table (logical execution environments)
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  host_device_id TEXT NOT NULL REFERENCES devices(id),
  settings TEXT,                 -- JSON: WorkspaceSettings
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  root_path TEXT NOT NULL,
  git_url TEXT,
  repo_structure TEXT NOT NULL,  -- 'single' | 'monorepo' | 'multi-repo'
  parent_project_id TEXT REFERENCES projects(id),
  default_branch TEXT DEFAULT 'main',
  settings TEXT,                 -- JSON: ProjectSettings
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, root_path)
);

-- Sub-projects table (for multi-repo)
CREATE TABLE sub_projects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  git_url TEXT,
  default_branch TEXT DEFAULT 'main',
  UNIQUE(project_id, relative_path)
);

-- Tasks table (updated)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  sub_project_id TEXT REFERENCES sub_projects(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_by_device_id TEXT REFERENCES devices(id),
  execution_session_id TEXT,
  progress_data TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for JWT management)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  device_id TEXT NOT NULL REFERENCES devices(id),
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints (Additions to Protocol)

### Authentication

```
POST /api/auth/register         # Create account
POST /api/auth/login            # Login (returns JWT)
POST /api/auth/logout           # Invalidate session
POST /api/auth/refresh          # Refresh JWT
GET  /api/auth/me               # Get current user
```

### Workspaces

```
GET    /api/workspaces                    # List user's workspaces
POST   /api/workspaces                    # Create workspace
GET    /api/workspaces/:id                # Get workspace
PATCH  /api/workspaces/:id                # Update workspace
DELETE /api/workspaces/:id                # Delete workspace
POST   /api/workspaces/:id/transfer-host  # Change host device
```

### Projects

```
GET    /api/workspaces/:wid/projects      # List projects in workspace
POST   /api/workspaces/:wid/projects      # Create project
GET    /api/projects/:id                  # Get project
PATCH  /api/projects/:id                  # Update project
DELETE /api/projects/:id                  # Delete project

# Sub-projects
GET    /api/projects/:id/sub-projects     # List sub-projects
POST   /api/projects/:id/sub-projects     # Add sub-project
DELETE /api/projects/:pid/sub-projects/:sid  # Remove sub-project
```

### Project Detection (Desktop Only)

```
POST /api/projects/detect
  Body: { path: string }
  Response: {
    isGitRepo: boolean;
    hasChildRepos: boolean;
    childRepos: Array<{ path: string; name: string; gitUrl?: string }>;
    remoteUrl?: string;
    defaultBranch?: string;
  }
```

---

## UI Components

### Settings → Workspaces Tab

```
src/renderer/features/settings/
├── components/
│   ├── WorkspacesTab.tsx        # Main workspaces settings
│   ├── WorkspaceCard.tsx        # Individual workspace in list
│   ├── WorkspaceEditor.tsx      # Edit workspace modal
│   └── WorkspaceHostSelector.tsx # Device dropdown for host
```

### Project Initialization Flow

```
src/renderer/features/projects/
├── components/
│   ├── ProjectInitWizard.tsx    # Multi-step init flow
│   ├── RepoTypeSelector.tsx     # Single/Monorepo/Multi-repo picker
│   ├── SubRepoDetector.tsx      # Shows detected child repos
│   └── SubRepoSelector.tsx      # Checkboxes for sub-projects
```

### Task Creation (Updated)

```
src/renderer/features/tasks/
├── components/
│   ├── TaskCreator.tsx          # Task creation form
│   └── SubProjectSelector.tsx   # Target selector for multi-repo
```

---

## Edge Cases & Decisions

### 1. Workspace Host Goes Offline

- Workspace shows as "offline"
- Tasks can still be created/edited (queued)
- Execution blocked until host comes online
- Progress shows "last known state"

### 2. Changing Workspace Host

- User goes to Settings → Workspaces → Edit
- Selects new host device from dropdown
- Warning: "Projects on old host won't be accessible until synced"
- Option: "Clone projects to new host" (future)

### 3. Project Path Changes

- User moves folder on disk
- Desktop app detects project not found
- Prompt: "Project 'foo' not found at /old/path. Locate or remove?"
- User selects new path, project updated

### 4. Sub-Project Added Later

- User has existing multi-repo project
- Adds new folder with git repo
- Goes to Project Settings → Sub-projects
- "Add Sub-project" → Select folder → Added

### 5. Authentication Token Expiry

- JWT expires (24h default)
- App attempts refresh token
- If refresh fails, prompt re-login
- Mobile can use biometric to unlock stored credentials

---

## Security Considerations

1. **Password Storage**: Argon2 hashing on Hub
2. **JWT**: Short-lived access (1h), longer refresh (7d)
3. **Device Trust**: Desktop devices can host, mobile cannot
4. **Project Paths**: Never transmitted, only stored locally on host
5. **Workspace Isolation**: Users only see their own workspaces

---

## Migration from Current System

### Phase 0: Add User Auth
1. Add `users` and `sessions` tables
2. Create default user for existing data
3. Add login/register UI

### Phase 1: Rename Computer → Workspace
1. Add `workspaces` table
2. Migrate `computers` data to `workspaces`
3. Add `host_device_id` concept
4. Update UI terminology

### Phase 2: Add Devices Table
1. Create `devices` table
2. Current machines become devices + workspaces
3. Mobile app registers as device only

### Phase 3: Project Enhancements
1. Add `repo_structure` to projects
2. Add `sub_projects` table
3. Add project initialization wizard
4. Update task creation with sub-project selector

---

## Open Questions

1. **OAuth providers**: Google, GitHub, or email-only for MVP?
2. **Workspace sharing**: Can users share workspaces? (future)
3. **Project templates**: Pre-configured project settings? (future)
4. **Offline-first**: Should mobile cache data for offline viewing?
5. **Workspace migration**: Tooling to move workspace to new host?

---

## Success Criteria

- [ ] User can register/login from any device
- [ ] User can create and name workspaces
- [ ] User can assign host device to workspace
- [ ] User can initialize projects with auto-detection
- [ ] Multi-repo projects show sub-project selector in task creation
- [ ] Settings → Workspaces tab fully functional
- [ ] All devices see same workspace/project/task data
- [ ] Workspace host executes tasks, viewers observe
