# Route Groups

TanStack Router route definitions, split by domain. Each file exports a `create*Routes()` function that takes the parent layout route and returns an array of child routes.

## Key Files

- **`auth.routes.tsx`** — Login and register routes (outside app layout)
- **`dashboard.routes.ts`** — Dashboard and my-work views
- **`project.routes.ts`** — Project detail, task board, terminal views
- **`productivity.routes.ts`** — Planner, fitness, changelog, milestones, insights, ideas
- **`communication.routes.ts`** — Email, GitHub, notifications
- **`settings.routes.ts`** — Settings page
- **`misc.routes.ts`** — Briefing, notes, QA, and other miscellaneous pages
- **`index.ts`** — Barrel re-export of all route group creators

## How It Connects

- **`router.tsx`** (parent) imports these creators, calls each with the app layout route, and assembles the full route tree
- Each route references page components from `src/renderer/features/`
- Auth routes use `AuthGuard` for protected route redirection
