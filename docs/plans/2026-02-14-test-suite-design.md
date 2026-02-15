# Test Suite Design — Claude-UI

**Status**: APPROVED
**Branch**: `feature/test-suite`
**Created**: 2026-02-14
**Author**: Claude (via brainstorming session)

---

## Overview

Comprehensive testing strategy for the Claude-UI Electron application with four layers:

1. **Unit Tests** — Vitest, services and utilities in isolation
2. **Integration Tests** — Vitest, IPC flow and Hub server
3. **E2E Tests** — Playwright + Electron, critical user journeys
4. **AI QA Agent** — Claude + MCP Electron, exploratory visual testing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLAUDE-UI TEST PYRAMID                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   AI QA AGENT   │  ← Claude + MCP Electron        │
│                         │  (Exploratory)  │    Visual verification          │
│                         └────────┬────────┘    Natural language scenarios   │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                            │
│                    │      E2E TESTS            │  ← Playwright + Electron   │
│                    │   (Critical Journeys)     │    Scripted, deterministic │
│                    └─────────────┬─────────────┘    CI-friendly             │
│                                  │                                          │
│          ┌───────────────────────┴───────────────────────┐                  │
│          │              INTEGRATION TESTS                 │  ← Vitest       │
│          └───────────────────────┬───────────────────────┘                  │
│                                  │                                          │
│  ┌───────────────────────────────┴───────────────────────────────────────┐  │
│  │                         UNIT TESTS                                     │  │
│  │        (Services, Utilities, Zod Schemas, Pure Functions)              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Tool | Speed | When to Run | Coverage Target |
|-------|------|-------|-------------|-----------------|
| Unit | Vitest | <1s | Every save | 80% of services |
| Integration | Vitest | <10s | Pre-commit | IPC contract, Hub API |
| E2E | Playwright | <60s | Pre-push/CI | 10 critical journeys |
| AI QA | Claude + MCP | ~5min | PR review | Exploratory, visual |

---

## Directory Structure

```
tests/
├── setup/
│   ├── vitest.setup.ts          # Global test setup
│   └── mocks/
│       ├── electron.ts          # Mock app, dialog, safeStorage
│       ├── node-fs.ts           # Mock file system
│       ├── node-pty.ts          # Mock PTY spawning
│       └── ipc.ts               # Mock window.api.invoke
│
├── unit/
│   ├── services/
│   │   ├── project-service.test.ts
│   │   ├── task-service.test.ts
│   │   ├── hub-sync-service.test.ts
│   │   ├── hub-token-store.test.ts
│   │   └── agent-service.test.ts
│   ├── ipc/
│   │   ├── router.test.ts
│   │   └── contract.test.ts
│   └── shared/
│       ├── time-parser.test.ts
│       └── utils.test.ts
│
├── integration/
│   ├── ipc-handlers/
│   │   ├── task-handlers.test.ts
│   │   ├── project-handlers.test.ts
│   │   └── hub-handlers.test.ts
│   ├── hub-server/
│   │   ├── auth-routes.test.ts
│   │   ├── task-routes.test.ts
│   │   └── websocket.test.ts
│   └── hooks/
│       ├── useTasks.test.tsx
│       └── useProjects.test.tsx
│
├── e2e/
│   ├── electron.setup.ts
│   ├── project-setup.spec.ts
│   ├── task-creation.spec.ts
│   ├── agent-execution.spec.ts
│   ├── hub-connection.spec.ts
│   └── settings-persistence.spec.ts
│
├── qa-scenarios/
│   ├── task-creation.md
│   ├── project-management.md
│   ├── agent-workflow.md
│   └── hub-sync.md
│
└── fixtures/
    ├── projects.ts
    ├── tasks.ts
    └── hub-responses.ts
```

---

## Layer 1: Unit Tests

### Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/main/services/**/*.ts'],
      exclude: ['**/*.d.ts', '**/index.ts'],
    },
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main'),
      electron: resolve(__dirname, 'tests/setup/mocks/electron.ts'),
    },
  },
});
```

### Mocks

**tests/setup/mocks/electron.ts:**
```typescript
import { vi } from 'vitest';

export const app = {
  getPath: vi.fn((name: string) => `/mock/${name}`),
  getName: vi.fn(() => 'claude-ui-test'),
  getVersion: vi.fn(() => '1.0.0'),
};

export const safeStorage = {
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`)),
  decryptString: vi.fn((b: Buffer) => b.toString().replace('enc:', '')),
};

export const dialog = {
  showOpenDialog: vi.fn(() => Promise.resolve({ canceled: false, filePaths: ['/mock/path'] })),
  showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
};

export const BrowserWindow = vi.fn();
export const ipcMain = { handle: vi.fn(), on: vi.fn() };

export default { app, safeStorage, dialog, BrowserWindow, ipcMain };
```

**tests/setup/mocks/node-fs.ts:**
```typescript
import { vi } from 'vitest';
import { Volume, createFsFromVolume } from 'memfs';

export function createMockFs(files: Record<string, string> = {}) {
  const vol = Volume.fromJSON(files);
  return createFsFromVolume(vol);
}

export const mockFs = createMockFs();
vi.mock('node:fs', () => mockFs);
vi.mock('node:fs/promises', () => mockFs.promises);
```

**tests/setup/mocks/node-pty.ts:**
```typescript
import { vi } from 'vitest';
import { EventEmitter } from 'events';

export class MockPty extends EventEmitter {
  pid = 12345;
  cols = 80;
  rows = 24;

  write = vi.fn();
  resize = vi.fn();
  kill = vi.fn(() => this.emit('exit', 0, 0));

  simulateOutput(data: string) {
    this.emit('data', data);
  }
}

export const spawn = vi.fn(() => new MockPty());

vi.mock('@lydell/node-pty', () => ({ spawn }));
```

### Priority Services to Test

| Service | Complexity | Test Focus |
|---------|------------|------------|
| `project-service.ts` | Low | CRUD, file persistence |
| `task-service.ts` | Medium | File structure, status transitions |
| `hub-token-store.ts` | Low | Encryption, expiry checking |
| `hub-sync-service.ts` | High | Offline queue, conflict resolution |
| `agent-service.ts` | High | Spawn, parse output, queue management |
| `time-parser.ts` | Low | Natural language parsing |

---

## Layer 2: Integration Tests

### IPC Handler Tests

```typescript
// tests/integration/ipc-handlers/task-handlers.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createIpcRouter } from '@main/ipc/router';
import { registerTaskHandlers } from '@main/ipc/handlers/task-handlers';
import { createTaskService } from '@main/services/task/task-service';

describe('Task IPC Handlers', () => {
  let router: IpcRouter;
  let taskService: TaskService;

  beforeEach(() => {
    taskService = createTaskService({ projectPath: '/mock/project' });
    router = createIpcRouter();
    registerTaskHandlers(router, taskService);
  });

  it('tasks.list returns array of tasks', async () => {
    const result = await router.invoke('tasks.list', { projectId: 'proj-1' });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('tasks.create validates input with Zod', async () => {
    const result = await router.invoke('tasks.create', { title: '' }); // Invalid
    expect(result.success).toBe(false);
    expect(result.error).toContain('validation');
  });
});
```

### Hub Server Tests

```typescript
// tests/integration/hub-server/task-routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../../../hub/src/app';
import type { FastifyInstance } from 'fastify';

describe('Hub Task Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build({ testing: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/tasks returns task list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      headers: { 'x-api-key': 'test-key' },
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toHaveProperty('tasks');
  });
});
```

### React Hook Tests

```typescript
// tests/integration/hooks/useTasks.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from '@features/tasks/api/useTasks';
import { vi } from 'vitest';

// Mock the ipc helper
vi.mock('@renderer/shared/lib/ipc', () => ({
  ipc: vi.fn((channel: string) => {
    if (channel === 'tasks.list') {
      return Promise.resolve({ success: true, data: [{ id: '1', title: 'Test' }] });
    }
  }),
}));

describe('useTasks', () => {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );

  it('fetches tasks for project', async () => {
    const { result } = renderHook(() => useTasks('proj-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
```

---

## Layer 3: E2E Tests (Playwright + Electron)

### Configuration

**playwright.config.ts:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 2,
  workers: 1, // Electron tests must run serially
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  reporter: [['html', { open: 'never' }]],
});
```

### Electron Setup

**tests/e2e/electron.setup.ts:**
```typescript
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { test as base } from '@playwright/test';

type TestFixtures = {
  electronApp: ElectronApplication;
  mainWindow: Page;
};

export const test = base.extend<TestFixtures>({
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test', ELECTRON_IS_TEST: '1' },
    });
    await use(app);
    await app.close();
  },
  mainWindow: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await use(window);
  },
});

export { expect } from '@playwright/test';
```

### Critical Journey Tests

**tests/e2e/task-creation.spec.ts:**
```typescript
import { test, expect } from './electron.setup';

test.describe('Task Creation', () => {
  test('creates task via kanban board', async ({ mainWindow }) => {
    // Navigate to project
    await mainWindow.click('[data-testid="sidebar-projects"]');
    await mainWindow.click('[data-testid="project-card"]:first-child');

    // Open task creation
    await mainWindow.click('[data-testid="new-task-button"]');

    // Fill form
    await mainWindow.fill('[data-testid="task-title"]', 'E2E Test Task');
    await mainWindow.fill('[data-testid="task-description"]', 'Created by Playwright');

    // Submit
    await mainWindow.click('[data-testid="create-task-submit"]');

    // Verify
    await expect(mainWindow.locator('[data-testid="task-card"]').filter({ hasText: 'E2E Test Task' })).toBeVisible();
  });

  test('validates empty title', async ({ mainWindow }) => {
    await mainWindow.click('[data-testid="new-task-button"]');
    await mainWindow.click('[data-testid="create-task-submit"]');
    await expect(mainWindow.locator('[data-testid="title-error"]')).toBeVisible();
  });
});
```

### Critical Journeys Checklist

| # | Journey | File | Priority |
|---|---------|------|----------|
| 1 | Project Setup | `project-setup.spec.ts` | P0 |
| 2 | Task Creation | `task-creation.spec.ts` | P0 |
| 3 | Task Drag & Drop | `task-dnd.spec.ts` | P0 |
| 4 | Agent Execution | `agent-execution.spec.ts` | P1 |
| 5 | Hub Connection | `hub-connection.spec.ts` | P1 |
| 6 | Settings Persistence | `settings.spec.ts` | P1 |
| 7 | Terminal Usage | `terminal.spec.ts` | P2 |
| 8 | Offline Mode | `offline-mode.spec.ts` | P2 |
| 9 | Voice Command | `voice.spec.ts` | P3 |
| 10 | Multi-Project Switch | `multi-project.spec.ts` | P2 |

---

## Layer 4: AI QA Agent

### Agent Definition

**.claude/agents/qa-tester.md:**
```markdown
# QA Tester Agent

You are Quinn, a veteran QA engineer with 12 years of experience testing desktop applications.

## Philosophy

- **Trust nothing** — Verify every claim with your own eyes
- **Edge cases are where bugs hide** — Always try boundary conditions
- **Document everything** — Screenshot before and after every action
- **Think like a user** — Not like a developer who knows the code

## Available Tools

You have access to the MCP Electron server tools:

- `mcp__electron__take_screenshot` — Capture current app state
- `mcp__electron__send_command_to_electron` — Interact with UI elements
- `mcp__electron__get_electron_window_info` — Check window properties
- `mcp__electron__read_electron_logs` — Check for console errors

## Interaction Commands

When using `send_command_to_electron`, use these commands:

| Command | Args | Purpose |
|---------|------|---------|
| `get_page_structure` | none | See all interactive elements |
| `click_by_text` | `{ text: "Button" }` | Click by visible text |
| `click_by_selector` | `{ selector: ".class" }` | Click by CSS selector |
| `fill_input` | `{ selector: "#id", value: "text" }` | Fill input field |
| `send_keyboard_shortcut` | `{ text: "Enter" }` | Send keypress |

## Testing Protocol

For each test scenario:

1. **Baseline** — Take screenshot, note initial state
2. **Execute** — Perform each step, screenshot after each
3. **Verify** — Check expected outcomes visually
4. **Logs** — Read console logs, flag any errors
5. **Report** — Document findings in structured format

## Report Format

Generate reports in this structure:

```markdown
# QA Report: [Scenario Name]

## Summary
- **Status**: PASS / FAIL / BLOCKED
- **Date**: [timestamp]
- **Duration**: [time]

## Test Steps
| Step | Action | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| 1 | ... | ... | ... | ✅/❌ |

## Screenshots
[Embedded screenshots with captions]

## Console Errors
[Any errors found in logs]

## Recommendations
[Suggested fixes or improvements]
```

## Edge Cases to Always Try

- Empty inputs
- Very long strings (500+ chars)
- Special characters: `<script>`, `'; DROP TABLE`, emoji 🚀
- Rapid repeated clicks
- Browser back/forward during operations
- Network disconnect during async operations
```

### Test Scenario Format

**tests/qa-scenarios/task-creation.md:**
```markdown
# QA Scenario: Task Creation Flow

## Objective
Verify that users can create tasks through the kanban board UI.

## Preconditions
- Application is running
- At least one project exists
- User is on the kanban board view

## Happy Path

### Steps
1. Click the "New Task" button in the toolbar
2. Enter title: "QA Test Task"
3. Enter description: "Created by QA agent"
4. Select priority: "High"
5. Click "Create" button

### Expected Results
- Modal closes
- Task card appears in "Backlog" column
- Card shows correct title and priority badge
- Toast notification confirms creation
- No console errors

## Edge Cases

### Empty Title
1. Open task creation modal
2. Leave title empty
3. Click Create
- **Expected**: Validation error shown, form not submitted

### Long Title
1. Open task creation modal
2. Enter 500 character title
3. Click Create
- **Expected**: Task created OR graceful truncation with warning

### Special Characters
1. Create task with title: `<script>alert('xss')</script>`
- **Expected**: Title displayed as literal text, no script execution

### Rapid Creation
1. Create 5 tasks in rapid succession (< 1 second each)
- **Expected**: All 5 tasks created, no duplicates, no errors

## Accessibility Checks
- Tab through all form fields
- Submit with Enter key
- Screen reader announces form labels
```

### Running QA Agent

**NPM Script:**
```json
{
  "scripts": {
    "test:qa": "npm run build && npm run start:test & sleep 5 && claude --agent qa-tester",
    "test:qa:scenario": "claude --agent qa-tester --input"
  }
}
```

**Manual Invocation:**
```bash
# Run all scenarios
npm run test:qa

# Run specific scenario
cat tests/qa-scenarios/task-creation.md | npm run test:qa:scenario
```

---

## CI/CD Integration

**.github/workflows/test.yml:**
```yaml
name: Test Suite

on:
  push:
    branches: [master, 'feature/**']
  pull_request:
    branches: [master]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: xvfb-run --auto-servernum npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  hub-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: hub
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:unit:watch": "vitest --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage",
    "test:qa": "npm run build && concurrently -k \"npm run start:test\" \"sleep 5 && claude --agent qa-tester\"",
    "start:test": "cross-env ELECTRON_IS_TEST=1 electron ."
  }
}
```

---

## Implementation Waves

### Wave 1: Test Infrastructure (Foundation)
1. Create `vitest.config.ts`
2. Create `tests/setup/vitest.setup.ts`
3. Create mock files (electron, fs, pty)
4. Add test scripts to package.json
5. Install missing dependencies (memfs, @vitest/coverage-v8)

### Wave 2: Unit Tests (Services)
1. `project-service.test.ts`
2. `task-service.test.ts`
3. `hub-token-store.test.ts`
4. `time-parser.test.ts`
5. `router.test.ts` (IPC validation)

### Wave 3: Integration Tests
1. `task-handlers.test.ts`
2. `project-handlers.test.ts`
3. `hub-handlers.test.ts`
4. Hub server route tests

### Wave 4: E2E Setup
1. Install Playwright
2. Create `playwright.config.ts`
3. Create `electron.setup.ts`
4. Add data-testid attributes to key components

### Wave 5: E2E Tests
1. `project-setup.spec.ts`
2. `task-creation.spec.ts`
3. `task-dnd.spec.ts`
4. `hub-connection.spec.ts`

### Wave 6: AI QA Agent
1. Create `.claude/agents/qa-tester.md`
2. Create QA scenario templates
3. Create QA report template
4. Document QA workflow

### Wave 7: CI/CD
1. Create `.github/workflows/test.yml`
2. Add coverage badges to README
3. Set up PR checks

---

## Dependencies to Add

```bash
# Testing
npm install -D memfs @vitest/coverage-v8

# E2E
npm install -D @playwright/test

# Utilities
npm install -D concurrently cross-env
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unit test coverage | 80% services | Vitest coverage report |
| Integration test pass rate | 100% | CI pipeline |
| E2E test pass rate | 95% | Playwright report |
| E2E test duration | <60s | CI timing |
| QA agent bug detection | Qualitative | PR review feedback |

---

## References

- [Playwright Electron Testing](https://playwright.dev/docs/api/class-electron)
- [Vitest Documentation](https://vitest.dev/)
- [Building AI QA Engineer with Claude](https://alexop.dev/posts/building_ai_qa_engineer_claude_code_playwright/)
- [Electron Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
