/**
 * FileExplorer -- Virtualized file tree using react-arborist
 *
 * Renders the project file tree with keyboard navigation,
 * expand/collapse, file type icons, and search filtering.
 * Designed to sit in the sidebar alongside agent panels.
 */

import { useCallback, useMemo, useRef } from 'react';

import { Search, X } from 'lucide-react';
import { Tree } from 'react-arborist';

import { cn } from '@renderer/shared/lib/utils';

import { Input } from '@ui/input';
import { ScrollArea } from '@ui/scroll-area';
import { Spinner } from '@ui/spinner';
import { Text } from '@ui/typography';

import { useFileTree } from '../api/useFileTree';
import { useFileTreeEvents } from '../hooks/useFileTreeEvents';
import { useFileExplorerUI } from '../store';

import { FileNode } from './FileNode';

import type { FileTreeNode } from '../api/useFileTree';
import type { NodeApi, TreeApi } from 'react-arborist';

// ─── Constants ─────────────────────────────────────────────────

const ROW_HEIGHT = 28;
const INDENT = 16;
const DEFAULT_HEIGHT = 600;

// ─── Props ─────────────────────────────────────────────────────

interface FileExplorerProps {
  /** Path to the project root */
  projectPath: string | null;
  /** Height of the tree container in pixels */
  height?: number;
  /** Callback when a file is activated (clicked/Enter) */
  onFileActivate?: (filePath: string) => void;
  /** Additional CSS classes for the root container */
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────

export function FileExplorer({
  projectPath,
  height = DEFAULT_HEIGHT,
  onFileActivate,
  className,
}: FileExplorerProps) {
  const treeRef = useRef<TreeApi<FileTreeNode> | undefined>(undefined);
  const { data: nodes, isLoading, error } = useFileTree(projectPath);
  const { searchQuery, setSearchQuery, clearSearch, selectNode } = useFileExplorerUI();

  // Subscribe to file-watcher events for cache invalidation
  useFileTreeEvents();

  // ─── Handlers ────────────────────────────────────────────────

  const handleActivate = useCallback(
    (node: NodeApi<FileTreeNode>) => {
      if (!node.data.isDirectory) {
        selectNode(node.id);
        onFileActivate?.(node.id);
      }
    },
    [onFileActivate, selectNode],
  );

  const handleSelect = useCallback(
    (selected: Array<NodeApi<FileTreeNode>>) => {
      if (selected.length > 0) {
        selectNode(selected[0].id);
      } else {
        selectNode(null);
      }
    },
    [selectNode],
  );

  const handleSearchMatch = useCallback(
    (node: NodeApi<FileTreeNode>, term: string): boolean => {
      return node.data.name.toLowerCase().includes(term.toLowerCase());
    },
    [],
  );

  // ─── Accessors ───────────────────────────────────────────────

  const childrenAccessor = useCallback(
    (d: FileTreeNode): readonly FileTreeNode[] | null => d.children,
    [],
  );

  const idAccessor = useCallback((d: FileTreeNode): string => d.id, []);

  // ─── Memoized search term ────────────────────────────────────

  const trimmedSearch = useMemo(() => searchQuery.trim(), [searchQuery]);

  // ─── Render ──────────────────────────────────────────────────

  if (projectPath === null) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <Text className="text-muted-foreground">No project selected</Text>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <Spinner size="sm" />
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <Text className="text-destructive">Failed to load files</Text>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Search bar */}
      <div className="relative px-2 pb-2">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={14}
        />
        <Input
          className="h-7 pl-7 pr-7 text-xs"
          placeholder="Search files..."
          size="sm"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
        />
        {searchQuery.length > 0 ? (
          <button
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            type="button"
            onClick={clearSearch}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <Tree<FileTreeNode>
          ref={treeRef}
          disableDrag
          disableDrop
          disableEdit
          disableMultiSelection
          childrenAccessor={childrenAccessor}
          className="file-explorer-tree"
          data={nodes ?? []}
          height={height}
          idAccessor={idAccessor}
          indent={INDENT}
          openByDefault={false}
          rowHeight={ROW_HEIGHT}
          searchMatch={handleSearchMatch}
          searchTerm={trimmedSearch.length > 0 ? trimmedSearch : undefined}
          width="100%"
          onActivate={handleActivate}
          onSelect={handleSelect}
        >
          {FileNode}
        </Tree>
      </ScrollArea>
    </div>
  );
}
