# Research Doc: Plan 4 — Assistant as Co-Pilot

**Goal:** Transform the assistant widget from a generic chatbot into a context-aware co-pilot. Quick Actions become per-view smart prompts. The assistant knows what page you're on and what project is active. The assistant can fill out and submit forms on behalf of the user, showing them a preview to confirm before saving.

This plan builds on Plan 3's tool_use infrastructure and focuses on the UX layer: how the assistant presents itself, how quick actions work per view, and how generated content flows into forms.

---

## Current State of Assistant UX

### Widget (`WidgetPanel.tsx`, `QuickActions.tsx`, `WidgetInput.tsx`, `WidgetMessageArea.tsx`)

- Floating FAB in bottom-right corner → opens/closes panel
- Panel: fixed width 380px, max 70vh, pinned bottom-right
- Header: "Assistant" title, voice toggle, clear, close
- Message area: scrollable stream of assistant responses
- Input: textarea + send button
- Quick Actions: 4 hardcoded static buttons above the input area

**QuickActions problem:**
```typescript
const quickActions: QuickAction[] = [
  { label: 'New Note', icon: StickyNote, command: 'create a new note' },
  { label: 'New Task', icon: ClipboardList, command: 'create a new task' },
  { label: 'Run Agent', icon: Play, command: 'run agent on current task' },
  { label: 'Remind Me', icon: Bell, command: 'set a reminder' },
];
```
These inject text into the chat input — they don't execute anything. After Plan 3, typing "create a new note" will work. But the UX is still wrong: Quick Actions should be *contextual* — if you're on the Roadmap page, they should offer roadmap-specific actions.

### AssistantWidget (`AssistantWidget.tsx`)

- Renders `WidgetFab` + conditionally `WidgetPanel`
- No context awareness — doesn't know what view is active

---

## Target UX

### Context-Aware Quick Actions

Quick Actions are computed based on `activeView` from the layout store. Each view has 4 tailored actions.

```typescript
const VIEW_QUICK_ACTIONS: Record<string, QuickAction[]> = {
  roadmap: [
    { label: 'Generate Roadmap', icon: Map, command: 'Generate a product roadmap for my current project' },
    { label: 'Add Milestone', icon: Plus, command: 'Add a milestone to my roadmap' },
    { label: 'Summarize Progress', icon: TrendingUp, command: 'Summarize my roadmap progress' },
    { label: 'Next Steps', icon: ArrowRight, command: 'What are the next steps on my roadmap?' },
  ],
  planner: [
    { label: 'Plan My Day', icon: Calendar, command: 'Plan my day based on my goals' },
    { label: 'Add Goal', icon: Target, command: 'Add a goal to today\'s plan' },
    { label: 'Schedule Block', icon: Clock, command: 'Schedule a time block for me' },
    { label: 'Review Yesterday', icon: History, command: 'Help me write a reflection for yesterday' },
  ],
  ideation: [
    { label: 'Generate Ideas', icon: Lightbulb, command: 'Generate 5 ideas for my current project' },
    { label: 'Refine Idea', icon: Pencil, command: 'Help me refine my best idea' },
    { label: 'Group Ideas', icon: Layers, command: 'Group my ideas by theme' },
    { label: 'Pick Top 3', icon: Star, command: 'Which of my ideas has the most potential?' },
  ],
  notes: [
    { label: 'New Note', icon: StickyNote, command: 'Create a new note about' },
    { label: 'Summarize', icon: FileText, command: 'Summarize the selected note' },
    { label: 'Find Note', icon: Search, command: 'Find my note about' },
    { label: 'Meeting Notes', icon: Users, command: 'Create meeting notes for' },
  ],
  fitness: [
    { label: 'Log Workout', icon: Dumbbell, command: 'Log my workout for today' },
    { label: 'Suggest Workout', icon: Zap, command: 'Suggest a workout for today' },
    { label: 'Track Goal', icon: Target, command: 'Update my fitness goal' },
    { label: 'Weekly Summary', icon: BarChart, command: 'Summarize my fitness this week' },
  ],
  dashboard: [
    { label: 'Morning Briefing', icon: Sun, command: 'Give me a morning briefing' },
    { label: 'Quick Capture', icon: Zap, command: 'Capture a quick note or task' },
    { label: 'What\'s Next', icon: ArrowRight, command: 'What should I focus on next?' },
    { label: 'End of Day', icon: Moon, command: 'Help me wrap up my day' },
  ],
  // fallback
  default: [
    { label: 'New Note', icon: StickyNote, command: 'create a new note' },
    { label: 'New Task', icon: ClipboardList, command: 'create a new task' },
    { label: 'Remind Me', icon: Bell, command: 'set a reminder' },
    { label: 'Search', icon: Search, command: 'search for' },
  ],
};
```

### Form Pre-Fill Flow (Plan 3 + Plan 4 combined)

When a Quick Action triggers AI generation (e.g., "Generate Roadmap"), instead of just inserting text into chat:

1. Quick Action sends a structured generation request via `assistant.generate` IPC (Plan 3)
2. Claude returns structured fields (e.g., array of milestone objects)
3. Renderer shows a **preview modal** before saving:
   - Title: "Generated Roadmap — Review & Confirm"
   - List of proposed milestones with editable title/date
   - "Save All" button → calls `createMilestone.mutate(...)` for each
   - "Edit" inline → user can modify before saving
   - "Discard" → closes without saving
4. On confirmation, records are created and the page refreshes

This flow keeps the human in control: Claude generates, human reviews, human confirms.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/renderer/features/assistant/components/GenerationPreviewModal.tsx` | Reusable modal showing AI-generated content for review before save |
| `src/renderer/shared/hooks/useAIGenerate.ts` | Shared mutation hook wrapping `assistant.generate` IPC |
| `src/renderer/features/assistant/lib/view-quick-actions.ts` | `VIEW_QUICK_ACTIONS` map + `getQuickActionsForView(view)` helper |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/renderer/features/assistant/components/QuickActions.tsx` | Accept `activeView?: string` prop; render view-specific actions from `view-quick-actions.ts` |
| `src/renderer/features/assistant/components/WidgetPanel.tsx` | Read `activeView` from `useLayoutStore`; pass to `<QuickActions>` |
| `src/renderer/features/assistant/components/AssistantWidget.tsx` | Pass `activeView` down from layout store |
| `src/renderer/features/assistant/hooks/useAssistantEvents.ts` | Handle `event:assistant.toolExecuted` → invalidate query cache (Plan 3 supplies this event) |
| `src/renderer/features/roadmap/components/RoadmapPage.tsx` | Add "Generate Roadmap" button → `useAIGenerate` → `<GenerationPreviewModal>` |
| `src/renderer/features/ideation/components/IdeationPage.tsx` | Add "Generate Ideas" button → `useAIGenerate` → `<GenerationPreviewModal>` |
| `src/renderer/features/planner/components/PlannerPage.tsx` | Add "Plan My Day" button → `useAIGenerate` → pre-fills time blocks |
| `src/renderer/features/notes/components/NotesPage.tsx` or `NotesList.tsx` | Add "Generate Note" button → `useAIGenerate` → opens NoteEditor pre-filled |

---

## `GenerationPreviewModal` Component Design

```typescript
interface GenerationPreviewModalProps<T> {
  isOpen: boolean;
  title: string;
  items: T[];
  renderItem: (item: T, onChange: (updated: T) => void) => React.ReactNode;
  onConfirm: (items: T[]) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}
```

Generic enough to handle milestone arrays, idea arrays, or single-note objects. Renders with:
- Modal overlay (using `@ui` Dialog or sheet)
- Scrollable list of pre-filled items, each editable inline
- Footer: Cancel + "Save [N] items" button

---

## Assistant Context in Layout Store

The layout store (`src/renderer/shared/stores/layout-store.ts`) already tracks `activeProjectId`. We need to add `activeView`:

```typescript
// Add to layout store:
activeView: string;  // matches route segment: 'roadmap', 'planner', 'ideation', etc.
setActiveView: (view: string) => void;
```

**Where `setActiveView` is called:** In the route component for each feature (or in each page's `useEffect` on mount). Alternatively, derive it from TanStack Router's active route — `useRouter().state.location.pathname`.

The simpler approach: read `window.location.pathname` in `WidgetPanel.tsx` to derive the active view without modifying the layout store.

```typescript
function getActiveViewFromPath(pathname: string): string {
  if (pathname.includes('/roadmap')) return 'roadmap';
  if (pathname.includes('/planner')) return 'planner';
  if (pathname.includes('/ideation')) return 'ideation';
  if (pathname.includes('/notes')) return 'notes';
  if (pathname.includes('/fitness')) return 'fitness';
  if (pathname.includes('/dashboard') || pathname === '/') return 'dashboard';
  return 'default';
}
```

---

## Wiring the "Generate Roadmap" Button (Concrete Example)

**In `RoadmapPage.tsx`:**

```tsx
// Add alongside existing state:
const [isGenerating, setIsGenerating] = useState(false);
const [generatedMilestones, setGeneratedMilestones] = useState<GeneratedMilestone[]>([]);
const [showPreview, setShowPreview] = useState(false);
const generateContent = useAIGenerate();

async function handleGenerateRoadmap() {
  const result = await generateContent.mutateAsync({
    prompt: `Generate 3-5 roadmap milestones for a software project${
      activeProject ? ` called "${activeProject.name}"` : ''
    }. Focus on major deliverables with realistic target dates starting from today.`,
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          targetDate: { type: 'string', format: 'date' },
        },
        required: ['title', 'description', 'targetDate'],
      },
    },
  });
  setGeneratedMilestones(result.fields as GeneratedMilestone[]);
  setShowPreview(true);
}

function handleConfirmGenerated(milestones: GeneratedMilestone[]) {
  for (const m of milestones) {
    createMilestone.mutate(m);
  }
  setShowPreview(false);
}
```

---

## Assistant Voice Notes

The assistant already has voice input (`useAssistantVoice.ts`) and voice output toggle (speaker button in `WidgetPanel.tsx`). These are already wired. No changes needed here — they'll naturally work once the assistant can actually take actions.

---

## IPC Changes

None beyond Plan 3's `assistant.generate` channel. Plan 4 is purely a renderer-layer change.

---

## Risk / Complexity

| Risk | Level | Notes |
|------|-------|-------|
| Quick action commands don't map well to tools | Low | Commands are natural language; Claude + tools handles ambiguity |
| Preview modal complexity | Medium | Generic modal with inline editing needs careful prop design |
| `activeView` derivation from pathname | Low | Simple string matching; no store changes needed if using pathname |
| Generated dates being in wrong format | Low | System prompt specifies ISO date format |
| User dismisses preview, AI created records anyway | N/A | Generation is separate from creation — `assistant.generate` does NOT create records; only `onConfirm` creates them |

---

## Out of Scope

- Saving conversation history to disk
- Multiple chat sessions / conversation switching
- Assistant personality configuration
- "Memory" of past user preferences across sessions
- Proactive suggestions without user prompting
- Assistant in non-widget views (full-page assistant view)

---

## Dependencies

- **Plan 3 must be complete first** — this plan requires `assistant.generate` IPC channel
- Plan 2 is independent
- Layout store must expose route/view info (minimal change or pathname derivation)
