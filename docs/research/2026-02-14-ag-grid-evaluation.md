# AG-Grid Evaluation for Task Management Dashboard

**Date**: 2026-02-14
**Status**: RECOMMENDED — Use `ag-grid-community` (Free, MIT)
**Packages**: `ag-grid-community@^35.1.0` + `ag-grid-react@^35.1.0`

---

## Decision

Use **AG-Grid Community** (MIT, free) for the Task Management Dashboard table. It covers all core needs: custom cell renderers, real-time streaming updates, sorting/filtering, virtualization, and theming. Enterprise features (sparklines, row grouping, tree data) can be approximated with lightweight custom implementations.

---

## 1. Community (Free) vs Enterprise Feature Matrix

| Feature | Community (Free) | Enterprise ($999/dev/yr) | Impact on Our Use Case |
|---------|:-:|:-:|---|
| **Custom Cell Renderers** | YES | YES | Progress bars, status badges, agent avatars — all free |
| **Sorting / Filtering / Pagination** | YES | YES | Core table functionality, free |
| **Column & Row Virtualization** | YES | YES | Performance for large task lists, free |
| **Live/Streaming Data Updates** (`applyTransaction`, `applyTransactionAsync`) | YES | YES | Real-time agent status updates, free |
| **CSS Theming / Custom Themes** | YES | YES | Tailwind v4 integration, free |
| **Row Grouping** | NO | YES | Group tasks by agent, project, status |
| **Sparklines / In-Cell Charts** | NO | YES | Mini activity graphs per task row |
| **Tree Data (parent/child hierarchy)** | NO | YES | Subtask trees under parent tasks |
| **Master/Detail (expandable rows)** | NO | YES | Expand row to see task details |
| **Server-Side Row Model** | NO | YES | Not needed (local data, small scale) |
| **Integrated Charts** | NO | YES | Full chart visualizations |
| **CSV Export** | YES | YES | Basic export, free |
| **Excel Export** | NO | YES | Export with styling |

### Enterprise Feature Workarounds (Community)

| Enterprise Feature | DIY Workaround |
|---|---|
| Sparklines | SVG polyline in custom cell renderer (~30 lines) |
| Row Grouping | Manual data sort + section header rows |
| Tree Data | Custom expand/collapse with indented rows |
| Master/Detail | Custom row height management + detail panel |

---

## 2. Compatibility

| Concern | Status |
|---------|--------|
| **React 19** | Fully supported since AG-Grid v32.3 (current v35.1.0) |
| **Electron** | Official tutorial exists, pure renderer-process code |
| **TypeScript strict** | Excellent type definitions |
| **Bundle size** | ~200 KB gzipped with tree shaking (~9% increase on 2.1 MB) |

---

## 3. Real-Time Update Patterns

### `applyTransaction()` — Immediate, Synchronous
Best for individual task status changes:
```typescript
gridApi.applyTransaction({ update: [updatedTask] });
gridApi.applyTransaction({ add: [newTask] });
gridApi.applyTransaction({ remove: [{ id: taskId }] });
```

### `applyTransactionAsync()` — Batched, High-Frequency
Best for multiple agents streaming updates simultaneously:
```typescript
// Batches updates every 50-100ms (configurable)
gridApi.applyTransactionAsync({ update: [task] });

// Grid config
<AgGridReact
  asyncTransactionWaitMillis={100}
  getRowId={(params) => params.data.id}
/>
```

### `refreshCells()` — Visual Refresh Only
For re-rendering specific cells without data change:
```typescript
gridApi.refreshCells({ columns: ['progress'], force: true });
```

### Integration with Claude-UI Architecture
```
main process agent events → IPC event → useIpcEvent hook → gridApi.applyTransaction()
```

---

## 4. Custom Cell Renderer Examples

### Progress Bar Cell
```typescript
export function ProgressBarCell(props: CustomCellRendererProps): React.ReactNode {
  const progress = Number(props.value) || 0;
  const getColor = (pct: number): string => {
    if (pct >= 100) return 'var(--success)';
    if (pct >= 60) return 'var(--primary)';
    if (pct >= 30) return 'var(--warning)';
    return 'var(--muted)';
  };
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: getColor(progress) }}
        />
      </div>
      <span className="min-w-[3ch] text-right text-xs text-muted-foreground">{progress}%</span>
    </div>
  );
}
```

### Status Badge Cell
```typescript
const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-info/15 text-info border-info/30' },
  running: { label: 'Running', className: 'bg-primary/15 text-primary border-primary/30' },
  paused: { label: 'Paused', className: 'bg-warning/15 text-warning border-warning/30' },
  done: { label: 'Done', className: 'bg-success/15 text-success border-success/30' },
  error: { label: 'Error', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export function StatusBadgeCell(props: CustomCellRendererProps): React.ReactNode {
  const status = (props.value as TaskStatus) ?? 'queued';
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued;
  return (
    <div className="flex items-center py-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {status === 'running' ? <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : null}
        {config.label}
      </span>
    </div>
  );
}
```

### DIY SVG Sparkline Cell (No Enterprise Needed)
```typescript
export function ActivitySparklineCell(props: CustomCellRendererProps): React.ReactNode {
  const data: number[] = Array.isArray(props.value) ? props.value : [];
  if (data.length === 0) return <span className="text-xs text-muted-foreground">No data</span>;
  const width = 120, height = 28;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((val, i) => `${(i / (data.length - 1)) * width},${height - ((val - min) / range) * height}`)
    .join(' ');
  return (
    <div className="flex items-center py-1">
      <svg width={width} height={height} className="overflow-visible">
        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
```

### Agent Avatar/Name Cell
```typescript
export function AgentCell(props: CustomCellRendererProps): React.ReactNode {
  const agentName = String(props.value ?? 'Unassigned');
  const initials = agentName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{initials}</div>
      <span className="truncate text-sm">{agentName}</span>
    </div>
  );
}
```

---

## 5. Module Registration (Tree Shaking)

```typescript
import {
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  TextFilterModule,
  NumberFilterModule,
  CellStyleModule,
  HighlightChangesModule,
  ModuleRegistry,
  ValidationModule,
  CsvExportModule,
  ColumnMenuModule,
  ContextMenuModule,
} from 'ag-grid-community';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  TextFilterModule,
  NumberFilterModule,
  CellStyleModule,
  HighlightChangesModule,
  CsvExportModule,
  ColumnMenuModule,
  ContextMenuModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
]);
```

---

## 6. Why AG-Grid Over Alternatives

| Criteria | AG-Grid Community | TanStack Table | react-data-grid | MUI DataGrid |
|---|---|---|---|---|
| Architecture | Full component | Headless (build all UI) | Full component | Full component |
| Real-time streaming API | `applyTransactionAsync` (purpose-built) | Manual state mgmt | Manual | Manual |
| Bundle size (gzipped) | ~200 KB | ~15 KB (but weeks of UI work) | ~50 KB | ~180 KB |
| Design system conflict | None (CSS theming) | None | None | MUI dependency conflict |
| Learning curve | Medium | Low (but high implementation effort) | Low | Medium |

**TanStack Table** is too low-level — weeks of UI work for sorting, filtering, virtualization, column resizing.
**MUI DataGrid** would introduce Material UI conflicting with our Radix + Tailwind stack.
**react-data-grid** has no built-in real-time streaming API.

---

## 7. License

**AG-Grid Community**: MIT License — completely free for commercial use, no license key, no restrictions.

---

## Sources

- [AG Grid: Community vs Enterprise](https://www.ag-grid.com/react-data-grid/community-vs-enterprise/)
- [AG Grid: React 19 Compatibility](https://www.ag-grid.com/react-data-grid/compatibility/)
- [AG Grid: Custom Cell Renderers](https://www.ag-grid.com/react-data-grid/component-cell-renderer/)
- [AG Grid: High Frequency Updates](https://www.ag-grid.com/react-data-grid/data-update-high-frequency/)
- [AG Grid: Transaction Updates](https://www.ag-grid.com/react-data-grid/data-update-transactions/)
- [AG Grid: Modules for Tree Shaking](https://www.ag-grid.com/javascript-data-grid/modules/)
- [AG Grid Blog: Electron Applications](https://blog.ag-grid.com/using-ag-grid-in-electron-applications/)
- [AG Grid: Community License (MIT)](https://www.ag-grid.com/eula/AG-Grid-Community-License.html)
