/**
 * Changelog — Version history and release notes
 */

import { Plus, RefreshCw, ScrollText, Trash2, Wrench } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

type CategoryType = 'added' | 'changed' | 'fixed' | 'removed';

interface ChangeCategory {
  type: CategoryType;
  items: string[];
}

interface VersionEntry {
  version: string;
  date: string;
  categories: ChangeCategory[];
}

// ─── Category Config ─────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  CategoryType,
  { label: string; icon: React.ComponentType<{ className?: string }>; cssVar: string }
> = {
  added: { label: 'Added', icon: Plus, cssVar: '--success' },
  changed: { label: 'Changed', icon: RefreshCw, cssVar: '--info' },
  fixed: { label: 'Fixed', icon: Wrench, cssVar: '--warning' },
  removed: { label: 'Removed', icon: Trash2, cssVar: '--destructive' },
};

// ─── Mock Data ───────────────────────────────────────────────

const CHANGELOG_DATA: VersionEntry[] = [
  {
    version: 'v0.3.0',
    date: 'February 2026',
    categories: [
      {
        type: 'added',
        items: [
          'Color theme picker with 7 themes',
          'UI scale slider (75-150%)',
          'Profile management system',
          'Changelog and Insights pages',
        ],
      },
      {
        type: 'changed',
        items: [
          'Settings page redesigned with sections',
          'Sidebar updated with new navigation items',
        ],
      },
      {
        type: 'fixed',
        items: ['Theme persistence across restarts', 'Sidebar collapse state preserved'],
      },
    ],
  },
  {
    version: 'v0.2.0',
    date: 'February 2026',
    categories: [
      {
        type: 'added',
        items: [
          'Terminal integration with xterm.js',
          'Agent management dashboard',
          'Kanban board with drag-and-drop',
          'GitHub integration page',
          'Roadmap and Ideation views',
        ],
      },
      {
        type: 'changed',
        items: ['Navigation restructured with project-scoped views'],
      },
    ],
  },
  {
    version: 'v0.1.0',
    date: 'February 2026',
    categories: [
      {
        type: 'added',
        items: [
          'Initial project scaffold',
          'IPC contract system',
          'Project management',
          'Task system with Kanban board',
          'Electron main process with services',
        ],
      },
    ],
  },
];

// ─── Components ──────────────────────────────────────────────

function CategorySection({ category }: { category: ChangeCategory }) {
  const config = CATEGORY_CONFIG[category.type];
  const IconComponent = config.icon;

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: `hsl(var(${config.cssVar}))` }}
      >
        <IconComponent className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
      <ul className="text-foreground space-y-1 pl-6 text-sm">
        {category.items.map((item) => (
          <li key={item} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VersionCard({ entry }: { entry: VersionEntry }) {
  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="border-primary bg-primary/30 absolute top-1 left-0 h-3 w-3 rounded-full border-2" />

      {/* Version header */}
      <div className="mb-3">
        <h3 className="text-foreground text-lg font-semibold">
          {entry.version}{' '}
          <span className="text-muted-foreground text-sm font-normal">— {entry.date}</span>
        </h3>
      </div>

      {/* Content card */}
      <div className="border-border bg-card space-y-4 rounded-lg border p-4">
        {entry.categories.map((category) => (
          <CategorySection key={category.type} category={category} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export function ChangelogPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ScrollText className="text-muted-foreground h-6 w-6" />
          <h1 className="text-foreground text-2xl font-bold">Changelog</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">Version history and release notes</p>
      </div>

      {/* Timeline */}
      <div className="relative space-y-8">
        {/* Timeline line */}
        <div className="bg-border absolute top-0 bottom-0 left-[5px] w-px" />

        {CHANGELOG_DATA.map((entry) => (
          <VersionCard key={entry.version} entry={entry} />
        ))}
      </div>
    </div>
  );
}
