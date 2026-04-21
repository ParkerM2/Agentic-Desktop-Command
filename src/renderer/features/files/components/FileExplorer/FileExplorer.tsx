/**
 * FileExplorer -- Virtualized file tree using react-arborist
 *
 * Renders the project file tree with keyboard navigation,
 * expand/collapse, file type icons, and search filtering.
 * Designed to sit in the sidebar alongside agent panels.
 */

import { Tree } from 'react-arborist';

import { cn } from '@renderer/shared/lib/utils';

import { ScrollArea } from '@ui/scroll-area';
import { SearchInput } from '@ui/search-input';
import { Spinner } from '@ui/spinner';
import { Text } from '@ui/typography';

import { FileNode } from '../FileNode';

import { useFileExplorer } from './useFileExplorer';

import type { FileTreeNode } from '../../api/useFileTree';

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
  const {
    treeRef,
    nodes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    clearSearch,
    trimmedSearch,
    handleActivate,
    handleSelect,
    handleSearchMatch,
    childrenAccessor,
    idAccessor,
  } = useFileExplorer({ projectPath, onFileActivate });

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
      <div className="px-2 pb-2">
        <SearchInput
          className="h-7 text-xs"
          placeholder="Search files..."
          size="sm"
          value={searchQuery}
          onClear={clearSearch}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
        />
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
